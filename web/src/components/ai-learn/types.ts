import type { ChatMessage as AiUiChatMessage } from '@mooc/ai-ui';

/** 对齐 agents/services/schemas/public.py 的 MasteryState（值是中文） */
export type MasteryState =
  | '未接触'
  | '已接触'
  | '理解程度未知'
  | '初步掌握'
  | '稳定掌握'
  | '迁移掌握';

/** 对齐 agents/services/schemas/public.py 的 TargetState。 */
export type TargetState =
  | 'node_discovery'
  | 'learning'
  | 'evaluate_feedback';

export interface Target {
  id: string;
  title: string;
  masteryState: MasteryState;
  state: TargetState;
  currentNodeId: string | null;
}

export interface TargetSummary extends Target {
  updatedAt: number;
}

export interface TargetNode {
  id: string;
  targetId: string;
  title: string;
  masteryState: MasteryState;
  /** 生成的微学习 HTML；为 null 表示尚未生成 */
  html: string | null;
}

export interface LearningEventPayload {
  operation: string;
  target?: string;
  input?: unknown;
  result?: unknown;
  timestamp: number;
}

export interface LearningEventMessage {
  type: 'learning_event';
  event: LearningEventPayload;
}

export interface LearningNextMessage {
  type: 'learning_next';
  event: {
    operation: 'next_step';
    timestamp: number;
  };
}

export type IframeLearningMessage = LearningEventMessage | LearningNextMessage;

/** 直接复用 @mooc/ai-ui 的判别联合消息类型。 */
export type ChatMessage = AiUiChatMessage;
