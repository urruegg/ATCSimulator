using AtcSim.FlightDataApi.Services;
using Xunit;

namespace AtcSim.FlightDataApi.Tests;

public class FlightFeedStatusProviderTests
{
    private sealed class FakeProbe(bool reachable) : IFr24UsageProbe
    {
        public Task<bool> IsReachableAsync(CancellationToken ct) => Task.FromResult(reachable);
    }

    [Fact]
    public async Task Offline_when_usage_probe_unreachable()
    {
        var sut = new FlightFeedStatusProvider(new FakeProbe(false), TimeProvider.System);
        var status = await sut.GetStatusAsync(CancellationToken.None);
        Assert.Equal("offline", status.State);
    }

    [Fact]
    public async Task No_credit_when_reachable_but_credit_flag_exhausted()
    {
        var sut = new FlightFeedStatusProvider(new FakeProbe(true), TimeProvider.System);
        sut.MarkNoCredit();
        var status = await sut.GetStatusAsync(CancellationToken.None);
        Assert.Equal("no_credit", status.State);
    }

    [Fact]
    public async Task Connected_when_reachable_and_credit_ok()
    {
        var sut = new FlightFeedStatusProvider(new FakeProbe(true), TimeProvider.System);
        sut.MarkNoCredit();
        sut.MarkCreditOk();
        var status = await sut.GetStatusAsync(CancellationToken.None);
        Assert.Equal("connected", status.State);
    }
}
