using System.Net.Http.Headers;
using Azure.Core;
using Azure.Identity;
using AtcSim.VoiceAgentApi.Options;

namespace AtcSim.VoiceAgentApi.Services;

/// <summary>
/// Mints a Speech token via AAD: gets an ARM-scoped token for the API's
/// Managed Identity, then POSTs to the Speech STS issueToken endpoint.
/// </summary>
public sealed class AadSpeechStsClient(IHttpClientFactory httpFactory, TokenCredential credential) : ISpeechStsClient
{
    public async Task<string> IssueTokenAsync(SpeechOptions options, CancellationToken ct)
    {
        var aad = await credential.GetTokenAsync(
            new TokenRequestContext(new[] { "https://cognitiveservices.azure.com/.default" }), ct);
        using var http = httpFactory.CreateClient();
        using var req = new HttpRequestMessage(HttpMethod.Post,
            $"https://{options.Region}.api.cognitive.microsoft.com/sts/v1.0/issueToken");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", aad.Token);
        req.Content = new StringContent(string.Empty);
        var res = await http.SendAsync(req, ct);
        res.EnsureSuccessStatusCode();
        return await res.Content.ReadAsStringAsync(ct);
    }
}
