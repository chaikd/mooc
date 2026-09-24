import type { HTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import { ChatInput } from './ChatInput';
import { ChatMessages } from './ChatMessages';

export type MessageRole = 'user' | 'assistant';
export type MessageStatus = 'sending' | 'sent' | 'error';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  createdAt: number;
}

export interface ChatBoxProps extends HTMLAttributes<HTMLDivElement> {
  /** 受控消息列表，由调用方维护 */
  messages: ChatMessage[];
  /** 发送回调；组件只负责把非空文本传出来，状态流转由调用方控制 */
  onSend: (text: string) => void | Promise<void>;
  /** 禁用输入（例如正在等待 AI 回复） */
  disabled?: boolean;
  /** 空态文案 */
  emptyText?: string;
}

/**
 * ChatBox —— AI 对话容器
 * 组合 ChatMessages + ChatInput，本身不持有消息状态。
 */
export function ChatBox({
  messages,
  onSend,
  disabled = false,
  emptyText,
  className,
  ...rest
}: ChatBoxProps) {
  return (
    <div
      className={cx(
        'flex h-full flex-col overflow-hidden rounded-ui border border-gray-200 bg-white shadow-ui',
        className
      )}
      {...rest}
    >
      <ChatMessages messages={messages} emptyText={emptyText} />
      <ChatInput onSend={onSend} disabled={disabled} />
    </div>
  );
}
