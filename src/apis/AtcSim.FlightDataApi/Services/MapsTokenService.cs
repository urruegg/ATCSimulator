using Azure.Core;

namespace AtcSim.FlightDataApi.Services;

public sealed class MapsTokenService(TokenCredential credential, IFlightDataTelemetry telemetry)
{
    private static readonly TokenRequestContext Scope = new(new[] { "https://atlas.microsoft.com/.default" });

    public MapsTokenService(TokenCredential credential)
        : this(credential, NullFlightDataTelemetry.Instance)
    {
    }

    public async Task<string> GetTokenAsync(CancellationToken ct)
    {
        try
        {
            var token = (await credential.GetTokenAsync(Scope, ct)).Token;
            telemetry.TrackMapsTokenBrokerSuccess();
            return token;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            telemetry.TrackMapsTokenBrokerFailure(ex.GetType().Name);
            throw;
        }
    }
}
