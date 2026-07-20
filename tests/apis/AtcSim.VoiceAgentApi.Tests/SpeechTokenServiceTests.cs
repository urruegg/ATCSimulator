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

    private sealed class FakeTokenSource(string token) : ISpeechStsClient
    {
        public Task<string> IssueTokenAsync(SpeechOptions options, CancellationToken ct) => Task.FromResult(token);
    }
}
