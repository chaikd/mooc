/** 对齐 agents/services/schemas/public.py 的 MasteryState（值是中文） */
export type MasteryState =
  | '未接触'
  | '已接触'
  | '理解程度未知'
  | '初步掌握'
  | '稳定掌握'
  | '迁移掌握';

export interface Target {
  id: string;
  title: string;
  masteryState: MasteryState;
  currentNodeId: string | null;
}

export interface TargetNode {
  id: string;
  targetId: string;
  title: string;
  masteryState: MasteryState;
  /** 生成的微学习 HTML；为 null 表示尚未生成 */
  html: string | null;
}

/** 与 @mooc/ai-ui ChatMessage 形状一致，便于直接透传给 ChatBox */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'sending' | 'sent' | 'error';
  createdAt: number;
}

