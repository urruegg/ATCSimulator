using Azure.Core;

namespace AtcSim.FlightDataApi.Services;

public sealed class MapsTokenService(TokenCredential credential)
{
    private static readonly TokenRequestContext Scope = new(new[] { "https://atlas.microsoft.com/.default" });

    public async Task<string> GetTokenAsync(CancellationToken ct)
        => (await credential.GetTokenAsync(Scope, ct)).Token;
}
