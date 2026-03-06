import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useState, useCallback } from 'react';
import { InfiniteScroll } from '../../src/components/InfiniteScroll';
import { mockIntersectionObserver } from '../helpers/mock-intersection-observer';

function createFakeData(page: number, pageSize = 5) {
  return Array.from({ length: pageSize }, (_, i) => ({
    id: (page - 1) * pageSize + i + 1,
    text: `Item ${(page - 1) * pageSize + i + 1}`,
  }));
}

function TestFeed({ totalPages = 3 }: { totalPages?: number }) {
  const [items, setItems] = useState(createFakeData(1));
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = useCallback(async () => {
    setIsLoading(true);
    // Simulate async fetch
    await Promise.resolve();
    const nextPage = page + 1;
    setItems((prev) => [...prev, ...createFakeData(nextPage)]);
    setPage(nextPage);
    setIsLoading(false);
  }, [page]);

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
}

describe('InfiniteScroll integration', () => {
  let io: ReturnType<typeof mockIntersectionObserver>;

  beforeEach(() => {
    io = mockIntersectionObserver();
  });

  afterEach(() => {
    io.reset();
    vi.restoreAllMocks();
  });

  it('loads multiple pages sequentially', async () => {
    render(<TestFeed totalPages={3} />);

    // Page 1 is loaded
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 5')).toBeInTheDocument();

    // Trigger load page 2
    let sentinel = screen.getByTestId('ros-sentinel');
    await act(async () => {
      io.triggerIntersection(sentinel, true);
    });

    expect(screen.getByText('Item 6')).toBeInTheDocument();
    expect(screen.getByText('Item 10')).toBeInTheDocument();

    // Trigger load page 3
    sentinel = screen.getByTestId('ros-sentinel');
    await act(async () => {
      io.triggerIntersection(sentinel, true);
    });

    expect(screen.getByText('Item 11')).toBeInTheDocument();
    expect(screen.getByText('Item 15')).toBeInTheDocument();

    // No more data - end message should show
    expect(screen.getByTestId('end-message')).toBeInTheDocument();
    expect(screen.queryByTestId('ros-sentinel')).not.toBeInTheDocument();
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
