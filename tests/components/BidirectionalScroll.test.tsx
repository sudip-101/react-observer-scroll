import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import { BidirectionalScroll } from '../../src/components/BidirectionalScroll';
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

    expect(screen.getByTestId('ros-bidirectional-container')).toBeInTheDocument();
    expect(screen.getByText('Message 1')).toBeInTheDocument();
  });

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

  it('falls back to loader prop when nextLoader/previousLoader not provided', () => {
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

    // Default loader should appear twice (top and bottom)
    const loaders = screen.getAllByText('Default loader');
    expect(loaders).toHaveLength(2);
  });

  it('prefers specific loader over default loader', () => {
    render(
      <BidirectionalScroll
        dataLength={5}
        onLoadNext={vi.fn()}
        hasNext={true}
        isLoadingNext={true}
        onLoadPrevious={vi.fn()}
        hasPrevious={true}
        isLoadingPrevious={true}
        loader={<span>Default</span>}
        nextLoader={<span>Next specific</span>}
        previousLoader={<span>Prev specific</span>}
      >
        <div>Content</div>
      </BidirectionalScroll>,
    );

    expect(screen.getByText('Next specific')).toBeInTheDocument();
    expect(screen.getByText('Prev specific')).toBeInTheDocument();
    expect(screen.queryByText('Default')).not.toBeInTheDocument();
  });

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

    // Mock scroll geometry
    Object.defineProperty(container, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(container, 'scrollTop', { value: 200, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 400, configurable: true });

    fireEvent.scroll(container);

    expect(onScrollIndicator).toHaveBeenCalledTimes(1);
    expect(onScrollIndicator).toHaveBeenCalledWith({
      scrolledFromStart: 200,
      scrolledFromEnd: 400, // 1000 - 200 - 400
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
    // onScroll should not be set
    expect(container.onscroll).toBeNull();
  });
});
