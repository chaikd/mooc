import { useEffect, useRef } from 'react';
import { cx } from '../../utils/cx';
import type { ChatMessage } from './ChatBox';

export interface ChatMessagesProps {
  messages: ChatMessage[];
  emptyText?: string;
}

/**
 * ChatMessages —— 消息列表
 * 自动滚动到底部（仅在消息数量变化时触发，避免重渲染抖动）。
 */
export function ChatMessages({
  messages,
  emptyText = '暂无消息',
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(messages.length);

  useEffect(() => {
    if (messages.length !== countRef.current) {
      countRef.current = messages.length;
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <ul className="space-y-3">
        {messages.map((msg) => (
          <li
            key={msg.id}
            className={cx(
              'flex',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <MessageBubble message={msg} />
          </li>
        ))}
      </ul>
      <div ref={bottomRef} aria-hidden />
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div
      className={cx(
        'max-w-[80%] whitespace-pre-wrap break-words rounded-ui px-3 py-2 text-sm shadow-ui',
        isUser ? 'bg-primary-600 text-white' : 'bg-primary-50 text-gray-900'
      )}
    >
      {message.content}
      {message.status === 'sending' && (
        <span className="ml-2 inline-block animate-pulse text-xs opacity-70" aria-label="发送中">
          …
        </span>
      )}
      {message.status === 'error' && (
        <span className="ml-2 inline-block text-xs text-red-500" role="alert">
          发送失败
        </span>
      )}
    </div>
  );
}
