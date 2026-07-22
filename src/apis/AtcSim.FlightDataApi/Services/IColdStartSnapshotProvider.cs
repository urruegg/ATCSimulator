namespace AtcSim.FlightDataApi.Services;

/// <summary>
/// Supplies a bundled, public ZRH fixture snapshot so the aircraft-selection
/// demo always has data on a brand-new environment where no live capture and no
/// stored snapshot exist yet. Public flight data only (CON-03); no personal
/// data; no operational-ATC connectivity (CON-01). See ADR-0008 and the ZRH
/// cold-start seed runbook.
/// </summary>
public interface IColdStartSnapshotProvider
{
    /// <summary>The bundled cold-start snapshot, or null when no fixture is available.</summary>
    SnapshotContent? GetSnapshot();
}
