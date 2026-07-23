using AtcSim.FlightDataApi.Contracts;
using AtcSim.FlightDataApi.Services;
using Azure.Core;
using Xunit;

namespace AtcSim.FlightDataApi.Tests;

public class FlightDataTelemetryTests
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
        public Task SaveLatestAndArchiveAsync(IReadOnlyList<AircraftResponse> aircraft, DateTimeOffset at, CancellationToken ct) =>
            Task.CompletedTask;
        public Task<SnapshotContent?> LoadLatestAsync(CancellationToken ct) => Task.FromResult(Latest);
        public Task<SnapshotContent?> LoadAsync(string id, CancellationToken ct) => Task.FromResult(Latest);
        public Task<IReadOnlyList<SnapshotInfo>> ListRecentAsync(int count, CancellationToken ct) =>
            Task.FromResult((IReadOnlyList<SnapshotInfo>)new List<SnapshotInfo>());
    }

    private sealed class FakeStatus : IFlightFeedStatusProvider
    {
        public Task<FeedStatus> GetStatusAsync(CancellationToken ct) => Task.FromResult(new FeedStatus("connected", DateTimeOffset.UtcNow));
        public void MarkNoCredit() { }
        public void MarkCreditOk() { }
    }

    private sealed class FakeColdStart : IColdStartSnapshotProvider
    {
        public SnapshotContent? GetSnapshot() => null;
    }

    private sealed class RecordingTelemetry : IFlightDataTelemetry
    {
        public List<(string Name, string? Reason, bool FallbackServed, long? SnapshotAgeSeconds)> Events { get; } = [];

        public void TrackFlightFeedSuccess(string source, int aircraftCount, DateTimeOffset? snapshotAt) =>
            Events.Add(("AtcSim.FlightFeed.Success", source, source == "snapshot", null));

        public void TrackFlightFeedFailure(string reason, bool fallbackServed, DateTimeOffset? snapshotAt) =>
            Events.Add(("AtcSim.FlightFeed.Failure", reason, fallbackServed, snapshotAt is null ? null : 3600));

        public void TrackFlightFeedQuotaExhausted(bool fallbackServed, DateTimeOffset? snapshotAt) =>
            Events.Add(("AtcSim.FlightFeed.QuotaExhausted", null, fallbackServed, snapshotAt is null ? null : 3600));

        public void TrackMapsTokenBrokerSuccess() =>
            Events.Add(("AtcSim.MapsTokenBroker.Success", null, false, null));
        public void TrackMapsTokenBrokerFailure(string reason) =>
            Events.Add(("AtcSim.MapsTokenBroker.Failure", reason, false, null));
    }

    [Fact]
    public async Task Credit_exhaustion_tracks_quota_event_with_snapshot_age_without_aircraft_payload()
    {
        var telemetry = new RecordingTelemetry();
        var store = new FakeStore
        {
            Latest = new SnapshotContent(new DateTimeOffset(2026, 7, 22, 8, 0, 0, TimeSpan.Zero), Sample)
        };
        var sut = new AircraftQueryService(
            new FakeFeed(() => throw new FlightFeedCreditExhaustedException("no credit")),
            store,
            new FakeStatus(),
            new FakeTimeProvider(new DateTimeOffset(2026, 7, 22, 9, 0, 0, TimeSpan.Zero)),
            new FakeColdStart(),
            telemetry);

        var result = await sut.GetAsync(null, "47.7,47.2,8.3,8.8", CancellationToken.None);

        Assert.Equal("snapshot", result.Source);
        Assert.Contains(telemetry.Events, e =>
            e.Name == "AtcSim.FlightFeed.QuotaExhausted"
            && e.FallbackServed
            && e.SnapshotAgeSeconds == 3600);
    }

    [Fact]
    public async Task Maps_token_broker_tracks_success_and_failure_without_token_value()
    {
        var telemetry = new RecordingTelemetry();
        var success = new MapsTokenService(new StubCredential("secret-token-value"), telemetry);

        var token = await success.GetTokenAsync(CancellationToken.None);

        Assert.Equal("secret-token-value", token);
        Assert.Contains(telemetry.Events, e => e.Name == "AtcSim.MapsTokenBroker.Success");
    }

    private sealed class FakeTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => utcNow;
    }

    private sealed class StubCredential(string token) : TokenCredential
    {
        public override AccessToken GetToken(TokenRequestContext requestContext, CancellationToken cancellationToken) =>
            new(token, DateTimeOffset.UtcNow.AddHours(1));

        public override ValueTask<AccessToken> GetTokenAsync(
            TokenRequestContext requestContext,
            CancellationToken cancellationToken) =>
            new(GetToken(requestContext, cancellationToken));
    }
}
