namespace AtcSim.FlightDataApi.Services;

/// <summary>
/// Thrown when the live feed is unavailable (credit exhausted, rate limited,
/// upstream 5xx, auth failure or network error) AND there is no saved snapshot
/// to fall back to. Mapped to HTTP 503 by the endpoint.
/// </summary>
public sealed class SnapshotUnavailableException : Exception
{
    public SnapshotUnavailableException() : base("No live feed and no snapshot available.") { }
}
