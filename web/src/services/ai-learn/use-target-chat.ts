'use client';

import type { ChatMessage } from '@/components/ai-learn/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatType, LearnDataSource, StreamGenerated, StreamMeta } from './types';

interface SendOptions {
  type?: ChatType;
  displayText?: string;
}

interface UseTargetChatOptions {
  dataSource: LearnDataSource;
  /** 可选：收到 meta 事件时的额外处理（WelcomeChat 用来切模式） */
  // eslint-disable-next-line no-unused-vars
  onMeta?: (meta: StreamMeta) => void;
  /** 收到完整的微学习 HTML 时更新中间展示区 */
  // eslint-disable-next-line no-unused-vars
  onGenerated?: (payload: StreamGenerated) => void;
  /** 数据流正常结束后触发，用于刷新依赖服务端落库结果的数据。 */
  // eslint-disable-next-line no-unused-vars
  onComplete?: (targetId: string) => void;
}

interface UseTargetChatReturn {
  messages: ChatMessage[];
  streaming: boolean;
  /** 发送消息并启动 SSE 流 */
  // eslint-disable-next-line no-unused-vars
  send: (targetId: string, text: string, targetNodeId?: string, options?: SendOptions) => void;
  /** 终止当前流，保留已生成内容和消息 */
  stop: () => void;
  stopped: boolean;
  clearStopped: () => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  generatedHtml:string;
  setGeneratedHtml: React.Dispatch<React.SetStateAction<string>>;
}

const nextMsgId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * useTargetChat —— AI-Learn target 聊天的消息流编排 Hook
 *
 * 封装 ChatPanel / WelcomeChat 共用的消息状态管理：
 * - 追加用户消息 + assistant(sending) 占位
 * - onToken 增量累加 assistant content
 * - onQuestion 以独立 assistant 消息插入
 * - onEnd/onError 更新 status
 * - 维护 abort ref，组件卸载时取消未完成的流
 */
export function useTargetChat({
  dataSource,
  onMeta,
  onGenerated,
  onComplete,
}: UseTargetChatOptions): UseTargetChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [stopped, setStopped] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [generatedHtml, setGeneratedHtml] = useState<string>('');

  // 组件卸载时取消未完成的流
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const send = useCallback(
    (targetId: string, text: string, targetNodeId?: string, options?: SendOptions) => {
      if (streaming) return;

      const userMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'user',
        content: options?.displayText || text,
        status: 'sent',
        createdAt: Date.now(),
      };
      const assistantId = nextMsgId();
      let thinkingId: string | null = null;
      let activeTargetId = targetId && targetId !== 'new' ? targetId : null;
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        status: 'sending',
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStreaming(true);
      setStopped(false);

      const ac = dataSource.streamChat({
        targetId,
        targetNodeId,
        text,
        type: options?.type,
        displayText: options?.displayText,
        onMeta: (meta) => {
          activeTargetId = meta.targetId;
          onMeta?.(meta);
        },
        onToken: (delta) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + delta } : m,
            ),
          );
        },
        onThinking: (delta) => {
          if (!thinkingId) {
            thinkingId = nextMsgId();
            const thinkingMsg: ChatMessage = {
              id: thinkingId,
              role: 'thinking',
              content: delta,
              status: 'sending',
              createdAt: Date.now(),
            };
            setMessages((prev) => {
              return [
                ...prev.filter((message) => message.id !== assistantId),
                thinkingMsg,
              ];
            });
            return;
          }

          setMessages((prev) => {
            return prev.map((m) => {
              return m.id === thinkingId ? { ...m, content: m.content + delta } : m;
            },
            )
          });
        },
        onQuestion: (q) => {
          const questionMsg: ChatMessage = {
            id: nextMsgId(),
            role: 'assistant',
            content: JSON.stringify(q),
            status: 'sent',
            createdAt: Date.now(),
          };
          setMessages((prev) => {
            prev.pop()
            return [...prev, questionMsg]
          });
        },
        onGenerated: (payload) => {
          onGenerated?.(payload)
          const html = typeof payload === 'string' ? payload : payload.result;
          setGeneratedHtml(pre => pre + html)
        },
        onEnd: () => {
          setMessages((prev) =>
            prev.map((m) => (
              m.id === assistantId || m.id === thinkingId
                ? { ...m, status: 'sent' }
                : m
            )),
          );
          setStreaming(false);
          setStopped(false);
          abortRef.current = null;
          if (activeTargetId) onComplete?.(activeTargetId);
        },
        onError: (err) => {
          if (err.name === 'AbortError') return;
          setMessages((prev) =>
            prev.map((m) => (
              m.id === assistantId || m.id === thinkingId
                ? { ...m, status: 'error' }
                : m
            )),
          );
          setStreaming(false);
          setStopped(false);
          abortRef.current = null;
        },
      });

      abortRef.current = ac;
    },
    [streaming, dataSource, onMeta, onGenerated, onComplete],
  );

  const stop = useCallback(() => {
    const controller = abortRef.current;
    if (!controller) return;

    abortRef.current = null;
    controller.abort();
    setStreaming(false);
    setStopped(true);
    setMessages((prev) =>
      prev.map((message) =>
        message.status === 'sending' ? { ...message, status: 'sent' } : message,
      ),
    );
  }, []);

  const clearStopped = useCallback(() => setStopped(false), []);

  return {
    messages,
    streaming,
    stopped,
    send,
    stop,
    clearStopped,
    setMessages,
    generatedHtml,
    setGeneratedHtml,
  };
}
