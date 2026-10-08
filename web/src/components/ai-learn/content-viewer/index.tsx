'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { IframeLearningMessage } from '../types';

interface ContentViewerProps {
  nodeId: string | null;
  html: string | null;
  streaming: boolean;
  // eslint-disable-next-line no-unused-vars
  onLearningEvent?: (message: IframeLearningMessage) => void;
}

const EMPTY_DOCUMENT = '<!doctype html><html><head></head><body></body></html>';
const MIN_FLUSH_INTERVAL = 50;

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
 * iframe 生命周期保持稳定，流式 HTML 通过 contentDocument 增量写入，避免反复重载。
 */
export default function ContentViewer({
  nodeId,
  html,
  streaming,
  onLearningEvent,
}: ContentViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const initialLoadHandledRef = useRef(false);
  const writtenHtmlRef = useRef('');
  const htmlRef = useRef(html ?? '');
  const streamingRef = useRef(streaming);
  const documentOpenRef = useRef(false);
  const activeDocumentRef = useRef<Document | null>(null);
  const frameRef = useRef<number | null>(null);
  const forceFlushRef = useRef(false);
  const lastFlushAtRef = useRef(0);
  const nodeIdRef = useRef(nodeId);

  const flushDocument = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !readyRef.current) return;

    const contentDocument = iframe.contentDocument;
    const nextHtml = htmlRef.current;
    if (!contentDocument || !nextHtml) return;

    const writtenHtml = writtenHtmlRef.current;
    if (nextHtml === writtenHtml) {
      if (!streamingRef.current && documentOpenRef.current) {
        contentDocument.close();
        documentOpenRef.current = false;
        activeDocumentRef.current = null;
      }
      return;
    }

    try {
      if (writtenHtml && documentOpenRef.current && nextHtml.startsWith(writtenHtml)) {
        contentDocument.write(nextHtml.slice(writtenHtml.length));
      } else {
        if (documentOpenRef.current) contentDocument.close();
        contentDocument.open();
        contentDocument.write(nextHtml);
        documentOpenRef.current = true;
        activeDocumentRef.current = contentDocument;
      }
      writtenHtmlRef.current = nextHtml;

      if (!streamingRef.current && documentOpenRef.current) {
        contentDocument.close();
        documentOpenRef.current = false;
        activeDocumentRef.current = null;
      }
    } catch (error) {
      console.warn('[ai-learn] iframe HTML write failed', error);
    }
  }, []);

  const scheduleFlush = useCallback((force = false) => {
    forceFlushRef.current = forceFlushRef.current || force;
    if (frameRef.current !== null) return;

    const run = (now: number) => {
      if (!forceFlushRef.current && now - lastFlushAtRef.current < MIN_FLUSH_INTERVAL) {
        frameRef.current = window.requestAnimationFrame(run);
        return;
      }

      frameRef.current = null;
      forceFlushRef.current = false;
      lastFlushAtRef.current = now;
      flushDocument();
    };

    frameRef.current = window.requestAnimationFrame(run);
  }, [flushDocument]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== iframeRef.current?.contentWindow) return;

      const message = parseLearningMessage(event.data);
      if (message) onLearningEvent?.(message);
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLearningEvent]);

  useEffect(() => {
    htmlRef.current = html ?? '';
    streamingRef.current = streaming;

    if (!html) {
      writtenHtmlRef.current = '';
      documentOpenRef.current = false;
      activeDocumentRef.current = null;
      readyRef.current = false;
      initialLoadHandledRef.current = false;
      forceFlushRef.current = false;
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      return;
    }

    if (nodeIdRef.current !== nodeId) {
      nodeIdRef.current = nodeId;
      writtenHtmlRef.current = '';
      documentOpenRef.current = false;
    }

    scheduleFlush(!streaming);
  }, [html, nodeId, scheduleFlush, streaming]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      activeDocumentRef.current?.close();
    };
  }, []);

  const handleIframeLoad = useCallback(() => {
    if (initialLoadHandledRef.current) return;
    initialLoadHandledRef.current = true;
    readyRef.current = true;
    scheduleFlush(true);
  }, [scheduleFlush]);

  if (!html) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        {streaming
          ? '正在生成学习内容…'
          : nodeId
            ? '该节点尚未生成学习内容'
            : '选择一个节点查看学习内容'}
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      srcDoc={EMPTY_DOCUMENT}
      onLoad={handleIframeLoad}
      title="学习内容"
      sandbox="allow-scripts allow-same-origin"
      className="h-full w-full border-0"
    />
  );
}
