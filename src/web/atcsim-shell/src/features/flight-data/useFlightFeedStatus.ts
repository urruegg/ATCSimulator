import { useEffect, useRef, useState } from 'react';
import { fetchFeedStatus, type FeedStatus } from './flightFeedApi';

const POLL_INTERVAL_MS = 60_000;

const INITIAL: FeedStatus = { state: 'offline', checkedAt: '' };

export interface FeedStatusResult {
  status: FeedStatus;
  isLoading: boolean;
}

/**
 * Polls the feed status every 60s. Keeps the last value in state; the polling
 * effect intentionally has an empty dependency list so it never re-subscribes
 * (avoiding render loops). On any fetch failure the status degrades to offline.
 */
export function useFlightFeedStatus(): FeedStatusResult {
  const [status, setStatus] = useState<FeedStatus>(INITIAL);
  const [isLoading, setIsLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const poll = async () => {
      try {
        const next = await fetchFeedStatus();
        if (mounted.current) setStatus(next);
      } catch {
        if (mounted.current) setStatus((prev) => ({ state: 'offline', checkedAt: prev.checkedAt }));
      } finally {
        if (mounted.current) setIsLoading(false);
      }
    };

    void poll();
    const id = setInterval(() => { void poll(); }, POLL_INTERVAL_MS);

    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, []);

  return { status, isLoading };
}
