using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace AtcSim.VoiceAgentApi.Services;

public sealed class VoiceLoopTelemetry(ILogger<VoiceLoopTelemetry> logger) : IVoiceLoopTelemetry
{
    public const string ActivitySourceName = "AtcSim.VoiceAgentApi";
    public const string MeterName = "AtcSim.VoiceAgentApi";

    private static readonly ActivitySource Source = new(ActivitySourceName);
    private static readonly Meter Meter = new(MeterName);
    private static readonly Histogram<long> StageLatency = Meter.CreateHistogram<long>("atcsim.voice_loop.stage_latency_ms");
    private static readonly Counter<long> CommandDispatches = Meter.CreateCounter<long>("atcsim.voice_loop.command_dispatches");

    public void TrackStageLatency(string stage, long elapsedMs)
    {
        Track("AtcSim.VoiceLoop.StageLatency", ("stage", stage), ("elapsed.ms", elapsedMs));
        logger.LogInformation(
            "telemetry_event {TelemetryEventName} stage={Stage} elapsed_ms={ElapsedMs}",
            "AtcSim.VoiceLoop.StageLatency",
            stage,
            elapsedMs);
        StageLatency.Record(Math.Max(0, elapsedMs), new KeyValuePair<string, object?>("stage", stage));
    }

    public void TrackCommandDispatched(string commandType, bool accepted)
    {
        Track("AtcSim.VoiceLoop.CommandDispatch", ("command.type", commandType), ("accepted", accepted));
        logger.LogInformation(
            "telemetry_event {TelemetryEventName} command_type={CommandType} accepted={Accepted}",
            "AtcSim.VoiceLoop.CommandDispatch",
            commandType,
            accepted);
        CommandDispatches.Add(1, new KeyValuePair<string, object?>("command.type", commandType), new("accepted", accepted));
    }

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

public sealed class NullVoiceLoopTelemetry : IVoiceLoopTelemetry
{
    public static readonly NullVoiceLoopTelemetry Instance = new();
    private NullVoiceLoopTelemetry() { }
    public void TrackStageLatency(string stage, long elapsedMs) { }
    public void TrackCommandDispatched(string commandType, bool accepted) { }
}
