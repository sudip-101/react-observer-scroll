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

export const mockIntersectionObserver = () => {
  // Must use `function` (not arrow) so it can be invoked with `new`
  const MockIO = vi.fn(function (
    this: MockObserverInstance,
    callback: IntersectionCallback,
    options?: IntersectionObserverInit,
  ) {
    this.observe = vi.fn((target: Element) => {
      observers.set(target, this);
    });
    this.unobserve = vi.fn((target: Element) => {
      observers.delete(target);
    });
    this.disconnect = vi.fn(() => {
      for (const [target, obs] of observers) {
        if (obs === this) observers.delete(target);
      }
    });
    this.takeRecords = vi.fn(() => []);
    this.callback = callback;
    this.options = options;
    lastInstance = this;
  });

  vi.stubGlobal('IntersectionObserver', MockIO);

  const helper = {
    getConstructor: () => MockIO,
    getLastInstance: () => lastInstance,
    getObserverForElement: (el: Element) => observers.get(el),

    /** Simulate an element entering or leaving the viewport */
    triggerIntersection: (
      target: Element,
      isIntersecting: boolean,
      overrides: Partial<IntersectionObserverEntry> = {},
    ) => {
      const observer = observers.get(target);
      if (!observer) throw new Error('Element is not being observed');

      const entry = {
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
    triggerAll: (isIntersecting: boolean) => {
      for (const [target] of observers) {
        helper.triggerIntersection(target, isIntersecting);
      }
    },

    /** Reset all state */
    reset: () => {
      observers.clear();
      lastInstance = null;
      MockIO.mockClear();
    },
  };

  return helper;
};
