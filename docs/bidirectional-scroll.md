# BidirectionalScroll — Implementation Reference

## Overview

`BidirectionalScroll` is a dual-direction scroll component for chat interfaces and timelines. It loads content in both directions (older items above, newer items below) using two IntersectionObserver sentinels and preserves scroll position when content is prepended.

**Location:** `lib/components/BidirectionalScroll.tsx`

## Architecture

### Component Hierarchy

```
BidirectionalScroll (forwardRef)
  ├── useScrollPreservation()       — captures/restores scrollTop on prepend
  ├── useIntersectionObserver() x2  — top sentinel + bottom sentinel
  └── Sentinel x2                   — one at top, one at bottom of children
```

### Internal Hooks

| Hook | Purpose | Source |
|------|---------|--------|
| `useIntersectionObserver` | Creates observer, returns callback ref. Two instances: one per sentinel. | `lib/hooks/useIntersectionObserver.ts` |
| `useScrollPreservation` | Captures `scrollHeight`/`scrollTop` before prepend, restores after DOM update. | `lib/hooks/useScrollPreservation.ts` |

## Props

```typescript
interface BidirectionalScrollProps {
  children: ReactNode;
  dataLength: number;                          // Item count — triggers scroll restoration
  onLoadNext: () => void | Promise<void>;      // Bottom sentinel callback
  hasNext: boolean;
  isLoadingNext: boolean;
  onLoadPrevious: () => void | Promise<void>;  // Top sentinel callback
  hasPrevious: boolean;
  isLoadingPrevious: boolean;
  loader?: ReactNode;                          // Default loader (fallback for both)
  nextLoader?: ReactNode;                      // Overrides loader for bottom
  previousLoader?: ReactNode;                  // Overrides loader for top
  onScrollIndicator?: (info: ScrollIndicatorInfo) => void;
  rootMargin?: string;                         // Default: "0px"
  threshold?: number | number[];               // Default: 0
  className?: string;
  style?: CSSProperties;                       // Merged with { height: '100%', overflowY: 'auto' }
  as?: ElementType;                            // Default: 'div'
}

interface ScrollIndicatorInfo {
  scrolledFromStart: number;                   // scrollTop (pixels from top)
  scrolledFromEnd: number;                     // scrollHeight - scrollTop - clientHeight
}
```

The component accepts a `ref` via `forwardRef` that exposes the scroll container element (useful for programmatic scrolling like "scroll to bottom").

## Element Ordering

```
previousLoader (when isLoadingPrevious)
topSentinel    (when hasPrevious)
children
bottomSentinel (when hasNext)
nextLoader     (when isLoadingNext && !isLoadingPrevious)
```

## Core Patterns

### 1. Dual-Ref Container Pattern

The scroll container needs to serve two purposes simultaneously:
- **Mutable ref** for `useScrollPreservation` (needs direct `.scrollTop`/`.scrollHeight` access)
- **State value** for observer root (needs to trigger re-render so observers use the container as `root`)

```typescript
const containerRef = useRef<HTMLElement>(null);
const [rootElement, setRootElement] = useState<HTMLElement | null>(null);

const containerCallbackRef = useCallback((node: HTMLElement | null) => {
  (containerRef as React.RefObject<HTMLElement | null>).current = node;
  setRootElement(node);  // triggers re-render → observers enabled
}, []);

useImperativeHandle(ref, () => containerRef.current as HTMLElement, []);
```

**Why both?** Observers need `root` as a dependency (recreated when root changes). If we only used a `useRef`, the observer wouldn't know when the container mounts. The state update triggers a re-render where `rootElement !== null` enables the observers.

### 2. Mutual Exclusion

Only one direction can load at a time. Without this, on initial mount with an empty or short container, both sentinels are visible and both fire simultaneously.

```typescript
const isLoadingAny = isLoadingPrevious || isLoadingNext;

// Top sentinel
enabled: hasPrevious && !isLoadingAny && rootElement !== null

// Bottom sentinel
enabled: hasNext && !isLoadingAny && rootElement !== null
```

**Render guard** prevents both loaders from appearing:
```tsx
{isLoadingPrevious && resolvedPreviousLoader}
{isLoadingNext && !isLoadingPrevious && resolvedNextLoader}
```

### 3. Loader Fallback Chain

```typescript
const resolvedPreviousLoader = previousLoader ?? loader;
const resolvedNextLoader = nextLoader ?? loader;
```

Consumers can pass a single `loader` for both directions, or override per-direction with `previousLoader`/`nextLoader`.

### 4. Scroll Indicator

`onScrollIndicator` provides scroll distances without the consumer needing to attach their own scroll listener:

```typescript
const handleScroll = useCallback((e: UIEvent<HTMLElement>) => {
  if (!onScrollIndicator) return;
  const target = e.currentTarget;
  onScrollIndicator({
    scrolledFromStart: target.scrollTop,
    scrolledFromEnd: target.scrollHeight - target.scrollTop - target.clientHeight,
  });
}, [onScrollIndicator]);

// Only attached when callback is provided (optimization)
onScroll={onScrollIndicator ? handleScroll : undefined}
```

## Scroll Preservation (useScrollPreservation)

**The problem:** When content is prepended to the top of a scrollable container, the browser inserts new DOM nodes and pushes existing content downward. The user visually loses their scroll position.

**The fix:** Two coordinated `useLayoutEffect` hooks:

```
Step 1: isLoadingPrevious becomes true
  → Capture scrollHeight and scrollTop
  → Set isPrependingRef = true

Step 2: dataLength changes (new items in DOM)
  → If isPrependingRef is true:
    → heightDifference = newScrollHeight - previousScrollHeight
    → scrollTop = previousScrollTop + heightDifference
    → isPrependingRef = false
```

**Why `useLayoutEffect`?** It runs synchronously after DOM mutation but before the browser paints. Using `useEffect` would cause a visible flash where the scroll position jumps.

```typescript
// lib/hooks/useScrollPreservation.ts
export const useScrollPreservation = (
  containerRef: RefObject<HTMLElement | null>,
  dataLength: number,
  isLoadingPrevious: boolean,
): void => {
  const prevScrollHeightRef = useRef(0);
  const prevScrollTopRef = useRef(0);
  const isPrependingRef = useRef(false);

  useLayoutEffect(() => {
    if (isLoadingPrevious && containerRef.current) {
      isPrependingRef.current = true;
      prevScrollHeightRef.current = containerRef.current.scrollHeight;
      prevScrollTopRef.current = containerRef.current.scrollTop;
    }
  }, [isLoadingPrevious, containerRef]);

  useLayoutEffect(() => {
    if (isPrependingRef.current && containerRef.current) {
      const container = containerRef.current;
      const heightDifference = container.scrollHeight - prevScrollHeightRef.current;
      container.scrollTop = prevScrollTopRef.current + heightDifference;
      isPrependingRef.current = false;
    }
  }, [dataLength, containerRef]);
};
```

## Chat Pattern: Scroll to Bottom on Initial Load (Critical)

When using `BidirectionalScroll` for a chat interface, the container starts at `scrollTop=0` after initial data loads. This means the **top sentinel is immediately visible**, causing `onLoadPrevious` to fire right away — producing flicker and unwanted jumps.

**Fix:** Scroll to bottom in a `useLayoutEffect` before observers activate:

```tsx
const containerRef = useRef<HTMLElement>(null);
const hasScrolledInitial = useRef(false);

// Scroll to bottom BEFORE observers are created (useLayoutEffect runs before useEffect)
useLayoutEffect(() => {
  if (!isInitialLoading && containerRef.current && !hasScrolledInitial.current) {
    hasScrolledInitial.current = true;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }
}, [isInitialLoading]);
```

**Timing:** The parent's `useLayoutEffect` runs after child effects (`useImperativeHandle` sets the ref) but before `useEffect` (where observers are created). So the scroll position is already at the bottom by the time sentinels are observed.

## Complete Usage Example

```tsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BidirectionalScroll } from 'react-observer-scroll';
import type { ScrollIndicatorInfo } from 'react-observer-scroll';

const Chat = () => {
  const {
    messages, isLoadingNext, isLoadingPrevious, isInitialLoading,
    hasNext, hasPrevious, loadInitial, loadNext, loadPrevious,
  } = useMessages();

  const containerRef = useRef<HTMLElement>(null);
  const hasScrolledInitial = useRef(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  // Scroll to bottom on initial load — prevents top sentinel auto-fire
  useLayoutEffect(() => {
    if (!isInitialLoading && containerRef.current && !hasScrolledInitial.current) {
      hasScrolledInitial.current = true;
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [isInitialLoading]);

  const handleScrollIndicator = (info: ScrollIndicatorInfo) => {
    setShowScrollDown(info.scrolledFromEnd > 200);
  };

  if (isInitialLoading) return <SkeletonLoader />;

  return (
    <div style={{ position: 'relative' }}>
      <BidirectionalScroll
        ref={containerRef}
        dataLength={messages.length}
        onLoadNext={loadNext}
        hasNext={hasNext}
        isLoadingNext={isLoadingNext}
        onLoadPrevious={loadPrevious}
        hasPrevious={hasPrevious}
        isLoadingPrevious={isLoadingPrevious}
        loader={<MessageSkeleton />}
        onScrollIndicator={handleScrollIndicator}
        style={{ height: '500px' }}
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </BidirectionalScroll>

      {showScrollDown && (
        <button onClick={() => containerRef.current?.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: 'smooth',
        })}>
          Scroll to bottom
        </button>
      )}
    </div>
  );
};
```

## Consumer State Management Pattern

The consumer hook should follow these rules:

1. **Start `hasNext`/`hasPrevious` as `false`** — sentinels must not fire before initial data populates the container
2. **Enable directions only after initial data loads** — prevents sentinel auto-fire on empty container
3. **Use `useRef` for pagination offsets** — keeps callback identities stable (no re-renders on skip changes)
4. **Set loading state synchronously before async operations** — ensures `enabled` prop disables the sentinel immediately

```typescript
const useMessages = () => {
  const [hasNext, setHasNext] = useState(false);       // Start false
  const [hasPrevious, setHasPrevious] = useState(false); // Start false

  const loadInitial = useCallback(async () => {
    const data = await fetchComments(INITIAL_SKIP, PAGE_SIZE);
    setMessages(data.comments);
    setHasNext(INITIAL_SKIP + PAGE_SIZE < data.total);  // Enable after data
    setHasPrevious(INITIAL_SKIP > 0);                   // Enable after data
  }, []);

  // ...
};
```

## Key Design Decisions

1. **Container is the observer root**: Both sentinels observe intersections within the scroll container (not the viewport). This requires the container element as `root`, hence the dual-ref pattern.

2. **Mutual exclusion over concurrent loading**: Allowing both directions to load simultaneously causes race conditions with scroll preservation and visual chaos with dual loaders. One direction at a time is simpler and more predictable.

3. **`dataLength` prop over internal tracking**: The component cannot know when the consumer's data changes. `dataLength` is a simple, explicit signal that triggers scroll restoration when it changes.

4. **No auto-scroll-to-bottom**: The library doesn't assume the usage context (could be a timeline, not a chat). Scrolling to bottom on mount is the consumer's responsibility.

## Testing

18 unit tests in `tests/components/BidirectionalScroll.test.tsx` + 4 integration tests in `tests/integration/bidirectional-scroll.integration.test.tsx` + 2 tests for `useScrollPreservation` in `tests/hooks/useScrollPreservation.test.ts`.

Tests verify:
- Top/bottom sentinel trigger correct callbacks
- Loading state prevents sentinel triggers
- Mutual exclusion: loading one direction disables the other sentinel
- Never shows both loaders simultaneously (previous takes priority)
- Loader fallback chain: `nextLoader/previousLoader` override `loader`
- `forwardRef` exposes container element
- `onScrollIndicator` fires with correct distances
- Scroll preservation math: `scrollTop = oldScrollTop + (newHeight - oldHeight)`
- No scroll adjustment when not prepending
- Scroll-to-bottom on mount prevents auto-trigger of top sentinel (integration)
- Sequential bidirectional loading (integration)
