export const Spinner = ({ className = '' }: { className?: string }) => (
  <div className={`flex justify-center py-4 ${className}`}>
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
  </div>
);
