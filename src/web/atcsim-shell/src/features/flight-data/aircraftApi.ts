import type { Aircraft } from './types';

export async function fetchAircraft(bounds: string): Promise<Aircraft[]> {
  const baseUrl = import.meta.env.VITE_FLIGHT_API_BASE_URL ?? '';
  const response = await fetch(`${baseUrl}/api/aircraft?bounds=${encodeURIComponent(bounds)}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch aircraft');
  }

  return response.json();
}
