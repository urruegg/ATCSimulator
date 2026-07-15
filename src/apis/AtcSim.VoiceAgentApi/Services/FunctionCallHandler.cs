using System.Text.Json;
using AtcSim.VoiceAgentApi.Contracts;

namespace AtcSim.VoiceAgentApi.Services;

public sealed class FunctionCallHandler(SimCommandValidator validator, MockSimulatorAdapter simulator)
{
    public string Handle(string name, string argumentsJson)
    {
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
        var result = validator.Validate(command);
        if (result.Accepted)
        {
            simulator.Dispatch(command);
        }

        return JsonSerializer.Serialize(new { accepted = result.Accepted, type = result.Type, reason = result.Reason });
    }
}
