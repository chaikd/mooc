import { ApiLearnDataSource } from './api';
import type { LearnDataSource } from './types';

const configuredApiBase = process.env.NEXT_PUBLIC_AI_LEARN_API?.trim();
const API_BASE = (configuredApiBase || '/api/ai-learn').replace(/\/+$/, '') || '/api/ai-learn';

let cached: LearnDataSource | null = null;

/**
 * 返回单例数据源：通过 Node 的 /api/ai-learn 代理访问 Python。
 */
export function createDataSource(): LearnDataSource {
  if (!cached) {
    cached = new ApiLearnDataSource(API_BASE);
  }
  return cached;
}
