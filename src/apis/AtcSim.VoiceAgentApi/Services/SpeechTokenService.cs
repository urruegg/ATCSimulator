using AtcSim.VoiceAgentApi.Options;
using Microsoft.Extensions.Options;

namespace AtcSim.VoiceAgentApi.Services;

public sealed record SpeechToken(string Token, string Region);

/// <summary>Exchanges the API's Managed Identity for a short-lived Speech token.</summary>
public interface ISpeechStsClient
{
    Task<string> IssueTokenAsync(SpeechOptions options, CancellationToken ct);
}

public sealed class SpeechTokenService(IOptions<SpeechOptions> options, ISpeechStsClient sts)
{
    public async Task<SpeechToken> IssueAsync(CancellationToken ct)
    {
        var o = options.Value;
        var token = await sts.IssueTokenAsync(o, ct);
        return new SpeechToken(token, o.Region);
    }
}
