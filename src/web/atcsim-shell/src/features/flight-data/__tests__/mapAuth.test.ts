import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fetchMapsToken } from '../mapAuth';

describe('fetchMapsToken', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the token from the maps token endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token: 'abc' }) });
    vi.stubGlobal('fetch', fetchMock);

    const token = await fetchMapsToken('https://api');

    expect(token).toBe('abc');
    expect(fetchMock).toHaveBeenCalledWith('https://api/api/maps/token', expect.any(Object));
  });
});
