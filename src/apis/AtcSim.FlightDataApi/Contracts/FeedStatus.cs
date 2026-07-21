namespace AtcSim.FlightDataApi.Contracts;

/// <summary>state: "connected" | "no_credit" | "offline".</summary>
public record FeedStatus(string State, DateTimeOffset CheckedAt);
