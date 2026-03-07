import { type ElementType, forwardRef, useCallback } from 'react';

import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { useResolvedRoot } from '../hooks/useResolvedRoot';
import type { InfiniteScrollProps } from '../types';
import { Sentinel } from './Sentinel';

/**
 * Single-direction infinite scroll component powered by IntersectionObserver.
 *
 * Element order for direction="bottom": children > sentinel > loader > endMessage
 * Element order for direction="top": endMessage > loader > sentinel > children
 *
 * The sentinel is placed at the END of the scroll direction so it only becomes
 * visible when the user has scrolled through all current content. This prevents
 * the observer from firing immediately on mount and loading all pages at once.
 *
 * When no scrollableTarget is provided, the observer root is null (viewport),
 * which is the correct default for window-level scrolling.
 *
 * @example
 * ```tsx
 * <InfiniteScroll
 *   onLoadMore={fetchNextPage}
 *   hasMore={hasNextPage}
 *   isLoading={isFetching}
 *   loader={<Spinner />}
 *   endMessage={<p>No more items</p>}
 * >
 *   {items.map(item => <Item key={item.id} {...item} />)}
 * </InfiniteScroll>
 * ```
 */
export const InfiniteScroll = forwardRef<HTMLElement, InfiniteScrollProps>(
  (
    {
      children,
      onLoadMore,
      hasMore,
      isLoading,
      loader,
      endMessage,
      scrollableTarget,
      rootMargin = '0px',
      threshold = 0,
      direction = 'bottom',
      className,
      style,
      as,
    },
    ref,
  ) => {
    const root = useResolvedRoot(scrollableTarget);

    const handleIntersect = useCallback(() => {
      if (!isLoading && hasMore) {
        onLoadMore();
      }
    }, [isLoading, hasMore, onLoadMore]);

    const sentinelRef = useIntersectionObserver({
      onIntersect: handleIntersect,
      root: root ?? null,
      rootMargin,
      threshold,
      enabled: hasMore && !isLoading,
    });

    const Component: ElementType = as || 'div';

    const sentinel = hasMore ? <Sentinel ref={sentinelRef} /> : null;
    const loaderContent = isLoading && hasMore ? loader : null;
    const endContent = !hasMore ? endMessage : null;

    if (direction === 'top') {
      return (
        <Component ref={ref} className={className} style={style}>
          {endContent}
          {loaderContent}
          {sentinel}
          {children}
        </Component>
      );
    }

    // Bottom (default): children > sentinel > loader > endMessage
    return (
      <Component ref={ref} className={className} style={style}>
        {children}
        {sentinel}
        {loaderContent}
        {endContent}
      </Component>
    );
  },
);
