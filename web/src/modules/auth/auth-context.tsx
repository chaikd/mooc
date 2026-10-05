'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { UserType } from '@mooc/db-shared';
import { getUserInfo, logOut, openLoginModal } from '@/services/auth';

interface AuthContextValue {
  user: UserType | null;
  loading: boolean;
  refresh: () => Promise<UserType | null>;
  // eslint-disable-next-line no-unused-vars
  requireLogin: (href?: string) => void;
  clearPendingHref: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const currentUser = await getUserInfo() as UserType | undefined;
    setUser(currentUser ?? null);
    setLoading(false);
    return currentUser ?? null;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!loading && user && pendingHref) {
      router.push(pendingHref);
      setPendingHref(null);
    }
  }, [loading, pendingHref, router, user]);

  const requireLogin = useCallback((href?: string) => {
    setPendingHref(href ?? null);
    openLoginModal();
  }, []);

  const clearPendingHref = useCallback(() => {
    setPendingHref(null);
  }, []);

  const logout = useCallback(async () => {
    await logOut();
    setUser(null);
    setPendingHref(null);
    router.refresh();
  }, [router]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    refresh,
    requireLogin,
    clearPendingHref,
    logout,
  }), [clearPendingHref, loading, logout, refresh, requireLogin, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
