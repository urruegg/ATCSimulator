namespace AtcSim.VoiceAgentApi.Options;

public sealed class SpeechOptions
{
    public string Region { get; init; } = "switzerlandnorth";
    public string? ResourceId { get; init; } // Azure AI Speech resource id (for AAD token exchange)
}
