using System.Text.Json;
using System.Diagnostics;
using AtcSim.VoiceAgentApi.Contracts;

namespace AtcSim.VoiceAgentApi.Services;

public sealed class FunctionCallHandler
{
    private readonly SimCommandValidator _validator;
    private readonly MockSimulatorAdapter _simulator;
    private readonly IVoiceLoopTelemetry _telemetry;

    public FunctionCallHandler(SimCommandValidator validator, MockSimulatorAdapter simulator)
        : this(validator, simulator, NullVoiceLoopTelemetry.Instance)
    {
    }

    public FunctionCallHandler(SimCommandValidator validator, MockSimulatorAdapter simulator, IVoiceLoopTelemetry telemetry)
    {
        _validator = validator;
        _simulator = simulator;
        _telemetry = telemetry;
    }

    public string Handle(string name, string argumentsJson)
    {
        var started = Stopwatch.GetTimestamp();
        var parameters = new Dictionary<string, double>();
        using (var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(argumentsJson) ? "{}" : argumentsJson))
        {
            foreach (var p in doc.RootElement.EnumerateObject())
            {
                if (p.Value.ValueKind == JsonValueKind.Number)
                {
                    parameters[p.Name] = p.Value.GetDouble();
                }
            }
        }

        var command = new SimCommand(name, parameters);
        var result = _validator.Validate(command);
        if (result.Accepted)
        {
            _simulator.Dispatch(command);
        }

        _telemetry.TrackCommandDispatched(result.Type, result.Accepted);
        _telemetry.TrackStageLatency("command", (long)Stopwatch.GetElapsedTime(started).TotalMilliseconds);
        return JsonSerializer.Serialize(new { accepted = result.Accepted, type = result.Type, reason = result.Reason });
    }
}
