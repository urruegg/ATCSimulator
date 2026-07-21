namespace AtcSim.FlightDataApi.Services;

public sealed class Fr24UsageProbe(HttpClient client) : IFr24UsageProbe
{
    public async Task<bool> IsReachableAsync(CancellationToken ct)
    {
        try
        {
            using var response = await client.GetAsync("usage?period=24h", ct);
            return response.IsSuccessStatusCode || (int)response.StatusCode == 402;
        }
        catch (HttpRequestException) { return false; }
        catch (TaskCanceledException) { return false; }
    }
}
