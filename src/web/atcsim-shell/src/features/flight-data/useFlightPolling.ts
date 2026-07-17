import { useEffect, useState } from 'react';
import { fetchAircraft } from './aircraftApi';
import type { Aircraft } from './types';

const MAX_BACKOFF_MS = 60_000;

export function useFlightPolling(bounds: string, cadenceSec: number) {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    const baseMs = Math.max(1, cadenceSec) * 1000;

    const tick = async () => {
      try {
        const data = await fetchAircraft(bounds);
        if (!active) return;
        setAircraft(data);
        setError(null);
        failures = 0;
        timer = setTimeout(() => void tick(), baseMs);
      } catch (e) {
        if (!active) return;
        failures += 1;
        // Keep the last-known aircraft on screen; surface the error and back off
        // exponentially (e.g. FR24 429 rate-limiting) up to a cap.
        setError(e as Error);
        const backoff = Math.min(baseMs * 2 ** failures, MAX_BACKOFF_MS);
        timer = setTimeout(() => void tick(), backoff);
      }
    };

    void tick();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [bounds, cadenceSec]);
  return { aircraft, error };
}
