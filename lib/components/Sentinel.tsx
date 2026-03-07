import { type CSSProperties, forwardRef } from 'react';

const SENTINEL_STYLE: CSSProperties = {
  height: 0,
  width: 0,
  padding: 0,
  margin: 0,
  border: 'none',
  overflow: 'hidden',
  visibility: 'hidden',
};

/** Internal sentinel element -- invisible to users and screen readers */
export const Sentinel = forwardRef<HTMLDivElement, { className?: string }>(
  ({ className }, ref) => (
    <div
      ref={ref}
      className={className}
      style={SENTINEL_STYLE}
      aria-hidden="true"
      data-testid="ros-sentinel"
    />
  ),
);
Sentinel.displayName = 'Sentinel';
