using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace AtcSim.VoiceAgentApi.Tests;

public class VoiceAgentHealthEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public VoiceAgentHealthEndpointTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetHealth_ReturnsVoiceAgentApiStatus()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("voice-agent-api", body);
        Assert.Contains("ok", body);
    }
}
