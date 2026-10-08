'use client';

import { useEffect, useRef } from 'react';
import type { IframeLearningMessage } from '../types';

interface ContentViewerProps {
  nodeId: string | null;
  html: string | null;
  // eslint-disable-next-line no-unused-vars
  onLearningEvent?: (message: IframeLearningMessage) => void;
}

function parseLearningMessage(value: unknown): IframeLearningMessage | null {
  if (!value || typeof value !== 'object') return null;

  const message = value as {
    type?: unknown;
    event?: {
      operation?: unknown;
      timestamp?: unknown;
    };
  };
  if (!message.event || typeof message.event !== 'object') return null;
  if (typeof message.event.timestamp !== 'number') return null;

  if (message.type === 'learning_next') {
    if (message.event.operation !== 'next_step') return null;
    return value as IframeLearningMessage;
  }

  if (message.type === 'learning_event' && typeof message.event.operation === 'string') {
    return value as IframeLearningMessage;
  }

  return null;
}

/**
 * 用 sandboxed iframe 渲染后端生成的微学习 HTML。
 * key=nodeId 强制切换时重建，避免 srcDoc 残留；不传 allow-forms/allow-popups 限制脚本能力。
 */
export default function ContentViewer({ nodeId, html, onLearningEvent }: ContentViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== iframeRef.current?.contentWindow) return;

      const message = parseLearningMessage(event.data);
      if (message) onLearningEvent?.(message);
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLearningEvent]);

  if (!html) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        {nodeId ? '该节点尚未生成学习内容' : '选择一个节点查看学习内容'}
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      key={nodeId ?? '__none__'}
      srcDoc={html}
      title="学习内容"
      sandbox="allow-scripts allow-same-origin"
      className="h-full w-full border-0"
    />
  );
}
