namespace AtcSim.VoiceAgentApi.Services;

public sealed class MockKnowledgeTool
{
    public Task<string> ResolveAsync(string prompt, CancellationToken cancellationToken)
    {
        var answer = prompt.Contains("aircraft selection", StringComparison.OrdinalIgnoreCase)
            ? "The aircraft selection PoC proves FR24 sandbox reading, Azure Maps rendering, and signed-in aircraft selection UX."
            : "This PoC focuses on low-latency voice interaction backed by tool-first mock knowledge.";

        return Task.FromResult(answer);
    }
}
