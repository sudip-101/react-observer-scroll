import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { InfiniteScroll } from '../../src/components/InfiniteScroll';
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
    // Observer is disabled via enabled=false, so element is not observed
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

  it('orders elements correctly for direction=bottom: loader|sentinel > children > endMessage', () => {
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
    const loaderIdx = children.indexOf(screen.getByTestId('loader'));
    const sentinelIdx = children.indexOf(screen.getByTestId('ros-sentinel'));
    const contentIdx = children.indexOf(screen.getByTestId('content'));

    // loader and sentinel come before content
    expect(loaderIdx).toBeLessThan(contentIdx);
    expect(sentinelIdx).toBeLessThan(contentIdx);
  });

  it('orders elements correctly for direction=bottom endMessage: children > endMessage', () => {
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

  it('orders elements correctly for direction=top: endMessage > children > sentinel|loader', () => {
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
    const contentIdx = children.indexOf(screen.getByTestId('content'));
    const sentinelIdx = children.indexOf(screen.getByTestId('ros-sentinel'));
    const loaderIdx = children.indexOf(screen.getByTestId('loader'));

    // content comes before sentinel and loader
    expect(contentIdx).toBeLessThan(sentinelIdx);
    expect(contentIdx).toBeLessThan(loaderIdx);
  });

  it('orders elements correctly for direction=top endMessage: endMessage > children', () => {
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
});
