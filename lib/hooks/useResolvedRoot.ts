import { useCallback, useSyncExternalStore } from 'react';

import { canUseDOM } from '../utils/ssr';

/**
 * Resolves a CSS selector string to a DOM Element for use as IntersectionObserver root.
 * Returns null for viewport (no selector or SSR), or the resolved Element.
 *
 * @param scrollableTarget - CSS selector for the scrollable ancestor
 * @returns The resolved Element or null (viewport)
 */
export const useResolvedRoot = (scrollableTarget?: string): Element | null => {
  const getSnapshot = useCallback(() => {
    if (!canUseDOM || !scrollableTarget) return null;

    const element = document.querySelector(scrollableTarget);

    if (!element) {
      console.warn(
        `[react-observer-scroll] scrollableTarget "${scrollableTarget}" not found in DOM.`,
      );
      return null;
    }

    return element;
  }, [scrollableTarget]);

  const getServerSnapshot = useCallback(() => null, []);

  // subscribe is a no-op since DOM selectors don't change without re-render
  const subscribe = useCallback((_onStoreChange: () => void) => {
    return () => {};
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
