'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TargetTree from '@/components/ai-learn/target-tree';
import ContentViewer from '@/components/ai-learn/content-viewer';
import ChatPanel from '@/components/ai-learn/chat-panel';
import WelcomeChat from '@/components/ai-learn/welcome-chat';
import type { Target, TargetNode } from '@/components/ai-learn/types';
import { createDataSource } from '@/services/ai-learn';
import { useTargetChat } from '@/services/ai-learn/use-target-chat';


export default function AiLearnChatClient({ initialTargetId }: { initialTargetId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [targetId, setTargetId] = useState<string | undefined>(initialTargetId);

  const [target, setTarget] = useState<Target | null>(null);
  const [nodes, setNodes] = useState<TargetNode[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // const [activeNode, setActiveNode] = useState<TargetNode | null>(null);

  const dataSource = useMemo(() => createDataSource(), []);

  // 防止 router.replace 过渡期 URL sync effect 误重置状态
  const skipNextSyncRef = useRef(false);

  // 新建完成：切模式 + 更新 URL
  const handleReady = useCallback(
    (newId: string) => {
      setTargetId(newId);
      // setGeneratedHtml(null);
      skipNextSyncRef.current = true;
      router.replace(`/ai-learn/chat?targetId=${newId}`, { scroll: false });
    },
    [router],
  );

  // const handleGenerated = useCallback((payload: StreamGenerated) => {
  //   setGeneratedHtml(payload.result);
  // }, []);

  // useTargetChat 提升到 client 层级，new/detail 模式共享同一份消息状态
  const { messages, streaming, send, setMessages, generatedHtml, setGeneratedHtml } = useTargetChat({
    dataSource,
    // onGenerated: handleGenerated,
    onMeta: !targetId ? (meta) => {
      return handleReady(meta.targetId);
    } : undefined,
    onComplete: (completedTargetId) => {
      void dataSource.getNodes(completedTargetId).then(setNodes).catch((e) => {
        console.warn('[ai-learn] refresh nodes failed', e);
      });
    },
  });

  // 同步 URL 变化（浏览器前进/后退）
  useEffect(() => {
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    const id = searchParams.get('targetId') ?? undefined;
    if (id && id !== targetId) {
      setTargetId(id);
      setGeneratedHtml('');
    } else if (!id && targetId) {
      setTargetId(undefined);
      setTarget(null);
      setNodes([]);
      setMessages([]);
      setActiveNodeId(null);
      setGeneratedHtml('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // detail 模式下加载 target/nodes/messages
  useEffect(() => {
    if (!targetId) return;
    let cancelled = false;
    setError(null);

    (async () => {
      try {
        const [t, n, m] = await Promise.all([
          dataSource.getTarget(targetId),
          dataSource.getNodes(targetId),
          dataSource.getMessages(targetId),
        ]);
        if (cancelled) return;
        setTarget(t);
        setNodes(n)
        // 仅在消息为空时合并历史（避免覆盖 WelcomeChat 中已写入的流式消息）
        setMessages((prev) => (prev.length === 0 ? m : prev));
        setActiveNodeId((prev) => prev ?? t.currentNodeId ?? n[0]?.id ?? null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [targetId, dataSource, setMessages]);

  useEffect(() => {
    if (!activeNodeId) {
      setGeneratedHtml('');
      return
    };
    // 实现当activeNodeId变化时，activeNode也随之变化,
    (async () => {
      try {
        const html = await dataSource.getLatestNodeDisplay(activeNodeId)
        setGeneratedHtml(html)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })()
  }, [activeNodeId])
  // const activeNode = useMemo(() => nodes.find((n) => n.id === activeNodeId) ?? null, [nodes, activeNodeId]);

  // ---- 新建模式 ----
  if (!targetId) {
    return (
      <WelcomeChat
        messages={messages}
        streaming={streaming}
        onSend={(text) => {
          setGeneratedHtml('');
          send('new', text);
        }}
      />
    );
  }

  // ---- 详情模式 ----
  if (error) {
    return (
      <div className="flex h-[calc(100vh-64px-100px)] items-center justify-center text-red-500">
        加载失败：{error}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px-100px)] gap-4 p-4">
      <aside className="w-72 shrink-0 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        <TargetTree
          target={target}
          nodes={nodes}
          activeNodeId={activeNodeId}
          onSelect={(nodeId) => {
            setActiveNodeId(nodeId);
          }}
        />
      </aside>

      <main className="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <ContentViewer
          nodeId={generatedHtml ? 'generated-current' : activeNodeId ?? null}
          html={generatedHtml}
        />
      </main>
      <aside className="w-96 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <ChatPanel
          messages={messages}
          streaming={streaming}
          onSend={(text) => {
            setGeneratedHtml('');
            send(targetId!, text, activeNodeId ?? undefined);
          }}
        />
      </aside>
    </div>
  );
}
