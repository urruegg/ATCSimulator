namespace AtcSim.VoiceAgentApi.Services;

public interface IVoiceLoopTelemetry
{
    void TrackStageLatency(string stage, long elapsedMs);
    void TrackCommandDispatched(string commandType, bool accepted);
}
