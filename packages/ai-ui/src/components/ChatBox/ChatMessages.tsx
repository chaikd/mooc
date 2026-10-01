import { useEffect, useRef } from 'react';
import { cx } from '../../utils/cx';
import type { ChatMessage } from './ChatBox';
import ChatMessageShow from './sections/ChatMessageShow';

export interface ChatMessagesProps {
  messages: ChatMessage[];
  emptyText?: string;
  onSelectedOption?: (v: string) => void;
}

/**
 * ChatMessages —— 消息列表
 * 自动滚动到底部（仅在消息数量变化时触发，避免重渲染抖动）。
 */
export function ChatMessages({
  messages,
  emptyText = '暂无消息',
  onSelectedOption
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(messages.length);
  const messageBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length !== countRef.current) {
      countRef.current = messages.length;
      bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
    }
    messageBoxRef.current?.lastElementChild?.scrollIntoView?.()
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4" ref={messageBoxRef}>
      <ul className="space-y-3">
        {messages.map((msg: ChatMessage,k) => (
          <li
            key={msg.id}
            className={cx(
              'flex',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <MessageBubble actionable={k === messages.length - 1} message={msg} onSelectedOption={onSelectedOption}/>
          </li>
        ))}
      </ul>
      <div ref={bottomRef} aria-hidden />
    </div>
  );
}

function MessageBubble({ message, actionable, onSelectedOption }: { message: ChatMessage; actionable: boolean; onSelectedOption?: (v: string) => void }) {
  const isUser = message.role === 'user';
  const isThinking = message.role === 'thinking';
  return (
    <div
      className={cx(
        'max-w-[80%] whitespace-pre-wrap break-words rounded-ui px-3 py-2 text-sm shadow-ui',
        isUser
          ? 'bg-primary-600 text-white'
          : isThinking
            ? 'border border-dashed border-amber-300 bg-amber-50 text-amber-900'
            : 'bg-primary-50 text-gray-900'
      )}
    >
      <ChatMessageShow
        actionable={actionable}
        message={message}
        onSelected={(v) => {
        onSelectedOption?.(v)
      }}></ChatMessageShow>
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
