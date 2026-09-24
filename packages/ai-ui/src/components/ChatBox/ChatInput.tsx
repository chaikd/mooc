import { type KeyboardEvent, useState } from 'react';
import { cx } from '../../utils/cx';

export interface ChatInputProps {
  onSend: (text: string) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * ChatInput —— 纯文本输入 + 发送按钮
 * Enter 发送；Shift+Enter 换行；trim 后为空不触发。
 * 仅在 onSend resolve 之后清空，避免丢失失败内容。
 */
export function ChatInput({
  onSend,
  disabled = false,
  placeholder = '输入消息…',
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const [pending, setPending] = useState(false);

  const busy = disabled || pending;

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setPending(true);
    try {
      await onSend(trimmed);
      setValue('');
    } catch {
      // 失败时保留输入内容，由调用方通过消息状态展示错误
    } finally {
      setPending(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <div className="flex items-end gap-2 border-t border-gray-200 bg-white p-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={busy}
        placeholder={placeholder}
        rows={1}
        aria-label="聊天输入"
        className={cx(
          'max-h-32 min-h-10 flex-1 resize-none overflow-auto rounded-ui border border-gray-300 px-3 py-2 text-sm outline-none transition-colors',
          'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
          'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400'
        )}
      />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy || !value.trim()}
        aria-label="发送消息"
        className={cx(
          'inline-flex h-10 items-center justify-center rounded-ui px-4 text-sm font-medium text-white shadow-ui transition-colors',
          'bg-primary-600 hover:bg-primary-700',
          'disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500'
        )}
      >
        发送
      </button>
    </div>
  );
}
