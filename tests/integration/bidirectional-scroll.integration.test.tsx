import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useState, useCallback } from 'react';
import { BidirectionalScroll } from '../../src/components/BidirectionalScroll';
import { mockIntersectionObserver } from '../helpers/mock-intersection-observer';

function createMessages(start: number, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: start + i,
    text: `Message ${start + i}`,
  }));
}

function TestChat() {
  const [messages, setMessages] = useState(createMessages(50, 10));
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);

  const loadPrevious = useCallback(async () => {
    setIsLoadingPrevious(true);
    await Promise.resolve();
    setMessages((prev) => {
      const oldest = prev[0]!.id;
      return [...createMessages(oldest - 5, 5), ...prev];
    });
    setIsLoadingPrevious(false);
  }, []);

  const loadNext = useCallback(async () => {
    setIsLoadingNext(true);
    await Promise.resolve();
    setMessages((prev) => {
      const newest = prev[prev.length - 1]!.id;
      return [...prev, ...createMessages(newest + 1, 5)];
    });
    setIsLoadingNext(false);
  }, []);

  return (
    <BidirectionalScroll
      dataLength={messages.length}
      onLoadPrevious={loadPrevious}
      hasPrevious={messages[0]!.id > 1}
      isLoadingPrevious={isLoadingPrevious}
      onLoadNext={loadNext}
      hasNext={messages[messages.length - 1]!.id < 100}
      isLoadingNext={isLoadingNext}
      previousLoader={<div data-testid="prev-loader">Loading older...</div>}
      nextLoader={<div data-testid="next-loader">Loading newer...</div>}
      style={{ height: '400px' }}
    >
      {messages.map((msg) => (
        <div key={msg.id} data-testid={`msg-${msg.id}`}>
          {msg.text}
        </div>
      ))}
    </BidirectionalScroll>
  );
}

describe('BidirectionalScroll integration', () => {
  let io: ReturnType<typeof mockIntersectionObserver>;

  beforeEach(() => {
    io = mockIntersectionObserver();
  });

  afterEach(() => {
    io.reset();
    vi.restoreAllMocks();
  });

  it('loads data in both directions', async () => {
    render(<TestChat />);

    // Initial messages 50-59
    expect(screen.getByText('Message 50')).toBeInTheDocument();
    expect(screen.getByText('Message 59')).toBeInTheDocument();

    const sentinels = screen.getAllByTestId('ros-sentinel');
    // Top sentinel for previous, bottom for next
    const topSentinel = sentinels[0]!;

    // Load older messages via top sentinel
    await act(async () => {
      io.triggerIntersection(topSentinel, true);
    });

    // Should now have messages 45-59
    expect(screen.getByText('Message 45')).toBeInTheDocument();
    expect(screen.getByText('Message 59')).toBeInTheDocument();

    // Load newer messages via bottom sentinel
    const updatedSentinels = screen.getAllByTestId('ros-sentinel');
    const bottomSentinel = updatedSentinels[updatedSentinels.length - 1]!;

    await act(async () => {
      io.triggerIntersection(bottomSentinel, true);
    });

    // Should now have messages 45-64
    expect(screen.getByText('Message 45')).toBeInTheDocument();
    expect(screen.getByText('Message 60')).toBeInTheDocument();
  });
});
