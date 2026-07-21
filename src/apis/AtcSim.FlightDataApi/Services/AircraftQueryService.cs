using AtcSim.FlightDataApi.Contracts;

namespace AtcSim.FlightDataApi.Services;

public sealed class AircraftQueryService(
    IFlightFeedService feed, ISnapshotStore store, IFlightFeedStatusProvider status, TimeProvider clock)
{
    public async Task<AircraftFeedResponse> GetAsync(string? snapshotId, string bounds, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(snapshotId))
        {
            var pinned = await store.LoadAsync(snapshotId, ct);
            return pinned is { } p
                ? new AircraftFeedResponse("snapshot", p.CapturedAt, p.Aircraft)
                : new AircraftFeedResponse("snapshot", null, Array.Empty<AircraftResponse>());
        }

        try
        {
            var live = await feed.GetAircraftAsync(bounds, ct);
            status.MarkCreditOk();
            var capturedAt = clock.GetUtcNow();
            try { await store.SaveLatestAndArchiveAsync(live, capturedAt, ct); }
            catch { /* snapshotting is best-effort; never fail a good live response */ }
            return new AircraftFeedResponse("live", null, live);
        }
        catch (FlightFeedCreditExhaustedException)
        {
            status.MarkNoCredit();
            var latest = await store.LoadLatestAsync(ct);
            return latest is { } l
                ? new AircraftFeedResponse("snapshot", l.CapturedAt, l.Aircraft)
                : new AircraftFeedResponse("snapshot", null, Array.Empty<AircraftResponse>());
        }
    }
}
