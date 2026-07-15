using System.Threading;
using System.Threading.Tasks;
using AtcSim.VoiceAgentApi.Services;
using Xunit;

namespace AtcSim.VoiceAgentApi.Tests;

public class MockKnowledgeToolTests
{
    [Fact]
    public async Task Returns_curated_answer_for_known_prompt()
    {
        var tool = new MockKnowledgeTool();

        var answer = await tool.ResolveAsync(
            "What does the aircraft selection PoC prove?",
            CancellationToken.None);

        Assert.Contains("FR24 sandbox", answer);
    }

    [Fact]
    public async Task Returns_generic_answer_for_unknown_prompt()
    {
        var tool = new MockKnowledgeTool();

        var answer = await tool.ResolveAsync("Tell me a joke.", CancellationToken.None);

        Assert.Contains("low-latency voice", answer);
    }
}
