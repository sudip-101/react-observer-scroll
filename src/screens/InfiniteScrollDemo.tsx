import { useState } from 'react';

import { InfiniteScroll } from '../../lib';
import { CodeBlock } from '../components/CodeBlock';
import { PhotoCard } from '../components/PhotoCard';
import { PhotoCardSkeleton } from '../components/PhotoCardSkeleton';
import { ViewToggle } from '../components/ViewToggle';
import { usePhotos } from '../hooks/usePhotos';
import hookSource from '../hooks/usePhotos.ts?raw';
import { CONSTANTS } from '../utils/constants';
import demoSource from './InfiniteScrollDemo.tsx?raw';

interface PhotoGridSkeletonProps {
  length?: number;
}

const PhotoGridSkeleton = ({ length = 3 }: PhotoGridSkeletonProps) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length }, (_, i) => (
      <PhotoCardSkeleton key={i} />
    ))}
  </div>
);

const codeFiles = [
  { name: 'InfiniteScrollDemo.tsx', content: demoSource },
  { name: 'usePhotos.ts', content: hookSource },
];

export const InfiniteScrollDemo = () => {
  const { photos, isLoading, hasMore, error, loadMore } = usePhotos();

  const [view, setView] = useState<'preview' | 'code'>('preview');
  const [activeFile, setActiveFile] = useState(0);

  const isInitialLoad = isLoading && photos.length === 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            InfiniteScroll Demo
          </h1>
          <p className="text-sm text-muted-foreground">
            Photo feed from Picsum API · Loads {CONSTANTS.FEED_ITEMS_LIMIT}{' '}
            photos per page · rootMargin 200px for early loading
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
        <>
          <InfiniteScroll
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoading={isLoading}
            rootMargin="200px"
            loader={<PhotoGridSkeleton />}
            endMessage={
              <p className="text-center text-sm text-muted-foreground py-8">
                You've seen all the photos!
              </p>
            }
          >
            {isInitialLoad ? (
              <PhotoGridSkeleton length={6} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <PhotoCard key={photo.id} photo={photo} />
                ))}
              </div>
            )}
          </InfiniteScroll>

          {error && (
            <div className="text-center py-8">
              <p className="text-sm text-red-500 mb-2">Failed to load photos</p>
              <button
                onClick={loadMore}
                className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Retry
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
