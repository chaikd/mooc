/**
 * @mooc/ai-ui 公共出口（唯一对外导出）
 * 新增组件后在此追加导出，消费方禁止深路径导入。
 */
export { ChatBox } from './components/ChatBox';
export type {
  ChatBoxProps,
  ChatMessage,
  MessageRole,
  MessageStatus,
} from './components/ChatBox';
