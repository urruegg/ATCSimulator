using System.Net.Http.Headers;
using System.Text.Json;
using AtcSim.FlightDataApi.Contracts;
using AtcSim.FlightDataApi.Options;
using Microsoft.Extensions.Options;

namespace AtcSim.FlightDataApi.Services;

public sealed class Fr24FlightFeedService(HttpClient httpClient, IOptions<Fr24Options> options) : IFlightFeedService
{
    public async Task<IReadOnlyList<AircraftResponse>> GetAircraftAsync(string bounds, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"live/flight-positions/full?bounds={bounds}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.Value.Token);
        request.Headers.Add("Accept-Version", options.Value.ApiVersion);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if ((int)response.StatusCode == 429)
        {
            throw new FlightFeedRateLimitedException();
        }

        if ((int)response.StatusCode == 402)
        {
            throw new FlightFeedCreditExhaustedException("FR24 credit limit reached.");
        }

        response.EnsureSuccessStatusCode();

        await using var content = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(content, cancellationToken: cancellationToken);

        return document.RootElement.GetProperty("data")
            .EnumerateArray()
            .Select(x => new AircraftResponse(
                x.GetProperty("callsign").GetString() ?? string.Empty,
                x.GetProperty("type").GetString() ?? string.Empty,
                x.TryGetProperty("reg", out var registration) ? registration.GetString() : null,
                x.GetProperty("lat").GetDouble(),
                x.GetProperty("lon").GetDouble(),
                x.GetProperty("alt").GetInt32(),
                x.GetProperty("track").GetInt32(),
                x.GetProperty("gspeed").GetInt32()))
            .ToArray();
    }
}

/// <summary>Thrown when the upstream flight feed (FR24) is rate-limiting (HTTP 429).</summary>
public sealed class FlightFeedRateLimitedException() : Exception("Flight feed rate limited (429).");
