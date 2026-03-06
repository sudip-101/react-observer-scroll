# Agent Memory -- react-observer-scroll

## Project Structure
- Vite library mode (not tsup) -- co-locates demo app with library source
- Entry: `src/index.ts`, library code in `src/`, tests in `tests/`
- Build output: `dist/react-observer-scroll.js` (ESM) + `.umd.cjs` (CJS) + `.d.ts`
- Config files: vite.config.ts, vitest.config.ts, tsconfig.json

## Key Architecture Decisions
- Sentinel pattern (invisible div) instead of React.cloneElement -- avoids forwardRef requirement on consumer components
- Callback ref pattern in useIntersectionObserver (not useRef) -- handles dynamic DOM node changes
- onIntersect stored in useRef to avoid observer recreation on callback identity change
- threshold serialized as string for stable useEffect dependency comparison
- Consumer owns all state (loading, error, pagination) -- library only detects intersection and calls callbacks
- useLayoutEffect for scroll preservation in BidirectionalScroll (sync before paint)

## IntersectionObserver API Gotchas
- Callback fires immediately on first observe() even if element hasn't moved
- Configuration is immutable -- must create new observer to change options
- Target must be descendant of root (when root is specified)
- isIntersecting=false for elements in display:none containers
- threshold option (singular) in constructor, but thresholds property (plural) on instance

## Testing Patterns
- Mock IO with vi.stubGlobal('IntersectionObserver', MockIO)
- Track observed elements in a Map<Element, MockInstance> for targeted intersection triggers
- Per-test mock setup (not global) for test-specific control
- Vitest + @testing-library/react + jsdom environment
- Mock scrollHeight/scrollTop on container for scroll preservation tests

## Publishing Notes
- `types` must be FIRST in exports condition map for TypeScript resolution
- `sideEffects: false` in package.json for tree-shaking
- `react/jsx-runtime` must be in externals alongside react and react-dom
- `npm pack --dry-run` to verify contents before publish
- `--provenance` flag for npm supply chain security
