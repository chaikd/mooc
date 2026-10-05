import AiLearnChatClient from './client';
import LoginGuard from '@/modules/auth/login-guard';

export default async function AiLearnChatPage({
  searchParams,
}: {
  searchParams: Promise<{ targetId?: string }>;
}) {
  const { targetId } = await searchParams;
  return (
    <LoginGuard>
      <AiLearnChatClient initialTargetId={targetId} />
    </LoginGuard>
  );
}
