namespace AtcSim.VoiceAgentApi.Contracts;

public sealed record SdpOfferRequest(string SdpOffer);

public sealed record SdpAnswerResponse(string SdpAnswer);

public sealed record TranscriptEvent(string Role, string Text, long TimestampMs);