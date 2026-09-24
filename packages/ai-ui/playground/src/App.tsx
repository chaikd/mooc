import { useState } from 'react';
import { ChatBox, type ChatMessage } from '../../src/index.ts';

let counter = 0;
const nextId = () => `msg-${++counter}-${Date.now()}`;

export function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [simulateError, setSimulateError] = useState(false);

  const handleSend = async (text: string) => {
    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      content: text,
      status: 'sending',
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setBusy(true);

    await new Promise((r) => setTimeout(r, 800));

    if (simulateError) {
      setMessages((prev) =>
        prev.map((m) => (m.id === userMsg.id ? { ...m, status: 'error' } : m))
      );
      setBusy(false);
      return;
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === userMsg.id ? { ...m, status: 'sent' } : m))
    );

    const reply: ChatMessage = {
      id: nextId(),
      role: 'assistant',
      content: `（模拟回复）你说的是：“${text}”`,
      status: 'sent',
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, reply]);
    setBusy(false);
  };

  return (
    <div className="mx-auto flex h-screen max-w-2xl flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">ChatBox Playground</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={simulateError}
              onChange={(e) => setSimulateError(e.target.checked)}
            />
            模拟发送失败
          </label>
          <button
            type="button"
            onClick={() => setMessages([])}
            className="rounded-ui border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 shadow-ui transition-colors hover:bg-gray-50"
          >
            清空
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden rounded-ui border border-gray-200">
        <ChatBox messages={messages} onSend={handleSend} disabled={busy} />
      </div>

      <p className="text-xs text-gray-500">
        提示：Enter 发送 · Shift+Enter 换行 · 切换「模拟发送失败」查看 error 态
      </p>
    </div>
  );
}
