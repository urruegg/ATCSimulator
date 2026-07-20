using System.Globalization;
using System.Text.RegularExpressions;
using AtcSim.VoiceAgentApi.Contracts;

namespace AtcSim.VoiceAgentApi.Services;

public sealed class MockScenarioService(
    SimCommandValidator validator,
    FunctionCallHandler handler,
    TranscriptHub hub)
{
    private static readonly IReadOnlyList<ScenarioSummary> Catalog = new[]
    {
        new ScenarioSummary("EX-01",
            new Dictionary<string, string> { ["en"] = "Instruction to airliner", ["de"] = "Anweisung an Verkehrsflugzeug", ["fr"] = "Instruction à un avion de ligne", ["it"] = "Istruzione a un aereo di linea" },
            "airliner", new[] { "SET_HEADING", "SET_FLIGHT_LEVEL" }),
        new ScenarioSummary("EX-02",
            new Dictionary<string, string> { ["en"] = "Waypoint instruction to light aircraft", ["de"] = "Wegpunktanweisung an Kleinflugzeug", ["fr"] = "Instruction de point de report à un avion léger", ["it"] = "Istruzione di waypoint a velivolo leggero" },
            "light", new[] { "REPORT_POINT" }),
        new ScenarioSummary("EX-03",
            new Dictionary<string, string> { ["en"] = "Traffic info", ["de"] = "Traffic Info", ["fr"] = "Information de trafic", ["it"] = "Informazioni sul traffico" },
            "any", new[] { "TRAFFIC_INFO" }),
        new ScenarioSummary("EX-04",
            new Dictionary<string, string> { ["en"] = "Traffic info to IFR", ["de"] = "Traffic Info an IFR", ["fr"] = "Information de trafic à un IFR", ["it"] = "Informazioni sul traffico a un IFR" },
            "IFR", new[] { "TRAFFIC_INFO" }),
    };

    public IReadOnlyList<ScenarioSummary> List() => Catalog;

    private static bool Exists(string id) => Catalog.Any(s => s.Id == id);

    public ScenarioTurnResponse Turn(ScenarioTurnRequest request)
    {
        if (!Exists(request.ScenarioId))
        {
            return new ScenarioTurnResponse(false, null, string.Empty, new[] { "unknown scenario" });
        }

        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        hub.Publish(new TranscriptEvent("atc", request.AtcTranscript, now));

        var (name, parameters, readBack, flags) = Interpret(request.AtcTranscript);
        if (name is null)
        {
            var miss = new ScenarioTurnResponse(false, null, "Say again.", new[] { "no recognizable instruction" });
            hub.Publish(new TranscriptEvent("pilot", miss.ReadBackText, now + 1));
            return miss;
        }

        var command = new SimCommand(name, parameters);
        var result = validator.Validate(command);
        if (!result.Accepted)
        {
            var rej = new ScenarioTurnResponse(false, name, "Unable.", new[] { result.Reason ?? "rejected" });
            hub.Publish(new TranscriptEvent("pilot", rej.ReadBackText, now + 1));
            return rej;
        }

        // Deterministic dispose through the shared boundary.
        handler.Handle(name, ToJson(parameters));
        hub.Publish(new TranscriptEvent("pilot", readBack, now + 1));
        return new ScenarioTurnResponse(true, name, readBack, flags);
    }

    private static string ToJson(IReadOnlyDictionary<string, double> p) =>
        "{" + string.Join(",", p.Select(kv => $"\"{kv.Key}\":{kv.Value.ToString(CultureInfo.InvariantCulture)}")) + "}";

    // Minimal deterministic phrase → command interpreter (demo scope; no LLM).
    private static (string? Name, IReadOnlyDictionary<string, double> Params, string ReadBack, string[] Flags)
        Interpret(string transcript)
    {
        var t = transcript.ToLowerInvariant();

        var heading = Regex.Match(t, @"heading\s+(\d{1,3})");
        if (heading.Success)
        {
            var deg = double.Parse(heading.Groups[1].Value, CultureInfo.InvariantCulture);
            return ("SET_HEADING", new Dictionary<string, double> { ["heading"] = deg },
                $"Turning heading {deg:0} degrees.", new[] { "heading read-back" });
        }

        var fl = Regex.Match(t, @"flight level\s+(\d{1,3})");
        if (fl.Success)
        {
            var v = double.Parse(fl.Groups[1].Value, CultureInfo.InvariantCulture);
            return ("SET_FLIGHT_LEVEL", new Dictionary<string, double> { ["flightLevel"] = v },
                $"Climbing flight level {v:0}.", new[] { "level read-back" });
        }

        var qnh = Regex.Match(t, @"qnh\s+(\d{3,4})");
        if (qnh.Success)
        {
            var v = double.Parse(qnh.Groups[1].Value, CultureInfo.InvariantCulture);
            return ("SET_QNH", new Dictionary<string, double> { ["qnh"] = v },
                $"QNH {v:0}.", new[] { "QNH read-back" });
        }

        if (t.Contains("report"))
        {
            return ("REPORT_POINT", new Dictionary<string, double>(),
                "Wilco, will report.", new[] { "conditional report" });
        }

        if (t.Contains("traffic"))
        {
            return ("TRAFFIC_INFO", new Dictionary<string, double>(),
                "Looking out for traffic.", new[] { "traffic look-out" });
        }

        return (null, new Dictionary<string, double>(), string.Empty, Array.Empty<string>());
    }
}
