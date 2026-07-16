using System;
using System.Threading;
using System.Threading.Tasks;
using AtcSim.VoiceAgentApi.Contracts;
using AtcSim.VoiceAgentApi.Services;
using Xunit;

namespace AtcSim.VoiceAgentApi.Tests;

public class TranscriptHubTests
{
    [Fact]
    public async Task Subscriber_receives_published_event()
    {
        var hub = new TranscriptHub();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));

        var enumerator = hub.Subscribe(cts.Token).GetAsyncEnumerator(cts.Token);
        try
        {
            hub.Publish(new TranscriptEvent("atc", "hello", 123));

            Assert.True(await enumerator.MoveNextAsync());
            Assert.Equal("atc", enumerator.Current.Role);
            Assert.Equal("hello", enumerator.Current.Text);
        }
        finally
        {
            await enumerator.DisposeAsync();
        }
    }
}
