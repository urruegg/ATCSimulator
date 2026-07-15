using AtcSim.VoiceAgentApi.Contracts;
using AtcSim.VoiceAgentApi.Services;
using Xunit;

namespace AtcSim.VoiceAgentApi.Tests;

public class MockSimulatorAdapterTests
{
    [Fact]
    public void Dispatch_records_last_valid_command()
    {
        var sim = new MockSimulatorAdapter();
        sim.Dispatch(new SimCommand("SET_HEADING", new Dictionary<string, double> { ["heading"] = 90 }));
        Assert.Equal("SET_HEADING", sim.LastCommand?.Type);
    }
}
