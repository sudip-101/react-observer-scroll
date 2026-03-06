import { forwardRef, useCallback, type ElementType } from 'react';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { useResolvedRoot } from '../hooks/useResolvedRoot';
import { Sentinel } from './Sentinel';
import type { InfiniteScrollProps } from '../types';

/**
 * Single-direction infinite scroll component powered by IntersectionObserver.
 *
 * Element order for direction="bottom": loader | sentinel > children > endMessage
 * Element order for direction="top": endMessage > children > sentinel | loader
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
  function InfiniteScroll(
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
  ) {
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
      // Reverse order: endMessage > children > sentinel | loader
      return (
        <Component ref={ref} className={className} style={style}>
          {endContent}
          {children}
          {sentinel}
          {loaderContent}
        </Component>
      );
    }

    // Bottom (default): loader | sentinel > children > endMessage
    return (
      <Component ref={ref} className={className} style={style}>
        {loaderContent}
        {sentinel}
        {children}
        {endContent}
      </Component>
    );
  },
);
