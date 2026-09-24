import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../ChatBox.tsx';
import { ChatBox } from '../ChatBox.tsx';

const msg = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: '1',
  role: 'user',
  content: '你好',
  status: 'sent',
  createdAt: 0,
  ...overrides,
});

describe('ChatBox', () => {
  it('渲染消息列表与输入区域', () => {
    render(<ChatBox messages={[msg()]} onSend={() => undefined} />);
    expect(screen.getByText('你好')).toBeInTheDocument();
    expect(screen.getByLabelText('聊天输入')).toBeInTheDocument();
  });

  it('空消息时显示空态', () => {
    render(<ChatBox messages={[]} onSend={() => undefined} />);
    expect(screen.getByText('暂无消息')).toBeInTheDocument();
  });

  it('发送流程：输入 → 回车 → 触发 onSend', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<ChatBox messages={[]} onSend={onSend} />);
    const input = screen.getByLabelText('聊天输入');
    fireEvent.change(input, { target: { value: '新消息' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(onSend).toHaveBeenCalledWith('新消息'));
  });

  it('disabled 透传给输入区', () => {
    render(<ChatBox messages={[]} onSend={() => undefined} disabled />);
    expect(screen.getByLabelText('聊天输入')).toBeDisabled();
  });

  it('支持自定义 className', () => {
    const { container } = render(
      <ChatBox messages={[]} onSend={() => undefined} className="custom-root" />
    );
    expect(container.firstElementChild).toHaveClass('custom-root');
  });
});
