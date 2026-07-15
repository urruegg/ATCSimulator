namespace AtcSim.VoiceAgentApi.Options;

public sealed class VoiceLiveOptions
{
    public string Endpoint { get; init; } = string.Empty; // wss://<foundry>.services.ai.azure.com
    public string ApiVersion { get; init; } = "2026-01-01-preview";
    public string? Model { get; init; } = "gpt-realtime";
    public string? AgentId { get; init; }
    public string? ProjectId { get; init; }
}
