# CLAUDE.md -- react-observer-scroll Implementation Blueprint

This file is the single source of truth for building, testing, and publishing the `react-observer-scroll` npm library. A developer reading only this file should be able to implement the entire library from scratch.

---

## 1. Project Overview and Philosophy

### What It Is

`react-observer-scroll` is a production-grade React library that provides `InfiniteScroll` and `BidirectionalScroll` components powered by the browser's native IntersectionObserver API.

### Value Proposition

Traditional infinite scroll implementations rely on `scroll` event listeners attached to the window or a container element. These listeners fire on every pixel of scroll movement on the main thread, requiring manual throttling/debouncing and repeated calls to `getBoundingClientRect()`, which triggers forced layout recalculations (layout thrashing).

IntersectionObserver is a browser-native API that asynchronously observes changes in the intersection of a target element with a viewport or ancestor element. The browser optimizes these checks internally, invoking callbacks only when actual threshold crossings occur -- off the main thread. This eliminates:

- Main thread blocking during scroll
- Layout thrashing from repeated geometry reads
- Manual throttle/debounce boilerplate
- Performance degradation with many observed elements

### Target Audience

- React developers building feeds, timelines, product listings, or any paginated UI
- Chat application developers who need bidirectional (up and down) content loading
- Teams migrating from `react-infinite-scroll-component` or hand-rolled scroll listeners

### Design Principles

1. **Minimal API surface** -- Few props, sensible defaults, progressive complexity
2. **TypeScript-first** -- Strict types, no `any`, comprehensive JSDoc on all exports
3. **Tree-shakeable** -- Named exports only, no side effects, dead code elimination friendly
4. **SSR-safe** -- Graceful no-op when `IntersectionObserver` or `window` is unavailable
5. **Accessible** -- Sentinel elements are invisible to screen readers (`aria-hidden`)
6. **Zero dependencies** -- Only peer deps on `react` and `react-dom`
7. **Composition over configuration** -- Small hooks compose into larger components

---

## 2. Technical Architecture

### Component Hierarchy

```
Public API
  InfiniteScroll       -- single-direction infinite scroll
  BidirectionalScroll  -- dual-direction scroll (chat, timelines)
  useIntersectionObserver -- foundational hook (also exported for advanced use)

Internal (not exported)
  Sentinel             -- invisible observer target element
  useScrollPreservation -- scroll position save/restore for prepend
  useResolvedRoot      -- SSR-safe root element resolution
  ssr utilities        -- canUseDOM, canUseIntersectionObserver checks
```

### Core Hook: useIntersectionObserver

This is the foundational primitive. Both components build on it. It:

1. Creates an `IntersectionObserver` instance with provided options
2. Observes a target element via a callback ref (not a React ref object)
3. Calls `onIntersect` when the target crosses the threshold
4. Cleans up (disconnects) on unmount or when options change
5. Uses `useRef` for the callback to avoid recreating the observer when only the callback identity changes
6. Returns a callback ref setter function for the consumer to attach to a DOM node

### State Management Approach

The library does NOT manage loading/error/pagination state internally. The consumer owns all state. The library's job is limited to:

- Detecting when a sentinel enters the viewport
- Calling the consumer's callback (`onLoadMore`, `onLoadPrevious`, `onLoadNext`)
- Rendering loader/end/error UI based on boolean props the consumer provides

This keeps the library framework-agnostic regarding data fetching (works with React Query, SWR, Redux, plain useState, etc.).

### Observer Lifecycle

```
Component mounts
  -> useEffect creates IntersectionObserver with current options
  -> callback ref attaches sentinel DOM node via observer.observe()

Props change (root, rootMargin, threshold)
  -> useEffect cleanup disconnects old observer
  -> new observer created with new options
  -> sentinel re-observed

Sentinel DOM node changes (callback ref called with new node)
  -> old node unobserved
  -> new node observed on existing observer

Component unmounts
  -> useEffect cleanup disconnects observer
```

### Sentinel Element Strategy

Instead of using `React.cloneElement` to attach refs to children (which breaks with components that do not forward refs), we render an explicit invisible `<div>` as the sentinel:

```tsx
<div
  ref={sentinelRef}
  style={{ height: 0, width: 0, overflow: 'hidden' }}
  aria-hidden="true"
/>
```

- For `InfiniteScroll` with `direction="bottom"`: sentinel is placed AFTER children
- For `InfiniteScroll` with `direction="top"`: sentinel is placed BEFORE children
- For `BidirectionalScroll`: two sentinels, one at top and one at bottom

### Scroll Position Restoration (BidirectionalScroll)

When content is prepended to the top of a scrollable container, the browser inserts new DOM nodes and pushes existing content downward, causing the user to lose their scroll position. The fix:

1. **Before prepend** (when `isLoadingPrevious` becomes true): capture `scrollHeight` and `scrollTop` of the container
2. **After prepend** (when `dataLength` changes and prepend flag is set): calculate `heightDifference = newScrollHeight - previousScrollHeight`, then set `container.scrollTop = previousScrollTop + heightDifference`

This must happen in `useLayoutEffect` to execute synchronously after DOM mutation but before the browser paints, preventing visual flicker.

---

## 3. Detailed API Design

### InfiniteScrollProps

```typescript
import { ReactNode, CSSProperties, ElementType, UIEvent } from 'react';

export type ScrollDirection = 'top' | 'bottom';

export interface InfiniteScrollProps {
  /** The scrollable content (typically mapped list items) */
  children: ReactNode;

  /**
   * Called when the sentinel enters the viewport and more data should be loaded.
   * Can return a Promise; the library does not await it but consumers
   * should set isLoading=true before the async operation.
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

  /** Shown when error is true */
  errorMessage?: ReactNode;

  /** Whether an error has occurred during loading */
  error?: boolean;

  /** Called when the user clicks retry after an error */
  onRetry?: () => void;

  /**
   * CSS selector string for the scrollable ancestor to use as the observer root.
   * If omitted, the browser viewport is used.
   * Resolved via document.querySelector in a useEffect (SSR-safe).
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
```

### BidirectionalScrollProps

```typescript
import { ReactNode, CSSProperties, ElementType, UIEvent, Ref } from 'react';

export interface BidirectionalScrollProps {
  /** The scrollable content */
  children: ReactNode;

  /**
   * Total number of currently rendered items.
   * Used by scroll preservation to detect when new items have been added to the DOM.
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

  /** Shown while isLoadingNext is true */
  nextLoader?: ReactNode;

  /** Shown while isLoadingPrevious is true */
  previousLoader?: ReactNode;

  /** Optional callback for scroll events on the container */
  onScroll?: (e: UIEvent<HTMLElement>) => void;

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
```

The `BidirectionalScroll` component accepts a `ref` via `forwardRef` that exposes the scroll container `HTMLDivElement`. This lets consumers programmatically scroll (e.g., "scroll to bottom" button in chat).

### useIntersectionObserver Hook

```typescript
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

/**
 * Returns a callback ref to attach to the element you want to observe.
 * The observer is automatically created, updated, and cleaned up.
 *
 * @example
 * const sentinelRef = useIntersectionObserver({
 *   onIntersect: (entry) => {
 *     if (entry.isIntersecting) loadMore();
 *   },
 *   rootMargin: '200px',
 *   enabled: hasMore && !isLoading,
 * });
 * return <div ref={sentinelRef} />;
 */
export function useIntersectionObserver(
  options: UseIntersectionObserverOptions
): (node: Element | null) => void;
```

---

## 4. Project Structure

```
react-observer-scroll/
├── src/
│   ├── index.ts                          # Public API: export { InfiniteScroll, BidirectionalScroll, useIntersectionObserver }
│   ├── components/
│   │   ├── InfiniteScroll.tsx            # Main single-direction component
│   │   ├── BidirectionalScroll.tsx       # Dual-direction component with scroll preservation
│   │   └── Sentinel.tsx                  # Internal zero-height observer target
│   ├── hooks/
│   │   ├── useIntersectionObserver.ts    # Core observer hook
│   │   ├── useScrollPreservation.ts      # Scroll position save/restore for prepend
│   │   └── useResolvedRoot.ts            # SSR-safe root element resolution from CSS selector
│   ├── utils/
│   │   └── ssr.ts                        # canUseDOM, canUseIntersectionObserver
│   └── types/
│       └── index.ts                      # All shared TypeScript interfaces and types
├── tests/
│   ├── setup.ts                          # Vitest setup: mock IntersectionObserver
│   ├── helpers/
│   │   └── mock-intersection-observer.ts # Controllable IO mock with trigger functions
│   ├── components/
│   │   ├── InfiniteScroll.test.tsx
│   │   └── BidirectionalScroll.test.tsx
│   ├── hooks/
│   │   ├── useIntersectionObserver.test.ts
│   │   └── useScrollPreservation.test.ts
│   └── integration/
│       ├── infinite-scroll.integration.test.tsx
│       └── bidirectional-scroll.integration.test.tsx
├── examples/
│   ├── basic-infinite-scroll/            # Minimal feed example
│   ├── chat-bidirectional/               # Chat app with bidirectional loading
│   └── custom-loader/                    # Custom loader components
├── .github/
│   └── workflows/
│       ├── ci.yml                        # Lint + typecheck + test + build on PRs
│       └── publish.yml                   # Publish to npm on release tag
├── package.json
├── tsconfig.json
├── tsconfig.build.json                   # Separate tsconfig for build (excludes tests)
├── vite.config.ts                        # Vite library mode config
├── vitest.config.ts                      # Test runner config
├── eslint.config.js                      # ESLint flat config
├── .prettierrc                           # Prettier config
├── CHANGELOG.md
├── README.md
├── LICENSE                               # MIT
└── CLAUDE.md                             # This file
```

### Public Exports (src/index.ts)

```typescript
export { InfiniteScroll } from './components/InfiniteScroll';
export { BidirectionalScroll } from './components/BidirectionalScroll';
export { useIntersectionObserver } from './hooks/useIntersectionObserver';

// Re-export types for consumers
export type { InfiniteScrollProps, ScrollDirection } from './types';
export type { BidirectionalScrollProps } from './types';
export type { UseIntersectionObserverOptions } from './types';
```

---

## 5. Implementation Plan (Ordered Phases)

### Phase 1: Project Foundation

**Goal:** Working build pipeline, linting, testing infrastructure, and the core observer hook.

1. Initialize the project:
   ```bash
   npm init -y
   ```
2. Install dev dependencies:
   ```bash
   npm install --save-dev typescript vite @vitejs/plugin-react vite-plugin-dts \
     react react-dom @types/react @types/react-dom \
     vitest @testing-library/react @testing-library/jest-dom jsdom \
     eslint @eslint/js typescript-eslint eslint-plugin-react-hooks \
     prettier
   ```
3. Configure `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "ESNext",
       "moduleResolution": "bundler",
       "jsx": "react-jsx",
       "strict": true,
       "noUncheckedIndexedAccess": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "declaration": true,
       "declarationMap": true,
       "sourceMap": true,
       "outDir": "./dist",
       "rootDir": "./src",
       "lib": ["ES2020", "DOM", "DOM.Iterable"]
     },
     "include": ["src"],
     "exclude": ["node_modules", "dist", "tests", "examples"]
   }
   ```
4. Configure `vite.config.ts` (library mode):
   ```typescript
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';
   import dts from 'vite-plugin-dts';
   import { resolve } from 'path';

   export default defineConfig({
     plugins: [
       react(),
       dts({ include: ['src'], exclude: ['tests', 'examples'] }),
     ],
     build: {
       lib: {
         entry: resolve(__dirname, 'src/index.ts'),
         name: 'ReactObserverScroll',
         fileName: 'react-observer-scroll',
         formats: ['es', 'umd'],
       },
       rollupOptions: {
         external: ['react', 'react-dom', 'react/jsx-runtime'],
         output: {
           globals: {
             react: 'React',
             'react-dom': 'ReactDOM',
             'react/jsx-runtime': 'jsxRuntime',
           },
         },
       },
     },
   });
   ```
5. Configure `vitest.config.ts`:
   ```typescript
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';

   export default defineConfig({
     plugins: [react()],
     test: {
       globals: true,
       environment: 'jsdom',
       setupFiles: ['./tests/setup.ts'],
       coverage: {
         provider: 'v8',
         include: ['src/**/*.{ts,tsx}'],
         exclude: ['src/index.ts', 'src/types/**'],
         thresholds: {
           statements: 95,
           branches: 90,
           functions: 95,
           lines: 95,
         },
       },
     },
   });
   ```
6. Create `tests/setup.ts`:
   ```typescript
   import '@testing-library/jest-dom/vitest';
   import { cleanup } from '@testing-library/react';
   import { afterEach } from 'vitest';

   afterEach(() => {
     cleanup();
   });
   ```
7. Create the IntersectionObserver mock (see Section 7 for full implementation).
8. Implement `src/utils/ssr.ts`:
   ```typescript
   export const canUseDOM: boolean =
     typeof window !== 'undefined' &&
     typeof window.document !== 'undefined' &&
     typeof window.document.createElement !== 'undefined';

   export const canUseIntersectionObserver: boolean =
     canUseDOM && typeof IntersectionObserver !== 'undefined';
   ```
9. Implement `src/hooks/useIntersectionObserver.ts` with full test coverage.
10. Implement `src/hooks/useResolvedRoot.ts` with full test coverage.

### Phase 2: Core Components

**Goal:** Both scroll components working with unit tests.

1. Implement `src/components/Sentinel.tsx`:
   ```typescript
   import React, { forwardRef } from 'react';

   /** Internal sentinel element -- invisible to users and screen readers */
   export const Sentinel = forwardRef<HTMLDivElement, { className?: string }>(
     ({ className }, ref) => (
       <div
         ref={ref}
         className={className}
         style={{
           height: 0,
           width: 0,
           padding: 0,
           margin: 0,
           border: 'none',
           overflow: 'hidden',
           visibility: 'hidden',
         }}
         aria-hidden="true"
       />
     )
   );
   Sentinel.displayName = 'Sentinel';
   ```
2. Implement `src/components/InfiniteScroll.tsx`:
   - Accept all `InfiniteScrollProps`
   - Use `useResolvedRoot` to resolve `scrollableTarget`
   - Use `useIntersectionObserver` for the sentinel
   - Render sentinel before or after children based on `direction`
   - Render `loader`, `endMessage`, `errorMessage` conditionally
   - Support `as` prop for custom wrapper element
   - Support `className` and `style`
3. Implement `src/hooks/useScrollPreservation.ts`:
   - Takes `containerRef`, `dataLength`, `isLoadingPrevious`
   - Captures scrollHeight and scrollTop in a useLayoutEffect when isLoadingPrevious becomes true
   - Restores scroll position in a useLayoutEffect keyed to dataLength changes
   - Uses `isPrepending` ref flag to coordinate between the two effects
4. Implement `src/components/BidirectionalScroll.tsx`:
   - Accept all `BidirectionalScrollProps`
   - Use `forwardRef` to expose container ref
   - Use `useImperativeHandle` to merge internal and forwarded refs
   - Create two `useIntersectionObserver` instances (top sentinel, bottom sentinel)
   - Use `useScrollPreservation` for scroll position restoration
   - The container itself is the observer `root` (its own scrollable area)
   - Set `overflowY: 'auto'` and `height: '100%'` on container by default
5. Write unit tests for each component (see Section 7).

### Phase 3: Polish and Edge Cases

**Goal:** Handle all edge cases, improve performance, pass integration tests.

1. **Debounce rapid intersection callbacks**: When scrolling fast, the observer may fire multiple times. Use the `enabled` prop (derived from `!isLoading`) to prevent duplicate calls. The consumer is responsible for setting `isLoading=true` synchronously before their async operation.
2. **Unmount during async**: If the component unmounts while `onLoadMore` is executing, the cleanup function disconnects the observer. The consumer's async callback may still resolve, but that is the consumer's responsibility (they should use an AbortController or check mounted state).
3. **Root element changes**: When `scrollableTarget` changes, `useResolvedRoot` returns a new root, which triggers observer recreation in `useIntersectionObserver`.
4. **Dynamic threshold changes**: The `useIntersectionObserver` hook recreates the observer when `threshold` changes (using a serialized string comparison to avoid reference issues with arrays).
5. **React Strict Mode**: All effects must be safe to run twice. The observer hook creates and disconnects cleanly on each effect invocation. No stale references.
6. **display:none containers**: IntersectionObserver reports `isIntersecting: false` for elements inside `display:none` containers. The library handles this gracefully -- it simply will not trigger loading, which is correct behavior.
7. **Ref forwarding and `as` prop**: Use a generic approach:
   ```typescript
   const Component = as || 'div';
   return <Component ref={ref} className={className} style={style} {...rest}>{children}</Component>;
   ```
8. **Integration tests**: Full render flows with mocked async data, sequential loads, error recovery.

### Phase 4: DX and Documentation

**Goal:** Developer experience polish.

1. Write comprehensive JSDoc on every public export
2. Write README.md with:
   - Installation instructions
   - Quick start code for both components
   - Full API reference table
   - FAQ (SSR, custom scrollable containers, TypeScript usage)
   - Bundle size badge
3. Create example projects in `examples/`:
   - `basic-infinite-scroll/`: Simple feed with fake API delay
   - `chat-bidirectional/`: Chat interface with bidirectional loading
   - `custom-loader/`: Skeleton/spinner loader customization
4. Initialize CHANGELOG.md following Keep a Changelog format

### Phase 5: Build and Publish

**Goal:** Production build, CI/CD, npm publish.

1. Verify dual ESM/CJS output:
   ```bash
   npm run build
   ls dist/  # Should contain .js (ESM), .umd.cjs (CJS), .d.ts
   ```
2. Verify tree-shaking: import only `InfiniteScroll` in a test project and check that `BidirectionalScroll` code is eliminated
3. Configure `package.json` fully (see Section 6)
4. Set up GitHub Actions (see Section 12)
5. Create initial npm publish:
   ```bash
   npm login
   npm publish --access public
   ```
6. Enable npm provenance for supply chain security

---

## 6. Build and Bundling Configuration

### package.json

```json
{
  "name": "react-observer-scroll",
  "version": "0.1.0",
  "description": "Production-grade infinite and bidirectional scroll components powered by IntersectionObserver. Eliminates layout thrashing and performance bottlenecks caused by traditional scroll event listeners.",
  "type": "module",
  "main": "./dist/react-observer-scroll.umd.cjs",
  "module": "./dist/react-observer-scroll.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/react-observer-scroll.js",
      "require": "./dist/react-observer-scroll.umd.cjs"
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ],
  "sideEffects": false,
  "keywords": [
    "react",
    "infinite-scroll",
    "intersection-observer",
    "bidirectional-scroll",
    "virtual-scroll",
    "lazy-loading",
    "chat",
    "feed",
    "pagination",
    "performance"
  ],
  "peerDependencies": {
    "react": ">=16.8.0",
    "react-dom": ">=16.8.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src/ tests/",
    "lint:fix": "eslint src/ tests/ --fix",
    "format": "prettier --write 'src/**/*.{ts,tsx}' 'tests/**/*.{ts,tsx}'",
    "format:check": "prettier --check 'src/**/*.{ts,tsx}' 'tests/**/*.{ts,tsx}'",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run lint && npm run typecheck && npm run test && npm run build",
    "size": "size-limit"
  },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/<owner>/react-observer-scroll.git"
  },
  "homepage": "https://github.com/<owner>/react-observer-scroll#readme",
  "bugs": {
    "url": "https://github.com/<owner>/react-observer-scroll/issues"
  }
}
```

### Key Bundling Decisions

- **Vite library mode** with Rollup under the hood (not tsup) -- chosen to co-locate a demo app in the same repo. `npm run dev` boots the demo; `npm run build` compiles the library.
- **Dual format**: ES module (`.js`) and UMD (`.umd.cjs`) to support both modern bundlers and legacy CommonJS consumers.
- **`sideEffects: false`**: Tells bundlers every module is side-effect-free, enabling aggressive tree-shaking.
- **`types` in exports**: Placed first in the condition map so TypeScript resolves it before `import`/`require`.
- **Externals**: `react`, `react-dom`, and `react/jsx-runtime` are marked external so they are NOT bundled into the library.
- **Target**: ES2020 -- this is the baseline where IntersectionObserver is universally supported (March 2019+). No need to target older environments.
- **vite-plugin-dts**: Generates `.d.ts` declaration files from TypeScript source. Without this, consumers get no type information.

---

## 7. Testing Strategy

### Test Infrastructure

**Stack:** Vitest + @testing-library/react + jsdom

### IntersectionObserver Mock

Create `tests/helpers/mock-intersection-observer.ts`:

```typescript
import { vi } from 'vitest';

type IntersectionCallback = (entries: IntersectionObserverEntry[]) => void;

interface MockObserverInstance {
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  takeRecords: ReturnType<typeof vi.fn>;
  callback: IntersectionCallback;
  options: IntersectionObserverInit | undefined;
}

const observers = new Map<Element, MockObserverInstance>();
let lastInstance: MockObserverInstance | null = null;

export function mockIntersectionObserver() {
  const MockIO = vi.fn((callback: IntersectionCallback, options?: IntersectionObserverInit) => {
    const instance: MockObserverInstance = {
      observe: vi.fn((target: Element) => {
        observers.set(target, instance);
      }),
      unobserve: vi.fn((target: Element) => {
        observers.delete(target);
      }),
      disconnect: vi.fn(() => {
        for (const [target, obs] of observers) {
          if (obs === instance) observers.delete(target);
        }
      }),
      takeRecords: vi.fn(() => []),
      callback,
      options,
    };
    lastInstance = instance;
    return instance;
  });

  vi.stubGlobal('IntersectionObserver', MockIO);

  return {
    getConstructor: () => MockIO,
    getLastInstance: () => lastInstance,
    getObserverForElement: (el: Element) => observers.get(el),

    /** Simulate an element entering or leaving the viewport */
    triggerIntersection(
      target: Element,
      isIntersecting: boolean,
      overrides: Partial<IntersectionObserverEntry> = {}
    ) {
      const observer = observers.get(target);
      if (!observer) throw new Error('Element is not being observed');

      const entry: IntersectionObserverEntry = {
        target,
        isIntersecting,
        intersectionRatio: isIntersecting ? 1 : 0,
        intersectionRect: target.getBoundingClientRect(),
        boundingClientRect: target.getBoundingClientRect(),
        rootBounds: null,
        time: Date.now(),
        ...overrides,
      } as IntersectionObserverEntry;

      observer.callback([entry]);
    },

    /** Trigger intersection on all observed elements */
    triggerAll(isIntersecting: boolean) {
      for (const [target] of observers) {
        this.triggerIntersection(target, isIntersecting);
      }
    },

    /** Reset all state */
    reset() {
      observers.clear();
      lastInstance = null;
      MockIO.mockClear();
    },
  };
}
```

### Test Setup (tests/setup.ts)

```typescript
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

The IntersectionObserver mock should be set up per-test or per-describe block (not globally in setup) to allow test-specific control over intersection behavior.

### Unit Test Specifications

#### useIntersectionObserver.test.ts

```
Test: creates an IntersectionObserver with provided options
  - Render a component using the hook with root=null, rootMargin="100px", threshold=0.5
  - Assert IntersectionObserver constructor was called with matching options

Test: observes the element when ref is attached
  - Render, get the sentinel element
  - Assert observer.observe was called with the sentinel

Test: calls onIntersect when entry.isIntersecting is true
  - Render, trigger intersection with isIntersecting=true
  - Assert onIntersect was called with the entry

Test: does NOT call onIntersect when entry.isIntersecting is false
  - Render, trigger intersection with isIntersecting=false
  - Assert onIntersect was NOT called

Test: disconnects observer on unmount
  - Render, then unmount
  - Assert observer.disconnect was called

Test: recreates observer when options change
  - Render with rootMargin="0px", then rerender with rootMargin="100px"
  - Assert old observer disconnected, new one created

Test: does not observe when enabled=false
  - Render with enabled=false
  - Assert observer was disconnected or not created

Test: unobserves old element and observes new element when ref target changes
  - Simulate ref being called with a new DOM node
  - Assert unobserve called on old, observe called on new

Test: uses stable callback reference via ref
  - Render, change onIntersect prop (new function identity)
  - Assert observer was NOT recreated (options unchanged)
  - Trigger intersection, assert NEW callback was called

Test: handles SSR (no IntersectionObserver available)
  - Temporarily remove IntersectionObserver from global
  - Render hook -- should not throw
  - Restore IntersectionObserver
```

#### InfiniteScroll.test.tsx

```
Test: renders children
  - Render with children, assert children are in the document

Test: calls onLoadMore when sentinel intersects (direction=bottom)
  - Render with hasMore=true, isLoading=false
  - Find sentinel element, trigger intersection
  - Assert onLoadMore was called

Test: does NOT call onLoadMore when isLoading=true
  - Render with isLoading=true
  - Trigger intersection
  - Assert onLoadMore was NOT called

Test: does NOT call onLoadMore when hasMore=false
  - Render with hasMore=false
  - Assert sentinel is not in the DOM

Test: shows loader when isLoading=true and hasMore=true
  - Render with loader={<div>Loading...</div>}, isLoading=true, hasMore=true
  - Assert "Loading..." is in the document

Test: shows endMessage when hasMore=false
  - Render with endMessage={<div>No more</div>}, hasMore=false
  - Assert "No more" is in the document

Test: shows errorMessage when error=true
  - Render with error=true, errorMessage={<div>Error</div>}
  - Assert "Error" is in the document

Test: calls onRetry when retry button is clicked (error state)
  - Render with error=true, onRetry provided
  - Simulate retry action, assert onRetry called

Test: places sentinel BEFORE children when direction=top
  - Render with direction="top"
  - Assert sentinel DOM position is before children

Test: renders custom wrapper element via "as" prop
  - Render with as="section"
  - Assert wrapper is a <section>

Test: resolves scrollableTarget to root element
  - Create a container div with an id, render with scrollableTarget="#container"
  - Assert IntersectionObserver was created with the container as root

Test: passes className and style to wrapper
  - Render with className="custom" style={{ color: 'red' }}
  - Assert wrapper has the class and style
```

#### BidirectionalScroll.test.tsx

```
Test: renders children inside a scrollable container
  - Render with children
  - Assert children are in a container with overflowY: 'auto'

Test: calls onLoadNext when bottom sentinel intersects
  - Render with hasNext=true, isLoadingNext=false
  - Trigger bottom sentinel intersection
  - Assert onLoadNext called

Test: calls onLoadPrevious when top sentinel intersects
  - Render with hasPrevious=true, isLoadingPrevious=false
  - Trigger top sentinel intersection
  - Assert onLoadPrevious called

Test: does not call onLoadNext when isLoadingNext=true
  - Render with isLoadingNext=true
  - Trigger bottom sentinel intersection
  - Assert onLoadNext NOT called

Test: does not call onLoadPrevious when isLoadingPrevious=true
  - Render with isLoadingPrevious=true
  - Trigger top sentinel intersection
  - Assert onLoadPrevious NOT called

Test: shows nextLoader when isLoadingNext is true
  - Render with nextLoader={<span>Loading next</span>}
  - Assert "Loading next" in document

Test: shows previousLoader when isLoadingPrevious is true
  - Render with previousLoader={<span>Loading prev</span>}
  - Assert "Loading prev" in document

Test: exposes container ref via forwardRef
  - Create a ref, pass to BidirectionalScroll
  - Assert ref.current is the container HTMLDivElement

Test: scroll preservation - maintains position when prepending content
  - Render with initial items
  - Simulate prepend (change isLoadingPrevious to true, then add items and update dataLength)
  - Assert scrollTop was adjusted by the height difference
  Note: This requires mocking scrollHeight/scrollTop on the container element.

Test: calls onScroll when container is scrolled
  - Render with onScroll handler
  - Fire scroll event on container
  - Assert onScroll was called
```

### Integration Test Specifications

#### infinite-scroll.integration.test.tsx

```
Test: loads multiple pages sequentially
  - Create a mock data source with 3 pages
  - Render InfiniteScroll with the first page
  - Trigger sentinel intersection -> assert page 2 loads
  - Trigger sentinel intersection again -> assert page 3 loads
  - Assert hasMore becomes false after last page

Test: handles error and retry flow
  - Render with onLoadMore that fails on second call
  - Load first page successfully
  - Trigger intersection -> onLoadMore throws
  - Assert error state shown
  - Click retry -> assert successful recovery

Test: handles rapid re-mount
  - Mount, trigger load, unmount, remount
  - Assert no errors, observer properly cleaned up and recreated
```

#### bidirectional-scroll.integration.test.tsx

```
Test: loads data in both directions
  - Render with initial data, hasPrevious=true, hasNext=true
  - Trigger top sentinel -> assert onLoadPrevious called
  - Trigger bottom sentinel -> assert onLoadNext called

Test: handles concurrent top and bottom loading
  - Trigger both sentinels
  - Assert both loaders shown, no duplicate calls

Test: full chat scenario
  - Start with middle page of messages
  - Scroll up to load older messages (trigger top sentinel multiple times)
  - Scroll down to load newer messages (trigger bottom sentinel)
  - Assert all data loaded correctly
```

### Coverage Target

- Statements: 95%+
- Branches: 90%+
- Functions: 95%+
- Lines: 95%+

---

## 8. Coding Standards

### TypeScript

- `strict: true` in tsconfig -- enables all strict checks
- No `any` types anywhere -- use `unknown` and narrow, or proper generics
- All components use explicit return types
- All hook parameters are typed via interfaces (not inline objects)

### React Patterns

- All public components must support `forwardRef`
- All hooks must follow the Rules of Hooks (no conditional hook calls)
- All `useEffect`/`useLayoutEffect` must return cleanup functions that disconnect observers
- Use `useCallback` for callback refs and event handlers passed to children
- Use `useRef` for mutable values that should not trigger re-renders (observer instance, callback ref, previous scroll position)
- Never use `useMemo` or `useCallback` without dependencies -- always specify the dependency array

### Exports

- Named exports only (no `export default`) -- enables better tree-shaking and IDE auto-import
- Re-export all public types from the root `index.ts`
- Internal modules (Sentinel, useScrollPreservation, useResolvedRoot, ssr utils) are NOT exported

### Documentation

- Every public function, component, hook, and type must have JSDoc with:
  - Description of what it does
  - `@param` for each parameter
  - `@returns` description
  - `@example` with working code snippet
- Internal functions should have brief inline comments explaining "why", not "what"

### Code Style

- Prettier with default settings (printWidth: 80, singleQuote: true, trailingComma: 'all')
- ESLint with recommended rules + react-hooks plugin
- No console.log in source (only in examples)
- No `// @ts-ignore` or `// @ts-expect-error` without a preceding comment explaining why

---

## 9. Performance Considerations

### Why IntersectionObserver Wins

| Aspect | scroll listener | IntersectionObserver |
|---|---|---|
| Fires on | Every pixel of scroll | Only at threshold crossings |
| Thread | Main thread | Browser-managed (async) |
| Geometry reads | Manual getBoundingClientRect | Browser-optimized internal |
| Throttle needed | Yes (manual) | No (built-in) |
| Multiple targets | One listener per target (or complex delegation) | Single observer, many targets |
| Battery/CPU | High | Low |

### Implementation Performance Guidelines

1. **Stable observer instances**: The `useIntersectionObserver` hook only recreates the observer when `root`, `rootMargin`, or `threshold` change. Callback changes do NOT trigger recreation (the callback is stored in a ref).

2. **Threshold comparison**: When `threshold` is an array, use `JSON.stringify(threshold)` as the useEffect dependency instead of the array reference, to avoid unnecessary observer recreation when the consumer creates a new array with the same values on each render.

3. **Callback ref pattern**: Using a callback ref (function) instead of `useRef` for the sentinel allows the hook to react to DOM node changes (mounting, conditional rendering) without an extra effect.

4. **Minimal re-renders**: The library triggers zero internal state updates. It only calls consumer callbacks. The consumer decides when to re-render by updating their own state (isLoading, data, etc.).

5. **Observer reuse**: For `BidirectionalScroll`, both sentinels use the same `root` element (the scroll container). While the current design creates two separate observers (one per sentinel), this is fine because IntersectionObserver instances are lightweight. The browser may internally batch observations on the same root.

---

## 10. SSR and Edge Cases

### Server-Side Rendering

The `canUseDOM` and `canUseIntersectionObserver` checks in `src/utils/ssr.ts` gate all browser API access:

```typescript
export const canUseDOM: boolean =
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  typeof window.document.createElement !== 'undefined';

export const canUseIntersectionObserver: boolean =
  canUseDOM && typeof IntersectionObserver !== 'undefined';
```

In the `useIntersectionObserver` hook:
- If `canUseIntersectionObserver` is false, the hook returns a no-op ref setter
- No observer is created, no callbacks fire
- The component renders normally (just without scroll detection)

In `useResolvedRoot`:
- `document.querySelector` is only called inside a `useEffect` (which only runs on the client)
- The root starts as `undefined` (not yet resolved) and is set to `null` (viewport) or an Element after mount

### Edge Cases Enumerated

1. **Scrollable container not yet mounted**: `useResolvedRoot` returns `undefined` until the effect runs. The observer hook treats `undefined` root as "not ready" and does not create an observer until root is resolved.

2. **Rapid hasMore toggling**: If hasMore flips true/false/true quickly, the sentinel mounts/unmounts/remounts. The callback ref handles this: when the sentinel unmounts, the old node is unobserved. When it remounts, the new node is observed. No stale state.

3. **display:none container**: IntersectionObserver reports `isIntersecting: false` for invisible elements. No false positives -- loading simply does not trigger, which is correct.

4. **React Strict Mode (double effect execution)**: In dev mode, React 18+ runs effects twice. The observer hook is safe: the first cleanup disconnects the first observer, the second effect creates a new one. No leak.

5. **Concurrent React features**: The library does not use `useState` for internal state, so there are no tearing risks. All mutable state is in refs. `useLayoutEffect` for scroll preservation runs synchronously, which is safe under concurrent rendering because layout effects are not deferred.

6. **Component unmount during async loadMore**: The observer is disconnected on unmount. If the consumer's async callback resolves after unmount, that is the consumer's responsibility to handle (e.g., with an AbortController or a mounted-check ref). The library does not fire any callbacks after unmount.

7. **Multiple InfiniteScroll on same page**: Each component instance creates its own observer. No global state, no conflicts.

8. **Zero items initially**: If children is empty, the sentinel still renders and can trigger the first load. This supports the "load on mount" pattern.

---

## 11. npm Publishing Checklist

- [ ] Verify package name `react-observer-scroll` is available on npm: `npm view react-observer-scroll`
- [ ] `package.json` has all required fields: name, version, description, keywords, author, license, repository, homepage, bugs
- [ ] `files` field includes only: `dist`, `README.md`, `LICENSE`, `CHANGELOG.md`
- [ ] `sideEffects: false` is set for tree-shaking
- [ ] `peerDependencies` lists `react >=16.8.0` and `react-dom >=16.8.0`
- [ ] `exports` map has `types` condition listed FIRST
- [ ] `prepublishOnly` script runs lint, typecheck, test, and build
- [ ] `README.md` has badges: npm version, bundle size, CI status, license
- [ ] `CHANGELOG.md` follows Keep a Changelog format
- [ ] `LICENSE` file exists (MIT)
- [ ] Run `npm pack --dry-run` to verify package contents before publishing
- [ ] Run `npm publish --access public` for first publish
- [ ] Enable npm provenance: add `--provenance` flag in CI publish step
- [ ] Tag release in git: `git tag v0.1.0 && git push --tags`
- [ ] Create GitHub Release from the tag

### README Badge Templates

```markdown
[![npm version](https://img.shields.io/npm/v/react-observer-scroll.svg)](https://www.npmjs.com/package/react-observer-scroll)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-observer-scroll)](https://bundlephobia.com/package/react-observer-scroll)
[![CI](https://github.com/<owner>/react-observer-scroll/actions/workflows/ci.yml/badge.svg)](https://github.com/<owner>/react-observer-scroll/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/react-observer-scroll.svg)](https://github.com/<owner>/react-observer-scroll/blob/main/LICENSE)
```

---

## 12. CI/CD Pipeline

### ci.yml (runs on all PRs and pushes to main)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npm run test:coverage

  build:
    runs-on: ubuntu-latest
    needs: [lint-typecheck, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - name: Verify dist output
        run: |
          test -f dist/react-observer-scroll.js
          test -f dist/react-observer-scroll.umd.cjs
          test -f dist/index.d.ts
```

### publish.yml (runs on release tag)

```yaml
name: Publish

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Matrix Testing Note

For testing across React versions (16.8, 17, 18, 19), you can add a separate CI job that uses `npm install --no-save react@17 react-dom@17` etc. and runs the test suite. This is optional for initial release but recommended before v1.0.

---

## 13. Key Implementation Code Patterns

### useIntersectionObserver (core hook, full implementation)

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { canUseIntersectionObserver } from '../utils/ssr';

export interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  rootMargin?: string;
  root?: Element | null;
  enabled?: boolean;
  onIntersect: (entry: IntersectionObserverEntry) => void;
}

export function useIntersectionObserver({
  threshold = 0,
  rootMargin = '0px',
  root = null,
  enabled = true,
  onIntersect,
}: UseIntersectionObserverOptions): (node: Element | null) => void {
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
    if (!canUseIntersectionObserver || !enabled) {
      observerRef.current?.disconnect();
      observerRef.current = null;
      return;
    }

    const thresholdValue = Array.isArray(threshold) ? threshold : threshold;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onIntersectRef.current(entry);
          }
        }
      },
      { root, rootMargin, threshold: thresholdValue },
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
}
```

### useScrollPreservation (scroll position save/restore)

```typescript
import { useLayoutEffect, useRef, RefObject } from 'react';

export function useScrollPreservation(
  containerRef: RefObject<HTMLElement | null>,
  dataLength: number,
  isLoadingPrevious: boolean,
): void {
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
}
```

### useResolvedRoot (SSR-safe root resolution)

```typescript
import { useState, useEffect } from 'react';
import { canUseDOM } from '../utils/ssr';

/**
 * Resolves a CSS selector string to a DOM Element for use as IntersectionObserver root.
 * Returns undefined while resolving (SSR or before mount), null for viewport, or Element.
 */
export function useResolvedRoot(
  scrollableTarget?: string,
): Element | null | undefined {
  const [root, setRoot] = useState<Element | null | undefined>(undefined);

  useEffect(() => {
    if (!canUseDOM) return;

    if (scrollableTarget) {
      const element = document.querySelector(scrollableTarget);
      if (element) {
        setRoot(element);
      } else {
        console.warn(
          `[react-observer-scroll] scrollableTarget "${scrollableTarget}" not found in DOM.`,
        );
        setRoot(null);
      }
    } else {
      setRoot(null); // null = viewport
    }
  }, [scrollableTarget]);

  return root;
}
```

### Sentinel Component

```typescript
import React, { forwardRef } from 'react';

export const Sentinel = forwardRef<HTMLDivElement, { className?: string }>(
  ({ className }, ref) => (
    <div
      ref={ref}
      className={className}
      style={{
        height: 0,
        width: 0,
        padding: 0,
        margin: 0,
        border: 'none',
        overflow: 'hidden',
        visibility: 'hidden',
      }}
      aria-hidden="true"
      data-testid="ros-sentinel"
    />
  ),
);
Sentinel.displayName = 'Sentinel';
```

---

## 14. Quick Reference Commands

```bash
# Development
npm run dev          # Start Vite dev server with demo app
npm run build        # Type-check and build library to dist/
npm run test         # Run all tests once
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run lint         # Check for linting errors
npm run lint:fix     # Auto-fix linting errors
npm run format       # Format code with Prettier
npm run typecheck    # Run TypeScript compiler check

# Publishing
npm pack --dry-run   # Preview what will be published
npm publish --access public  # Publish to npm (first time)
npm publish          # Publish subsequent versions
```

---

## 15. IntersectionObserver API Quick Reference

For implementers who need a refresher without leaving this file.

**Constructor**: `new IntersectionObserver(callback, options?)`

**Options**:
- `root: Element | null` -- ancestor element as viewport (null = browser viewport)
- `rootMargin: string` -- margin around root, CSS syntax ("10px 20px 30px 40px"), px or %
- `threshold: number | number[]` -- 0 to 1, visibility ratio(s) that trigger callback

**Callback**: `(entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void`

**Entry properties**:
- `target: Element` -- the observed element
- `isIntersecting: boolean` -- currently crossing threshold?
- `intersectionRatio: number` -- 0.0 to 1.0 visible ratio
- `boundingClientRect: DOMRectReadOnly` -- target's bounding box
- `intersectionRect: DOMRectReadOnly` -- visible intersection area
- `rootBounds: DOMRectReadOnly | null` -- root's bounding box
- `time: DOMHighResTimeStamp` -- when intersection was recorded

**Methods**:
- `observer.observe(target)` -- start observing (callback fires immediately on first observe)
- `observer.unobserve(target)` -- stop observing one target
- `observer.disconnect()` -- stop observing all targets
- `observer.takeRecords()` -- flush pending entries synchronously

**Key behaviors**:
- Callback fires on first `observe()` call even if element has not moved
- Configuration is immutable after construction -- must create new observer to change options
- Target must be a descendant of root (if root is specified)
- All elements treated as their smallest enclosing rectangle
- Browser support: all modern browsers since March 2019

---

## Sources and References

- [MDN: Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [MDN: IntersectionObserver constructor](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/IntersectionObserver)
- [MDN: IntersectionObserver interface](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver)
- [react-intersection-observer (thebuilder)](https://github.com/thebuilder/react-intersection-observer) -- reference for API patterns and test utilities
- [freeCodeCamp: Infinite Scrolling in React](https://www.freecodecamp.org/news/infinite-scrolling-in-react/)
- [LogRocket: 3 ways to implement infinite scroll](https://blog.logrocket.com/react-infinite-scroll/)
- [Dual Publishing ESM/CJS with tsup](https://johnnyreilly.com/dual-publishing-esm-cjs-modules-with-tsup-and-are-the-types-wrong)
- [Vite Library Mode](https://vite.dev/guide/build.html#library-mode)
