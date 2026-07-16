import { useEffect, useState } from 'react';
import { fetchAircraft } from './aircraftApi';
import type { Aircraft } from './types';

export function useFlightPolling(bounds: string, cadenceSec: number) {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const data = await fetchAircraft(bounds);
        if (active) {
          setAircraft(data);
          setError(null);
        }
      } catch (e) {
        if (active) setError(e as Error);
      }
    };
    void tick();
    const id = setInterval(() => void tick(), Math.max(1, cadenceSec) * 1000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [bounds, cadenceSec]);
  return { aircraft, error };
}
