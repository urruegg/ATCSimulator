namespace AtcSim.VoiceAgentApi.Contracts;

public sealed record VoiceSessionResponse(
    string Transcript,
    string AnswerText,
    string AudioContentBase64,
    long AgentLatencyMs,
    long TotalLatencyMs);
