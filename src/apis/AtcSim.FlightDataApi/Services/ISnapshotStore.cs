using AtcSim.FlightDataApi.Contracts;

namespace AtcSim.FlightDataApi.Services;

public interface ISnapshotStore
{
    Task SaveLatestAndArchiveAsync(IReadOnlyList<AircraftResponse> aircraft, DateTimeOffset capturedAt, CancellationToken ct);
    Task<SnapshotContent?> LoadLatestAsync(CancellationToken ct);
    Task<SnapshotContent?> LoadAsync(string id, CancellationToken ct);
    Task<IReadOnlyList<SnapshotInfo>> ListRecentAsync(int count, CancellationToken ct);
}
