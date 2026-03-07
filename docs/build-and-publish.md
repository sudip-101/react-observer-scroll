# Build, Test, and Publish — Reference

## Overview

`react-observer-scroll` uses a dual-mode Vite configuration: one mode for building the npm library, another for the demo app. Library code lives in `lib/`, the demo app in `src/`, and tests in `tests/`.

## Project Structure

```
react-observer-scroll/
├── lib/                        # Library source (npm-published)
│   ├── components/             # InfiniteScroll, BidirectionalScroll, Sentinel
│   ├── hooks/                  # useIntersectionObserver, useResolvedRoot, useScrollPreservation
│   ├── types/index.ts          # All TypeScript interfaces
│   ├── utils/ssr.ts            # SSR safety checks
│   └── index.ts                # Public exports
├── src/                        # Demo app (NOT published)
│   ├── screens/                # Home, InfiniteScrollDemo, BidirectionalScrollDemo
│   ├── components/             # UI components (Layout, cards, skeletons, toggles)
│   ├── hooks/                  # Data hooks (usePhotos, useMessages, useTheme)
│   ├── utils/constants.ts      # Demo constants
│   └── lib/api.ts              # API helpers
├── tests/                      # Test suite
├── dist/                       # Library build output (generated)
├── dist-demo/                  # Demo build output (generated)
├── tsconfig.json               # Base TypeScript config
├── tsconfig.lib.json           # Library build config
├── tsconfig.app.json           # Demo app config
├── vite.config.ts              # Dual-mode Vite config
├── vitest.config.ts            # Test runner config
├── eslint.config.js            # ESLint flat config
├── .prettierrc                 # Prettier config
└── package.json
```

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Starts Vite dev server for the demo app |
| `npm run build` | Typechecks lib (`tsconfig.lib.json`) + builds library to `dist/` |
| `npm run build:demo` | Typechecks app (`tsconfig.app.json`) + builds demo to `dist-demo/` |
| `npm run test` | Runs all 63 tests once |
| `npm run test:watch` | Runs tests in watch mode |
| `npm run test:coverage` | Tests with V8 coverage report |
| `npm run typecheck` | `tsc -p tsconfig.lib.json --noEmit` |
| `npm run lint` | ESLint on `lib/` and `tests/` |
| `npm run lint:fix` | Auto-fix lint errors |
| `npm run format` | Prettier on `lib/`, `tests/`, `src/` |
| `npm run format:check` | Check formatting without writing |
| `npm run prepublishOnly` | lint → typecheck → test → build (gate for npm publish) |

## Dual-Mode Vite Configuration

`vite.config.ts` uses an async function with dynamic imports to conditionally load plugins:

### Library Mode (`vite build --mode lib`)

```typescript
if (mode === 'lib') {
  const dts = (await import('vite-plugin-dts')).default;
  return {
    plugins: [react(), dts({ include: ['lib'], exclude: ['tests', 'src'] })],
    build: {
      lib: {
        entry: resolve(__dirname, 'lib/index.ts'),
        name: 'ReactObserverScroll',
        fileName: 'react-observer-scroll',
        formats: ['es', 'umd'],
      },
      rollupOptions: {
        external: ['react', 'react-dom', 'react/jsx-runtime'],
        output: {
          globals: { react: 'React', 'react-dom': 'ReactDOM', 'react/jsx-runtime': 'jsxRuntime' },
        },
      },
    },
  };
}
```

- Entry: `lib/index.ts`
- Output: `dist/react-observer-scroll.js` (ESM) + `dist/react-observer-scroll.umd.cjs` (UMD) + `dist/index.d.ts`
- `vite-plugin-dts` generates TypeScript declaration files
- `react`, `react-dom`, `react/jsx-runtime` are externalized (not bundled)

### Demo Mode (default)

```typescript
const tailwindcss = (await import('@tailwindcss/vite')).default;
return {
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@lib': resolve(__dirname, 'lib') } },
  build: { outDir: 'dist-demo' },
};
```

- Tailwind CSS plugin for styling
- `@lib` alias points to `./lib` for importing library code in demo
- Output to `dist-demo/` (separate from library build)

**Why dynamic imports?** `@tailwindcss/vite` is not needed for library builds, and `vite-plugin-dts` is not needed for demo builds. Dynamic imports prevent cross-mode import errors.

## TypeScript Configuration

### Base (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  }
}
```

### Library (`tsconfig.lib.json`)

Extends base. `rootDir: ./lib`, `include: ["lib"]`, `outDir: ./dist`. Generates declarations. Excludes `tests/` and `src/`.

### Demo App (`tsconfig.app.json`)

Extends base. `include: ["src", "lib"]`, `noEmit: true` (typecheck only, Vite handles compilation). No declarations generated.

## Test Configuration

### Vitest (`vitest.config.ts`)

```typescript
{
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.{ts,tsx}'],
      exclude: ['lib/index.ts', 'lib/types/**'],
      thresholds: { statements: 95, branches: 90, functions: 95, lines: 95 },
    },
  },
}
```

- **Environment**: jsdom (simulates browser DOM)
- **Coverage**: V8 provider, only measures `lib/` code, excludes barrel exports and type-only files
- **Thresholds**: 95% statements, 90% branches, 95% functions, 95% lines
- **Setup**: `tests/setup.ts` imports `@testing-library/jest-dom/vitest` and runs `cleanup()` after each test

### IntersectionObserver Mock

`tests/helpers/mock-intersection-observer.ts` provides a controllable mock:

```typescript
const io = mockIntersectionObserver();

// Simulate element entering viewport
io.triggerIntersection(sentinelElement, true);

// Query observer state
io.getObserverForElement(element);
io.getLastInstance();
io.getConstructor();

// Cleanup
io.reset();
```

## Package Configuration

### package.json (Key Fields)

```json
{
  "name": "react-observer-scroll",
  "version": "1.0.0",
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
  "files": ["dist", "README.md", "LICENSE", "CHANGELOG.md"],
  "sideEffects": false,
  "peerDependencies": {
    "react": ">=16.8.0",
    "react-dom": ">=16.8.0"
  }
}
```

| Field | Purpose |
|-------|---------|
| `type: "module"` | ESM package |
| `main` | UMD entry for CommonJS consumers |
| `module` | ESM entry for modern bundlers |
| `types` | TypeScript declarations entry |
| `exports` | Conditional exports map (`types` listed first for TypeScript resolution) |
| `files` | Only `dist/` and docs shipped to npm (no source, tests, or demo) |
| `sideEffects: false` | Enables aggressive tree-shaking by bundlers |
| `peerDependencies` | React 16.8+ (hooks minimum) |

### Linting (`eslint.config.js`)

- Extends: `@eslint/js` recommended + `typescript-eslint` recommended
- Plugin: `react-hooks` with recommended rules
- Custom: `@typescript-eslint/no-unused-vars` allows `_` prefixed params
- Ignores: `dist/`, `node_modules/`, `coverage/`

### Formatting (`.prettierrc`)

```json
{ "printWidth": 80, "singleQuote": true, "trailingComma": "all" }
```

## Publishing Checklist

```bash
# 1. Verify package contents
npm pack --dry-run

# 2. Run full validation
npm run lint
npm run typecheck
npm run test
npm run build

# 3. Verify output files exist
ls dist/react-observer-scroll.js dist/react-observer-scroll.umd.cjs dist/index.d.ts

# 4. Publish
npm publish --access public
```

The `prepublishOnly` script runs lint → typecheck → test → build automatically before `npm publish`.

## CI/CD

### CI (`.github/workflows/ci.yml`)

Runs on PRs and pushes to main:
1. **lint-typecheck**: Install, lint, typecheck
2. **test**: Run tests with coverage across Node 18/20/22
3. **build**: Build library, verify dist output files exist

### Publish (`.github/workflows/publish.yml`)

Runs on `v*` tags:
1. Install, lint, typecheck, test, build
2. `npm publish --provenance --access public`
3. Requires `NPM_TOKEN` secret and `id-token: write` permission for provenance

## Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | 5.9.x | Type checking |
| `vite` | 7.3.x | Build tool + dev server |
| `vitest` | 4.0.x | Test runner |
| `@vitejs/plugin-react` | 5.x | React JSX transform for Vite |
| `vite-plugin-dts` | 4.x | TypeScript declaration generation |
| `@testing-library/react` | 16.x | Component testing utilities |
| `@testing-library/jest-dom` | 6.x | DOM assertion matchers |
| `jsdom` | 28.x | DOM environment for tests |
| `@vitest/coverage-v8` | 4.x | Code coverage |
| `eslint` | 9.x | Linting (flat config) |
| `typescript-eslint` | 8.x | TypeScript ESLint rules |
| `eslint-plugin-react-hooks` | 7.x | React hooks lint rules |
| `prettier` | 3.x | Code formatting |
| `react` / `react-dom` | 19.x | Dev dependency (peer dep for consumers) |
| `react-router-dom` | 7.x | Demo app routing |
| `tailwindcss` / `@tailwindcss/vite` | 4.x | Demo app styling |
