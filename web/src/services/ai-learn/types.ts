import type { ChatMessage, Target, TargetNode } from '@/components/ai-learn/types';

export interface StreamQuestion {
  question: string;
  options?: string[];
}

export interface StreamMeta {
  targetId: string;
  isNew: boolean;
}

/* eslint-disable no-unused-vars -- 接口方法签名中的参数名仅供实现参考，本身不会被"使用" */
/**
 * AI 学习模块数据源接口。
 * mock / api 各自实现一份，通过 services/ai-learn/index.ts 工厂切换。
 */
export interface LearnDataSource {
  getTarget(targetId: string): Promise<Target>;
  getNodes(targetId: string): Promise<TargetNode[]>;
  getMessages(targetId: string): Promise<ChatMessage[]>;
  /**
   * 发起 SSE 流式对话。返回 AbortController 以便调用方在卸载/切 target 时取消。
   * - onMeta：SSE 流首个事件，携带真实 targetId + 是否新建标识（新建模式下用于更新 URL）。
   * - onToken：增量追加 assistant 内容。
   * - onQuestion：接收中断提问。
   * - onEnd/onError：终止流。
   *
   * 新建模式传 targetId='new'，后端 ensure_target 幂等创建后通过 meta 事件返回真实 ID。
   */
  streamChat(
    targetId: string,
    text: string,
    onMeta: (meta: StreamMeta) => void,
    onToken: (delta: string) => void,
    onQuestion: (q: StreamQuestion) => void,
    onEnd: () => void,
    onError: (err: Error) => void,
  ): AbortController;
}
/* eslint-enable no-unused-vars */
