import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import { BidirectionalScroll } from '../../lib/components/BidirectionalScroll';
import { mockIntersectionObserver } from '../helpers/mock-intersection-observer';

describe('BidirectionalScroll', () => {
  let io: ReturnType<typeof mockIntersectionObserver>;

  beforeEach(() => {
    io = mockIntersectionObserver();
  });

  afterEach(() => {
    io.reset();
    vi.restoreAllMocks();
  });

  // --- Basic rendering ---

  it('renders children inside a scrollable container', () => {
    render(
      <BidirectionalScroll
        dataLength={5}
        onLoadNext={vi.fn()}
        hasNext={true}
        isLoadingNext={false}
        onLoadPrevious={vi.fn()}
        hasPrevious={true}
        isLoadingPrevious={false}
      >
        <div>Message 1</div>
      </BidirectionalScroll>,
    );

    expect(
      screen.getByTestId('ros-bidirectional-container'),
    ).toBeInTheDocument();
    expect(screen.getByText('Message 1')).toBeInTheDocument();
  });

  // --- Sentinel intersection triggers ---

  it('calls onLoadNext when bottom sentinel intersects', () => {
    const onLoadNext = vi.fn();

    render(
      <BidirectionalScroll
        dataLength={5}
        onLoadNext={onLoadNext}
        hasNext={true}
        isLoadingNext={false}
        onLoadPrevious={vi.fn()}
        hasPrevious={false}
        isLoadingPrevious={false}
      >
        <div>Content</div>
      </BidirectionalScroll>,
    );

    const sentinels = screen.getAllByTestId('ros-sentinel');
    io.triggerIntersection(sentinels[0]!, true);

    expect(onLoadNext).toHaveBeenCalledTimes(1);
  });

  it('calls onLoadPrevious when top sentinel intersects', () => {
    const onLoadPrevious = vi.fn();

    render(
      <BidirectionalScroll
        dataLength={5}
        onLoadNext={vi.fn()}
        hasNext={false}
        isLoadingNext={false}
        onLoadPrevious={onLoadPrevious}
        hasPrevious={true}
        isLoadingPrevious={false}
      >
        <div>Content</div>
      </BidirectionalScroll>,
    );

    const sentinels = screen.getAllByTestId('ros-sentinel');
    io.triggerIntersection(sentinels[0]!, true);

    expect(onLoadPrevious).toHaveBeenCalledTimes(1);
  });

  // --- Loading state prevents triggers ---

  it('does not call onLoadNext when isLoadingNext=true', () => {
    const onLoadNext = vi.fn();

    render(
      <BidirectionalScroll
        dataLength={5}
        onLoadNext={onLoadNext}
        hasNext={true}
        isLoadingNext={true}
        onLoadPrevious={vi.fn()}
        hasPrevious={false}
        isLoadingPrevious={false}
      >
        <div>Content</div>
      </BidirectionalScroll>,
    );

    expect(onLoadNext).not.toHaveBeenCalled();
  });

  it('does not call onLoadPrevious when isLoadingPrevious=true', () => {
    const onLoadPrevious = vi.fn();

    render(
      <BidirectionalScroll
        dataLength={5}
        onLoadNext={vi.fn()}
        hasNext={false}
        isLoadingNext={false}
        onLoadPrevious={onLoadPrevious}
        hasPrevious={true}
        isLoadingPrevious={true}
      >
        <div>Content</div>
      </BidirectionalScroll>,
    );

    expect(onLoadPrevious).not.toHaveBeenCalled();
  });

  // --- Mutual exclusion: only one direction loads at a time ---

  it('disables bottom sentinel when isLoadingPrevious=true (mutual exclusion)', () => {
    const onLoadNext = vi.fn();

    render(
      <BidirectionalScroll
        dataLength={5}
        onLoadNext={onLoadNext}
        hasNext={true}
        isLoadingNext={false}
        onLoadPrevious={vi.fn()}
        hasPrevious={true}
        isLoadingPrevious={true}
      >
        <div>Content</div>
      </BidirectionalScroll>,
    );

    // Bottom sentinel should exist but NOT be observed
    const sentinels = screen.getAllByTestId('ros-sentinel');
    const bottomSentinel = sentinels[sentinels.length - 1]!;
    expect(io.getObserverForElement(bottomSentinel)).toBeUndefined();
  });

  it('disables top sentinel when isLoadingNext=true (mutual exclusion)', () => {
    const onLoadPrevious = vi.fn();

    render(
      <BidirectionalScroll
        dataLength={5}
        onLoadNext={vi.fn()}
        hasNext={true}
        isLoadingNext={true}
        onLoadPrevious={onLoadPrevious}
        hasPrevious={true}
        isLoadingPrevious={false}
      >
        <div>Content</div>
      </BidirectionalScroll>,
    );

    // Top sentinel should exist but NOT be observed
    const sentinels = screen.getAllByTestId('ros-sentinel');
    const topSentinel = sentinels[0]!;
    expect(io.getObserverForElement(topSentinel)).toBeUndefined();
  });

  it('never shows both loaders simultaneously', () => {
    // Even if consumer somehow passes both loading=true,
    // the component only renders one loader (previous takes priority)
    render(
      <BidirectionalScroll
        dataLength={5}
        onLoadNext={vi.fn()}
        hasNext={true}
        isLoadingNext={true}
        onLoadPrevious={vi.fn()}
        hasPrevious={true}
        isLoadingPrevious={true}
        previousLoader={<span>Loading previous...</span>}
        nextLoader={<span>Loading next...</span>}
      >
        <div>Content</div>
      </BidirectionalScroll>,
    );

    // Previous loader wins when both are true
    expect(screen.getByText('Loading previous...')).toBeInTheDocument();
    expect(screen.queryByText('Loading next...')).not.toBeInTheDocument();
  });

  it('never shows both default loaders simultaneously', () => {
    render(
      <BidirectionalScroll
        dataLength={5}
        onLoadNext={vi.fn()}
        hasNext={true}
        isLoadingNext={true}
        onLoadPrevious={vi.fn()}
        hasPrevious={true}
        isLoadingPrevious={true}
        loader={<span>Default loader</span>}
      >
        <div>Content</div>
      </BidirectionalScroll>,
    );

    // Only one instance of the default loader should appear
    const loaders = screen.getAllByText('Default loader');
    expect(loaders).toHaveLength(1);
  });

  // --- Loader rendering ---

  it('shows nextLoader when isLoadingNext is true', () => {
    render(
      <BidirectionalScroll
        dataLength={5}
        onLoadNext={vi.fn()}
        hasNext={true}
        isLoadingNext={true}
        onLoadPrevious={vi.fn()}
        hasPrevious={false}
        isLoadingPrevious={false}
        nextLoader={<span>Loading next...</span>}
      >
        <div>Content</div>
      </BidirectionalScroll>,
    );

    expect(screen.getByText('Loading next...')).toBeInTheDocument();
  });

  it('shows previousLoader when isLoadingPrevious is true', () => {
    render(
      <BidirectionalScroll
        dataLength={5}
        onLoadNext={vi.fn()}
        hasNext={false}
        isLoadingNext={false}
        onLoadPrevious={vi.fn()}
        hasPrevious={true}
        isLoadingPrevious={true}
        previousLoader={<span>Loading previous...</span>}
      >
        <div>Content</div>
      </BidirectionalScroll>,
    );

    expect(screen.getByText('Loading previous...')).toBeInTheDocument();
  });

  it('falls back to loader prop when nextLoader not provided', () => {
    render(
      <BidirectionalScroll
        dataLength={5}
        onLoadNext={vi.fn()}
        hasNext={true}
        isLoadingNext={true}
        onLoadPrevious={vi.fn()}
        hasPrevious={false}
        isLoadingPrevious={false}
        loader={<span>Default loader</span>}
      >
        <div>Content</div>
      </BidirectionalScroll>,
    );

    expect(screen.getByText('Default loader')).toBeInTheDocument();
  });

  it('falls back to loader prop when previousLoader not provided', () => {
    render(
      <BidirectionalScroll
        dataLength={5}
        onLoadNext={vi.fn()}
        hasNext={false}
        isLoadingNext={false}
        onLoadPrevious={vi.fn()}
        hasPrevious={true}
        isLoadingPrevious={true}
        loader={<span>Default loader</span>}
      >
        <div>Content</div>
      </BidirectionalScroll>,
    );

    expect(screen.getByText('Default loader')).toBeInTheDocument();
  });

  it('prefers specific loader over default loader', () => {
    render(
      <BidirectionalScroll
        dataLength={5}
        onLoadNext={vi.fn()}
        hasNext={true}
        isLoadingNext={true}
        onLoadPrevious={vi.fn()}
        hasPrevious={false}
        isLoadingPrevious={false}
        loader={<span>Default</span>}
        nextLoader={<span>Next specific</span>}
      >
        <div>Content</div>
      </BidirectionalScroll>,
    );

    expect(screen.getByText('Next specific')).toBeInTheDocument();
    expect(screen.queryByText('Default')).not.toBeInTheDocument();
  });

  // --- Ref and wrapper ---

  it('exposes container ref via forwardRef', () => {
    const ref = createRef<HTMLElement>();

    render(
      <BidirectionalScroll
        ref={ref}
        dataLength={5}
        onLoadNext={vi.fn()}
        hasNext={false}
        isLoadingNext={false}
        onLoadPrevious={vi.fn()}
        hasPrevious={false}
        isLoadingPrevious={false}
      >
        <div>Content</div>
      </BidirectionalScroll>,
    );

    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current).toBe(
      screen.getByTestId('ros-bidirectional-container'),
    );
  });

  // --- Scroll indicator ---

  it('calls onScrollIndicator with scroll distances when scrolled', () => {
    const onScrollIndicator = vi.fn();

    render(
      <BidirectionalScroll
        dataLength={5}
        onLoadNext={vi.fn()}
        hasNext={false}
        isLoadingNext={false}
        onLoadPrevious={vi.fn()}
        hasPrevious={false}
        isLoadingPrevious={false}
        onScrollIndicator={onScrollIndicator}
      >
        <div>Content</div>
      </BidirectionalScroll>,
    );

    const container = screen.getByTestId('ros-bidirectional-container');

    Object.defineProperty(container, 'scrollHeight', {
      value: 1000,
      configurable: true,
    });
    Object.defineProperty(container, 'scrollTop', {
      value: 200,
      configurable: true,
    });
    Object.defineProperty(container, 'clientHeight', {
      value: 400,
      configurable: true,
    });

    fireEvent.scroll(container);

    expect(onScrollIndicator).toHaveBeenCalledTimes(1);
    expect(onScrollIndicator).toHaveBeenCalledWith({
      scrolledFromStart: 200,
      scrolledFromEnd: 400,
    });
  });

  it('does not attach scroll listener when onScrollIndicator is not provided', () => {
    render(
      <BidirectionalScroll
        dataLength={5}
        onLoadNext={vi.fn()}
        hasNext={false}
        isLoadingNext={false}
        onLoadPrevious={vi.fn()}
        hasPrevious={false}
        isLoadingPrevious={false}
      >
        <div>Content</div>
      </BidirectionalScroll>,
    );

    const container = screen.getByTestId('ros-bidirectional-container');
    expect(container.onscroll).toBeNull();
  });

  // --- Element ordering ---

  it('orders: previousLoader > topSentinel > children > bottomSentinel > nextLoader', () => {
    render(
      <BidirectionalScroll
        dataLength={5}
        onLoadNext={vi.fn()}
        hasNext={true}
        isLoadingNext={true}
        onLoadPrevious={vi.fn()}
        hasPrevious={false}
        isLoadingPrevious={false}
        nextLoader={<span data-testid="next-loader">Loading next</span>}
      >
        <div data-testid="content">Content</div>
      </BidirectionalScroll>,
    );

    const container = screen.getByTestId('ros-bidirectional-container');
    const children = Array.from(container.children);
    const contentIdx = children.indexOf(screen.getByTestId('content'));
    const sentinelIdx = children.indexOf(
      screen.getByTestId('ros-sentinel'),
    );
    const loaderIdx = children.indexOf(screen.getByTestId('next-loader'));

    // content > sentinel > loader
    expect(contentIdx).toBeLessThan(sentinelIdx);
    expect(sentinelIdx).toBeLessThan(loaderIdx);
  });
});
