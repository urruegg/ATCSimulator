import { describe, it, expect, vi } from 'vitest';
import { requestSdpAnswer } from '../voiceLiveClient';

describe('requestSdpAnswer', () => {
  it('posts the SDP offer to the broker and returns the answer', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sdpAnswer: 'v=0...answer' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const answer = await requestSdpAnswer('https://broker', 'v=0...offer');

    expect(answer).toBe('v=0...answer');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://broker/api/voice/session',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
