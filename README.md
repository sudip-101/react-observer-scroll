# react-observer-scroll

[![npm version](https://img.shields.io/npm/v/react-observer-scroll.svg)](https://www.npmjs.com/package/react-observer-scroll)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-observer-scroll)](https://bundlephobia.com/package/react-observer-scroll)
[![license](https://img.shields.io/npm/l/react-observer-scroll.svg)](https://github.com/sudip-101/react-observer-scroll/blob/main/LICENSE)

Production-grade infinite and bidirectional scroll components powered by IntersectionObserver. Zero dependencies. Tree-shakeable. TypeScript-first.

## Why?

Traditional scroll listeners fire on every pixel of scroll movement on the main thread, causing layout thrashing and jank. `react-observer-scroll` uses the browser's native `IntersectionObserver` API which runs asynchronously off the main thread, triggering callbacks only at threshold crossings.

## Installation

```bash
npm install react-observer-scroll
```

**Peer dependencies:** `react >= 16.8.0`, `react-dom >= 16.8.0`

## Quick Start

### InfiniteScroll

```tsx
import { InfiniteScroll } from 'react-observer-scroll';

function Feed() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = async () => {
    setIsLoading(true);
    const data = await fetchItems(page + 1);
    setItems((prev) => [...prev, ...data.items]);
    setHasMore(data.hasMore);
    setPage((p) => p + 1);
    setIsLoading(false);
  };

  return (
    <InfiniteScroll
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoading={isLoading}
      loader={<Spinner />}
      endMessage={<p>You've seen it all!</p>}
    >
      {items.map((item) => (
        <Card key={item.id} {...item} />
      ))}
    </InfiniteScroll>
  );
}
```

### BidirectionalScroll

```tsx
import { BidirectionalScroll } from 'react-observer-scroll';

function Chat() {
  const [messages, setMessages] = useState([]);
  // ... loading state

  return (
    <BidirectionalScroll
      dataLength={messages.length}
      onLoadPrevious={loadOlderMessages}
      hasPrevious={hasPrevious}
      isLoadingPrevious={isLoadingOlder}
      onLoadNext={loadNewerMessages}
      hasNext={hasNext}
      isLoadingNext={isLoadingNewer}
      style={{ height: '500px' }}
    >
      {messages.map((msg) => (
        <Message key={msg.id} {...msg} />
      ))}
    </BidirectionalScroll>
  );
}
```

### useIntersectionObserver (Advanced)

```tsx
import { useIntersectionObserver } from 'react-observer-scroll';

function CustomComponent() {
  const ref = useIntersectionObserver({
    onIntersect: (entry) => console.log('Visible!', entry),
    rootMargin: '200px',
    enabled: true,
  });

  return <div ref={ref}>Watch me</div>;
}
```

## API Reference

### `<InfiniteScroll>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Scrollable content |
| `onLoadMore` | `() => void \| Promise<void>` | required | Called when sentinel enters viewport |
| `hasMore` | `boolean` | required | Whether more data is available |
| `isLoading` | `boolean` | required | Whether loading is in progress |
| `loader` | `ReactNode` | - | Shown while loading |
| `endMessage` | `ReactNode` | - | Shown when no more data |
| `errorMessage` | `ReactNode` | - | Shown on error |
| `error` | `boolean` | `false` | Whether an error occurred |
| `onRetry` | `() => void` | - | Called on retry click |
| `scrollableTarget` | `string` | - | CSS selector for scroll container |
| `rootMargin` | `string` | `"0px"` | Observer root margin |
| `threshold` | `number \| number[]` | `0` | Observer threshold |
| `direction` | `'top' \| 'bottom'` | `'bottom'` | Content growth direction |
| `className` | `string` | - | Wrapper CSS class |
| `style` | `CSSProperties` | - | Wrapper inline styles |
| `as` | `ElementType` | `'div'` | Wrapper element type |

### `<BidirectionalScroll>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Scrollable content |
| `dataLength` | `number` | required | Current item count (for scroll preservation) |
| `onLoadNext` | `() => void \| Promise<void>` | required | Load newer items |
| `hasNext` | `boolean` | required | Has newer items |
| `isLoadingNext` | `boolean` | required | Loading newer items |
| `onLoadPrevious` | `() => void \| Promise<void>` | required | Load older items |
| `hasPrevious` | `boolean` | required | Has older items |
| `isLoadingPrevious` | `boolean` | required | Loading older items |
| `nextLoader` | `ReactNode` | - | Bottom loader |
| `previousLoader` | `ReactNode` | - | Top loader |
| `onScroll` | `(e: UIEvent) => void` | - | Scroll event handler |
| `rootMargin` | `string` | `"0px"` | Observer root margin |
| `threshold` | `number \| number[]` | `0` | Observer threshold |
| `ref` | `Ref<HTMLElement>` | - | Container ref (via forwardRef) |

### `useIntersectionObserver(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `onIntersect` | `(entry: IntersectionObserverEntry) => void` | required | Intersection callback |
| `threshold` | `number \| number[]` | `0` | Observer threshold |
| `rootMargin` | `string` | `"0px"` | Observer root margin |
| `root` | `Element \| null` | `null` | Observer root element |
| `enabled` | `boolean` | `true` | Enable/disable observation |

Returns a callback ref `(node: Element | null) => void`.

## Browser Support

All modern browsers (Chrome, Firefox, Safari, Edge). IntersectionObserver is supported since March 2019.

## License

[MIT](LICENSE)
