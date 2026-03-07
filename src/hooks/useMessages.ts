import { useState, useCallback, useRef } from 'react';
import { fetchComments, type DummyComment } from '../lib/api';

const PAGE_SIZE = 20;
const INITIAL_SKIP = 100;

export const useMessages = () => {
  const [messages, setMessages] = useState<DummyComment[]>([]);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
  // Start false — sentinels must not fire before initial data is loaded
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const nextSkipRef = useRef(INITIAL_SKIP + PAGE_SIZE);
  const prevSkipRef = useRef(INITIAL_SKIP - PAGE_SIZE);
  const initializedRef = useRef(false);

  const loadInitial = useCallback(async () => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    setIsInitialLoading(true);
    try {
      const data = await fetchComments(INITIAL_SKIP, PAGE_SIZE);
      setMessages(data.comments);
      // Enable directions only after we have data in the container
      setHasNext(INITIAL_SKIP + PAGE_SIZE < data.total);
      setHasPrevious(INITIAL_SKIP > 0);
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  const loadNext = useCallback(async () => {
    setIsLoadingNext(true);
    try {
      const data = await fetchComments(nextSkipRef.current, PAGE_SIZE);
      if (data.comments.length === 0) {
        setHasNext(false);
      } else {
        setMessages((prev) => [...prev, ...data.comments]);
        nextSkipRef.current += PAGE_SIZE;
        if (nextSkipRef.current >= data.total) setHasNext(false);
      }
    } finally {
      setIsLoadingNext(false);
    }
  }, []);

  const loadPrevious = useCallback(async () => {
    if (prevSkipRef.current < 0) {
      setHasPrevious(false);
      return;
    }
    setIsLoadingPrevious(true);
    try {
      const skip = Math.max(0, prevSkipRef.current);
      const limit = Math.min(PAGE_SIZE, prevSkipRef.current + PAGE_SIZE);
      const data = await fetchComments(skip, limit);
      if (data.comments.length === 0) {
        setHasPrevious(false);
      } else {
        setMessages((prev) => [...data.comments, ...prev]);
        prevSkipRef.current -= PAGE_SIZE;
        if (prevSkipRef.current < 0) setHasPrevious(false);
      }
    } finally {
      setIsLoadingPrevious(false);
    }
  }, []);

  return {
    messages,
    isLoadingNext,
    isLoadingPrevious,
    isInitialLoading,
    hasNext,
    hasPrevious,
    loadInitial,
    loadNext,
    loadPrevious,
  };
};
