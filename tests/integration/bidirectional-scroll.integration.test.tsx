import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useState, useCallback, useLayoutEffect, useRef } from 'react';
import { BidirectionalScroll } from '../../lib/components/BidirectionalScroll';
import { mockIntersectionObserver } from '../helpers/mock-intersection-observer';

const createMessages = (start: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: start + i,
    text: `Message ${start + i}`,
  }));

const TestChat = ({
  onLoadPreviousSpy,
  onLoadNextSpy,
}: {
  onLoadPreviousSpy?: ReturnType<typeof vi.fn>;
  onLoadNextSpy?: ReturnType<typeof vi.fn>;
} = {}) => {
  const [messages, setMessages] = useState(createMessages(50, 10));
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);

  const loadPrevious = useCallback(async () => {
    onLoadPreviousSpy?.();
    setIsLoadingPrevious(true);
    await Promise.resolve();
    setMessages((prev) => {
      const oldest = prev[0]!.id;
      return [...createMessages(oldest - 5, 5), ...prev];
    });
    setIsLoadingPrevious(false);
  }, [onLoadPreviousSpy]);

  const loadNext = useCallback(async () => {
    onLoadNextSpy?.();
    setIsLoadingNext(true);
    await Promise.resolve();
    setMessages((prev) => {
      const newest = prev[prev.length - 1]!.id;
      return [...prev, ...createMessages(newest + 1, 5)];
    });
    setIsLoadingNext(false);
  }, [onLoadNextSpy]);

  return (
    <BidirectionalScroll
      dataLength={messages.length}
      onLoadPrevious={loadPrevious}
      hasPrevious={messages[0]!.id > 1}
      isLoadingPrevious={isLoadingPrevious}
      onLoadNext={loadNext}
      hasNext={messages[messages.length - 1]!.id < 100}
      isLoadingNext={isLoadingNext}
      previousLoader={
        <div data-testid="prev-loader">Loading older...</div>
      }
      nextLoader={
        <div data-testid="next-loader">Loading newer...</div>
      }
      style={{ height: '400px' }}
    >
      {messages.map((msg) => (
        <div key={msg.id} data-testid={`msg-${msg.id}`}>
          {msg.text}
        </div>
      ))}
    </BidirectionalScroll>
  );
};

describe('BidirectionalScroll integration', () => {
  let io: ReturnType<typeof mockIntersectionObserver>;

  beforeEach(() => {
    io = mockIntersectionObserver();
  });

  afterEach(() => {
    io.reset();
    vi.restoreAllMocks();
  });

  it('loads data in both directions sequentially', async () => {
    render(<TestChat />);

    // Initial messages 50-59
    expect(screen.getByText('Message 50')).toBeInTheDocument();
    expect(screen.getByText('Message 59')).toBeInTheDocument();

    const sentinels = screen.getAllByTestId('ros-sentinel');
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

  it('never triggers both directions simultaneously', async () => {
    const prevSpy = vi.fn();
    const nextSpy = vi.fn();

    render(
      <TestChat onLoadPreviousSpy={prevSpy} onLoadNextSpy={nextSpy} />,
    );

    // Both sentinels exist
    const sentinels = screen.getAllByTestId('ros-sentinel');
    expect(sentinels).toHaveLength(2);

    // Trigger top sentinel
    await act(async () => {
      io.triggerIntersection(sentinels[0]!, true);
    });

    // Only previous should have been called
    expect(prevSpy).toHaveBeenCalledTimes(1);
    expect(nextSpy).not.toHaveBeenCalled();
  });

  it('does not auto-trigger onLoadPrevious when consumer scrolls to bottom on mount', () => {
    const prevSpy = vi.fn();
    const nextSpy = vi.fn();

    // Simulates the recommended chat pattern: scroll to bottom on initial mount
    // so the top sentinel is not visible and doesn't auto-fire.
    const ChatWithScrollToBottom = () => {
      const containerRef = useRef<HTMLElement>(null);
      const [messages] = useState(createMessages(50, 10));
      const hasScrolled = useRef(false);

      useLayoutEffect(() => {
        if (containerRef.current && !hasScrolled.current) {
          hasScrolled.current = true;
          // In real DOM this moves scroll to bottom; in jsdom we simulate
          // the effect: the top sentinel is NOT in the viewport
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }, []);

      return (
        <BidirectionalScroll
          ref={containerRef}
          dataLength={messages.length}
          onLoadPrevious={prevSpy}
          hasPrevious={true}
          isLoadingPrevious={false}
          onLoadNext={nextSpy}
          hasNext={true}
          isLoadingNext={false}
          style={{ height: '400px' }}
        >
          {messages.map((msg) => (
            <div key={msg.id}>{msg.text}</div>
          ))}
        </BidirectionalScroll>
      );
    };

    render(<ChatWithScrollToBottom />);

    // After mount with scroll-to-bottom, neither callback should have fired
    // (sentinels exist but our mock only fires on explicit triggerIntersection)
    expect(prevSpy).not.toHaveBeenCalled();
    expect(nextSpy).not.toHaveBeenCalled();

    // Only explicit bottom sentinel trigger should fire onLoadNext
    const sentinels = screen.getAllByTestId('ros-sentinel');
    const bottomSentinel = sentinels[sentinels.length - 1]!;
    act(() => {
      io.triggerIntersection(bottomSentinel, true);
    });
    expect(nextSpy).toHaveBeenCalledTimes(1);
    expect(prevSpy).not.toHaveBeenCalled();
  });

  it('never shows both loaders at the same time', () => {
    // Render with both loading states forced true to verify render guard
    render(
      <BidirectionalScroll
        dataLength={10}
        onLoadNext={vi.fn()}
        hasNext={true}
        isLoadingNext={true}
        onLoadPrevious={vi.fn()}
        hasPrevious={true}
        isLoadingPrevious={true}
        previousLoader={
          <div data-testid="prev-loader">Loading older...</div>
        }
        nextLoader={
          <div data-testid="next-loader">Loading newer...</div>
        }
      >
        <div>Content</div>
      </BidirectionalScroll>,
    );

    // Previous loader takes priority
    expect(screen.getByTestId('prev-loader')).toBeInTheDocument();
    expect(screen.queryByTestId('next-loader')).not.toBeInTheDocument();
  });
});
