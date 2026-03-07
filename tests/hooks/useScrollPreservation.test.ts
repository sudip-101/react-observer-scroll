import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useScrollPreservation } from '../../lib/hooks/useScrollPreservation';

const createMockContainer = (scrollHeight: number, scrollTop: number) => {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollHeight', {
    get: () => scrollHeight,
    configurable: true,
  });
  Object.defineProperty(el, 'scrollTop', {
    get: () => scrollTop,
    set: (v: number) => {
      scrollTop = v;
    },
    configurable: true,
  });
  return {
    el,
    getScrollTop: () => scrollTop,
    setScrollHeight: (h: number) => {
      scrollHeight = h;
      Object.defineProperty(el, 'scrollHeight', {
        get: () => h,
        configurable: true,
      });
    },
  };
};

describe('useScrollPreservation', () => {
  let container: ReturnType<typeof createMockContainer>;

  beforeEach(() => {
    container = createMockContainer(1000, 500);
  });

  it('preserves scroll position when content is prepended', () => {
    const { rerender } = renderHook(
      ({
        dataLength,
        isLoadingPrevious,
      }: {
        dataLength: number;
        isLoadingPrevious: boolean;
      }) => {
        const ref = useRef<HTMLElement>(container.el);
        useScrollPreservation(ref, dataLength, isLoadingPrevious);
      },
      { initialProps: { dataLength: 10, isLoadingPrevious: false } },
    );

    // Start loading previous items - captures scrollHeight=1000, scrollTop=500
    rerender({ dataLength: 10, isLoadingPrevious: true });

    // Simulate DOM adding content (scrollHeight increases by 300)
    container.setScrollHeight(1300);

    // Data arrives - dataLength changes triggers restoration
    rerender({ dataLength: 15, isLoadingPrevious: false });

    // scrollTop should be adjusted: 500 + (1300 - 1000) = 800
    expect(container.getScrollTop()).toBe(800);
  });

  it('does not adjust scroll when not prepending', () => {
    const { rerender } = renderHook(
      ({
        dataLength,
        isLoadingPrevious,
      }: {
        dataLength: number;
        isLoadingPrevious: boolean;
      }) => {
        const ref = useRef<HTMLElement>(container.el);
        useScrollPreservation(ref, dataLength, isLoadingPrevious);
      },
      { initialProps: { dataLength: 10, isLoadingPrevious: false } },
    );

    // Just add items without going through prepend flow
    rerender({ dataLength: 15, isLoadingPrevious: false });

    // scrollTop should remain unchanged
    expect(container.getScrollTop()).toBe(500);
  });
});
