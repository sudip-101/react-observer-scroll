import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { ScrollIndicatorInfo } from '../../lib';
import { BidirectionalScroll } from '../../lib';
import { CodeBlock } from '../components/CodeBlock';
import { MessageBubble } from '../components/MessageBubble';
import { MessageSkeletonGroup } from '../components/MessageBubbleSkeleton';
import { ViewToggle } from '../components/ViewToggle';
import { useMessages } from '../hooks/useMessages';

import demoSource from './BidirectionalScrollDemo.tsx?raw';
import hookSource from '../hooks/useMessages.ts?raw';

const codeFiles = [
  { name: 'BidirectionalScrollDemo.tsx', content: demoSource },
  { name: 'useMessages.ts', content: hookSource },
];

export const BidirectionalScrollDemo = () => {
  const {
    messages,
    isLoadingNext,
    isLoadingPrevious,
    isInitialLoading,
    hasNext,
    hasPrevious,
    loadInitial,
    loadNext,
    loadPrevious,
  } = useMessages();

  const containerRef = useRef<HTMLElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const [activeFile, setActiveFile] = useState(0);

  const hasScrolledInitial = useRef(false);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // Scroll to bottom before observers activate so the top sentinel
  // isn't visible on mount — prevents auto-triggering loadPrevious.
  // useLayoutEffect runs after child effects (useImperativeHandle sets ref)
  // but before useEffect (where observers are created).
  useLayoutEffect(() => {
    if (!isInitialLoading && containerRef.current && !hasScrolledInitial.current) {
      hasScrolledInitial.current = true;
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [isInitialLoading]);

  const handleScrollIndicator = (info: ScrollIndicatorInfo) => {
    setShowScrollDown(info.scrolledFromEnd > 200);
  };

  const scrollToBottom = () => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            BidirectionalScroll Demo
          </h1>
          <p className="text-sm text-muted-foreground">
            Chat interface from DummyJSON API · Scroll up for older messages ·
            Scroll preservation on prepend
          </p>
        </div>
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      {view === 'code' ? (
        <CodeBlock
          files={codeFiles}
          activeFile={activeFile}
          onFileChange={setActiveFile}
        />
      ) : (
        <div className="relative rounded-lg border border-border bg-card">
          {isInitialLoading ? (
            <div
              className="p-4"
              style={{ height: '500px', overflowY: 'hidden' }}
            >
              <MessageSkeletonGroup />
            </div>
          ) : (
            <BidirectionalScroll
              ref={containerRef}
              dataLength={messages.length}
              onLoadNext={loadNext}
              hasNext={hasNext}
              isLoadingNext={isLoadingNext}
              onLoadPrevious={loadPrevious}
              hasPrevious={hasPrevious}
              isLoadingPrevious={isLoadingPrevious}
              loader={<MessageSkeletonGroup length={2} />}
              onScrollIndicator={handleScrollIndicator}
              style={{ height: '500px', overflowY: 'auto' }}
              className="p-4"
            >
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </BidirectionalScroll>
          )}

          {showScrollDown && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-4 right-4 bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:opacity-90 transition-opacity"
              aria-label="Scroll to bottom"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
