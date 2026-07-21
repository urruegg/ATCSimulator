using System.Net;
using System.Text;
using AtcSim.FlightDataApi.Options;
using AtcSim.FlightDataApi.Services;
using Xunit;

namespace AtcSim.FlightDataApi.Tests;

public class Fr24CreditExhaustionTests
{
    [Fact]
    public async Task Throws_credit_exhausted_on_402()
    {
        var handler = new StatusStubHandler((HttpStatusCode)402,
            """{ "message": "Forbidden", "details": "Credit limit reached." }""");
        var client = new HttpClient(handler) { BaseAddress = new Uri("https://fr24api.flightradar24.com/api/") };
        var service = new Fr24FlightFeedService(client, Microsoft.Extensions.Options.Options.Create(new Fr24Options { Token = "x" }));

        await Assert.ThrowsAsync<FlightFeedCreditExhaustedException>(
            () => service.GetAircraftAsync("47.7,47.2,8.3,8.8", CancellationToken.None));
    }

    private sealed class StatusStubHandler(HttpStatusCode code, string body) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
            Task.FromResult(new HttpResponseMessage(code)
            { Content = new StringContent(body, Encoding.UTF8, "application/json") });
    }
}
