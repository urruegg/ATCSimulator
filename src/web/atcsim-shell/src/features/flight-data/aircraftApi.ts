import type { Aircraft } from './types';

/** Error thrown when the flight feed request fails. `rateLimited` is true when
 * the upstream (FR24) is throttling (surfaced by the API as 429/503). */
export class FlightFeedError extends Error {
  constructor(
    public readonly status: number,
    public readonly rateLimited: boolean,
  ) {
    super(rateLimited ? 'flight_feed_rate_limited' : `flight_feed_error_${status}`);
    this.name = 'FlightFeedError';
  }
}

export async function fetchAircraft(bounds: string): Promise<Aircraft[]> {
  const baseUrl = (import.meta.env.VITE_FLIGHT_API_BASE_URL ?? '').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/api/aircraft?bounds=${encodeURIComponent(bounds)}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new FlightFeedError(response.status, response.status === 429 || response.status === 503);
  }

  return response.json();
}
