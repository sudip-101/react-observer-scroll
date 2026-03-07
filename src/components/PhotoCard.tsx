import { useState } from 'react';
import type { PicsumPhoto } from '../lib/api';

export const PhotoCard = ({ photo }: { photo: PicsumPhoto }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="relative w-full aspect-[4/3] bg-muted">
        {!loaded && (
          <div className="absolute inset-0 animate-pulse bg-muted" />
        )}
        <img
          src={`https://picsum.photos/id/${photo.id}/400/300`}
          alt={`Photo by ${photo.author}`}
          width={400}
          height={300}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
      </div>
      <div className="p-3">
        <p className="text-sm font-medium">{photo.author}</p>
        <p className="text-xs text-muted-foreground">
          {photo.width} × {photo.height}
        </p>
      </div>
    </div>
  );
};
