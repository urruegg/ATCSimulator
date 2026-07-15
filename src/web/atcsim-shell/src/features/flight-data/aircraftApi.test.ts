import { describe, expect, it, vi } from 'vitest';
import { fetchAircraft } from './aircraftApi';

describe('fetchAircraft', () => {
  it('requests aircraft with bounds query', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ callsign: 'SWR123' }],
      }),
    );

    const result = await fetchAircraft('47.7,8.3,47.2,8.8');

    expect(fetch).toHaveBeenCalledWith(
      '/api/aircraft?bounds=47.7%2C8.3%2C47.2%2C8.8',
      expect.any(Object),
    );
    expect(result[0].callsign).toBe('SWR123');
  });
});
