import { type RefObject, useLayoutEffect, useRef } from 'react';

/**
 * Preserves scroll position when content is prepended to a scrollable container.
 * Captures scrollHeight/scrollTop before prepend and restores after DOM update.
 *
 * @param containerRef - Ref to the scrollable container element
 * @param dataLength - Current number of items (triggers restoration when changed)
 * @param isLoadingPrevious - Whether a prepend load is in progress
 */
export const useScrollPreservation = (
  containerRef: RefObject<HTMLElement | null>,
  dataLength: number,
  isLoadingPrevious: boolean,
): void => {
  const prevScrollHeightRef = useRef(0);
  const prevScrollTopRef = useRef(0);
  const isPrependingRef = useRef(false);

  // Capture scroll metrics when prepend loading starts
  useLayoutEffect(() => {
    if (isLoadingPrevious && containerRef.current) {
      isPrependingRef.current = true;
      prevScrollHeightRef.current = containerRef.current.scrollHeight;
      prevScrollTopRef.current = containerRef.current.scrollTop;
    }
  }, [isLoadingPrevious, containerRef]);

  // Restore scroll position after new items are in the DOM
  useLayoutEffect(() => {
    if (isPrependingRef.current && containerRef.current) {
      const container = containerRef.current;
      const heightDifference =
        container.scrollHeight - prevScrollHeightRef.current;
      container.scrollTop = prevScrollTopRef.current + heightDifference;
      isPrependingRef.current = false;
    }
  }, [dataLength, containerRef]);
};
