# CLAUDE.md — react-observer-scroll

## Overview
IntersectionObserver-powered `InfiniteScroll` and `BidirectionalScroll` React components. Zero deps, SSR-safe, TypeScript-strict, tree-shakeable.

## Project Structure
```
lib/                    # Library (npm-published, ESM+UMD)
  components/           # InfiniteScroll, BidirectionalScroll, Sentinel (internal)
  hooks/                # useIntersectionObserver, useResolvedRoot, useScrollPreservation
  types/index.ts        # All shared interfaces
  utils/ssr.ts          # canUseDOM, canUseIntersectionObserver()
  index.ts              # Public exports

src/                    # Demo app (NOT published, Tailwind + React Router)
  screens/              # Home, InfiniteScrollDemo, BidirectionalScrollDemo
  components/           # Layout, PhotoCard, MessageBubble, skeletons, ThemeToggle, Spinner
  hooks/                # usePhotos, useMessages, useTheme
  lib/api.ts            # Picsum + DummyJSON API helpers

tests/                  # Vitest + @testing-library/react + jsdom
  helpers/mock-intersection-observer.ts   # Controllable IO mock with triggerIntersection()
  components/           # Unit tests for InfiniteScroll, BidirectionalScroll
  hooks/                # Unit tests for useIntersectionObserver, useScrollPreservation
  integration/          # Multi-page load flows, error recovery, bidirectional scenarios
```

## Commands
```bash
npm run dev             # Vite dev server (demo app)
npm run build           # Typecheck lib + build library to dist/ (--mode lib)
npm run build:demo      # Typecheck app + build demo to dist-demo/
npm run test            # Run 62 tests once
npm run test:coverage   # Tests + V8 coverage (95%+ thresholds)
npm run typecheck       # tsc -p tsconfig.lib.json --noEmit
npm run lint            # ESLint on lib/ and tests/
npm run format          # Prettier on lib/, tests/, src/
```

## Dual-Mode Vite Config
- `vite build --mode lib` → library build (dts, externals react/react-dom, no tailwind)
- `vite build` (default) → demo SPA build with Tailwind + `@lib` alias → `./lib`
- Dynamic imports: tailwind and dts plugins loaded conditionally to avoid cross-mode errors

## TypeScript Configs
- `tsconfig.json` — Base: ES2020, strict, react-jsx, bundler moduleResolution
- `tsconfig.lib.json` — Extends base, rootDir=lib, include=["lib"], generates declarations
- `tsconfig.app.json` — Extends base, include=["src","lib"], noEmit (typecheck only)

## Critical Architecture Decisions

### Sentinel Placement (CRITICAL)
- **bottom direction**: `children → sentinel → loader → endMessage`
- **top direction**: `endMessage → loader → sentinel → children`
- Sentinel MUST be at the END of scroll direction so it's only visible when user scrolls through all content. Wrong placement causes infinite load loops.

### Mutual Exclusion in BidirectionalScroll
- `isLoadingAny = isLoadingPrevious || isLoadingNext`
- Both sentinels use `enabled: !isLoadingAny` — only one direction loads at a time
- Render guard: `{isLoadingNext && !isLoadingPrevious && nextLoader}`

### Scroll Preservation (Prepend)
- `useScrollPreservation` uses two `useLayoutEffect` hooks
- First: captures scrollHeight/scrollTop when isLoadingPrevious becomes true
- Second: on dataLength change, restores via `scrollTop = prev + (newHeight - prevHeight)`
- Must be `useLayoutEffect` (sync before paint) to prevent flicker

### Observer Lifecycle
- `useIntersectionObserver` returns a **callback ref** (not useRef)
- Callback stored in `useRef` — changing callback does NOT recreate observer
- Observer recreated only when `root`, `rootMargin`, `threshold`, or `enabled` change
- Threshold arrays serialized via `JSON.stringify` for stable deps

### SSR Safety
- `canUseDOM`: static boolean (window/document/createElement check)
- `canUseIntersectionObserver()`: function (allows mocking after module load)
- `useResolvedRoot`: uses `useSyncExternalStore` for SSR-safe DOM queries
- Hook returns no-op ref when IO unavailable

### BidirectionalScroll Container Pattern
- Uses callback ref to set both `containerRef` (MutableRef) and `rootElement` (state)
- State update triggers re-render so observer can use container as root
- `useImperativeHandle` exposes container to consumer via forwardRef (for programmatic scroll)

## Coding Standards
- **Arrow functions** for all React components (`export const X = () => ...`)
- **Named exports only** — no default exports
- **No `any`** — use `unknown` and narrow
- All public APIs have JSDoc with `@param`, `@returns`, `@example`
- Prettier: printWidth 80, singleQuote, trailingComma all
- ESLint: typescript-eslint recommended + react-hooks plugin
- Unused params: prefix with `_` (eslint configured)

## Testing Patterns
- Mock IO per-test via `mockIntersectionObserver()` from `tests/helpers/`
- Query sentinels: `screen.getByTestId('ros-sentinel')` or `getAllByTestId` (bidirectional has 2)
- Trigger loads: `io.triggerIntersection(sentinel, true)` then assert callback
- Async flows: wrap in `await act(async () => { ... })`
- Coverage excludes: `lib/index.ts` (re-exports), `lib/types/**` (interfaces)

## Demo App Patterns
- APIs: Picsum (`picsum.photos/v2/list`) for photos, DummyJSON (`dummyjson.com/comments`) for chat
- `usePhotos`: pageRef (useRef, not useState) for stable loadMore callback
- `useMessages`: starts with `hasNext=false, hasPrevious=false`, enables after `loadInitial()` returns
- Dark theme: `useTheme` hook with system detection, localStorage persistence, `.dark` class on `<html>`
- Skeletons: aspect-ratio-matched placeholders to prevent CLS

## Package Publishing
- `files: ["dist", "README.md", "LICENSE", "CHANGELOG.md"]`
- `sideEffects: false` for tree-shaking
- `exports` map: types first, then import/require conditions
- `peerDependencies: react >=16.8.0, react-dom >=16.8.0`
- Verify with `npm pack --dry-run` before publish
