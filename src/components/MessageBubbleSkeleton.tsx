export const MessageBubbleSkeleton = ({
  align,
}: {
  align: 'left' | 'right';
}) => (
  <div
    className={`flex ${align === 'right' ? 'justify-end' : 'justify-start'} mb-3`}
  >
    <div
      className={`max-w-[75%] rounded-lg px-3 py-2 animate-pulse ${
        align === 'right'
          ? 'bg-primary/20 rounded-br-none'
          : 'bg-muted rounded-bl-none'
      }`}
    >
      <div className="h-3 w-16 rounded bg-muted-foreground/20 mb-2" />
      <div className="space-y-1.5">
        <div className="h-3 w-48 rounded bg-muted-foreground/20" />
        <div className="h-3 w-32 rounded bg-muted-foreground/20" />
      </div>
    </div>
  </div>
);

interface MessageSkeletonGroupProps {
  length?: number;
}

export const MessageSkeletonGroup = ({
  length = 8,
}: MessageSkeletonGroupProps) => (
  <>
    {Array.from({ length }, (_, i) => (
      <MessageBubbleSkeleton
        key={i}
        align={i % 2 === 0 ? 'left' : 'right'}
      />
    ))}
  </>
);
