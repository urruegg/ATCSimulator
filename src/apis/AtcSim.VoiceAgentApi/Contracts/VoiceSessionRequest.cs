namespace AtcSim.VoiceAgentApi.Contracts;

public sealed record VoiceSessionRequest(string Transcript, string? AudioBase64);
