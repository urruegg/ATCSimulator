using AtcSim.VoiceAgentApi.Contracts;
using AtcSim.VoiceAgentApi.Services;
using Xunit;

namespace AtcSim.VoiceAgentApi.Tests;

public class MockScenarioServiceTests
{
    private static MockScenarioService NewService() =>
        new(new SimCommandValidator(), new FunctionCallHandler(new SimCommandValidator(), new MockSimulatorAdapter()), new TranscriptHub());

    [Fact]
    public void Catalog_has_the_four_seeded_examples()
    {
        var ids = NewService().List().Select(s => s.Id).ToArray();
        Assert.Equal(new[] { "EX-01", "EX-02", "EX-03", "EX-04" }, ids);
    }

    [Fact]
    public void Turn_maps_heading_to_a_validated_command_with_readback()
    {
        var svc = NewService();
        var r = svc.Turn(new ScenarioTurnRequest("EX-01", "Swiss 456, turn right heading 290 degrees."));
        Assert.True(r.Accepted);
        Assert.Equal("SET_HEADING", r.Command);
        Assert.Contains("290", r.ReadBackText);
    }

    [Fact]
    public void Turn_rejects_out_of_range_heading()
    {
        var svc = NewService();
        var r = svc.Turn(new ScenarioTurnRequest("EX-01", "Swiss 456, turn right heading 400 degrees."));
        Assert.False(r.Accepted);
    }

    [Fact]
    public void Turn_on_unknown_scenario_is_rejected()
    {
        var r = NewService().Turn(new ScenarioTurnRequest("EX-99", "anything"));
        Assert.False(r.Accepted);
    }
}
