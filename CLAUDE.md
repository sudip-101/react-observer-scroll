# CLAUDE.md — react-observer-scroll

## Overview
IntersectionObserver-powered `InfiniteScroll` and `BidirectionalScroll` React components. Zero deps, SSR-safe, TypeScript-strict, tree-shakeable.

## Project Structure
```
lib/                        # Library (npm-published, ESM+UMD)
  components/
    InfiniteScroll.tsx       # Single-direction infinite scroll (forwardRef)
    BidirectionalScroll.tsx  # Dual-direction scroll with scroll preservation (forwardRef)
    Sentinel.tsx             # Internal zero-height invisible observer target
  hooks/
    useIntersectionObserver.ts  # Core hook — returns callback ref for observed element
    useResolvedRoot.ts          # SSR-safe CSS selector → Element resolution
    useScrollPreservation.ts    # Scroll position save/restore on prepend
  types/index.ts             # All shared interfaces and types
  utils/ssr.ts               # canUseDOM (const), canUseIntersectionObserver (fn)
  index.ts                   # Public exports

src/                        # Demo app (NOT published, Tailwind + React Router)
  screens/                   # Home, InfiniteScrollDemo, BidirectionalScrollDemo
  components/                # Layout, PhotoCard, MessageBubble, skeletons, ThemeToggle, Spinner, ViewToggle, CodeBlock
  hooks/                     # usePhotos, useMessages, useTheme
  utils/constants.ts         # FEED_ITEMS_LIMIT (12), MESSAGES_LIMIT (20)
  lib/api.ts                 # Picsum + DummyJSON API helpers

tests/                      # Vitest + @testing-library/react + jsdom (63 tests)
  helpers/mock-intersection-observer.ts  # Controllable IO mock
  components/                # Unit: InfiniteScroll (23), BidirectionalScroll (18)
  hooks/                     # Unit: useIntersectionObserver (11), useScrollPreservation (2)
  integration/               # InfiniteScroll (5), BidirectionalScroll (4)
```

## Public API (lib/index.ts)
```
Components:  InfiniteScroll, BidirectionalScroll
Hooks:       useIntersectionObserver
Types:       InfiniteScrollProps, BidirectionalScrollProps, UseIntersectionObserverOptions,
             ScrollDirection ('top' | 'bottom'), ScrollIndicatorInfo
```

## Commands
```bash
npm run dev             # Vite dev server (demo app)
npm run build           # tsc -p tsconfig.lib.json --noEmit && vite build --mode lib
npm run build:demo      # tsc -p tsconfig.app.json --noEmit && vite build
npm run test            # Run 63 tests
npm run test:coverage   # Tests + V8 coverage (95%+ thresholds)
npm run typecheck       # tsc -p tsconfig.lib.json --noEmit
npm run lint            # ESLint on lib/ and tests/
npm run format          # Prettier on lib/, tests/, src/
```

## Build Configuration

### Dual-Mode Vite Config (vite.config.ts)
- `--mode lib`: library build — `lib/index.ts` entry, ESM+UMD, dts generation, externalizes react/react-dom/react-jsx-runtime, NO tailwind
- Default: demo SPA — Tailwind + `@lib` alias → `./lib`, output to `dist-demo/`
- Plugins loaded via dynamic `await import()` so lib mode never loads tailwind

### TypeScript Configs
- `tsconfig.json` — Base: ES2020, strict, react-jsx, bundler moduleResolution, declaration+declarationMap
- `tsconfig.lib.json` — Extends base, rootDir=lib, include=["lib"], outDir=dist
- `tsconfig.app.json` — Extends base, include=["src","lib"], noEmit (typecheck only)

### Package Output
- `dist/react-observer-scroll.js` (ESM), `dist/react-observer-scroll.umd.cjs` (UMD), `dist/index.d.ts`
- `files: ["dist", "README.md", "LICENSE", "CHANGELOG.md"]`
- `sideEffects: false`, `exports` map with types first
- `peerDependencies: react >=16.8.0, react-dom >=16.8.0`

---

## Critical Architecture Decisions

### Sentinel Placement (CRITICAL — wrong order causes infinite load loops)
- **direction="bottom"**: `children → sentinel → loader → endMessage`
- **direction="top"**: `endMessage → loader → sentinel → children`
- Sentinel at the END of scroll direction — only visible when user scrolls through all content
- Sentinel only rendered when `hasMore === true`

### Observer Lifecycle (useIntersectionObserver)
- Returns a **callback ref** (not useRef) — reacts to DOM node changes
- `onIntersect` stored in `useRef` — callback identity changes do NOT recreate observer
- Observer recreated only when `root`, `rootMargin`, `threshold`, or `enabled` change
- Threshold arrays serialized to string (`join(',')`) for stable dependency comparison
- Only fires callback when `entry.isIntersecting === true` (filters false entries)
- Returns no-op when `canUseIntersectionObserver()` returns false (SSR)

### BidirectionalScroll Internal Patterns

**Container dual-ref pattern:**
- `containerRef` (useRef) — for scroll preservation (needs mutable ref)
- `rootElement` (useState) — for observer root (needs state to trigger re-render)
- Single callback ref updates both: `containerCallbackRef` sets ref + calls `setRootElement`
- `useImperativeHandle` exposes container to consumer via forwardRef

**Mutual exclusion — only one direction loads at a time:**
- `isLoadingAny = isLoadingPrevious || isLoadingNext`
- Both sentinels: `enabled: has[Direction] && !isLoadingAny && rootElement !== null`
- Render guard: `{isLoadingNext && !isLoadingPrevious && resolvedNextLoader}`
- Prevents both firing simultaneously (e.g., on empty container mount)

**Loader fallback chain:**
- `resolvedPreviousLoader = previousLoader ?? loader`
- `resolvedNextLoader = nextLoader ?? loader`

**Scroll preservation (useScrollPreservation):**
- Two coordinated `useLayoutEffect` hooks with `isPrependingRef` flag
- Effect 1 (deps: isLoadingPrevious): captures `scrollHeight` + `scrollTop` when prepend starts
- Effect 2 (deps: dataLength): restores `scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight)`
- Must be `useLayoutEffect` — runs sync after DOM mutation, before paint, prevents flicker

### SSR Safety
- `canUseDOM`: static boolean — `typeof window/document/createElement !== 'undefined'`
- `canUseIntersectionObserver()`: lazy function — allows test mocks set up after module load
- `useResolvedRoot`: uses `useSyncExternalStore` with no-op `subscribe` — SSR-safe DOM queries
- All hooks return no-ops when browser APIs unavailable

---

## Demo App Patterns

### Data Fetching Hooks
- **usePhotos**: `pageRef` (useRef, not useState) keeps `loadMore` callback identity stable across page increments. MAX_PAGES=5 guard.
- **useMessages**: `hasNext/hasPrevious` start as `false` — sentinels can't fire until `loadInitial()` sets data and enables directions. Uses offset/skip pagination from INITIAL_SKIP=100 (middle of dataset).

### Chat Scroll-to-Bottom on Mount (CRITICAL for BidirectionalScroll demos)
```tsx
const hasScrolledInitial = useRef(false);
useLayoutEffect(() => {
  if (!isInitialLoading && containerRef.current && !hasScrolledInitial.current) {
    hasScrolledInitial.current = true;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }
}, [isInitialLoading]);
```
- Without this, container starts at scrollTop=0 → top sentinel visible → auto-triggers `loadPrevious` → flicker/jump
- `useLayoutEffect` runs BEFORE the observer `useEffect` creates IntersectionObservers, so scroll position is set before sentinels activate

### View Toggle (Preview/Code)
- Each demo screen has a laptop/code icon toggle
- Code view uses Vite `?raw` imports to show actual source files at build time
- `CodeBlock` component with tabbed file viewer (demo screen + hook)
- Type declarations in `src/vite-env.d.ts`

### Theme
- `useTheme`: light/dark toggle, detects system preference on first load, persists to localStorage, applies `.dark` class on `<html>`
- `@custom-variant dark (&:where(.dark, .dark *))` in `index.css`

### Skeletons
- `PhotoCardSkeleton`: matches PhotoCard aspect-ratio (4/3) to prevent CLS
- `MessageBubbleSkeleton` + `MessageSkeletonGroup(length)`: configurable count, alternating left/right

---

## Coding Standards
- **Arrow functions everywhere** — components, hooks, helpers, tests, API functions
  - Exception: `MockIO` in test helper uses `function` (needs `this` + `new`)
- **Named exports only** — no default exports, enables tree-shaking
- **No `any`** — use `unknown` and narrow, or proper generics
- **JSDoc** on all public exports with `@param`, `@returns`, `@example`
- Prettier: printWidth 80, singleQuote, trailingComma all
- ESLint: typescript-eslint recommended + react-hooks plugin
- Unused params: prefix with `_` (eslint argsIgnorePattern)

---

## Testing Patterns

### Mock Setup
- `mockIntersectionObserver()` from `tests/helpers/` — create per `beforeEach`, `reset()` per `afterEach`
- Returns: `getConstructor()`, `getLastInstance()`, `getObserverForElement(el)`, `triggerIntersection(target, isIntersecting)`, `triggerAll()`, `reset()`

### Querying
- Single sentinel: `screen.getByTestId('ros-sentinel')`
- Bidirectional (2 sentinels): `screen.getAllByTestId('ros-sentinel')` → `[top, bottom]`
- Container: `screen.getByTestId('ros-bidirectional-container')`

### Triggering and Asserting
- `io.triggerIntersection(sentinel, true)` → assert callback called
- `io.triggerIntersection(sentinel, false)` → assert callback NOT called
- Async: `await act(async () => { io.triggerIntersection(...) })`
- Observer disabled: `expect(io.getObserverForElement(sentinel)).toBeUndefined()`

### What Tests Verify (Behavioral)
- Callbacks fire only on explicit intersection, never on mount
- `isLoading=true` disables observer (prevents duplicate calls)
- `hasMore=false` removes sentinel from DOM
- Sentinel DOM position matches direction (after content for bottom, before for top)
- Element ordering: children > sentinel > loader > endMessage
- Mutual exclusion: only one direction loads at a time
- Loader priority: previous > next (never both visible)
- Scroll preservation math: `newScrollTop = oldScrollTop + heightDifference`
- forwardRef exposes container element
- Observer recreated on option changes, NOT on callback identity changes

### Coverage
- Provider: V8
- Include: `lib/**/*.{ts,tsx}`
- Exclude: `lib/index.ts` (re-exports), `lib/types/**` (interfaces only)
- Thresholds: statements 95%, branches 90%, functions 95%, lines 95%
