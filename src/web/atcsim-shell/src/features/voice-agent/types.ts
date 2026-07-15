export interface VoiceTurnRequest {
  transcript: string;
  audioBase64: string;
}

export interface VoiceTurnResponse {
  transcript: string;
  answerText: string;
  audioContentBase64: string;
  agentLatencyMs: number;
  totalLatencyMs: number;
}
