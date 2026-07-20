import type { Capabilities, ScenarioSummary, ScenarioTurnResponse, SpeechTokenResponse } from './types';

function base(voiceBaseUrl: string): string {
  return voiceBaseUrl.replace(/\/$/, '');
}

export async function fetchScenarios(voiceBaseUrl: string): Promise<ScenarioSummary[]> {
  const res = await fetch(`${base(voiceBaseUrl)}/api/voice/scenarios`, { credentials: 'include' });
  if (!res.ok) throw new Error(`scenarios_${res.status}`);
  return res.json();
}

export async function fetchCapabilities(voiceBaseUrl: string): Promise<Capabilities> {
  const res = await fetch(`${base(voiceBaseUrl)}/api/voice/capabilities`, { credentials: 'include' });
  if (!res.ok) throw new Error(`capabilities_${res.status}`);
  return res.json();
}

export async function fetchSpeechToken(voiceBaseUrl: string): Promise<SpeechTokenResponse> {
  const res = await fetch(`${base(voiceBaseUrl)}/api/voice/speech/token`, { credentials: 'include' });
  if (!res.ok) throw new Error(`speech_token_${res.status}`);
  return res.json();
}

export async function postScenarioTurn(
  voiceBaseUrl: string,
  scenarioId: string,
  atcTranscript: string,
): Promise<ScenarioTurnResponse> {
  const res = await fetch(`${base(voiceBaseUrl)}/api/voice/scenario/turn`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId, atcTranscript }),
  });
  if (!res.ok) throw new Error(`scenario_turn_${res.status}`);
  return res.json();
}
