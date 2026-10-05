'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuth } from './auth-context';

export default function LoginGuard({ children }: { children: ReactNode }) {
  const { user, loading, requireLogin } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      requireLogin();
    }
  }, [loading, requireLogin, user]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-64px-100px)] items-center justify-center text-sm text-gray-400">
        加载中...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-[calc(100vh-64px-100px)] items-center justify-center">
        <button
          type="button"
          className="text-sm font-medium text-primary hover:text-primary-700"
          onClick={() => requireLogin()}
        >
          请先登录后使用 AI 学习
        </button>
      </div>
    );
  }

  return children;
}
