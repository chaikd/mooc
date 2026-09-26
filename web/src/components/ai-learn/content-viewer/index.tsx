'use client';

interface ContentViewerProps {
  nodeId: string | null;
  html: string | null;
}

/**
 * 用 sandboxed iframe 渲染后端生成的微学习 HTML。
 * key=nodeId 强制切换时重建，避免 srcDoc 残留；不传 allow-forms/allow-popups 限制脚本能力。
 */
export default function ContentViewer({ nodeId, html }: ContentViewerProps) {
  if (!html) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        {nodeId ? '该节点尚未生成学习内容' : '选择一个节点查看学习内容'}
      </div>
    );
  }

  return (
    <iframe
      key={nodeId ?? '__none__'}
      srcDoc={html}
      title="学习内容"
      sandbox="allow-scripts allow-same-origin"
      className="h-full w-full border-0"
    />
  );
}
