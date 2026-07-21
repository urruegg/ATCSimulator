namespace AtcSim.FlightDataApi.Services;

public interface IFr24UsageProbe
{
    Task<bool> IsReachableAsync(CancellationToken ct);
}
