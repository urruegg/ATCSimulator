using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace AtcSim.FlightDataApi.Services;

public sealed class FlightDataTelemetry(ILogger<FlightDataTelemetry> logger, TimeProvider clock) : IFlightDataTelemetry
{
    public const string ActivitySourceName = "AtcSim.FlightDataApi";
    public const string MeterName = "AtcSim.FlightDataApi";

    private static readonly ActivitySource Source = new(ActivitySourceName);
    private static readonly Meter Meter = new(MeterName);
    private static readonly Counter<long> FlightFeedEvents = Meter.CreateCounter<long>("atcsim.flight_feed.events");
    private static readonly Histogram<double> SnapshotAgeSeconds = Meter.CreateHistogram<double>("atcsim.flight_feed.snapshot_age_seconds");
    private static readonly Counter<long> MapsTokenBrokerEvents = Meter.CreateCounter<long>("atcsim.maps_token_broker.events");

    public void TrackFlightFeedSuccess(string source, int aircraftCount, DateTimeOffset? snapshotAt)
    {
        var snapshotAgeSeconds = GetSnapshotAgeSeconds(snapshotAt);
        Track(
            "AtcSim.FlightFeed.Success",
            ("source", source),
            ("aircraft.count", aircraftCount),
            ("fallback.served", source == "snapshot"),
            ("snapshot.age.seconds", snapshotAgeSeconds));
        logger.LogInformation(
            "telemetry_event {TelemetryEventName} source={Source} aircraft_count={AircraftCount} fallback_served={FallbackServed} snapshot_age_seconds={SnapshotAgeSeconds}",
            "AtcSim.FlightFeed.Success",
            source,
            aircraftCount,
            source == "snapshot",
            snapshotAgeSeconds);
        FlightFeedEvents.Add(1, new KeyValuePair<string, object?>("result", "success"), new("source", source));
        if (snapshotAgeSeconds is not null)
        {
            SnapshotAgeSeconds.Record(snapshotAgeSeconds.Value, new KeyValuePair<string, object?>("source", source));
        }
    }

    public void TrackFlightFeedFailure(string reason, bool fallbackServed, DateTimeOffset? snapshotAt)
    {
        var snapshotAgeSeconds = GetSnapshotAgeSeconds(snapshotAt);
        Track(
            "AtcSim.FlightFeed.Failure",
            ("reason", reason),
            ("fallback.served", fallbackServed),
            ("snapshot.age.seconds", snapshotAgeSeconds));
        logger.LogInformation(
            "telemetry_event {TelemetryEventName} reason={Reason} fallback_served={FallbackServed} snapshot_age_seconds={SnapshotAgeSeconds}",
            "AtcSim.FlightFeed.Failure",
            reason,
            fallbackServed,
            snapshotAgeSeconds);
        FlightFeedEvents.Add(1, new KeyValuePair<string, object?>("result", "failure"), new("fallback.served", fallbackServed));
        if (snapshotAgeSeconds is not null)
        {
            SnapshotAgeSeconds.Record(snapshotAgeSeconds.Value, new KeyValuePair<string, object?>("source", "snapshot"));
        }
    }

    public void TrackFlightFeedQuotaExhausted(bool fallbackServed, DateTimeOffset? snapshotAt)
    {
        var snapshotAgeSeconds = GetSnapshotAgeSeconds(snapshotAt);
        Track(
            "AtcSim.FlightFeed.QuotaExhausted",
            ("fallback.served", fallbackServed),
            ("snapshot.age.seconds", snapshotAgeSeconds));
        logger.LogInformation(
            "telemetry_event {TelemetryEventName} fallback_served={FallbackServed} snapshot_age_seconds={SnapshotAgeSeconds}",
            "AtcSim.FlightFeed.QuotaExhausted",
            fallbackServed,
            snapshotAgeSeconds);
        FlightFeedEvents.Add(1, new KeyValuePair<string, object?>("result", "quota_exhausted"), new("fallback.served", fallbackServed));
        if (snapshotAgeSeconds is not null)
        {
            SnapshotAgeSeconds.Record(snapshotAgeSeconds.Value, new KeyValuePair<string, object?>("source", "snapshot"));
        }
    }

    public void TrackMapsTokenBrokerSuccess()
    {
        Track("AtcSim.MapsTokenBroker.Success");
        logger.LogInformation("telemetry_event {TelemetryEventName}", "AtcSim.MapsTokenBroker.Success");
        MapsTokenBrokerEvents.Add(1, new KeyValuePair<string, object?>("result", "success"));
    }

    public void TrackMapsTokenBrokerFailure(string reason)
    {
        Track("AtcSim.MapsTokenBroker.Failure", ("reason", reason));
        logger.LogInformation(
            "telemetry_event {TelemetryEventName} reason={Reason}",
            "AtcSim.MapsTokenBroker.Failure",
            reason);
        MapsTokenBrokerEvents.Add(1, new KeyValuePair<string, object?>("result", "failure"));
    }

    private double? GetSnapshotAgeSeconds(DateTimeOffset? snapshotAt) =>
        snapshotAt is null ? null : Math.Max(0, (clock.GetUtcNow() - snapshotAt.Value).TotalSeconds);

    private void Track(string eventName, params (string Key, object? Value)[] tags)
    {
        using var activity = Source.StartActivity(eventName, ActivityKind.Internal);
        activity?.SetTag("telemetry.event.name", eventName);
        foreach (var (key, value) in tags)
        {
            activity?.SetTag(key, value);
        }
    }
}

public sealed class NullFlightDataTelemetry : IFlightDataTelemetry
{
    public static readonly NullFlightDataTelemetry Instance = new();
    private NullFlightDataTelemetry() { }
    public void TrackFlightFeedSuccess(string source, int aircraftCount, DateTimeOffset? snapshotAt) { }
    public void TrackFlightFeedFailure(string reason, bool fallbackServed, DateTimeOffset? snapshotAt) { }
    public void TrackFlightFeedQuotaExhausted(bool fallbackServed, DateTimeOffset? snapshotAt) { }
    public void TrackMapsTokenBrokerSuccess() { }
    public void TrackMapsTokenBrokerFailure(string reason) { }
}
