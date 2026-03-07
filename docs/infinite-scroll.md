# InfiniteScroll — Implementation Reference

## Overview

`InfiniteScroll` is a single-direction infinite scroll component powered by the browser's native IntersectionObserver API. It detects when a sentinel element enters the viewport and fires a callback to load more data.

**Location:** `lib/components/InfiniteScroll.tsx`

## Architecture

### Component Hierarchy

```
InfiniteScroll (forwardRef)
  ├── useResolvedRoot()        — resolves CSS selector to Element (SSR-safe)
  ├── useIntersectionObserver() — creates observer, returns callback ref
  └── Sentinel                 — zero-height invisible div, observer target
```

### Internal Hooks

| Hook | Purpose | Source |
|------|---------|--------|
| `useResolvedRoot` | Resolves `scrollableTarget` CSS selector to a DOM Element via `useSyncExternalStore`. Returns `null` for viewport. SSR-safe. | `lib/hooks/useResolvedRoot.ts` |
| `useIntersectionObserver` | Creates/manages an IntersectionObserver. Returns a callback ref. Only fires `onIntersect` when `entry.isIntersecting === true`. | `lib/hooks/useIntersectionObserver.ts` |

### Sentinel Element

An invisible `<div>` (0x0, `visibility: hidden`, `aria-hidden="true"`) placed in the DOM as the observer's target. Unlike `React.cloneElement`, this approach never breaks with components that don't forward refs.

```tsx
// lib/components/Sentinel.tsx
<div
  ref={ref}
  style={{ height: 0, width: 0, visibility: 'hidden', /* ... */ }}
  aria-hidden="true"
  data-testid="ros-sentinel"
/>
```

## Props

```typescript
interface InfiniteScrollProps {
  children: ReactNode;
  onLoadMore: () => void | Promise<void>;
  hasMore: boolean;
  isLoading: boolean;
  loader?: ReactNode;                    // Shown when isLoading && hasMore
  endMessage?: ReactNode;                // Shown when !hasMore
  scrollableTarget?: string;             // CSS selector for observer root (default: viewport)
  rootMargin?: string;                   // Default: "0px"
  threshold?: number | number[];         // Default: 0
  direction?: 'top' | 'bottom';         // Default: 'bottom'
  className?: string;
  style?: CSSProperties;
  as?: ElementType;                      // Default: 'div'
}
```

The component also accepts a `ref` via `forwardRef` that exposes the wrapper element.

## Element Ordering (Critical)

Sentinel placement determines whether the component works correctly or enters an infinite load loop.

**direction="bottom"** (default):
```
children → sentinel → loader → endMessage
```

**direction="top"**:
```
endMessage → loader → sentinel → children
```

The sentinel is always at the **end of the scroll direction** — it only becomes visible when the user has scrolled through all existing content. Placing it before content causes it to be immediately visible on mount, firing `onLoadMore` in a loop.

## How It Works

```
1. Component mounts
   → useResolvedRoot resolves scrollableTarget (or null for viewport)
   → useIntersectionObserver creates observer with { root, rootMargin, threshold }
   → Sentinel renders, callback ref attaches it to the observer

2. User scrolls to end of content
   → Sentinel enters viewport
   → Observer fires callback → onIntersect → onLoadMore()

3. Consumer sets isLoading=true
   → Observer disabled (enabled: hasMore && !isLoading)
   → No duplicate calls while loading

4. New data arrives, consumer sets isLoading=false
   → Observer re-enabled, sentinel re-observed
   → Cycle repeats until hasMore=false

5. hasMore becomes false
   → Sentinel removed from DOM
   → endMessage rendered
```

## Observer Lifecycle

The `useIntersectionObserver` hook manages the observer:

- **Creation**: In a `useEffect` when `enabled`, `root`, `rootMargin`, or `threshold` change
- **Callback stability**: `onIntersect` is stored in a `useRef` — changing the callback identity does NOT recreate the observer
- **Threshold stability**: Array thresholds are serialized to a string (`join(',')`) for dependency comparison
- **Cleanup**: `observer.disconnect()` on unmount or when options change
- **SSR**: Returns a no-op ref when `canUseIntersectionObserver()` is false

## Conditional Rendering Logic

```typescript
const sentinel = hasMore ? <Sentinel ref={sentinelRef} /> : null;
const loaderContent = isLoading && hasMore ? loader : null;
const endContent = !hasMore ? endMessage : null;
```

| State | Sentinel | Loader | End Message |
|-------|----------|--------|-------------|
| `hasMore=true, isLoading=false` | Rendered + observed | Hidden | Hidden |
| `hasMore=true, isLoading=true` | Rendered, NOT observed | Shown | Hidden |
| `hasMore=false` | Not rendered | Hidden | Shown |

## Usage Example

```tsx
import { InfiniteScroll } from 'react-observer-scroll';

const PhotoFeed = () => {
  const { photos, isLoading, hasMore, loadMore } = usePhotos();

  return (
    <InfiniteScroll
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoading={isLoading}
      rootMargin="200px"
      loader={<Skeleton />}
      endMessage={<p>No more photos</p>}
    >
      <div className="grid grid-cols-3 gap-4">
        {photos.map((photo) => (
          <PhotoCard key={photo.id} photo={photo} />
        ))}
      </div>
    </InfiniteScroll>
  );
};
```

### With a Custom Scrollable Container

```tsx
<div id="scroll-container" style={{ height: '500px', overflow: 'auto' }}>
  <InfiniteScroll
    onLoadMore={loadMore}
    hasMore={hasMore}
    isLoading={isLoading}
    scrollableTarget="#scroll-container"
  >
    {items.map((item) => <Item key={item.id} {...item} />)}
  </InfiniteScroll>
</div>
```

### With direction="top" (Reverse Chronological)

```tsx
<InfiniteScroll
  onLoadMore={loadOlder}
  hasMore={hasOlder}
  isLoading={isLoadingOlder}
  direction="top"
>
  {logs.map((log) => <LogEntry key={log.id} {...log} />)}
</InfiniteScroll>
```

## Key Design Decisions

1. **No internal state**: The library does not manage loading/pagination state. The consumer owns `isLoading`, `hasMore`, and data. This decouples from any data-fetching strategy (React Query, SWR, plain fetch, etc.).

2. **Sentinel over cloneElement**: A dedicated invisible `<div>` avoids the brittle `React.cloneElement` pattern that breaks with components that don't forward refs.

3. **`enabled` prop gates the observer**: Setting `enabled: hasMore && !isLoading` prevents duplicate `onLoadMore` calls during in-flight requests without manual debounce/throttle.

4. **Viewport as default root**: When no `scrollableTarget` is provided, `root=null` gives the browser viewport — the most common use case for window-level scrolling.

5. **`useResolvedRoot` with `useSyncExternalStore`**: Ensures SSR safety. `document.querySelector` is only called on the client, and the result is cached until `scrollableTarget` changes.

## Testing

23 unit tests in `tests/components/InfiniteScroll.test.tsx` + 5 integration tests in `tests/integration/infinite-scroll.integration.test.tsx`.

Tests verify:
- Sentinel placement per direction (before/after children)
- Element ordering: children > sentinel > loader > endMessage
- Observer disabled when `isLoading=true` (sentinel exists but not observed)
- Observer re-enabled when `isLoading` transitions true → false
- Sentinel removed from DOM when `hasMore=false`
- `scrollableTarget` resolved to observer root
- `as`, `className`, `style`, `ref` pass-through
- Multi-page sequential loading (integration)
- No auto-load on mount (integration)
