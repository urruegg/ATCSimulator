using System.Net.Http.Headers;
using Azure.Core;
using Azure.Identity;
using AtcSim.VoiceAgentApi.Options;

namespace AtcSim.VoiceAgentApi.Services;

/// <summary>
/// Mints a Speech token via AAD: gets a Cognitive Services-scoped token for the
/// API's Managed Identity, then POSTs to the resource's custom-subdomain
/// issueToken endpoint. Entra ID auth is only accepted on the custom-subdomain
/// host (https://&lt;name&gt;.cognitiveservices.azure.com), never the shared
/// regional *.api.cognitive.microsoft.com host (which is key-auth only).
/// </summary>
public sealed class AadSpeechStsClient(IHttpClientFactory httpFactory, TokenCredential credential) : ISpeechStsClient
{
    /// <summary>
    /// Builds the issueToken URI. Prefers the custom-subdomain endpoint (required
    /// for Entra auth); falls back to the regional host only when no endpoint is
    /// configured (that host rejects bearer tokens, so this is a last resort).
    /// </summary>
    public static Uri BuildIssueTokenUri(SpeechOptions options)
    {
        if (!string.IsNullOrWhiteSpace(options.Endpoint))
        {
            var baseUrl = options.Endpoint.TrimEnd('/');
            return new Uri($"{baseUrl}/sts/v1.0/issueToken");
        }

        return new Uri($"https://{options.Region}.api.cognitive.microsoft.com/sts/v1.0/issueToken");
    }

    public async Task<string> IssueTokenAsync(SpeechOptions options, CancellationToken ct)
    {
        var aad = await credential.GetTokenAsync(
            new TokenRequestContext(new[] { "https://cognitiveservices.azure.com/.default" }), ct);
        using var http = httpFactory.CreateClient();
        using var req = new HttpRequestMessage(HttpMethod.Post, BuildIssueTokenUri(options));
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", aad.Token);
        req.Content = new StringContent(string.Empty);
        var res = await http.SendAsync(req, ct);
        res.EnsureSuccessStatusCode();
        return await res.Content.ReadAsStringAsync(ct);
    }
}
