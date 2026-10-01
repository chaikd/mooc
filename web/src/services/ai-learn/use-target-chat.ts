'use client';

import type { ChatMessage } from '@/components/ai-learn/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LearnDataSource, StreamGenerated, StreamMeta } from './types';

interface UseTargetChatOptions {
  dataSource: LearnDataSource;
  /** 可选：收到 meta 事件时的额外处理（WelcomeChat 用来切模式） */
  // eslint-disable-next-line no-unused-vars
  onMeta?: (meta: StreamMeta) => void;
  /** 收到完整的微学习 HTML 时更新中间展示区 */
  // eslint-disable-next-line no-unused-vars
  onGenerated?: (payload: StreamGenerated) => void;
}

interface UseTargetChatReturn {
  messages: ChatMessage[];
  streaming: boolean;
  /** 发送消息并启动 SSE 流 */
  // eslint-disable-next-line no-unused-vars
  send: (targetId: string, text: string, targetNodeId?: string) => void;
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
export function useTargetChat({ dataSource, onMeta, onGenerated }: UseTargetChatOptions): UseTargetChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [generatedHtml, setGeneratedHtml] = useState<string>('');

  // 组件卸载时取消未完成的流
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const send = useCallback(
    (targetId: string, text: string, targetNodeId?: string) => {
      if (streaming) return;

      const userMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'user',
        content: text,
        status: 'sent',
        createdAt: Date.now(),
      };
      const assistantId = nextMsgId();
      let thinkingId: string | null = null;
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        status: 'sending',
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStreaming(true);

      const ac = dataSource.streamChat({
        targetId,
        targetNodeId,
        text,
        onMeta: (meta) => onMeta?.(meta),
        onToken: (delta) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + delta } : m,
            ),
          );
        },
        onThinking: (delta) => {
          setMessages((prev) => {
            return prev.filter(v => v.id !== assistantId)
          })
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
              return [...prev, thinkingMsg]
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
          setGeneratedHtml(pre => pre + payload)
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
          abortRef.current = null;
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
          abortRef.current = null;
        },
      });

      abortRef.current = ac;
    },
    [streaming, dataSource, onMeta, onGenerated],
  );

  return { messages, streaming, send, setMessages, generatedHtml, setGeneratedHtml };
}
