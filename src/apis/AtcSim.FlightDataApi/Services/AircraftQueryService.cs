using AtcSim.FlightDataApi.Contracts;
using Microsoft.Extensions.Logging;

namespace AtcSim.FlightDataApi.Services;

public sealed class AircraftQueryService
{
    private readonly IFlightFeedService _feed;
    private readonly ISnapshotStore _store;
    private readonly IFlightFeedStatusProvider _status;
    private readonly TimeProvider _clock;
    private readonly IColdStartSnapshotProvider _coldStart;
    private readonly IFlightDataTelemetry _telemetry;
    private readonly ILogger<AircraftQueryService>? _logger;

    public AircraftQueryService(
        IFlightFeedService feed,
        ISnapshotStore store,
        IFlightFeedStatusProvider status,
        TimeProvider clock,
        IColdStartSnapshotProvider coldStart,
        ILogger<AircraftQueryService>? logger = null)
        : this(feed, store, status, clock, coldStart, NullFlightDataTelemetry.Instance, logger)
    {
    }

    public AircraftQueryService(
        IFlightFeedService feed,
        ISnapshotStore store,
        IFlightFeedStatusProvider status,
        TimeProvider clock,
        IColdStartSnapshotProvider coldStart,
        IFlightDataTelemetry telemetry,
        ILogger<AircraftQueryService>? logger = null)
    {
        _feed = feed;
        _store = store;
        _status = status;
        _clock = clock;
        _coldStart = coldStart;
        _telemetry = telemetry;
        _logger = logger;
    }

    public async Task<AircraftFeedResponse> GetAsync(string? snapshotId, string bounds, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(snapshotId))
        {
            var pinned = await _store.LoadAsync(snapshotId, ct);
            if (pinned is null)
            {
                throw new SnapshotNotFoundException(snapshotId);
            }

            var snapshot = pinned.Value;
            _telemetry.TrackFlightFeedSuccess("snapshot", snapshot.Aircraft.Count, snapshot.CapturedAt);
            return new AircraftFeedResponse("snapshot", snapshot.CapturedAt, snapshot.Aircraft);
        }

        try
        {
            var live = await _feed.GetAircraftAsync(bounds, ct);
            _status.MarkCreditOk();
            var capturedAt = _clock.GetUtcNow();
            try { await _store.SaveLatestAndArchiveAsync(live, capturedAt, ct); }
            catch { /* snapshotting is best-effort; never fail a good live response */ }
            _telemetry.TrackFlightFeedSuccess("live", live.Count, null);
            return new AircraftFeedResponse("live", null, live);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw; // caller went away / shutdown — not a feed failure, don't mask it
        }
        catch (FlightFeedCreditExhaustedException)
        {
            // FR24 402: out of credit — serve the latest snapshot (yellow / no_credit).
            _status.MarkNoCredit();
            try
            {
                var fallback = await FallbackToLatestAsync(ct);
                _telemetry.TrackFlightFeedQuotaExhausted(true, fallback.SnapshotAt);
                return fallback;
            }
            catch (SnapshotUnavailableException)
            {
                _telemetry.TrackFlightFeedQuotaExhausted(false, null);
                throw;
            }
        }
        catch (Exception ex)
        {
            // 429 / 5xx / network / auth / timeout: serve the latest snapshot so the
            // demo keeps working (red / offline). Status is derived by the probe.
            try
            {
                var fallback = await FallbackToLatestAsync(ct);
                _telemetry.TrackFlightFeedFailure(ex.GetType().Name, true, fallback.SnapshotAt);
                return fallback;
            }
            catch (SnapshotUnavailableException)
            {
                _telemetry.TrackFlightFeedFailure(ex.GetType().Name, false, null);
                throw;
            }
        }
    }

    private async Task<AircraftFeedResponse> FallbackToLatestAsync(CancellationToken ct)
    {
        SnapshotContent? latest = null;
        try
        {
            latest = await _store.LoadLatestAsync(ct);
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
            _logger?.LogWarning(ex, "Snapshot store read failed; falling back to bundled cold-start seed.");
        }

        if (latest is { } l)
        {
            return new AircraftFeedResponse("snapshot", l.CapturedAt, l.Aircraft);
        }

        // Cold-start: no live feed and no stored snapshot yet (fresh environment)
        // or the store is unreachable. Serve the bundled public ZRH fixture so the
        // demo always has data, and best-effort persist it so the snapshot
        // selector is populated on the next request.
        if (_coldStart.GetSnapshot() is { Aircraft.Count: > 0 } seed)
        {
            _logger?.LogInformation(
                "Serving bundled cold-start ZRH seed ({Count} aircraft) captured at {CapturedAt:o}.",
                seed.Aircraft.Count, seed.CapturedAt);
            try { await _store.SaveLatestAndArchiveAsync(seed.Aircraft, seed.CapturedAt, ct); }
            catch (Exception ex) { _logger?.LogWarning(ex, "Cold-start seed persist failed (best-effort)."); }
            return new AircraftFeedResponse("snapshot", seed.CapturedAt, seed.Aircraft);
        }

        throw new SnapshotUnavailableException();
    }
}
