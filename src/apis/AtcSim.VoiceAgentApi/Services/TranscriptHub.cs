using System.Threading.Channels;
using AtcSim.VoiceAgentApi.Contracts;

namespace AtcSim.VoiceAgentApi.Services;

public sealed class TranscriptHub
{
    private readonly List<Channel<TranscriptEvent>> _subscribers = new();
    private readonly object _lock = new();

    public void Publish(TranscriptEvent evt)
    {
        lock (_lock)
        {
            foreach (var ch in _subscribers) { ch.Writer.TryWrite(evt); }
        }
    }

    public IAsyncEnumerable<TranscriptEvent> Subscribe(CancellationToken ct)
    {
        var channel = Channel.CreateUnbounded<TranscriptEvent>();
        lock (_lock) { _subscribers.Add(channel); }
        ct.Register(() =>
        {
            lock (_lock) { _subscribers.Remove(channel); }
            channel.Writer.TryComplete();
        });
        return channel.Reader.ReadAllAsync(ct);
    }
}
