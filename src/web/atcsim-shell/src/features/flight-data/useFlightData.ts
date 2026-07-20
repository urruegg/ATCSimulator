import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAircraft } from './aircraftApi';
import type { Aircraft } from './types';

export interface FlightData {
  aircraft: Aircraft[];
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
export function useFlightData(bounds: string): FlightData {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const data = await fetchAircraft(bounds);
      setAircraft(data);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e as Error); // keep last-known aircraft on screen
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, [bounds]);

  useEffect(() => {
    void load();
  }, [load]);

  return { aircraft, error, loading, lastUpdated, refresh: load };
}
