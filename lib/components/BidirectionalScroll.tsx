import {
  type ElementType,
  forwardRef,
  type UIEvent,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { useScrollPreservation } from '../hooks/useScrollPreservation';
import type { BidirectionalScrollProps } from '../types';
import { Sentinel } from './Sentinel';

/**
 * Dual-direction scroll component for chat interfaces and timelines.
 * Loads content in both directions using IntersectionObserver.
 * Preserves scroll position when content is prepended at the top.
 *
 * @example
 * ```tsx
 * <BidirectionalScroll
 *   dataLength={messages.length}
 *   onLoadNext={fetchNewerMessages}
 *   hasNext={hasNewerMessages}
 *   isLoadingNext={isFetchingNewer}
 *   onLoadPrevious={fetchOlderMessages}
 *   hasPrevious={hasOlderMessages}
 *   isLoadingPrevious={isFetchingOlder}
 *   loader={<Spinner />}
 *   onScrollIndicator={({ scrolledFromEnd }) => {
 *     setShowScrollToBottom(scrolledFromEnd > 200);
 *   }}
 *   style={{ height: '500px' }}
 * >
 *   {messages.map(msg => <Message key={msg.id} {...msg} />)}
 * </BidirectionalScroll>
 * ```
 */
export const BidirectionalScroll = forwardRef<
  HTMLElement,
  BidirectionalScrollProps
>(
  (
    {
      children,
      dataLength,
      onLoadNext,
      hasNext,
      isLoadingNext,
      onLoadPrevious,
      hasPrevious,
      isLoadingPrevious,
      loader,
      nextLoader,
      previousLoader,
      onScrollIndicator,
      rootMargin = '0px',
      threshold = 0,
      className,
      style,
      as,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLElement>(null);
    const [rootElement, setRootElement] = useState<HTMLElement | null>(null);

    // Callback ref: sets both the mutable ref (for scroll preservation)
    // and the state (for observer root, which needs to trigger re-render)
    const containerCallbackRef = useCallback((node: HTMLElement | null) => {
      (containerRef as React.RefObject<HTMLElement | null>).current = node;
      setRootElement(node);
    }, []);

    useImperativeHandle(ref, () => containerRef.current as HTMLElement, []);

    useScrollPreservation(containerRef, dataLength, isLoadingPrevious);

    const handleTopIntersect = useCallback(() => {
      if (!isLoadingPrevious && hasPrevious) {
        onLoadPrevious();
      }
    }, [isLoadingPrevious, hasPrevious, onLoadPrevious]);

    const handleBottomIntersect = useCallback(() => {
      if (!isLoadingNext && hasNext) {
        onLoadNext();
      }
    }, [isLoadingNext, hasNext, onLoadNext]);

    // Mutual exclusion: only one direction can load at a time.
    // When one direction is loading, the other sentinel is disabled to prevent
    // both firing simultaneously (e.g., on initial mount with an empty container).
    const isLoadingAny = isLoadingPrevious || isLoadingNext;

    const topSentinelRef = useIntersectionObserver({
      onIntersect: handleTopIntersect,
      root: rootElement,
      rootMargin,
      threshold,
      enabled: hasPrevious && !isLoadingAny && rootElement !== null,
    });

    const bottomSentinelRef = useIntersectionObserver({
      onIntersect: handleBottomIntersect,
      root: rootElement,
      rootMargin,
      threshold,
      enabled: hasNext && !isLoadingAny && rootElement !== null,
    });

    const handleScroll = useCallback(
      (e: UIEvent<HTMLElement>) => {
        if (!onScrollIndicator) return;
        const target = e.currentTarget;
        const scrolledFromStart = target.scrollTop;
        const scrolledFromEnd =
          target.scrollHeight - target.scrollTop - target.clientHeight;
        onScrollIndicator({ scrolledFromStart, scrolledFromEnd });
      },
      [onScrollIndicator],
    );

    const Component: ElementType = as || 'div';
    const resolvedPreviousLoader = previousLoader ?? loader;
    const resolvedNextLoader = nextLoader ?? loader;

    return (
      <Component
        ref={containerCallbackRef}
        className={className}
        style={{ height: '100%', overflowY: 'auto', ...style }}
        onScroll={onScrollIndicator ? handleScroll : undefined}
        data-testid="ros-bidirectional-container"
      >
        {isLoadingPrevious && resolvedPreviousLoader}
        {hasPrevious && <Sentinel ref={topSentinelRef} />}
        {children}
        {hasNext && <Sentinel ref={bottomSentinelRef} />}
        {isLoadingNext && !isLoadingPrevious && resolvedNextLoader}
      </Component>
    );
  },
);
