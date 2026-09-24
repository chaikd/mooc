import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatInput } from '../ChatInput.tsx';

describe('ChatInput', () => {
  it('渲染输入框与发送按钮', () => {
    render(<ChatInput onSend={() => undefined} />);
    expect(screen.getByLabelText('聊天输入')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '发送消息' })).toBeInTheDocument();
  });

  it('空内容时发送按钮禁用', () => {
    render(<ChatInput onSend={() => undefined} />);
    expect(screen.getByRole('button', { name: '发送消息' })).toBeDisabled();
  });

  it('输入非空文本后按钮可用，点击触发 onSend 并清空输入', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<ChatInput onSend={onSend} />);
    const input = screen.getByLabelText('聊天输入');
    fireEvent.change(input, { target: { value: '你好' } });
    expect(screen.getByRole('button', { name: '发送消息' })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));
    await waitFor(() => expect(onSend).toHaveBeenCalledWith('你好'));
    expect((input as HTMLTextAreaElement).value).toBe('');
  });

  it('Enter 触发发送，Shift+Enter 不发送', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<ChatInput onSend={onSend} />);
    const input = screen.getByLabelText('聊天输入');
    fireEvent.change(input, { target: { value: 'hello' } });

    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(onSend).toHaveBeenCalledWith('hello'));
  });

  it('纯空白内容不触发发送', async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    const input = screen.getByLabelText('聊天输入');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('disabled 时输入框与按钮均禁用', () => {
    render(<ChatInput onSend={() => undefined} disabled />);
    expect(screen.getByLabelText('聊天输入')).toBeDisabled();
    expect(screen.getByRole('button', { name: '发送消息' })).toBeDisabled();
  });

  it('onSend 失败时不清空输入', async () => {
    const onSend = vi.fn().mockRejectedValue(new Error('fail'));
    render(<ChatInput onSend={onSend} />);
    const input = screen.getByLabelText('聊天输入');
    fireEvent.change(input, { target: { value: '保留我' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));
    await waitFor(() => expect(onSend).toHaveBeenCalled());
    // 等待组件内部 try/catch 完成
    await new Promise((r) => setTimeout(r, 0));
    expect((input as HTMLTextAreaElement).value).toBe('保留我');
  });
});
