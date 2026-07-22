using AtcSim.FlightDataApi.Contracts;
using AtcSim.FlightDataApi.Services;
using Xunit;

namespace AtcSim.FlightDataApi.Tests;

public class AircraftQueryServiceTests
{
    private static readonly IReadOnlyList<AircraftResponse> Sample =
        new List<AircraftResponse> { new("SWR1", "A320", "HB-AAA", 47.4, 8.5, 15000, 270, 320) };

    private sealed class FakeFeed(Func<Task<IReadOnlyList<AircraftResponse>>> impl) : IFlightFeedService
    {
        public Task<IReadOnlyList<AircraftResponse>> GetAircraftAsync(string bounds, CancellationToken ct) => impl();
    }

    private sealed class FakeStore : ISnapshotStore
    {
        public SnapshotContent? Latest;
        public bool Saved;
        public bool ThrowOnSave;
        public bool ThrowOnLoad;
        public Task SaveLatestAndArchiveAsync(IReadOnlyList<AircraftResponse> a, DateTimeOffset at, CancellationToken ct)
        {
            if (ThrowOnSave) throw new InvalidOperationException("storage down");
            Saved = true; return Task.CompletedTask;
        }
        public Task<SnapshotContent?> LoadLatestAsync(CancellationToken ct)
        {
            if (ThrowOnLoad) throw new InvalidOperationException("storage unreachable");
            return Task.FromResult(Latest);
        }
        public Task<SnapshotContent?> LoadAsync(string id, CancellationToken ct) => Task.FromResult(Latest);
        public Task<IReadOnlyList<SnapshotInfo>> ListRecentAsync(int count, CancellationToken ct) => Task.FromResult((IReadOnlyList<SnapshotInfo>)new List<SnapshotInfo>());
    }

    private sealed class FakeColdStart(SnapshotContent? snapshot = null) : IColdStartSnapshotProvider
    {
        public SnapshotContent? GetSnapshot() => snapshot;
    }

    private static readonly SnapshotContent ColdStartSeed =
        new(new DateTimeOffset(2026, 7, 20, 12, 0, 0, TimeSpan.Zero),
            new List<AircraftResponse> { new("SEED1", "UNKNOWN", null, 47.45, 8.56, 6000, 270, 250) });

    private sealed class FakeStatus : IFlightFeedStatusProvider
    {
        public bool NoCredit, CreditOk;
        public Task<FeedStatus> GetStatusAsync(CancellationToken ct) => Task.FromResult(new FeedStatus("connected", DateTimeOffset.UtcNow));
        public void MarkNoCredit() => NoCredit = true;
        public void MarkCreditOk() => CreditOk = true;
    }

    [Fact]
    public async Task Live_success_saves_snapshot_and_returns_live()
    {
        var store = new FakeStore();
        var status = new FakeStatus();
        var sut = new AircraftQueryService(new FakeFeed(() => Task.FromResult(Sample)), store, status, TimeProvider.System, new FakeColdStart());

        var result = await sut.GetAsync(null, "b", CancellationToken.None);

        Assert.Equal("live", result.Source);
        Assert.Null(result.SnapshotAt);
        Assert.True(store.Saved);
        Assert.True(status.CreditOk);
    }

    [Fact]
    public async Task Live_success_still_returns_live_when_snapshot_save_fails()
    {
        var store = new FakeStore { ThrowOnSave = true };
        var sut = new AircraftQueryService(new FakeFeed(() => Task.FromResult(Sample)), store, new FakeStatus(), TimeProvider.System, new FakeColdStart());

        var result = await sut.GetAsync(null, "b", CancellationToken.None);

        Assert.Equal("live", result.Source);
        Assert.Single(result.Aircraft);
    }

    [Fact]
    public async Task Credit_exhausted_falls_back_to_latest_snapshot()
    {
        var store = new FakeStore { Latest = new SnapshotContent(new DateTimeOffset(2026,7,21,9,0,0,TimeSpan.Zero), Sample) };
        var status = new FakeStatus();
        var sut = new AircraftQueryService(
            new FakeFeed(() => throw new FlightFeedCreditExhaustedException("no credit")),
            store, status, TimeProvider.System, new FakeColdStart());

        var result = await sut.GetAsync(null, "b", CancellationToken.None);

        Assert.Equal("snapshot", result.Source);
        Assert.Equal(9, result.SnapshotAt!.Value.Hour);
        Assert.True(status.NoCredit);
    }

    [Fact]
    public async Task Credit_exhausted_with_no_snapshot_throws_snapshot_unavailable()
    {
        var store = new FakeStore { Latest = null };
        var sut = new AircraftQueryService(
            new FakeFeed(() => throw new FlightFeedCreditExhaustedException("no credit")),
            store, new FakeStatus(), TimeProvider.System, new FakeColdStart());

        await Assert.ThrowsAsync<SnapshotUnavailableException>(
            () => sut.GetAsync(null, "b", CancellationToken.None));
    }

    [Fact]
    public async Task Feed_failure_falls_back_to_latest_snapshot()
    {
        var store = new FakeStore { Latest = new SnapshotContent(new DateTimeOffset(2026,7,21,7,0,0,TimeSpan.Zero), Sample) };
        var sut = new AircraftQueryService(
            new FakeFeed(() => throw new HttpRequestException("upstream 503")),
            store, new FakeStatus(), TimeProvider.System, new FakeColdStart());

        var result = await sut.GetAsync(null, "b", CancellationToken.None);

        Assert.Equal("snapshot", result.Source);
        Assert.Equal(7, result.SnapshotAt!.Value.Hour);
    }

    [Fact]
    public async Task Feed_failure_with_no_snapshot_throws_snapshot_unavailable()
    {
        var store = new FakeStore { Latest = null };
        var sut = new AircraftQueryService(
            new FakeFeed(() => throw new HttpRequestException("upstream 503")),
            store, new FakeStatus(), TimeProvider.System, new FakeColdStart());

        await Assert.ThrowsAsync<SnapshotUnavailableException>(
            () => sut.GetAsync(null, "b", CancellationToken.None));
    }

    [Fact]
    public async Task Explicit_snapshot_id_loads_that_snapshot()
    {
        var store = new FakeStore { Latest = new SnapshotContent(new DateTimeOffset(2026,7,21,8,0,0,TimeSpan.Zero), Sample) };
        var sut = new AircraftQueryService(new FakeFeed(() => Task.FromResult(Sample)), store, new FakeStatus(), TimeProvider.System, new FakeColdStart());

        var result = await sut.GetAsync("dt=2026-07-21/08-00-00", "b", CancellationToken.None);

        Assert.Equal("snapshot", result.Source);
        Assert.Equal(8, result.SnapshotAt!.Value.Hour);
    }

    [Fact]
    public async Task Explicit_snapshot_id_that_is_missing_throws_not_found()
    {
        var store = new FakeStore { Latest = null }; // LoadAsync returns null
        var sut = new AircraftQueryService(new FakeFeed(() => Task.FromResult(Sample)), store, new FakeStatus(), TimeProvider.System, new FakeColdStart());

        await Assert.ThrowsAsync<SnapshotNotFoundException>(
            () => sut.GetAsync("dt=2026-07-21/99-99-99", "b", CancellationToken.None));
    }

    [Fact]
    public async Task Rate_limited_falls_back_to_latest_snapshot()
    {
        var store = new FakeStore { Latest = new SnapshotContent(new DateTimeOffset(2026,7,21,6,0,0,TimeSpan.Zero), Sample) };
        var sut = new AircraftQueryService(
            new FakeFeed(() => throw new FlightFeedRateLimitedException()),
            store, new FakeStatus(), TimeProvider.System, new FakeColdStart());

        var result = await sut.GetAsync(null, "b", CancellationToken.None);

        Assert.Equal("snapshot", result.Source);
        Assert.Equal(6, result.SnapshotAt!.Value.Hour);
    }

    [Fact]
    public async Task Feed_failure_with_no_stored_snapshot_serves_cold_start_seed()
    {
        var store = new FakeStore { Latest = null };
        var sut = new AircraftQueryService(
            new FakeFeed(() => throw new HttpRequestException("upstream 503")),
            store, new FakeStatus(), TimeProvider.System, new FakeColdStart(ColdStartSeed));

        var result = await sut.GetAsync(null, "b", CancellationToken.None);

        Assert.Equal("snapshot", result.Source);
        Assert.Equal(ColdStartSeed.CapturedAt, result.SnapshotAt);
        Assert.Equal("SEED1", Assert.Single(result.Aircraft).Callsign);
        Assert.True(store.Saved); // best-effort persist so the selector is populated
    }

    [Fact]
    public async Task Credit_exhausted_with_no_stored_snapshot_serves_cold_start_seed()
    {
        var store = new FakeStore { Latest = null };
        var status = new FakeStatus();
        var sut = new AircraftQueryService(
            new FakeFeed(() => throw new FlightFeedCreditExhaustedException("no credit")),
            store, status, TimeProvider.System, new FakeColdStart(ColdStartSeed));

        var result = await sut.GetAsync(null, "b", CancellationToken.None);

        Assert.Equal("snapshot", result.Source);
        Assert.Single(result.Aircraft);
        Assert.True(status.NoCredit);
    }

    [Fact]
    public async Task Storage_read_failure_serves_cold_start_seed_not_500()
    {
        var store = new FakeStore { ThrowOnLoad = true };
        var sut = new AircraftQueryService(
            new FakeFeed(() => throw new HttpRequestException("upstream 503")),
            store, new FakeStatus(), TimeProvider.System, new FakeColdStart(ColdStartSeed));

        var result = await sut.GetAsync(null, "b", CancellationToken.None);

        Assert.Equal("snapshot", result.Source);
        Assert.Equal(ColdStartSeed.CapturedAt, result.SnapshotAt);
    }

    [Fact]
    public async Task Storage_read_failure_with_no_cold_start_seed_throws_snapshot_unavailable()
    {
        var store = new FakeStore { ThrowOnLoad = true };
        var sut = new AircraftQueryService(
            new FakeFeed(() => throw new HttpRequestException("upstream 503")),
            store, new FakeStatus(), TimeProvider.System, new FakeColdStart());

        await Assert.ThrowsAsync<SnapshotUnavailableException>(
            () => sut.GetAsync(null, "b", CancellationToken.None));
    }
}
