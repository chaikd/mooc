'use client';

import {
  ClockCircleOutlined,
  MessageOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import type { MasteryState, TargetSummary } from '@/components/ai-learn/types';
import { useAuth } from '@/modules/auth/auth-context';
import LoginRequiredLink from '@/modules/auth/login-required-link';
import { createDataSource } from '@/services/ai-learn';

const STATE_COLOR: Record<MasteryState, string> = {
  未接触: 'bg-gray-300',
  已接触: 'bg-blue-300',
  理解程度未知: 'bg-yellow-300',
  初步掌握: 'bg-green-300',
  稳定掌握: 'bg-emerald-500',
  迁移掌握: 'bg-indigo-500',
};

function formatUpdatedAt(value: number) {
  if (!Number.isFinite(value)) return '--';
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Shanghai',
  }).format(new Date(value));
}

export default function AILearn() {
  const dataSource = useMemo(() => createDataSource(), []);
  const { user, loading: authLoading, requireLogin } = useAuth();
  const [targets, setTargets] = useState<TargetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setLoginRequired(true);
      return;
    }

    let cancelled = false;
    setLoginRequired(false);
    setLoadFailed(false);
    setLoading(true);

    const loadTargets = async () => {
      try {
        const result = await dataSource.getTargets(6);
        if (!cancelled) setTargets(result);
      } catch (error) {
        if (cancelled) return;
        const status = (error as Error & { status?: number }).status;
        if (status === 401 || status === 403) {
          setLoginRequired(true);
          requireLogin();
        } else {
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadTargets();
    return () => {
      cancelled = true;
    };
  }, [authLoading, dataSource, requireLogin, user]);

  return (
    <div className="container mx-auto px-4 py-8">
      <section className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">自主学习</p>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">
            我的 AI 学习
          </h1>
        </div>
        <LoginRequiredLink
          href="/ai-learn/chat"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition hover:bg-primary-600"
        >
          <MessageOutlined />
          开始新的学习
        </LoginRequiredLink>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">最近学习</h2>
          {targets.length > 0 && (
            <span className="text-sm text-gray-400">最近 {targets.length} 个主题</span>
          )}
        </div>

        {loading ? (
          <div className="mt-4 rounded-lg border border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
            加载中...
          </div>
        ) : loginRequired ? (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center">
            <p className="text-sm text-gray-500">登录后查看学习内容</p>
            <button
              type="button"
              className="mt-3 text-sm font-medium text-primary hover:text-primary-700"
              onClick={() => requireLogin()}
            >
              登录
            </button>
          </div>
        ) : loadFailed ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-600"
          >
            学习内容加载失败，请稍后重试。
          </div>
        ) : targets.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center">
            <p className="text-sm text-gray-500">还没有生成学习内容</p>
            <LoginRequiredLink
              href="/ai-learn/chat"
              className="mt-3 inline-block text-sm font-medium text-primary hover:text-primary-700"
            >
              从一次对话开始
            </LoginRequiredLink>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {targets.map((target) => (
              <LoginRequiredLink
                key={target.id}
                href={`/ai-learn/chat?targetId=${target.id}`}
                className="group flex min-h-36 flex-col justify-between rounded-lg border border-gray-200 bg-white p-5 transition hover:border-primary-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex items-center gap-2 text-xs text-gray-500">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${STATE_COLOR[target.masteryState]}`}
                    />
                    {target.masteryState}
                  </span>
                  <RightOutlined className="text-xs text-gray-300 transition group-hover:text-primary" />
                </div>

                <h3 className="mt-5 line-clamp-2 text-base font-semibold text-gray-900 transition group-hover:text-primary-700">
                  {target.title}
                </h3>

                <p className="mt-4 inline-flex items-center gap-2 text-xs text-gray-400">
                  <ClockCircleOutlined />
                  {formatUpdatedAt(target.updatedAt)}
                </p>
              </LoginRequiredLink>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
