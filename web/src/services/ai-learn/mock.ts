import type { ChatMessage, MasteryState, Target, TargetNode } from '@/components/ai-learn/types';
import type { LearnDataSource, StreamMeta, StreamQuestion } from './types';

const DEMO_HTML = `<!doctype html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><style>
  body{font-family:system-ui,sans-serif;padding:24px;color:#1f2937;line-height:1.6}
  h1{color:#2563eb;margin-top:0} .card{background:#eff6ff;border-radius:8px;padding:16px;margin:12px 0}
  code{background:#f3f4f6;padding:2px 6px;border-radius:4px}
</style></head>
<body>
  <h1>{{TITLE}}</h1>
  <div class="card"><p>这是一个<strong>模拟的微学习页面</strong>，用于演示 ContentViewer 的 iframe sandbox 渲染。</p></div>
  <p>当前节点 ID：<code>{{ID}}</code></p>
</body>
</html>`;

const mkHtml = (title: string, id: string) =>
  DEMO_HTML.replace('{{TITLE}}', title).replace('{{ID}}', id);

const existingTarget: Target = {
  id: 'mock-target-id',
  title: 'Python 异步编程入门',
  masteryState: '理解程度未知' as MasteryState,
  currentNodeId: 'node-2',
};

const existingNodes: TargetNode[] = [
  {
    id: 'node-1',
    targetId: existingTarget.id,
    title: '什么是 async/await',
    masteryState: '初步掌握',
    html: mkHtml('什么是 async/await', 'node-1'),
  },
  {
    id: 'node-2',
    targetId: existingTarget.id,
    title: '事件循环与协程调度',
    masteryState: '理解程度未知',
    html: mkHtml('事件循环与协程调度', 'node-2'),
  },
  {
    id: 'node-3',
    targetId: existingTarget.id,
    title: '并发任务实战：aiohttp + asyncio.Queue',
    masteryState: '未接触',
    html: null,
  },
];

const existingHistory: ChatMessage[] = [
  {
    id: 'hist-1',
    role: 'assistant',
    content: '你好！我们将通过几轮对话了解你对 Python 异步编程的掌握情况。准备好了就告诉我。',
    status: 'sent',
    createdAt: Date.now() - 60_000,
  },
];

export class MockLearnDataSource implements LearnDataSource {
  /* eslint-disable no-unused-vars */
  async getTarget(_targetId: string): Promise<Target> {
    return structuredClone(existingTarget);
  }

  async getNodes(_targetId: string): Promise<TargetNode[]> {
    return structuredClone(existingNodes);
  }

  async getMessages(_targetId: string): Promise<ChatMessage[]> {
    return structuredClone(existingHistory);
  }

  streamChat(
    _targetId: string,
    text: string,
    onMeta: (meta: StreamMeta) => void,
    onToken: (delta: string) => void,
    onQuestion: (q: StreamQuestion) => void,
    onEnd: () => void,
    _onError: (err: Error) => void,
  ): AbortController {
    /* eslint-enable no-unused-vars */
    const ac = new AbortController();
    const signal = ac.signal;

    // meta 事件总是第一个发出；新建模式（targetId === 'new'）标记 isNew
    const isNew = _targetId === 'new' || !_targetId;
    const realTargetId = isNew ? `mock-target-${Date.now()}` : _targetId;

    // 微任务中触发，模拟网络延迟但保持同步感
    queueMicrotask(() => {
      if (!signal.aborted) {
        onMeta({ targetId: realTargetId, isNew });
      }
    });

    const reply = `（mock 回复）你说的是："${text}"。这是一段用来演示 SSE 流式追加效果的文本，会逐字出现在聊天框里。`;
    let i = 0;

    const tick = setInterval(() => {
      if (signal.aborted) {
        clearInterval(tick);
        return;
      }
      if (i < reply.length) {
        onToken(reply[i]);
        i++;
      } else {
        clearInterval(tick);
        if (Math.random() > 0.5) {
          onQuestion({ question: '你更希望先深入哪个方向？', options: ['原理', '实战'] });
        }
        onEnd();
      }
    }, 40);

    signal.addEventListener('abort', () => {
      clearInterval(tick);
    });

    return ac;
  }
}
