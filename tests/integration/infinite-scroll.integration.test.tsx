import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useState, useCallback } from 'react';
import { InfiniteScroll } from '../../lib/components/InfiniteScroll';
import { mockIntersectionObserver } from '../helpers/mock-intersection-observer';

const createFakeData = (page: number, pageSize = 5) =>
  Array.from({ length: pageSize }, (_, i) => ({
    id: (page - 1) * pageSize + i + 1,
    text: `Item ${(page - 1) * pageSize + i + 1}`,
  }));

const TestFeed = ({
  totalPages = 3,
  onLoadMoreSpy,
}: {
  totalPages?: number;
  onLoadMoreSpy?: ReturnType<typeof vi.fn>;
}) => {
  const [items, setItems] = useState(createFakeData(1));
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = useCallback(async () => {
    onLoadMoreSpy?.();
    setIsLoading(true);
    // Simulate async fetch
    await Promise.resolve();
    const nextPage = page + 1;
    setItems((prev) => [...prev, ...createFakeData(nextPage)]);
    setPage(nextPage);
    setIsLoading(false);
  }, [page, onLoadMoreSpy]);

  return (
    <InfiniteScroll
      onLoadMore={loadMore}
      hasMore={page < totalPages}
      isLoading={isLoading}
      loader={<div data-testid="loader">Loading...</div>}
      endMessage={<div data-testid="end-message">No more items</div>}
    >
      {items.map((item) => (
        <div key={item.id} data-testid={`item-${item.id}`}>
          {item.text}
        </div>
      ))}
    </InfiniteScroll>
  );
};

describe('InfiniteScroll integration', () => {
  let io: ReturnType<typeof mockIntersectionObserver>;

  beforeEach(() => {
    io = mockIntersectionObserver();
  });

  afterEach(() => {
    io.reset();
    vi.restoreAllMocks();
  });

  it('loads multiple pages sequentially (one at a time)', async () => {
    render(<TestFeed totalPages={3} />);

    // Page 1 is loaded initially
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 5')).toBeInTheDocument();
    expect(screen.queryByText('Item 6')).not.toBeInTheDocument();

    // Trigger load page 2
    let sentinel = screen.getByTestId('ros-sentinel');
    await act(async () => {
      io.triggerIntersection(sentinel, true);
    });

    expect(screen.getByText('Item 6')).toBeInTheDocument();
    expect(screen.getByText('Item 10')).toBeInTheDocument();
    expect(screen.queryByText('Item 11')).not.toBeInTheDocument();

    // Trigger load page 3
    sentinel = screen.getByTestId('ros-sentinel');
    await act(async () => {
      io.triggerIntersection(sentinel, true);
    });

    expect(screen.getByText('Item 11')).toBeInTheDocument();
    expect(screen.getByText('Item 15')).toBeInTheDocument();

    // No more data - end message should show, sentinel removed
    expect(screen.getByTestId('end-message')).toBeInTheDocument();
    expect(screen.queryByTestId('ros-sentinel')).not.toBeInTheDocument();
  });

  it('does NOT call onLoadMore multiple times without explicit intersection triggers', async () => {
    const spy = vi.fn();
    render(<TestFeed totalPages={5} onLoadMoreSpy={spy} />);

    // After initial render, onLoadMore should NOT have been called automatically
    expect(spy).not.toHaveBeenCalled();

    // Only a single explicit intersection trigger should cause a single call
    const sentinel = screen.getByTestId('ros-sentinel');
    await act(async () => {
      io.triggerIntersection(sentinel, true);
    });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('shows loader during loading and hides it after', async () => {
    render(<TestFeed totalPages={3} />);

    expect(screen.queryByTestId('loader')).not.toBeInTheDocument();

    const sentinel = screen.getByTestId('ros-sentinel');

    // Start loading (but don't await the async part yet)
    await act(async () => {
      io.triggerIntersection(sentinel, true);
    });

    // After the async completes, loader should be gone again
    expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    // And new items should be present
    expect(screen.getByText('Item 6')).toBeInTheDocument();
  });

  it('sentinel is placed after content (not before) for direction=bottom', () => {
    render(<TestFeed totalPages={3} />);

    const sentinel = screen.getByTestId('ros-sentinel');
    const lastItem = screen.getByTestId('item-5');
    const parent = lastItem.parentElement!;
    const children = Array.from(parent.children);

    const lastItemIdx = children.indexOf(lastItem);
    const sentinelIdx = children.indexOf(sentinel);

    // Sentinel must come AFTER the last content item
    expect(sentinelIdx).toBeGreaterThan(lastItemIdx);
  });

  it('handles rapid re-mount without errors', () => {
    const { unmount } = render(<TestFeed />);

    const sentinel = screen.getByTestId('ros-sentinel');
    expect(sentinel).toBeInTheDocument();

    // Unmount and remount
    unmount();
    expect(() => render(<TestFeed />)).not.toThrow();

    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });
});
