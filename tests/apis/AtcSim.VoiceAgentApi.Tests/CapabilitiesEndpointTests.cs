using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace AtcSim.VoiceAgentApi.Tests;

public class CapabilitiesEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Reports_mock_available_and_live_unavailable_by_default()
    {
        var res = await factory.CreateClient().GetFromJsonAsync<Capabilities>("/api/voice/capabilities");
        Assert.NotNull(res);
        Assert.True(res!.MockAvailable);
        Assert.False(res.LiveAvailable); // no AgentId/ProjectId configured in tests
    }

    private sealed record Capabilities(bool LiveAvailable, bool MockAvailable);
}
