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
                : throw new SnapshotNotFoundException(snapshotId);
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
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw; // caller went away / shutdown — not a feed failure, don't mask it
        }
        catch (FlightFeedCreditExhaustedException)
        {
            // FR24 402: out of credit — serve the latest snapshot (yellow / no_credit).
            status.MarkNoCredit();
            return await FallbackToLatestAsync(ct);
        }
        catch
        {
            // 429 / 5xx / network / auth / timeout: serve the latest snapshot so the
            // demo keeps working (red / offline). Status is derived by the probe.
            return await FallbackToLatestAsync(ct);
        }
    }

    private async Task<AircraftFeedResponse> FallbackToLatestAsync(CancellationToken ct)
    {
        var latest = await store.LoadLatestAsync(ct);
        return latest is { } l
            ? new AircraftFeedResponse("snapshot", l.CapturedAt, l.Aircraft)
            : throw new SnapshotUnavailableException();
    }
}
