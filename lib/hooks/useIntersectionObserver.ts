import { useEffect, useRef, useCallback } from 'react';
import { canUseIntersectionObserver } from '../utils/ssr';
import type { UseIntersectionObserverOptions } from '../types';

/**
 * Foundational hook for observing element intersection with a root element or viewport.
 * Returns a callback ref to attach to the target element.
 *
 * @param options - Observer configuration and intersection callback
 * @returns A callback ref setter function for the observed element
 *
 * @example
 * ```tsx
 * const sentinelRef = useIntersectionObserver({
 *   onIntersect: (entry) => {
 *     if (entry.isIntersecting) loadMore();
 *   },
 *   rootMargin: '200px',
 *   enabled: hasMore && !isLoading,
 * });
 * return <div ref={sentinelRef} />;
 * ```
 */
export const useIntersectionObserver = ({
  threshold = 0,
  rootMargin = '0px',
  root = null,
  enabled = true,
  onIntersect,
}: UseIntersectionObserverOptions): ((node: Element | null) => void) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const targetRef = useRef<Element | null>(null);
  const onIntersectRef = useRef(onIntersect);

  // Keep callback fresh without recreating the observer
  useEffect(() => {
    onIntersectRef.current = onIntersect;
  }, [onIntersect]);

  // Serialize threshold for stable dependency comparison
  const thresholdStr = Array.isArray(threshold)
    ? threshold.join(',')
    : String(threshold);

  useEffect(() => {
    if (!canUseIntersectionObserver() || !enabled) {
      observerRef.current?.disconnect();
      observerRef.current = null;
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onIntersectRef.current(entry);
          }
        }
      },
      { root, rootMargin, threshold },
    );

    // If a target is already set (from callback ref), observe it
    if (targetRef.current) {
      observerRef.current.observe(targetRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, root, rootMargin, thresholdStr]);

  // Callback ref: handles DOM node attachment/detachment
  const setTargetRef = useCallback((node: Element | null) => {
    // Unobserve the previous node
    if (targetRef.current && observerRef.current) {
      observerRef.current.unobserve(targetRef.current);
    }

    targetRef.current = node;

    // Observe the new node
    if (node && observerRef.current) {
      observerRef.current.observe(node);
    }
  }, []);

  return setTargetRef;
};
