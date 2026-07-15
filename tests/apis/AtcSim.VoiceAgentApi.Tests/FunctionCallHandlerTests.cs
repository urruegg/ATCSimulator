using System.Text.Json;
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

public class FunctionCallHandlerTests
{
    [Fact]
    public void Valid_call_dispatches_and_returns_accepted_output()
    {
        var sim = new MockSimulatorAdapter();
        var handler = new FunctionCallHandler(new SimCommandValidator(), sim);

        var json = handler.Handle("SET_HEADING", """{ "heading": 120 }""");

        using var doc = JsonDocument.Parse(json);
        Assert.True(doc.RootElement.GetProperty("accepted").GetBoolean());
        Assert.Equal("SET_HEADING", sim.LastCommand?.Type);
    }

    [Fact]
    public void Invalid_call_is_rejected_and_not_dispatched()
    {
        var sim = new MockSimulatorAdapter();
        var handler = new FunctionCallHandler(new SimCommandValidator(), sim);

        var json = handler.Handle("SET_HEADING", """{ "heading": 999 }""");

        using var doc = JsonDocument.Parse(json);
        Assert.False(doc.RootElement.GetProperty("accepted").GetBoolean());
        Assert.Null(sim.LastCommand);
    }
}
