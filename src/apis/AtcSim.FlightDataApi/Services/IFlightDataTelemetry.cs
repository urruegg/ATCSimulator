namespace AtcSim.FlightDataApi.Services;

public interface IFlightDataTelemetry
{
    void TrackFlightFeedSuccess(string source, int aircraftCount, DateTimeOffset? snapshotAt);
    void TrackFlightFeedFailure(string reason, bool fallbackServed, DateTimeOffset? snapshotAt);
    void TrackFlightFeedQuotaExhausted(bool fallbackServed, DateTimeOffset? snapshotAt);
    void TrackMapsTokenBrokerSuccess();
    void TrackMapsTokenBrokerFailure(string reason);
}
