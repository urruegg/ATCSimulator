using System.Text.Json;
using AtcSim.VoiceAgentApi.Services;
using Xunit;

namespace AtcSim.VoiceAgentApi.Tests;

public class VoiceLiveToolSchemaTests
{
    [Fact]
    public void Includes_set_heading_tool()
    {
        var json = VoiceLiveToolSchema.BuildSessionUpdate();
        using var doc = JsonDocument.Parse(json);
        var tools = doc.RootElement.GetProperty("session").GetProperty("tools");
        var names = tools.EnumerateArray().Select(t => t.GetProperty("name").GetString()).ToList();
        Assert.Contains("SET_HEADING", names);
    }
}
