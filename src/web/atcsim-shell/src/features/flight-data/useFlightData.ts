import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAircraft } from './aircraftApi';
import type { Aircraft, FeedSource } from './types';

export interface FlightData {
  aircraft: Aircraft[];
  source: FeedSource;
  snapshotAt: string | null;
  error: Error | null;
  loading: boolean;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

/**
 * Load all aircraft within `bounds` once on mount; `refresh()` reloads on
 * demand. Unlike the removed `useFlightPolling`, no interval timer runs — this
 * cuts third-party feed consumption. The last-known aircraft set is kept on
 * error (e.g. FR24 429) so the map never goes blank.
 */
export function useFlightData(bounds: string, selectedSnapshotId: string | null = null): FlightData {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [source, setSource] = useState<FeedSource>('live');
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const feed = await fetchAircraft(bounds, selectedSnapshotId);
      setAircraft(feed.aircraft);
      setSource(feed.source);
      setSnapshotAt(feed.snapshotAt);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e as Error); // keep last-known aircraft on screen
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, [bounds, selectedSnapshotId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { aircraft, source, snapshotAt, error, loading, lastUpdated, refresh: load };
}
