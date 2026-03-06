import { ReactNode, CSSProperties, ElementType } from 'react';

export type ScrollDirection = 'top' | 'bottom';

export interface InfiniteScrollProps {
  /** The scrollable content (typically mapped list items) */
  children: ReactNode;

  /**
   * Called when the sentinel enters the viewport and more data should be loaded.
   * The consumer should set isLoading=true before the async operation.
   */
  onLoadMore: () => void | Promise<void>;

  /** Whether more data is available. When false, sentinel is removed and endMessage shown. */
  hasMore: boolean;

  /** Whether a load operation is in progress. Prevents duplicate calls to onLoadMore. */
  isLoading: boolean;

  /** Shown while isLoading is true and hasMore is true */
  loader?: ReactNode;

  /** Shown when hasMore is false */
  endMessage?: ReactNode;

  /**
   * CSS selector string for the scrollable ancestor to use as the observer root.
   * If omitted, the browser viewport is used.
   */
  scrollableTarget?: string;

  /**
   * Margin around the root, following CSS margin syntax (e.g., "200px 0px").
   * Use positive values to trigger loading before the sentinel is visible.
   * @default "0px"
   */
  rootMargin?: string;

  /**
   * Visibility ratio(s) at which to trigger. 0 = any pixel visible, 1 = fully visible.
   * @default 0
   */
  threshold?: number | number[];

  /**
   * Direction of content growth.
   * 'bottom' = new items appended below (default feed behavior)
   * 'top' = new items prepended above (reverse chronological)
   * @default 'bottom'
   */
  direction?: ScrollDirection;

  /** Additional CSS class for the wrapper element */
  className?: string;

  /** Inline styles for the wrapper element */
  style?: CSSProperties;

  /**
   * The HTML element type for the wrapper.
   * @default 'div'
   */
  as?: ElementType;
}

export interface ScrollIndicatorInfo {
  /** Distance in pixels from the top/start of the scrollable area */
  scrolledFromStart: number;
  /** Distance in pixels from the bottom/end of the scrollable area */
  scrolledFromEnd: number;
}

export interface BidirectionalScrollProps {
  /** The scrollable content */
  children: ReactNode;

  /**
   * Total number of currently rendered items.
   * Used by scroll preservation to detect when new items have been added.
   */
  dataLength: number;

  /** Called when the bottom sentinel enters the viewport */
  onLoadNext: () => void | Promise<void>;

  /** Whether more data is available at the bottom */
  hasNext: boolean;

  /** Whether bottom loading is in progress */
  isLoadingNext: boolean;

  /** Called when the top sentinel enters the viewport */
  onLoadPrevious: () => void | Promise<void>;

  /** Whether more data is available at the top */
  hasPrevious: boolean;

  /** Whether top loading is in progress */
  isLoadingPrevious: boolean;

  /**
   * Default loader shown for both directions.
   * Overridden by nextLoader/previousLoader when provided.
   */
  loader?: ReactNode;

  /** Shown while isLoadingNext is true. Falls back to `loader` if not provided. */
  nextLoader?: ReactNode;

  /** Shown while isLoadingPrevious is true. Falls back to `loader` if not provided. */
  previousLoader?: ReactNode;

  /**
   * Called on scroll with distances from start and end of the scrollable area.
   * Use this to show/hide scroll indicators (e.g., "scroll to bottom" button).
   */
  onScrollIndicator?: (info: ScrollIndicatorInfo) => void;

  /** @default "0px" */
  rootMargin?: string;

  /** @default 0 */
  threshold?: number | number[];

  /** Additional CSS class for the scroll container */
  className?: string;

  /** Inline styles merged onto the scroll container */
  style?: CSSProperties;

  /**
   * The HTML element type for the container.
   * @default 'div'
   */
  as?: ElementType;
}

export interface UseIntersectionObserverOptions {
  /**
   * IntersectionObserver threshold(s).
   * @default 0
   */
  threshold?: number | number[];

  /**
   * Margin around the root element.
   * @default "0px"
   */
  rootMargin?: string;

  /**
   * The root element for intersection. null = viewport.
   * @default null
   */
  root?: Element | null;

  /**
   * When false, the observer is disconnected and no callbacks fire.
   * Use this to pause observation (e.g., while loading).
   * @default true
   */
  enabled?: boolean;

  /**
   * Called when the observed element intersects with the root
   * according to the configured threshold.
   */
  onIntersect: (entry: IntersectionObserverEntry) => void;
}
