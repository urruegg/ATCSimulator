import { useEffect, useState } from 'react';

export interface TranscriptEntry {
  role: string;
  text: string;
  ts: number;
}

export function useLiveTranscript(voiceBaseUrl: string): TranscriptEntry[] {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  useEffect(() => {
    const es = new EventSource(`${voiceBaseUrl}/api/voice/transcript/stream`, {
      withCredentials: true,
    });
    es.onmessage = (e) => {
      try {
        const m = JSON.parse(e.data) as { role?: string; text?: string; timestampMs?: number };
        // Skip keep-alives / malformed events that lack a role or text.
        if (typeof m.role !== 'string' || typeof m.text !== 'string') return;
        setEntries((prev) => [...prev, { role: m.role!, text: m.text!, ts: m.timestampMs ?? Date.now() }]);
      } catch {
        /* ignore non-JSON keep-alives */
      }
    };
    return () => es.close();
  }, [voiceBaseUrl]);
  return entries;
}
