import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../ChatBox.tsx';
import { ChatMessages } from '../ChatMessages.tsx';

const baseMsg = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: '1',
  role: 'user',
  content: '你好',
  status: 'sent',
  createdAt: 0,
  ...overrides,
});

describe('ChatMessages', () => {
  it('空列表显示空态文案', () => {
    render(<ChatMessages messages={[]} />);
    expect(screen.getByText('暂无消息')).toBeInTheDocument();
  });

  it('支持自定义空态文案', () => {
    render(<ChatMessages messages={[]} emptyText="开始对话吧" />);
    expect(screen.getByText('开始对话吧')).toBeInTheDocument();
  });

  it('渲染用户与助手消息', () => {
    const msgs: ChatMessage[] = [
      baseMsg({ id: 'u1', role: 'user', content: 'hi' }),
      baseMsg({ id: 'a1', role: 'assistant', content: 'hello' }),
    ];
    render(<ChatMessages messages={msgs} />);
    expect(screen.getByText('hi')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('sending 状态显示省略号标记', () => {
    render(
      <ChatMessages
        messages={[baseMsg({ status: 'sending' })]}
      />
    );
    expect(screen.getByLabelText('发送中')).toBeInTheDocument();
  });

  it('error 状态显示失败提示', () => {
    render(
      <ChatMessages
        messages={[baseMsg({ status: 'error' })]}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('发送失败');
  });
});
