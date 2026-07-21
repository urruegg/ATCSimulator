using AtcSim.FlightDataApi.Contracts;

namespace AtcSim.FlightDataApi.Services;

public interface IFlightFeedStatusProvider
{
    Task<FeedStatus> GetStatusAsync(CancellationToken ct);
    void MarkNoCredit();
    void MarkCreditOk();
}
