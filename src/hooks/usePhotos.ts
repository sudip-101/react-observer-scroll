import { useState, useCallback, useRef } from 'react';
import { fetchPhotos, type PicsumPhoto } from '../lib/api';

const MAX_PAGES = 5;

export const usePhotos = () => {
  const [photos, setPhotos] = useState<PicsumPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(false);
  const pageRef = useRef(1);

  const loadMore = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const data = await fetchPhotos(pageRef.current);
      if (data.length === 0) {
        setHasMore(false);
      } else {
        setPhotos((prev) => [...prev, ...data]);
        pageRef.current += 1;
        if (pageRef.current > MAX_PAGES) setHasMore(false);
      }
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { photos, isLoading, hasMore, error, loadMore };
};
