using System.Net;
using System.Text;
using AtcSim.FlightDataApi.Options;
using AtcSim.FlightDataApi.Services;
using Microsoft.Extensions.Options;
using Xunit;

namespace AtcSim.FlightDataApi.Tests;

public class Fr24FlightFeedServiceTests
{
    [Fact]
    public async Task Maps_fr24_payload_to_aircraft_response()
    {
        const string payload = """
        { "data": [ { "callsign": "SWR123", "lat": 47.45, "lon": 8.56, "alt": 15000, "track": 270, "gspeed": 320, "type": "A320", "registration": "HB-IJJ" } ] }
        """;

        var handler = new StubMessageHandler(payload);
        var client = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://fr24api.flightradar24.com/")
        };

        var service = new Fr24FlightFeedService(client, Microsoft.Extensions.Options.Options.Create(new Fr24Options { Token = "sandbox" }));

        var results = await service.GetAircraftAsync("47.7,8.3,47.2,8.8", CancellationToken.None);

        Assert.Single(results);
        Assert.Equal("SWR123", results[0].Callsign);
        Assert.Equal("A320", results[0].AircraftType);
    }

    private sealed class StubMessageHandler(string responseBody) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseBody, Encoding.UTF8, "application/json")
            };

            return Task.FromResult(response);
        }
    }
}
