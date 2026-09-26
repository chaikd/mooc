import { ApiLearnDataSource } from './api';
import { MockLearnDataSource } from './mock';
import type { LearnDataSource } from './types';

const USE_MOCK = process.env.NEXT_PUBLIC_AI_LEARN_USE_MOCK !== 'false';
const API_BASE = process.env.NEXT_PUBLIC_AI_LEARN_API

let cached: LearnDataSource | null = null;

/**
 * 返回单例数据源。
 * - NEXT_PUBLIC_AI_LEARN_USE_MOCK !== 'false' → MockLearnDataSource（默认）
 * - 否则 → ApiLearnDataSource(NEXT_PUBLIC_AI_LEARN_API)
 */
export function createDataSource(): LearnDataSource {
  if (!cached) {
    cached = USE_MOCK ? new MockLearnDataSource() : new ApiLearnDataSource(API_BASE);
  }
  return cached;
}
