import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchAircraft } from './aircraftApi';

describe('fetchAircraft', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('requests aircraft with bounds query on the same origin by default', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{ callsign: 'SWR123' }] }));
    await fetchAircraft('47.7,8.3,47.2,8.8');
    expect(fetch).toHaveBeenCalledWith('/api/aircraft?bounds=47.7%2C8.3%2C47.2%2C8.8', expect.any(Object));
  });

  it('prefixes the configured flight API base URL', async () => {
    vi.stubEnv('VITE_FLIGHT_API_BASE_URL', 'https://atcsim-flight.example.net');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    await fetchAircraft('1,2,3,4');
    expect(fetch).toHaveBeenCalledWith('https://atcsim-flight.example.net/api/aircraft?bounds=1%2C2%2C3%2C4', expect.any(Object));
  });
});
