import type { Aircraft } from './types';

export async function fetchAircraft(bounds: string): Promise<Aircraft[]> {
  const response = await fetch(`/api/aircraft?bounds=${encodeURIComponent(bounds)}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch aircraft');
  }

  return response.json();
}
