using System.Text.Json;
using AtcSim.VoiceAgentApi.Services;
using Xunit;

namespace AtcSim.VoiceAgentApi.Tests;

public class VoiceLoopTelemetryTests
{
    private sealed class RecordingTelemetry : IVoiceLoopTelemetry
    {
        public List<(string Name, string Stage, long ElapsedMs, bool Accepted)> Events { get; } = [];

        public void TrackStageLatency(string stage, long elapsedMs) =>
            Events.Add(("AtcSim.VoiceLoop.StageLatency", stage, elapsedMs, false));

        public void TrackCommandDispatched(string commandType, bool accepted) =>
            Events.Add(("AtcSim.VoiceLoop.CommandDispatch", commandType, 0, accepted));
    }

    [Fact]
    public void Function_call_handler_tracks_command_stage_without_argument_payload()
    {
        var telemetry = new RecordingTelemetry();
        var handler = new FunctionCallHandler(new SimCommandValidator(), new MockSimulatorAdapter(), telemetry);

        var json = handler.Handle("SET_HEADING", """{ "heading": 120 }""");

        using var doc = JsonDocument.Parse(json);
        Assert.True(doc.RootElement.GetProperty("accepted").GetBoolean());
        Assert.Contains(telemetry.Events, e =>
            e.Name == "AtcSim.VoiceLoop.CommandDispatch"
            && e.Stage == "SET_HEADING"
            && e.Accepted);
        Assert.Contains(telemetry.Events, e =>
            e.Name == "AtcSim.VoiceLoop.StageLatency"
            && e.Stage == "command"
            && e.ElapsedMs >= 0);
    }
}
