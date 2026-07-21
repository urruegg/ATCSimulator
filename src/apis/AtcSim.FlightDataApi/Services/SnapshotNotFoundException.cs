namespace AtcSim.FlightDataApi.Services;

/// <summary>
/// Thrown when a specific snapshot id requested via <c>?snapshot={id}</c> does
/// not exist. Mapped to HTTP 404 by the endpoint.
/// </summary>
public sealed class SnapshotNotFoundException : Exception
{
    public SnapshotNotFoundException(string id) : base($"Snapshot '{id}' was not found.") { }
}
