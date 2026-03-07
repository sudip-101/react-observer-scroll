# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-07

### Added

- `InfiniteScroll` component for single-direction infinite scrolling
- `BidirectionalScroll` component for dual-direction scrolling (chat, timelines)
- `useIntersectionObserver` hook for custom observer usage
- Scroll position preservation when prepending content
- SSR-safe with graceful no-op when IntersectionObserver is unavailable
- Full TypeScript types with JSDoc documentation
- Dual ESM/UMD build output
