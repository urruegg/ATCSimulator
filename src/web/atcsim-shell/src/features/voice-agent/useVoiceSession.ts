import { useState } from 'react';
import { sendVoiceTurn } from './voiceSessionApi';
import type { VoiceTurnResponse } from './types';

export function useVoiceSession() {
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [pending, setPending] = useState(false);

  async function submitTranscript(transcript: string): Promise<VoiceTurnResponse> {
    setPending(true);
    const started = performance.now();
    try {
      const response = await sendVoiceTurn({ transcript, audioBase64: '' });
      setLatencyMs(performance.now() - started);
      return response;
    } finally {
      setPending(false);
    }
  }

  return { latencyMs, pending, submitTranscript };
}
