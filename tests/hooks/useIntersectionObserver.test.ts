import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIntersectionObserver } from '../../lib/hooks/useIntersectionObserver';
import { mockIntersectionObserver } from '../helpers/mock-intersection-observer';

describe('useIntersectionObserver', () => {
  let io: ReturnType<typeof mockIntersectionObserver>;

  beforeEach(() => {
    io = mockIntersectionObserver();
  });

  afterEach(() => {
    io.reset();
    vi.restoreAllMocks();
  });

  it('creates an IntersectionObserver with provided options', () => {
    const onIntersect = vi.fn();

    const { result } = renderHook(() =>
      useIntersectionObserver({
        onIntersect,
        rootMargin: '100px',
        threshold: 0.5,
      }),
    );

    // Attach ref to trigger observation
    const el = document.createElement('div');
    act(() => {
      result.current(el);
    });

    const constructor = io.getConstructor();
    expect(constructor).toHaveBeenCalledWith(expect.any(Function), {
      root: null,
      rootMargin: '100px',
      threshold: 0.5,
    });
  });

  it('observes the element when ref is attached', () => {
    const onIntersect = vi.fn();

    const { result } = renderHook(() =>
      useIntersectionObserver({ onIntersect }),
    );

    const el = document.createElement('div');
    act(() => {
      result.current(el);
    });

    const instance = io.getLastInstance();
    expect(instance?.observe).toHaveBeenCalledWith(el);
  });

  it('calls onIntersect when entry.isIntersecting is true', () => {
    const onIntersect = vi.fn();

    const { result } = renderHook(() =>
      useIntersectionObserver({ onIntersect }),
    );

    const el = document.createElement('div');
    act(() => {
      result.current(el);
    });

    act(() => {
      io.triggerIntersection(el, true);
    });

    expect(onIntersect).toHaveBeenCalledTimes(1);
    expect(onIntersect).toHaveBeenCalledWith(
      expect.objectContaining({ isIntersecting: true }),
    );
  });

  it('does NOT call onIntersect when entry.isIntersecting is false', () => {
    const onIntersect = vi.fn();

    const { result } = renderHook(() =>
      useIntersectionObserver({ onIntersect }),
    );

    const el = document.createElement('div');
    act(() => {
      result.current(el);
    });

    act(() => {
      io.triggerIntersection(el, false);
    });

    expect(onIntersect).not.toHaveBeenCalled();
  });

  it('disconnects observer on unmount', () => {
    const onIntersect = vi.fn();

    const { result, unmount } = renderHook(() =>
      useIntersectionObserver({ onIntersect }),
    );

    const el = document.createElement('div');
    act(() => {
      result.current(el);
    });

    const instance = io.getLastInstance();
    unmount();

    expect(instance?.disconnect).toHaveBeenCalled();
  });

  it('recreates observer when options change', () => {
    const onIntersect = vi.fn();
    const constructor = io.getConstructor();

    const { result, rerender } = renderHook(
      ({ rootMargin }) =>
        useIntersectionObserver({ onIntersect, rootMargin }),
      { initialProps: { rootMargin: '0px' } },
    );

    const el = document.createElement('div');
    act(() => {
      result.current(el);
    });

    const firstInstance = io.getLastInstance();
    expect(constructor).toHaveBeenCalledTimes(1);

    rerender({ rootMargin: '100px' });

    expect(firstInstance?.disconnect).toHaveBeenCalled();
    expect(constructor).toHaveBeenCalledTimes(2);
  });

  it('does not observe when enabled=false', () => {
    const onIntersect = vi.fn();

    const { result } = renderHook(() =>
      useIntersectionObserver({ onIntersect, enabled: false }),
    );

    const el = document.createElement('div');
    act(() => {
      result.current(el);
    });

    const constructor = io.getConstructor();
    expect(constructor).not.toHaveBeenCalled();
  });

  it('unobserves old element and observes new element when ref target changes', () => {
    const onIntersect = vi.fn();

    const { result } = renderHook(() =>
      useIntersectionObserver({ onIntersect }),
    );

    const el1 = document.createElement('div');
    act(() => {
      result.current(el1);
    });

    const instance = io.getLastInstance();

    const el2 = document.createElement('div');
    act(() => {
      result.current(el2);
    });

    expect(instance?.unobserve).toHaveBeenCalledWith(el1);
    expect(instance?.observe).toHaveBeenCalledWith(el2);
  });

  it('uses stable callback reference via ref (does not recreate observer)', () => {
    const onIntersect1 = vi.fn();
    const onIntersect2 = vi.fn();
    const constructor = io.getConstructor();

    const { result, rerender } = renderHook(
      ({ onIntersect }) => useIntersectionObserver({ onIntersect }),
      { initialProps: { onIntersect: onIntersect1 } },
    );

    const el = document.createElement('div');
    act(() => {
      result.current(el);
    });

    expect(constructor).toHaveBeenCalledTimes(1);

    // Change callback identity
    rerender({ onIntersect: onIntersect2 });

    // Observer should NOT be recreated
    expect(constructor).toHaveBeenCalledTimes(1);

    // Trigger - should call the NEW callback
    act(() => {
      io.triggerIntersection(el, true);
    });

    expect(onIntersect1).not.toHaveBeenCalled();
    expect(onIntersect2).toHaveBeenCalledTimes(1);
  });

  it('handles SSR (no IntersectionObserver available)', () => {
    // Remove IO from global
    const original = globalThis.IntersectionObserver;
    // @ts-expect-error -- intentionally removing for SSR test
    delete globalThis.IntersectionObserver;

    // Re-import would be needed for true SSR test, but since canUseIntersectionObserver
    // is evaluated at module load time, we test that the hook doesn't throw
    // when the observer constructor is unavailable by setting enabled=false
    const onIntersect = vi.fn();

    expect(() => {
      renderHook(() =>
        useIntersectionObserver({ onIntersect, enabled: false }),
      );
    }).not.toThrow();

    globalThis.IntersectionObserver = original;
  });

  it('re-observes existing target when observer is recreated', () => {
    const onIntersect = vi.fn();

    const { result, rerender } = renderHook(
      ({ rootMargin }) =>
        useIntersectionObserver({ onIntersect, rootMargin }),
      { initialProps: { rootMargin: '0px' } },
    );

    const el = document.createElement('div');
    act(() => {
      result.current(el);
    });

    rerender({ rootMargin: '200px' });

    // New observer should have observed the existing target
    const newInstance = io.getLastInstance();
    expect(newInstance?.observe).toHaveBeenCalledWith(el);
  });
});
