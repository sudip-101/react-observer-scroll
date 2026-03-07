import type { DummyComment } from '../lib/api';

export const MessageBubble = ({ message }: { message: DummyComment }) => {
  const isEven = message.id % 2 === 0;

  return (
    <div className={`flex ${isEven ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
          isEven
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-muted text-foreground rounded-bl-none'
        }`}
      >
        <p className="font-medium text-xs mb-1 opacity-70">
          {message.user.fullName}
        </p>
        <p>{message.body}</p>
      </div>
    </div>
  );
};
