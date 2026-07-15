import type { VoiceTurnRequest, VoiceTurnResponse } from './types';

export async function sendVoiceTurn(request: VoiceTurnRequest): Promise<VoiceTurnResponse> {
  const response = await fetch('/api/voice/respond', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Voice response failed');
  }

  return response.json();
}
