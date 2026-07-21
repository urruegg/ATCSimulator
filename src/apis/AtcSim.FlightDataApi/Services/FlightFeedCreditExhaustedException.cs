namespace AtcSim.FlightDataApi.Services;

public sealed class FlightFeedCreditExhaustedException : Exception
{
    public FlightFeedCreditExhaustedException(string message) : base(message) { }
}
