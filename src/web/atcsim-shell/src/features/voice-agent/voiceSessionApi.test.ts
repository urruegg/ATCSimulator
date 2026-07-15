import { describe, expect, it, vi } from 'vitest';
import { sendVoiceTurn } from './voiceSessionApi';

describe('sendVoiceTurn', () => {
  it('posts transcript payload to voice endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ answerText: 'ok' }),
      }),
    );

    await sendVoiceTurn({ transcript: 'Hello tower', audioBase64: 'abc' });

    expect(fetch).toHaveBeenCalledWith('/api/voice/respond', expect.any(Object));
  });
});
