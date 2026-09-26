'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@/components/ai-learn/types';
import type { LearnDataSource, StreamMeta } from './types';

interface UseTargetChatOptions {
  dataSource: LearnDataSource;
  /** 可选：收到 meta 事件时的额外处理（WelcomeChat 用来切模式） */
  // eslint-disable-next-line no-unused-vars
  onMeta?: (meta: StreamMeta) => void;
}

interface UseTargetChatReturn {
  messages: ChatMessage[];
  streaming: boolean;
  /** 发送消息并启动 SSE 流 */
  // eslint-disable-next-line no-unused-vars
  send: (targetId: string, text: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
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
export function useTargetChat({ dataSource, onMeta }: UseTargetChatOptions): UseTargetChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // 组件卸载时取消未完成的流
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const send = useCallback(
    (targetId: string, text: string) => {
      if (streaming) return;

      const userMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'user',
        content: text,
        status: 'sent',
        createdAt: Date.now(),
      };
      const assistantId = nextMsgId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        status: 'sending',
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStreaming(true);

      const ac = dataSource.streamChat(
        targetId,
        text,
        (meta) => onMeta?.(meta),
        (delta) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + delta } : m,
            ),
          );
        },
        (q) => {
          const opts = q.options?.length ? `\n\n可选：${q.options.join(' / ')}` : '';
          const questionMsg: ChatMessage = {
            id: nextMsgId(),
            role: 'assistant',
            content: q.question + opts,
            status: 'sent',
            createdAt: Date.now(),
          };
          setMessages((prev) => [...prev, questionMsg]);
        },
        () => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, status: 'sent' } : m)),
          );
          setStreaming(false);
          abortRef.current = null;
        },
        (err) => {
          if (err.name === 'AbortError') return;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, status: 'error' } : m)),
          );
          setStreaming(false);
          abortRef.current = null;
        },
      );

      abortRef.current = ac;
    },
    [streaming, dataSource, onMeta],
  );

  return { messages, streaming, send, setMessages };
}
