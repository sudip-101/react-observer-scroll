const LaptopIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16" />
  </svg>
);

const CodeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

export const ViewToggle = ({
  view,
  onViewChange,
}: {
  view: 'preview' | 'code';
  onViewChange: (view: 'preview' | 'code') => void;
}) => (
  <div className="flex items-center rounded-md border border-border p-0.5 gap-0.5">
    <button
      onClick={() => onViewChange('preview')}
      aria-label="Preview"
      className={`p-1.5 rounded transition-colors ${
        view === 'preview'
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <LaptopIcon />
    </button>
    <button
      onClick={() => onViewChange('code')}
      aria-label="Code"
      className={`p-1.5 rounded transition-colors ${
        view === 'code'
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <CodeIcon />
    </button>
  </div>
);
