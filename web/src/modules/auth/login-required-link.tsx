'use client';

import { useRouter } from 'next/navigation';
import type { MouseEvent, ReactNode } from 'react';
import { useAuth } from './auth-context';

interface LoginRequiredLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

export default function LoginRequiredLink({
  href,
  className,
  children,
}: LoginRequiredLinkProps) {
  const router = useRouter();
  const { user, loading, refresh, requireLogin } = useAuth();

  const handleClick = async (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    const currentUser = user || (loading ? await refresh() : null);

    if (currentUser) {
      router.push(href);
    } else {
      requireLogin(href);
    }
  };

  return (
    <a
      href={href}
      className={className}
      aria-busy={loading}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
