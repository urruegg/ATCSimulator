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
        { "data": [ { "callsign": "SWR123", "lat": 47.45, "lon": 8.56, "alt": 15000, "track": 270, "gspeed": 320, "type": "A320", "reg": "HB-IJJ" } ] }
        """;

        var handler = new StubMessageHandler(payload);
        var client = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://fr24api.flightradar24.com/api/")
        };

        var service = new Fr24FlightFeedService(client, Microsoft.Extensions.Options.Options.Create(new Fr24Options { Token = "sandbox" }));

        var results = await service.GetAircraftAsync("47.7,47.2,8.3,8.8", CancellationToken.None);

        Assert.Single(results);
        Assert.Equal("SWR123", results[0].Callsign);
        Assert.Equal("A320", results[0].AircraftType);
        Assert.Equal("HB-IJJ", results[0].Registration);

        // Guards the FR24 contract: full '/api' path, versioned header, and bounds passthrough.
        Assert.Equal(
            "https://fr24api.flightradar24.com/api/live/flight-positions/full?bounds=47.7,47.2,8.3,8.8",
            handler.LastRequest!.RequestUri!.ToString());
        Assert.Equal("v1", handler.LastRequest.Headers.GetValues("Accept-Version").Single());
        Assert.Equal("Bearer", handler.LastRequest.Headers.Authorization!.Scheme);
    }

    private sealed class StubMessageHandler(string responseBody) : HttpMessageHandler
    {
        public HttpRequestMessage? LastRequest { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequest = request;
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseBody, Encoding.UTF8, "application/json")
            };

            return Task.FromResult(response);
        }
    }
}
