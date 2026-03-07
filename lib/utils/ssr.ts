export const canUseDOM: boolean =
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  typeof window.document.createElement !== 'undefined';

/** Evaluated lazily so mocks set up after module load are detected */
export const canUseIntersectionObserver = (): boolean =>
  canUseDOM && typeof IntersectionObserver !== 'undefined';
