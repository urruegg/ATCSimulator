import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchAircraft } from './aircraftApi';

const liveEnvelope = { source: 'live', snapshotAt: null, aircraft: [{ callsign: 'SWR123' }] };

describe('fetchAircraft', () => {
  beforeEach(() => { vi.unstubAllEnvs(); });

  it('requests aircraft with bounds query on the same origin by default', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => liveEnvelope }));
    const feed = await fetchAircraft('47.7,8.3,47.2,8.8');
    expect(fetch).toHaveBeenCalledWith('/api/aircraft?bounds=47.7%2C8.3%2C47.2%2C8.8', expect.any(Object));
    expect(feed.source).toBe('live');
    expect(feed.aircraft).toEqual([{ callsign: 'SWR123' }]);
  });

  it('prefixes the configured flight API base URL', async () => {
    vi.stubEnv('VITE_FLIGHT_API_BASE_URL', 'https://atcsim-flight.example.net');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ source: 'live', snapshotAt: null, aircraft: [] }) }));
    await fetchAircraft('1,2,3,4');
    expect(fetch).toHaveBeenCalledWith('https://atcsim-flight.example.net/api/aircraft?bounds=1%2C2%2C3%2C4', expect.any(Object));
  });

  it('appends the snapshot id when pinning a snapshot', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ source: 'snapshot', snapshotAt: '2026-07-21T08:00:00Z', aircraft: [] }) }));
    await fetchAircraft('1,2,3,4', 'dt=2026-07-21/08-00-00');
    expect(fetch).toHaveBeenCalledWith('/api/aircraft?bounds=1%2C2%2C3%2C4&snapshot=dt%3D2026-07-21%2F08-00-00', expect.any(Object));
  });
});
