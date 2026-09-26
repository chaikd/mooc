'use client';

import type { MasteryState, Target, TargetNode } from '../types';

interface TargetTreeProps {
  target: Target | null;
  nodes: TargetNode[];
  activeNodeId: string | null;
  // eslint-disable-next-line no-unused-vars
  onSelect: (nodeId: string) => void;
}

const STATE_COLOR: Record<MasteryState, string> = {
  未接触: 'bg-gray-300',
  已接触: 'bg-blue-300',
  理解程度未知: 'bg-yellow-300',
  初步掌握: 'bg-green-300',
  稳定掌握: 'bg-emerald-500',
  迁移掌握: 'bg-indigo-500',
};

export default function TargetTree({ target, nodes, activeNodeId, onSelect }: TargetTreeProps) {
  if (!target) {
    return <div className="text-sm text-gray-400">加载中…</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="border-b border-gray-100 pb-3">
        <h2 className="text-base font-semibold text-gray-900">{target.title}</h2>
        <span className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500">
          <span className={`inline-block h-2 w-2 rounded-full ${STATE_COLOR[target.masteryState]}`} />
          {target.masteryState}
        </span>
      </header>

      {nodes.length === 0 ? (
        <p className="text-sm text-gray-400">暂无学习节点</p>
      ) : (
        <ul className="space-y-1">
          {nodes.map((node) => {
            const isActive = node.id === activeNodeId;
            return (
              <li key={node.id}>
                <button
                  type="button"
                  onClick={() => onSelect(node.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${STATE_COLOR[node.masteryState]}`}
                    aria-label={node.masteryState}
                  />
                  <span className="truncate">{node.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
