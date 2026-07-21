import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchFeedStatus, fetchSnapshots } from '../flightFeedApi';

describe('flightFeedApi', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('fetches feed status on the same origin by default', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ state: 'connected', checkedAt: '2026-07-21T10:30:00Z' }),
    }));
    const status = await fetchFeedStatus();
    expect(fetch).toHaveBeenCalledWith('/api/flight-feed/status', expect.objectContaining({ credentials: 'include' }));
    expect(status.state).toBe('connected');
    expect(status.checkedAt).toBe('2026-07-21T10:30:00Z');
  });

  it('prefixes the configured base URL for snapshots', async () => {
    vi.stubEnv('VITE_FLIGHT_API_BASE_URL', 'https://atcsim-flight.example.net');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => [{ id: 'dt=2026-07-21/10-30-05', capturedAt: '2026-07-21T10:30:05Z' }],
    }));
    const snaps = await fetchSnapshots();
    expect(fetch).toHaveBeenCalledWith('https://atcsim-flight.example.net/api/flight-snapshots', expect.objectContaining({ credentials: 'include' }));
    expect(snaps).toHaveLength(1);
    expect(snaps[0].id).toBe('dt=2026-07-21/10-30-05');
  });

  it('throws on non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    await expect(fetchFeedStatus()).rejects.toThrow();
  });
});
