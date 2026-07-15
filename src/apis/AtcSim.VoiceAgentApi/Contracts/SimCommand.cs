namespace AtcSim.VoiceAgentApi.Contracts;

public sealed record SimCommand(string Type, IReadOnlyDictionary<string, double> Parameters);

public sealed record SimCommandResult(bool Accepted, string Type, string? Reason = null);
