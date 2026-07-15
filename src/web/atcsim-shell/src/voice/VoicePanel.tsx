import { useState } from 'react';
import { startVoiceSession, type VoiceSession } from './voiceLiveClient';

export function VoicePanel({ brokerBaseUrl }: { brokerBaseUrl: string }) {
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [status, setStatus] = useState('idle');

  async function start() {
    setStatus('connecting');
    try {
      setSession(await startVoiceSession(brokerBaseUrl));
      setStatus('connected');
    } catch (e) {
      setStatus(`error: ${(e as Error).message}`);
    }
  }

  function stop() {
    session?.stop();
    setSession(null);
    setStatus('idle');
  }

  return (
    <section aria-label="virtual pilot">
      <p role="note">The virtual pilot voice is synthetic (AI-generated).</p>
      <button onClick={session ? stop : start}>
        {session ? 'Stop' : 'Start'} virtual pilot
      </button>
      <span>{status}</span>
    </section>
  );
}
