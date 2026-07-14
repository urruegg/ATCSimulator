using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace AtcSim.FlightDataApi.Tests;

public class FlightDataHealthEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public FlightDataHealthEndpointTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetHealth_ReturnsFlightDataApiStatus()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("flight-data-api", body);
        Assert.Contains("ok", body);
    }
}
