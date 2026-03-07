# react-observer-scroll

Performant infinite scroll for React, powered by IntersectionObserver.

[![npm version](https://img.shields.io/npm/v/react-observer-scroll.svg?style=flat-square&color=0070f3)](https://www.npmjs.com/package/react-observer-scroll) [![license](https://img.shields.io/npm/l/react-observer-scroll.svg?style=flat-square)](https://github.com/sudip-101/react-observer-scroll/blob/main/LICENSE) [![downloads](https://img.shields.io/badge/downloads-0%2Fmonth-brightgreen?style=flat-square)](https://www.npmjs.com/package/react-observer-scroll) [![bundle size](https://img.shields.io/badge/bundle-1.77kB%20gzip-0070f3?style=flat-square)](https://bundlephobia.com/package/react-observer-scroll)

---

Production-grade [`InfiniteScroll`](#infinitescroll) and [`BidirectionalScroll`](#bidirectionalscroll) components for React, built on the browser's native [IntersectionObserver API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API). Also exports a low-level [`useIntersectionObserver`](#useintersectionobserver) hook for custom implementations.

Zero dependencies. Tree-shakeable. TypeScript-first. SSR-safe.

**Jump to:** [Key Features](#key-features) | [Installation](#installation) | [Usage](#usage) | [How It Works](#how-it-works) | [Examples](#examples) | [Why IntersectionObserver?](#why-intersectionobserver) | [FAQs](#faqs)

---

## Key Features

- **IntersectionObserver-powered** -- no scroll event listeners, no layout thrashing, no manual throttling
- **Externally controlled** -- you own loading state, pagination, and data fetching (works with React Query, SWR, Redux, or plain `useState`)
- **Scroll preservation** -- `BidirectionalScroll` auto-adjusts `scrollTop` on prepend via `useLayoutEffect` (no flicker)
- **Mutual exclusion** -- `BidirectionalScroll` prevents concurrent top/bottom loads
- **Custom scroll containers** -- pass a CSS selector via `scrollableTarget` to observe within any scrollable ancestor
- **Polymorphic** -- render as any element type via the `as` prop
- **SSR-safe** -- graceful no-op when `IntersectionObserver` or `window` is unavailable
- **Accessible** -- sentinel elements are invisible to screen readers (`aria-hidden`)
- **React 16.8 through 19** -- compatible with any version that supports hooks

---

## Installation

```bash
npm install react-observer-scroll
```

**Peer dependencies:** `react >= 16.8.0` and `react-dom >= 16.8.0`

---

## Usage

### `InfiniteScroll`

Single-direction infinite scroll for feeds, product listings, and paginated content.

```tsx
import { InfiniteScroll } from 'react-observer-scroll';

function Feed() {
  const { items, isLoading, hasMore, loadMore } = useItems();

  return (
    <InfiniteScroll
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoading={isLoading}
      rootMargin="200px"
      loader={<Spinner />}
      endMessage={<p>You've reached the end</p>}
    >
      {items.map((item) => (
        <Card key={item.id} item={item} />
      ))}
    </InfiniteScroll>
  );
}
```

With a custom scrollable container:

```tsx
<div id="scroll-box" style={{ height: 500, overflow: 'auto' }}>
  <InfiniteScroll
    onLoadMore={loadMore}
    hasMore={hasMore}
    isLoading={isLoading}
    scrollableTarget="#scroll-box"
  >
    {items.map((item) => <Item key={item.id} {...item} />)}
  </InfiniteScroll>
</div>
```

#### API

| Prop | Type | Default | Description |
|:-----|:-----|:--------|:------------|
| `children` | `ReactNode` | **required** | Scrollable content |
| `onLoadMore` | `() => void \| Promise<void>` | **required** | Called when sentinel enters viewport |
| `hasMore` | `boolean` | **required** | Whether more data is available |
| `isLoading` | `boolean` | **required** | Loading in progress (prevents duplicate calls) |
| `loader` | `ReactNode` | -- | Shown while loading |
| `endMessage` | `ReactNode` | -- | Shown when all data is loaded |
| `scrollableTarget` | `string` | -- | CSS selector for scrollable ancestor (`null` = viewport) |
| `rootMargin` | `string` | `"0px"` | Trigger loading before sentinel is visible (e.g. `"200px"`) |
| `threshold` | `number \| number[]` | `0` | Visibility ratio to trigger (0--1) |
| `direction` | `'top' \| 'bottom'` | `'bottom'` | Content growth direction |
| `className` | `string` | -- | CSS class on wrapper |
| `style` | `CSSProperties` | -- | Inline styles on wrapper |
| `as` | `ElementType` | `'div'` | Custom wrapper element |
| `ref` | `Ref<HTMLElement>` | -- | Forwarded ref to wrapper |

---

### `BidirectionalScroll`

Dual-direction scroll for chat interfaces, timelines, and any UI that loads content in both directions. Includes automatic scroll preservation and mutual exclusion.

```tsx
import { BidirectionalScroll } from 'react-observer-scroll';
import type { ScrollIndicatorInfo } from 'react-observer-scroll';

function Chat() {
  const {
    messages, isLoadingNext, isLoadingPrevious,
    hasNext, hasPrevious, loadNext, loadPrevious,
  } = useMessages();

  return (
    <BidirectionalScroll
      dataLength={messages.length}
      onLoadNext={loadNext}
      hasNext={hasNext}
      isLoadingNext={isLoadingNext}
      onLoadPrevious={loadPrevious}
      hasPrevious={hasPrevious}
      isLoadingPrevious={isLoadingPrevious}
      loader={<Spinner />}
      style={{ height: 500 }}
    >
      {messages.map((msg) => (
        <Message key={msg.id} message={msg} />
      ))}
    </BidirectionalScroll>
  );
}
```

#### API

| Prop | Type | Default | Description |
|:-----|:-----|:--------|:------------|
| `children` | `ReactNode` | **required** | Scrollable content |
| `dataLength` | `number` | **required** | Current item count (triggers scroll preservation) |
| `onLoadNext` | `() => void \| Promise<void>` | **required** | Load newer/bottom items |
| `hasNext` | `boolean` | **required** | More items below? |
| `isLoadingNext` | `boolean` | **required** | Loading bottom items? |
| `onLoadPrevious` | `() => void \| Promise<void>` | **required** | Load older/top items |
| `hasPrevious` | `boolean` | **required** | More items above? |
| `isLoadingPrevious` | `boolean` | **required** | Loading top items? |
| `loader` | `ReactNode` | -- | Default loader for both directions |
| `nextLoader` | `ReactNode` | -- | Overrides `loader` for bottom |
| `previousLoader` | `ReactNode` | -- | Overrides `loader` for top |
| `onScrollIndicator` | `(info: ScrollIndicatorInfo) => void` | -- | Scroll position callback |
| `rootMargin` | `string` | `"0px"` | Observer root margin |
| `threshold` | `number \| number[]` | `0` | Observer threshold |
| `className` | `string` | -- | CSS class on container |
| `style` | `CSSProperties` | -- | Inline styles on container |
| `as` | `ElementType` | `'div'` | Custom container element |
| `ref` | `Ref<HTMLElement>` | -- | Forwarded ref to scroll container |

> **Scroll preservation:** When items are prepended, scroll position is automatically adjusted so the user's reading position stays stable. No flicker, no jump.

> **Mutual exclusion:** Only one direction loads at a time, preventing race conditions.

> **`ScrollIndicatorInfo`:** `{ scrolledFromStart: number; scrolledFromEnd: number }` -- use it to show/hide a "scroll to bottom" button.

---

### `useIntersectionObserver`

The foundational hook that powers both components. Exported for custom implementations like lazy loading, reveal animations, or ad viewability tracking.

```tsx
import { useIntersectionObserver } from 'react-observer-scroll';

function LazyImage({ src }: { src: string }) {
  const [visible, setVisible] = useState(false);

  const ref = useIntersectionObserver({
    onIntersect: () => setVisible(true),
    rootMargin: '100px',
    enabled: !visible,
  });

  return <div ref={ref}>{visible ? <img src={src} /> : <Placeholder />}</div>;
}
```

#### API

| Option | Type | Default | Description |
|:-------|:-----|:--------|:------------|
| `onIntersect` | `(entry: IntersectionObserverEntry) => void` | **required** | Called on intersection |
| `threshold` | `number \| number[]` | `0` | Visibility ratio trigger |
| `rootMargin` | `string` | `"0px"` | Root margin |
| `root` | `Element \| null` | `null` | Root element (`null` = viewport) |
| `enabled` | `boolean` | `true` | Enable/disable observation |

**Returns:** `(node: Element | null) => void` -- a callback ref to attach to your target element.

---

## How It Works

```
1. Component mounts       ->  IntersectionObserver created
2. Invisible sentinel placed at scroll boundary (zero-height, aria-hidden div)
3. User scrolls           ->  sentinel enters viewport
4. Observer fires          ->  onLoadMore / onLoadNext / onLoadPrevious called
5. isLoading set to true  ->  observer pauses (no duplicate calls)
6. New data arrives        ->  isLoading set to false, observer resumes
7. hasMore becomes false  ->  sentinel removed, endMessage shown
```

The sentinel is a zero-height invisible `<div>` with `aria-hidden="true"` -- no layout impact, no screen reader noise. This avoids the brittle `React.cloneElement` pattern that breaks with components that don't forward refs.

---

## Examples

### Feed Posts

A minimal infinite feed loading paginated data:

```tsx
function PostFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = async () => {
    setIsLoading(true);
    const newPosts = await fetchPosts(page);
    setPosts((prev) => [...prev, ...newPosts]);
    setHasMore(newPosts.length > 0);
    setPage((p) => p + 1);
    setIsLoading(false);
  };

  return (
    <InfiniteScroll onLoadMore={loadMore} hasMore={hasMore} isLoading={isLoading}>
      {posts.map((post) => <PostCard key={post.id} post={post} />)}
    </InfiniteScroll>
  );
}
```

[View live demo](https://react-observer-scroll.vercel.app)

### Chat with Scroll-to-Bottom

A bidirectional chat UI that scrolls to the bottom on mount and shows a "scroll to bottom" button when the user scrolls up:

```tsx
function ChatRoom() {
  const containerRef = useRef<HTMLElement>(null);
  const hasScrolledInitial = useRef(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Scroll to bottom on initial load
  useLayoutEffect(() => {
    if (!isInitialLoading && containerRef.current && !hasScrolledInitial.current) {
      hasScrolledInitial.current = true;
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [isInitialLoading]);

  return (
    <BidirectionalScroll
      ref={containerRef}
      dataLength={messages.length}
      onLoadNext={loadNext}
      hasNext={hasNext}
      isLoadingNext={isLoadingNext}
      onLoadPrevious={loadPrevious}
      hasPrevious={hasPrevious}
      isLoadingPrevious={isLoadingPrevious}
      onScrollIndicator={({ scrolledFromEnd }) => setShowScrollBtn(scrolledFromEnd > 200)}
      style={{ height: '100vh' }}
    >
      {messages.map((msg) => <Message key={msg.id} message={msg} />)}
    </BidirectionalScroll>
  );
}
```

[View live demo](https://react-observer-scroll.vercel.app)

---

## Why IntersectionObserver?

| | Scroll Event Listener | IntersectionObserver |
|---|---|---|
| **Fires on** | Every pixel of scroll | Only at threshold crossings |
| **Runs on** | Main thread (blocks UI) | Browser-managed (async, off main thread) |
| **Geometry reads** | Manual `getBoundingClientRect()` | Browser-optimized internal checks |
| **Throttling** | Required (manual debounce/throttle) | Built-in (no extra code) |
| **Multiple targets** | One listener per target or complex delegation | Single observer, many targets |
| **Performance impact** | High CPU, layout thrashing, jank | Low CPU, no layout recalculations |
| **Battery impact** | High (constant computation) | Low (idle until threshold) |

---

## Implementation, Testing & Project Structure

**Build:** Vite library mode with dual ESM (`.js`) + UMD (`.umd.cjs`) output. Type declarations generated via `vite-plugin-dts`. React and React DOM are externalized as peer dependencies.

**Test stack:** Vitest + @testing-library/react + jsdom with a custom `IntersectionObserver` mock that allows per-test control over intersection triggers.

**Coverage:** 63 tests across unit, component, and integration suites. Thresholds: 95% statements, 90% branches, 95% functions, 95% lines.

```
react-observer-scroll/
  lib/
    components/
      InfiniteScroll.tsx
      BidirectionalScroll.tsx
      Sentinel.tsx
    hooks/
      useIntersectionObserver.ts
      useScrollPreservation.ts
      useResolvedRoot.ts
    utils/
      ssr.ts
    types/
      index.ts
    index.ts
  tests/
    helpers/
      mock-intersection-observer.ts
    components/
      InfiniteScroll.test.tsx
      BidirectionalScroll.test.tsx
    hooks/
      useIntersectionObserver.test.ts
      useScrollPreservation.test.ts
    integration/
      infinite-scroll.integration.test.tsx
      bidirectional-scroll.integration.test.tsx
    setup.ts
```

---

## FAQs

**Does it work with SSR / Next.js?**
Yes. The library checks for `IntersectionObserver` availability and renders a no-op on the server. Scroll detection activates after hydration on the client.

**Can I use a custom scrollable container instead of the viewport?**
Yes. Pass a CSS selector to `scrollableTarget` on `InfiniteScroll`. For `BidirectionalScroll`, the component itself is the scroll container.

**Which React versions are supported?**
Any version from React 16.8 (the first to support hooks) through React 19.

**Is it written in TypeScript?**
Yes. All props, hooks, and exported types are fully typed. Import types directly:
```ts
import type { InfiniteScrollProps, ScrollIndicatorInfo } from 'react-observer-scroll';
```

**How do I prevent duplicate `onLoadMore` calls?**
Set `isLoading` to `true` synchronously before your async operation. The library disables the observer while `isLoading` is `true`.

**Can I render the wrapper as a `<ul>` or `<section>`?**
Yes. Use the `as` prop: `<InfiniteScroll as="ul" ...>`.

---

## Browser Support

All modern browsers. [IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) is natively supported in Chrome, Firefox, Safari, and Edge (since March 2019).

---

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please [open an issue](https://github.com/sudip-101/react-observer-scroll/issues). Pull requests are appreciated -- check the existing issues for ideas on where to start.

---

## License

[MIT](LICENSE)
