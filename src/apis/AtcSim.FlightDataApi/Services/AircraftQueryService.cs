using AtcSim.FlightDataApi.Contracts;
using Microsoft.Extensions.Logging;

namespace AtcSim.FlightDataApi.Services;

public sealed class AircraftQueryService(
    IFlightFeedService feed,
    ISnapshotStore store,
    IFlightFeedStatusProvider status,
    TimeProvider clock,
    IColdStartSnapshotProvider coldStart,
    ILogger<AircraftQueryService>? logger = null)
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
        SnapshotContent? latest = null;
        try
        {
            latest = await store.LoadLatestAsync(ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw; // caller went away / shutdown — not a store failure, don't mask it
        }
        catch (Exception ex)
        {
            // The snapshot store itself is unreachable (e.g. storage data-plane
            // RBAC not yet propagated on a fresh environment, network or auth
            // failure). Never surface this as an unhandled 500 — fall through to
            // the bundled cold-start seed and, failing that, a clean 503.
            logger?.LogWarning(ex, "Snapshot store read failed; falling back to bundled cold-start seed.");
        }

        if (latest is { } l)
        {
            return new AircraftFeedResponse("snapshot", l.CapturedAt, l.Aircraft);
        }

        // Cold-start: no live feed and no stored snapshot yet (fresh environment)
        // or the store is unreachable. Serve the bundled public ZRH fixture so the
        // demo always has data, and best-effort persist it so the snapshot
        // selector is populated on the next request.
        if (coldStart.GetSnapshot() is { Aircraft.Count: > 0 } seed)
        {
            logger?.LogInformation(
                "Serving bundled cold-start ZRH seed ({Count} aircraft) captured at {CapturedAt:o}.",
                seed.Aircraft.Count, seed.CapturedAt);
            try { await store.SaveLatestAndArchiveAsync(seed.Aircraft, seed.CapturedAt, ct); }
            catch (Exception ex) { logger?.LogWarning(ex, "Cold-start seed persist failed (best-effort)."); }
            return new AircraftFeedResponse("snapshot", seed.CapturedAt, seed.Aircraft);
        }

        throw new SnapshotUnavailableException();
    }
}
