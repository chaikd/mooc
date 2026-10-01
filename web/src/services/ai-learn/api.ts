import type { ChatMessage, Target, TargetNode } from '@/components/ai-learn/types';
import { sseRequest } from '../sse-request';
import type {
  LearnDataSource,
  StreamChatOptions
} from './types';

/**
 * 真实 agents 后端数据源。
 * REST 接口用于读取 target、节点、消息和节点最新展示内容；streamChat 对接 SSE。
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

  async getLatestNodeDisplay(nodeId: string): Promise<string | null> {
    const res = await fetch(`${this.baseUrl}/api/targets/nodes/${nodeId}/latest-display`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`getLatestNodeDisplay HTTP ${res.status}`);
    const payload = await res.json() as { result?: string | null };
    return payload.result ?? null;
  }

  async getMessages(targetId: string): Promise<ChatMessage[]> {
    const res = await fetch(`${this.baseUrl}/api/targets/${targetId}/messages`);
    if (!res.ok) throw new Error(`getMessages HTTP ${res.status}`);
    return res.json();
  }

  streamChat({
    targetId,
    text,
    onMeta,
    onToken,
    onThinking,
    onQuestion,
    onGenerated,
    onEnd,
    onError,
  }: StreamChatOptions): AbortController {
    // 新建模式（targetId 为 'new' 或空）不传 target_id，后端自动创建
    const body: Record<string, string> = { user_input: text };
    if (targetId && targetId !== 'new') {
      body.target_id = targetId;
    }

    return sseRequest({
      url: `${this.baseUrl}/api/mastery_chat`,
      body,
      onEvent: ({ event, data }) => {
        try {
          switch (event) {
            case 'meta': {
              const payload = JSON.parse(data);
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
            case 'thinking':
              if (data) onThinking(data);
              break;
            case 'question': {
              const payload = JSON.parse(data);
              const question = typeof payload === 'string' ? JSON.parse(payload) : payload;
              onQuestion(question);
              break;
            }
            case 'generated': {
              const payload = JSON.parse(data);
              onGenerated(payload);
              break;
            }
            case 'end':
              onEnd();
              break;
            case 'error': {
              let message = data || 'SSE error';
              try {
                const payload = JSON.parse(data);
                message = payload.message || message;
              } catch {
                // 兼容旧版纯字符串错误事件。
              }
              onError(new Error(message));
              break;
            }
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
