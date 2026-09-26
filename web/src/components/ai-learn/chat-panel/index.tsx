'use client';

import { ChatBox } from '@mooc/ai-ui';
import type { ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  streaming: boolean;
  // eslint-disable-next-line no-unused-vars
  onSend: (text: string) => void;
}

/**
 * ChatPanel —— @mooc/ai-ui ChatBox 的业务包装器（详情模式）
 * 消息状态由父组件通过 useTargetChat hook 管理并透传。
 */
export default function ChatPanel({ messages, streaming, onSend }: ChatPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <ChatBox
        messages={messages}
        onSend={onSend}
        disabled={streaming}
        emptyText="开始新的对话吧"
        className="h-full border-0 shadow-none"
      />
    </div>
  );
}
