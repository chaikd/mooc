import AiLearnChatClient from './client';

export default async function AiLearnChatPage({
  searchParams,
}: {
  searchParams: Promise<{ targetId?: string }>;
}) {
  const { targetId } = await searchParams;
  return <AiLearnChatClient initialTargetId={targetId} />;
}
