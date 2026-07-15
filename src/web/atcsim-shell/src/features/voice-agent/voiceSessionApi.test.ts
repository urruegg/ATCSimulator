import { describe, expect, it, vi, beforeEach } from 'vitest';
import { sendVoiceTurn } from './voiceSessionApi';

describe('sendVoiceTurn', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('posts transcript payload to the voice endpoint on the same origin by default', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ answerText: 'ok' }) }));
    await sendVoiceTurn({ transcript: 'Hello tower', audioBase64: 'abc' });
    expect(fetch).toHaveBeenCalledWith('/api/voice/respond', expect.objectContaining({ method: 'POST' }));
  });

  it('prefixes the configured voice API base URL', async () => {
    vi.stubEnv('VITE_VOICE_API_BASE_URL', 'https://atcsim-voice.example.net');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ answerText: 'ok' }) }));
    await sendVoiceTurn({ transcript: 'Hello tower', audioBase64: 'abc' });
    expect(fetch).toHaveBeenCalledWith('https://atcsim-voice.example.net/api/voice/respond', expect.objectContaining({ method: 'POST' }));
  });
});
