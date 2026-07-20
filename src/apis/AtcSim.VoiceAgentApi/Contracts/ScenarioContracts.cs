namespace AtcSim.VoiceAgentApi.Contracts;

/// <summary>One catalog scenario, localized title keyed by language code.</summary>
public sealed record ScenarioSummary(
    string Id,
    IReadOnlyDictionary<string, string> Title,
    string AircraftClass,
    IReadOnlyList<string> ExpectedCommands);

/// <summary>A single ATC turn against a scenario.</summary>
public sealed record ScenarioTurnRequest(string ScenarioId, string AtcTranscript);

/// <summary>Result of a mock turn: the accepted command + grounded read-back.</summary>
public sealed record ScenarioTurnResponse(
    bool Accepted,
    string? Command,
    string ReadBackText,
    IReadOnlyList<string> PhraseologyFlags);
