'use client';

import { ChatBox } from '@mooc/ai-ui';
import type { ChatMessage } from '../types';

interface WelcomeChatProps {
  messages: ChatMessage[];
  streaming: boolean;
  // eslint-disable-next-line no-unused-vars
  onSend: (text: string) => void;
}

/**
 * WelcomeChat —— 新建模式的居中欢迎卡片 + ChatBox
 * 视觉上区别于详情模式的右侧窄栏 ChatPanel。
 * 消息状态由父组件通过 useTargetChat hook 管理并透传。
 */
export default function WelcomeChat({ messages, streaming, onSend }: WelcomeChatProps) {
  return (
    <div className="flex h-[calc(100vh-64px-100px)] flex-col items-center justify-center px-4">
      <div className="w-full max-w-[640px]">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">开始新的学习</h1>
          <p className="mt-2 text-sm text-gray-500">
            描述你想学什么，AI 将为你定制学习路径
          </p>
        </header>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <ChatBox
            messages={messages}
            onSend={onSend}
            disabled={streaming}
            emptyText="在下方输入你的学习目标，例如「我想学 Python 异步编程」"
            className="min-h-[320px] border-0 shadow-none"
          />
        </div>
      </div>
    </div>
  );
}
