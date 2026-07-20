using AtcSim.VoiceAgentApi.Services;
using AtcSim.VoiceAgentApi.Options;
using Xunit;

namespace AtcSim.VoiceAgentApi.Tests;

public class SpeechTokenServiceTests
{
    [Fact]
    public async Task Returns_region_and_a_token()
    {
        var opts = Microsoft.Extensions.Options.Options.Create(new SpeechOptions { Region = "switzerlandnorth" });
        var svc = new SpeechTokenService(opts, new FakeTokenSource("tok-123"));
        var result = await svc.IssueAsync(CancellationToken.None);
        Assert.Equal("switzerlandnorth", result.Region);
        Assert.Equal("tok-123", result.Token);
    }

    [Fact]
    public void IssueToken_uri_uses_the_custom_subdomain_endpoint_when_configured()
    {
        var opts = new SpeechOptions { Region = "switzerlandnorth", Endpoint = "https://atcsimspch.cognitiveservices.azure.com/" };
        var uri = AadSpeechStsClient.BuildIssueTokenUri(opts);
        Assert.Equal("https://atcsimspch.cognitiveservices.azure.com/sts/v1.0/issueToken", uri.ToString());
    }

    [Fact]
    public void IssueToken_uri_falls_back_to_the_regional_host_without_an_endpoint()
    {
        var opts = new SpeechOptions { Region = "switzerlandnorth" };
        var uri = AadSpeechStsClient.BuildIssueTokenUri(opts);
        Assert.Equal("https://switzerlandnorth.api.cognitive.microsoft.com/sts/v1.0/issueToken", uri.ToString());
    }

    private sealed class FakeTokenSource(string token) : ISpeechStsClient
    {
        public Task<string> IssueTokenAsync(SpeechOptions options, CancellationToken ct) => Task.FromResult(token);
    }
}
