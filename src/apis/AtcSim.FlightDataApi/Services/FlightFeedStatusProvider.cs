using AtcSim.FlightDataApi.Contracts;

namespace AtcSim.FlightDataApi.Services;

public sealed class FlightFeedStatusProvider(IFr24UsageProbe probe, TimeProvider clock)
    : IFlightFeedStatusProvider
{
    private volatile bool _creditExhausted;

    public void MarkNoCredit() => _creditExhausted = true;
    public void MarkCreditOk() => _creditExhausted = false;

    public async Task<FeedStatus> GetStatusAsync(CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var reachable = await probe.IsReachableAsync(ct);
        if (!reachable) return new FeedStatus("offline", now);
        return new FeedStatus(_creditExhausted ? "no_credit" : "connected", now);
    }
}
