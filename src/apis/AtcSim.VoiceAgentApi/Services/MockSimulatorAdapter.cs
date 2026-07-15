using AtcSim.VoiceAgentApi.Contracts;

namespace AtcSim.VoiceAgentApi.Services;

public sealed class MockSimulatorAdapter
{
    private readonly object _gate = new();
    public SimCommand? LastCommand { get; private set; }

    public SimCommand? Dispatch(SimCommand command)
    {
        lock (_gate)
        {
            LastCommand = command;
        }

        return LastCommand;
    }
}
