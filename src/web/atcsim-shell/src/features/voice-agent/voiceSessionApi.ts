import type { VoiceTurnRequest, VoiceTurnResponse } from './types';

export async function sendVoiceTurn(request: VoiceTurnRequest): Promise<VoiceTurnResponse> {
  const baseUrl = import.meta.env.VITE_VOICE_API_BASE_URL ?? '';
  const response = await fetch(`${baseUrl}/api/voice/respond`, {
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
