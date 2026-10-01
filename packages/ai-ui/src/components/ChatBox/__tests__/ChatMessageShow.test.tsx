import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ChatMessageShow from '../sections/ChatMessageShow';
import type { ChatMessage } from '../ChatBox';

describe('ChatMessageShow', () => {
  it('renders string content_info', () => {
    const message: ChatMessage = {
      id: 'thinking-1',
      role: 'thinking',
      status: 'sent',
      content: JSON.stringify({
        learning_node: 'React 渲染规则',
        mastery_state: '初步掌握',
        content_info: '解释 React 不允许直接渲染普通对象。',
      }),
    };

    render(<ChatMessageShow message={message} actionable={false} />);

    expect(screen.getByText('解释 React 不允许直接渲染普通对象。')).toBeInTheDocument();
  });

  it('serializes unknown object content as a safe fallback', () => {
    const message: ChatMessage = {
      id: 'assistant-1',
      role: 'assistant',
      status: 'sent',
      content: JSON.stringify({
        notice: '未知消息结构',
      }),
    };

    render(<ChatMessageShow message={message} actionable={false} />);

    expect(screen.getByText(/"notice":"未知消息结构"/)).toBeInTheDocument();
  });

  it('parses a double-encoded question message', () => {
    const message: ChatMessage = {
      id: 'assistant-question',
      role: 'assistant',
      status: 'sent',
      content: JSON.stringify(JSON.stringify({
        conditions_satisfied: false,
        question: '你目前 Python 编程基础处于哪种程度？',
        options: ['完全没有基础', '了解基本语法'],
      })),
    };

    render(<ChatMessageShow message={message} actionable />);

    expect(screen.getByText('你目前 Python 编程基础处于哪种程度？')).toBeInTheDocument();
    expect(screen.getByText(/完全没有基础/)).toBeInTheDocument();
  });
});
