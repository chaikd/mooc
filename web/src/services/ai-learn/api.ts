import type { ChatMessage, Target, TargetNode } from '@/components/ai-learn/types';
import { sseRequest } from '../sse-request';
import type { LearnDataSource, StreamMeta, StreamQuestion } from './types';

/**
 * 真实 agents 后端数据源。
 * 当前仅 streamChat 对接 POST /api/mastery_chat SSE；其他方法待后端补 REST 接口后实现。
 */
export class ApiLearnDataSource implements LearnDataSource {
  // eslint-disable-next-line no-unused-vars
  constructor(private readonly baseUrl: string) {}

  async getTarget(targetId: string): Promise<Target> {
    const res = await fetch(`${this.baseUrl}/api/targets/${targetId}`);
    if (!res.ok) throw new Error(`getTarget HTTP ${res.status}`);
    return res.json();
  }

  async getNodes(targetId: string): Promise<TargetNode[]> {
    const res = await fetch(`${this.baseUrl}/api/targets/${targetId}/nodes`);
    if (!res.ok) throw new Error(`getNodes HTTP ${res.status}`);
    return res.json();
  }

  async getMessages(targetId: string): Promise<ChatMessage[]> {
    const res = await fetch(`${this.baseUrl}/api/targets/${targetId}/messages`);
    if (!res.ok) throw new Error(`getMessages HTTP ${res.status}`);
    return res.json();
  }

  /* eslint-disable no-unused-vars */
  streamChat(
    targetId: string,
    text: string,
    onMeta: (meta: StreamMeta) => void,
    onToken: (delta: string) => void,
    onQuestion: (q: StreamQuestion) => void,
    onEnd: () => void,
    onError: (err: Error) => void,
  ): AbortController {
    /* eslint-enable no-unused-vars */
    // 新建模式（targetId 为 'new' 或空）不传 target_id，后端自动创建
    const body: Record<string, string> = { user_input: text };
    if (targetId && targetId !== 'new') {
      body.target_id = targetId;
    }

    return sseRequest({
      url: `${this.baseUrl}/api/mastery_chat`,
      body,
      onEvent: ({ event, data }) => {
        console.log("🚀 ~ ApiLearnDataSource ~ streamChat ~ event, data:", event, data)
        try {
          switch (event) {
            case 'meta': {
              const payload = JSON.parse(data);
              console.log("🚀 ~ ApiLearnDataSource ~ streamChat ~ payload:", payload)
              console.log("🚀 ~ ApiLearnDataSource ~ streamChat ~ payload.target_id:", payload.target_id)
              onMeta({
                targetId: payload.target_id,
                isNew: !!payload.is_new,
              });
              break;
            }
            case 'token':
              // data 是纯文本字符串（后端 yield ServerSentEvent(data=text)）
              if (data) onToken(data);
              break;
            case 'question': {
              const payload = JSON.parse(data);
              onQuestion(payload as StreamQuestion);
              break;
            }
            case 'end':
              onEnd();
              break;
            case 'error':
              onError(new Error(data || 'SSE error'));
              break;
            default:
              // 未知事件类型，静默忽略
              break;
          }
        } catch (e) {
          console.warn('[ai-learn] SSE event parse failed', event, e);
        }
      },
      onError,
    });
  }
}
