using System.Text.Json;

namespace AtcSim.VoiceAgentApi.Services;

public static class VoiceLiveToolSchema
{
    // session.update payload. When bound to a Foundry agent, "instructions" is
    // owned by the agent and omitted here (see voice-live-how-to).
    public static string BuildSessionUpdate() => JsonSerializer.Serialize(new
    {
        type = "session.update",
        session = new
        {
            modalities = new[] { "text", "audio" },
            turn_detection = new { type = "azure_semantic_vad", remove_filler_words = true },
            tools = new object[]
            {
                Tool("SET_HEADING", "heading", 0, 360),
                Tool("SET_FLIGHT_LEVEL", "flightLevel", 0, 600),
                Tool("SET_ALTITUDE", "altitudeFt", 0, 60000),
                Tool("SET_SPEED", "speedKt", 0, 600),
                Tool("SET_QNH", "qnh", 900, 1100),
            },
        },
    });

    private static object Tool(string name, string param, double min, double max) => new
    {
        type = "function",
        name,
        description = $"Issue {name} to the training simulator.",
        parameters = new
        {
            type = "object",
            properties = new Dictionary<string, object>
            {
                [param] = new { type = "number", minimum = min, maximum = max },
            },
            required = new[] { param },
        },
    };
}
