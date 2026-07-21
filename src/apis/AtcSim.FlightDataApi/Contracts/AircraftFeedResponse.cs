namespace AtcSim.FlightDataApi.Contracts;

/// <summary>source: "live" | "snapshot". snapshotAt null when source == "live".</summary>
public record AircraftFeedResponse(string Source, DateTimeOffset? SnapshotAt, IReadOnlyList<AircraftResponse> Aircraft);
