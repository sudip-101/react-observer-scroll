import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { InfiniteScroll } from '../../lib/components/InfiniteScroll';
import { mockIntersectionObserver } from '../helpers/mock-intersection-observer';

describe('InfiniteScroll', () => {
  let io: ReturnType<typeof mockIntersectionObserver>;

  beforeEach(() => {
    io = mockIntersectionObserver();
  });

  afterEach(() => {
    io.reset();
    vi.restoreAllMocks();
  });

  // --- Basic rendering ---

  it('renders children', () => {
    render(
      <InfiniteScroll
        onLoadMore={vi.fn()}
        hasMore={true}
        isLoading={false}
      >
        <div>Item 1</div>
        <div>Item 2</div>
      </InfiniteScroll>,
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  // --- Sentinel intersection triggers ---

  it('calls onLoadMore when sentinel intersects (direction=bottom)', () => {
    const onLoadMore = vi.fn();

    render(
      <InfiniteScroll
        onLoadMore={onLoadMore}
        hasMore={true}
        isLoading={false}
      >
        <div>Content</div>
      </InfiniteScroll>,
    );

    const sentinel = screen.getByTestId('ros-sentinel');
    io.triggerIntersection(sentinel, true);

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onLoadMore when isLoading=true', () => {
    const onLoadMore = vi.fn();

    render(
      <InfiniteScroll
        onLoadMore={onLoadMore}
        hasMore={true}
        isLoading={true}
      >
        <div>Content</div>
      </InfiniteScroll>,
    );

    // Sentinel should still exist but observer should be disabled
    const sentinel = screen.queryByTestId('ros-sentinel');
    expect(sentinel).toBeInTheDocument();

    // Verify the sentinel is NOT being observed (enabled=false disconnects)
    const observerForSentinel = io.getObserverForElement(sentinel!);
    expect(observerForSentinel).toBeUndefined();
  });

  it('does NOT render sentinel when hasMore=false', () => {
    render(
      <InfiniteScroll
        onLoadMore={vi.fn()}
        hasMore={false}
        isLoading={false}
      >
        <div>Content</div>
      </InfiniteScroll>,
    );

    expect(screen.queryByTestId('ros-sentinel')).not.toBeInTheDocument();
  });

  it('does NOT call onLoadMore when sentinel leaves viewport (isIntersecting=false)', () => {
    const onLoadMore = vi.fn();

    render(
      <InfiniteScroll
        onLoadMore={onLoadMore}
        hasMore={true}
        isLoading={false}
      >
        <div>Content</div>
      </InfiniteScroll>,
    );

    const sentinel = screen.getByTestId('ros-sentinel');
    io.triggerIntersection(sentinel, false);

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  // --- Loader / endMessage / errorMessage rendering ---

  it('shows loader when isLoading=true and hasMore=true', () => {
    render(
      <InfiniteScroll
        onLoadMore={vi.fn()}
        hasMore={true}
        isLoading={true}
        loader={<div>Loading...</div>}
      >
        <div>Content</div>
      </InfiniteScroll>,
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('does NOT show loader when isLoading=false', () => {
    render(
      <InfiniteScroll
        onLoadMore={vi.fn()}
        hasMore={true}
        isLoading={false}
        loader={<div>Loading...</div>}
      >
        <div>Content</div>
      </InfiniteScroll>,
    );

    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('does NOT show loader when hasMore=false even if isLoading=true', () => {
    render(
      <InfiniteScroll
        onLoadMore={vi.fn()}
        hasMore={false}
        isLoading={true}
        loader={<div>Loading...</div>}
      >
        <div>Content</div>
      </InfiniteScroll>,
    );

    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('shows endMessage when hasMore=false', () => {
    render(
      <InfiniteScroll
        onLoadMore={vi.fn()}
        hasMore={false}
        isLoading={false}
        endMessage={<div>No more items</div>}
      >
        <div>Content</div>
      </InfiniteScroll>,
    );

    expect(screen.getByText('No more items')).toBeInTheDocument();
  });

  it('does NOT show endMessage when hasMore=true', () => {
    render(
      <InfiniteScroll
        onLoadMore={vi.fn()}
        hasMore={true}
        isLoading={false}
        endMessage={<div>No more items</div>}
      >
        <div>Content</div>
      </InfiniteScroll>,
    );

    expect(screen.queryByText('No more items')).not.toBeInTheDocument();
  });

  // --- Element ordering (direction=bottom) ---

  it('places sentinel AFTER children for direction=bottom', () => {
    render(
      <InfiniteScroll
        onLoadMore={vi.fn()}
        hasMore={true}
        isLoading={false}
        direction="bottom"
      >
        <div data-testid="content">Content</div>
      </InfiniteScroll>,
    );

    const parent = screen.getByTestId('content').parentElement!;
    const children = Array.from(parent.children);
    const contentIdx = children.indexOf(screen.getByTestId('content'));
    const sentinelIdx = children.indexOf(
      screen.getByTestId('ros-sentinel'),
    );

    expect(contentIdx).toBeLessThan(sentinelIdx);
  });

  it('orders children > sentinel > loader for direction=bottom when loading', () => {
    render(
      <InfiniteScroll
        onLoadMore={vi.fn()}
        hasMore={true}
        isLoading={true}
        loader={<div data-testid="loader">Loading</div>}
        direction="bottom"
      >
        <div data-testid="content">Content</div>
      </InfiniteScroll>,
    );

    const parent = screen.getByTestId('content').parentElement!;
    const children = Array.from(parent.children);
    const contentIdx = children.indexOf(screen.getByTestId('content'));
    const sentinelIdx = children.indexOf(
      screen.getByTestId('ros-sentinel'),
    );
    const loaderIdx = children.indexOf(screen.getByTestId('loader'));

    expect(contentIdx).toBeLessThan(sentinelIdx);
    expect(sentinelIdx).toBeLessThan(loaderIdx);
  });

  it('orders children > endMessage for direction=bottom when done', () => {
    render(
      <InfiniteScroll
        onLoadMore={vi.fn()}
        hasMore={false}
        isLoading={false}
        endMessage={<div data-testid="end">Done</div>}
        direction="bottom"
      >
        <div data-testid="content">Content</div>
      </InfiniteScroll>,
    );

    const parent = screen.getByTestId('content').parentElement!;
    const children = Array.from(parent.children);
    const contentIdx = children.indexOf(screen.getByTestId('content'));
    const endIdx = children.indexOf(screen.getByTestId('end'));

    expect(contentIdx).toBeLessThan(endIdx);
  });

  // --- Element ordering (direction=top) ---

  it('places sentinel BEFORE children for direction=top', () => {
    render(
      <InfiniteScroll
        onLoadMore={vi.fn()}
        hasMore={true}
        isLoading={false}
        direction="top"
      >
        <div data-testid="content">Content</div>
      </InfiniteScroll>,
    );

    const parent = screen.getByTestId('content').parentElement!;
    const children = Array.from(parent.children);
    const sentinelIdx = children.indexOf(
      screen.getByTestId('ros-sentinel'),
    );
    const contentIdx = children.indexOf(screen.getByTestId('content'));

    expect(sentinelIdx).toBeLessThan(contentIdx);
  });

  it('orders loader > sentinel > children for direction=top when loading', () => {
    render(
      <InfiniteScroll
        onLoadMore={vi.fn()}
        hasMore={true}
        isLoading={true}
        loader={<div data-testid="loader">Loading</div>}
        direction="top"
      >
        <div data-testid="content">Content</div>
      </InfiniteScroll>,
    );

    const parent = screen.getByTestId('content').parentElement!;
    const children = Array.from(parent.children);
    const loaderIdx = children.indexOf(screen.getByTestId('loader'));
    const sentinelIdx = children.indexOf(
      screen.getByTestId('ros-sentinel'),
    );
    const contentIdx = children.indexOf(screen.getByTestId('content'));

    expect(loaderIdx).toBeLessThan(sentinelIdx);
    expect(sentinelIdx).toBeLessThan(contentIdx);
  });

  it('orders endMessage > children for direction=top when done', () => {
    render(
      <InfiniteScroll
        onLoadMore={vi.fn()}
        hasMore={false}
        isLoading={false}
        endMessage={<div data-testid="end">Done</div>}
        direction="top"
      >
        <div data-testid="content">Content</div>
      </InfiniteScroll>,
    );

    const parent = screen.getByTestId('content').parentElement!;
    const children = Array.from(parent.children);
    const endIdx = children.indexOf(screen.getByTestId('end'));
    const contentIdx = children.indexOf(screen.getByTestId('content'));

    expect(endIdx).toBeLessThan(contentIdx);
  });

  // --- Observer root (viewport by default) ---

  it('uses viewport (root=null) when no scrollableTarget is provided', () => {
    render(
      <InfiniteScroll
        onLoadMore={vi.fn()}
        hasMore={true}
        isLoading={false}
      >
        <div>Content</div>
      </InfiniteScroll>,
    );

    const constructor = io.getConstructor();
    expect(constructor).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ root: null }),
    );
  });

  it('resolves scrollableTarget to root element', () => {
    const container = document.createElement('div');
    container.id = 'scroll-container';
    document.body.appendChild(container);

    render(
      <InfiniteScroll
        onLoadMore={vi.fn()}
        hasMore={true}
        isLoading={false}
        scrollableTarget="#scroll-container"
      >
        <div>Content</div>
      </InfiniteScroll>,
    );

    const constructor = io.getConstructor();
    expect(constructor).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ root: container }),
    );

    document.body.removeChild(container);
  });

  // --- Duplicate load prevention ---

  it('does NOT observe sentinel when isLoading=true (prevents duplicate calls)', () => {
    render(
      <InfiniteScroll
        onLoadMore={vi.fn()}
        hasMore={true}
        isLoading={true}
      >
        <div>Content</div>
      </InfiniteScroll>,
    );

    const sentinel = screen.getByTestId('ros-sentinel');
    const observer = io.getObserverForElement(sentinel);

    // Sentinel should NOT be observed because enabled=false when isLoading
    expect(observer).toBeUndefined();
  });

  it('re-enables observation when isLoading transitions from true to false', () => {
    const onLoadMore = vi.fn();

    const { rerender } = render(
      <InfiniteScroll
        onLoadMore={onLoadMore}
        hasMore={true}
        isLoading={true}
      >
        <div>Content</div>
      </InfiniteScroll>,
    );

    const sentinel = screen.getByTestId('ros-sentinel');

    // Not observed while loading
    expect(io.getObserverForElement(sentinel)).toBeUndefined();

    // Finish loading
    rerender(
      <InfiniteScroll
        onLoadMore={onLoadMore}
        hasMore={true}
        isLoading={false}
      >
        <div>Content</div>
      </InfiniteScroll>,
    );

    // Now sentinel should be observed
    expect(io.getObserverForElement(sentinel)).toBeDefined();
  });

  // --- Wrapper customization ---

  it('exposes ref via forwardRef', () => {
    const ref = createRef<HTMLElement>();

    render(
      <InfiniteScroll
        ref={ref}
        onLoadMore={vi.fn()}
        hasMore={true}
        isLoading={false}
      >
        <div>Content</div>
      </InfiniteScroll>,
    );

    expect(ref.current).toBeInstanceOf(HTMLElement);
  });

  it('renders custom wrapper element via "as" prop', () => {
    render(
      <InfiniteScroll
        onLoadMore={vi.fn()}
        hasMore={true}
        isLoading={false}
        as="section"
      >
        <div>Content</div>
      </InfiniteScroll>,
    );

    const content = screen.getByText('Content');
    expect(content.parentElement?.tagName).toBe('SECTION');
  });

  it('passes className and style to wrapper', () => {
    render(
      <InfiniteScroll
        onLoadMore={vi.fn()}
        hasMore={true}
        isLoading={false}
        className="custom-class"
        style={{ color: 'red' }}
      >
        <div>Content</div>
      </InfiniteScroll>,
    );

    const wrapper = screen.getByText('Content').parentElement!;
    expect(wrapper).toHaveClass('custom-class');
    expect(wrapper).toHaveStyle({ color: 'rgb(255, 0, 0)' });
  });
});
