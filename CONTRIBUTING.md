# Contributing to react-observer-scroll

Thank you for your interest in contributing! This guide covers everything you need to get started.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Branch Strategy & Release Workflow](#branch-strategy--release-workflow)
- [Writing Code](#writing-code)
- [Testing](#testing)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Issues](#reporting-issues)
- [Requesting Features](#requesting-features)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you are expected to uphold this code. Please report unacceptable behavior via [GitHub Issues](https://github.com/sudip-101/react-observer-scroll/issues).

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/react-observer-scroll.git
   cd react-observer-scroll
   ```
3. **Add the upstream remote:**
   ```bash
   git remote add upstream https://github.com/sudip-101/react-observer-scroll.git
   ```
4. **Install dependencies:**
   ```bash
   npm install
   ```

---

## Development Setup

**Requirements:**
- Node.js 18 or higher
- npm 9 or higher

**Available scripts:**

| Command | Description |
|:--------|:------------|
| `npm run dev` | Start Vite dev server (demo app) |
| `npm run build` | Typecheck + build library to `dist/` |
| `npm run build:demo` | Typecheck + build demo app to `dist-demo/` |
| `npm run test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | Lint `lib/` and `tests/` |
| `npm run lint:fix` | Auto-fix lint errors |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without writing |

---

## Project Structure

```
react-observer-scroll/
├── lib/                    # Library source (published to npm)
│   ├── components/         # InfiniteScroll, BidirectionalScroll, Sentinel
│   ├── hooks/              # useIntersectionObserver, useResolvedRoot, useScrollPreservation
│   ├── types/index.ts      # All TypeScript interfaces
│   ├── utils/ssr.ts        # SSR safety checks
│   └── index.ts            # Public exports
├── src/                    # Demo app (NOT published)
│   ├── screens/            # Demo screens
│   ├── components/         # Demo UI components
│   └── hooks/              # Demo data hooks
├── tests/                  # Test suite
│   ├── components/         # Component tests
│   ├── hooks/              # Hook tests
│   ├── integration/        # Integration tests
│   └── helpers/            # Test utilities (IO mock)
├── docs/                   # Internal documentation
└── .github/workflows/      # CI/CD pipelines
```

**Key distinction:** `lib/` is the npm-published library. `src/` is the demo app. `tests/` covers `lib/` only.

---

## Development Workflow

### 1. Sync your fork

Before starting work, sync with upstream:

```bash
git checkout main
git fetch upstream
git merge upstream/main
```

### 2. Create a feature branch

Always branch off `main`:

```bash
git checkout -b feat/your-feature-name
```

**Branch naming conventions:**

| Prefix | Use for |
|:-------|:--------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `refactor/` | Code refactoring (no behavior change) |
| `docs/` | Documentation changes |
| `test/` | Adding or updating tests |
| `chore/` | Build config, CI, dependencies |

### 3. Make your changes

- Edit files in `lib/` for library changes
- Edit files in `tests/` for test changes
- Edit files in `src/` for demo app changes

### 4. Validate before committing

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

All four must pass. CI will run these automatically on your PR.

### 5. Commit your changes

Write clear, descriptive commit messages:

```
feat: add error state and retry support to InfiniteScroll

fix: prevent duplicate onLoadMore calls during rapid scrolling

docs: update BidirectionalScroll usage examples

test: add integration test for scroll preservation
```

### 6. Push and open a PR

```bash
git push origin feat/your-feature-name
```

Then open a Pull Request targeting the `main` branch on GitHub.

---

## Branch Strategy & Release Workflow

### Rules

- **`main` is the only publishable branch.** All releases are cut from `main`.
- **Never push directly to `main`.** All changes go through Pull Requests.
- **Feature branches** are created from `main` and merged back via PR.
- **CI runs on every PR** — lint, typecheck, tests (Node 18/20/22), and build must pass.

### Release process (maintainers only)

1. Merge all PRs for the release into `main`
2. On `main`, bump the version:
   ```bash
   npm version patch   # 1.0.0 → 1.0.1 (bug fixes)
   npm version minor   # 1.0.0 → 1.1.0 (new features, backward compatible)
   npm version major   # 1.0.0 → 2.0.0 (breaking changes)
   ```
   This updates `package.json` and creates a git tag (e.g. `v1.0.1`).
3. Push the tag:
   ```bash
   git push origin main --tags
   ```
4. The `publish.yml` workflow automatically:
   - Runs lint, typecheck, tests, and build
   - Publishes to npm with provenance
   - Creates a GitHub Release with auto-generated release notes

### Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **Patch** (`x.x.1`): Bug fixes, documentation, internal refactors
- **Minor** (`x.1.x`): New features, new props, new exports (backward compatible)
- **Major** (`1.x.x`): Breaking API changes (removed props, renamed exports, changed behavior)

---

## Writing Code

### Coding standards

- **TypeScript strict mode** — no `any`, no `@ts-ignore`
- **Arrow functions** for all exports (components, hooks, utilities)
- **Named exports only** — no `export default`
- **`import type`** for type-only imports
- **Prettier** formatting: single quotes, trailing commas, 80 char width
- **ESLint** with TypeScript and React Hooks rules

### Component conventions

- All public components use `forwardRef` and have a `displayName`
- All components support `className`, `style`, and `as` (polymorphic) props
- Internal components (e.g. `Sentinel`) are NOT exported from `lib/index.ts`

### Hook conventions

- All hooks follow the Rules of Hooks
- `useEffect` / `useLayoutEffect` always return cleanup functions
- Mutable values that shouldn't trigger re-renders go in `useRef`
- Callback refs use `useCallback` for stable identity

### What NOT to do

- Don't add runtime dependencies — the library has zero deps
- Don't export internal modules (`Sentinel`, `useScrollPreservation`, `useResolvedRoot`, `ssr`)
- Don't use `console.log` in library code (only `console.warn` for developer warnings)
- Don't add `@ts-ignore` or `@ts-expect-error` without a clear explanation

---

## Testing

### Test stack

- **Vitest** — test runner
- **@testing-library/react** — component rendering and queries
- **jsdom** — DOM environment
- **Custom IntersectionObserver mock** — `tests/helpers/mock-intersection-observer.ts`

### Running tests

```bash
npm run test              # Run once
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
```

### Coverage thresholds

All PRs must maintain these minimums on `lib/` code:

| Metric | Threshold |
|:-------|:----------|
| Statements | 95% |
| Branches | 90% |
| Functions | 95% |
| Lines | 95% |

### Writing tests

- Place tests in the matching directory under `tests/` (e.g. `tests/components/` for component tests)
- Use the IntersectionObserver mock for controlling intersection triggers:
  ```typescript
  const io = mockIntersectionObserver();

  // Simulate element entering viewport
  io.triggerIntersection(sentinelElement, true);

  // Cleanup
  io.reset();
  ```
- Test **behavior**, not implementation details
- Include both positive and negative cases (e.g. "calls onLoadMore" and "does NOT call onLoadMore when isLoading")

### Test file naming

- Unit tests: `ComponentName.test.tsx` or `hookName.test.ts`
- Integration tests: `feature-name.integration.test.tsx`

---

## Submitting a Pull Request

### Before submitting

- [ ] Your branch is up to date with `main`
- [ ] All commands pass: `npm run lint && npm run typecheck && npm run test && npm run build`
- [ ] New features include tests
- [ ] Bug fixes include a regression test
- [ ] No unrelated changes are included

### PR guidelines

- **Keep PRs focused.** One feature or fix per PR. Don't mix refactors with features.
- **Write a clear title** — e.g. "Add error state and retry to InfiniteScroll"
- **Describe what and why** in the PR body. Include:
  - What the change does
  - Why it's needed
  - How to test it
  - Screenshots/recordings for UI changes (demo app)
- **Link related issues** — use `Closes #123` or `Fixes #123` in the PR body

### Review process

1. CI must pass (lint, typecheck, tests on Node 18/20/22, build)
2. A maintainer will review your code
3. Address any feedback and push updates
4. Once approved, a maintainer will merge

---

## Reporting Issues

Found a bug? Please [open an issue](https://github.com/sudip-101/react-observer-scroll/issues/new) with:

- **Title**: Short, descriptive summary
- **Environment**: React version, browser, OS, bundler
- **Steps to reproduce**: Minimal code or repo that demonstrates the bug
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Screenshots/recordings**: If applicable (especially for scroll/visual bugs)

### Good bug report example

> **Title:** onLoadMore fires twice on initial mount with scrollableTarget
>
> **Environment:** React 18.2, Chrome 120, Vite 5.x
>
> **Steps to reproduce:**
> 1. Render InfiniteScroll with `scrollableTarget="#container"`
> 2. Container has `overflow: auto` and `height: 300px`
> 3. Initial content is shorter than container height
>
> **Expected:** onLoadMore fires once
> **Actual:** onLoadMore fires twice in quick succession

---

## Requesting Features

Have an idea? [Open an issue](https://github.com/sudip-101/react-observer-scroll/issues/new) with:

- **Title**: `[Feature] Short description`
- **Use case**: Why do you need this? What problem does it solve?
- **Proposed API**: How would the feature look from a consumer's perspective?
- **Alternatives considered**: Other approaches you've thought about

Feature requests that align with the library's [design principles](README.md#key-features) (minimal API, zero dependencies, externally controlled state) are more likely to be accepted.

---

## Questions?

If you're unsure about anything, feel free to [open a discussion](https://github.com/sudip-101/react-observer-scroll/issues) on GitHub. We're happy to help!

Thank you for contributing!
