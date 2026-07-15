using AtcSim.VoiceAgentApi.Contracts;

namespace AtcSim.VoiceAgentApi.Services;

public sealed class SimCommandValidator
{
    private sealed record Rule(string Param, double Min, double Max);

    // Deterministic allow-list mirrors api/openapi.yaml / DATA.md section 5.
    private static readonly IReadOnlyDictionary<string, Rule?> Rules = new Dictionary<string, Rule?>
    {
        ["SELECT_AIRCRAFT"] = null,
        ["SET_HEADING"] = new Rule("heading", 0, 360),
        ["SET_FLIGHT_LEVEL"] = new Rule("flightLevel", 0, 600),
        ["SET_ALTITUDE"] = new Rule("altitudeFt", 0, 60000),
        ["SET_SPEED"] = new Rule("speedKt", 0, 600),
        ["SET_QNH"] = new Rule("qnh", 900, 1100),
        ["REPORT_POINT"] = null,
        ["TRAFFIC_INFO"] = null,
    };

    public SimCommandResult Validate(SimCommand command)
    {
        if (!Rules.TryGetValue(command.Type, out var rule))
        {
            return new SimCommandResult(false, command.Type, $"unknown command '{command.Type}'");
        }

        if (rule is null)
        {
            return new SimCommandResult(true, command.Type);
        }

        if (!command.Parameters.TryGetValue(rule.Param, out var value))
        {
            return new SimCommandResult(false, command.Type, $"missing parameter '{rule.Param}'");
        }

        if (value < rule.Min || value > rule.Max)
        {
            return new SimCommandResult(false, command.Type,
                $"{rule.Param} {value} out of range [{rule.Min}, {rule.Max}]");
        }

        return new SimCommandResult(true, command.Type);
    }
}
