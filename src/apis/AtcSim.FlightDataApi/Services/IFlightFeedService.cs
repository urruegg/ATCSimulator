using AtcSim.FlightDataApi.Contracts;

namespace AtcSim.FlightDataApi.Services;

public interface IFlightFeedService
{
    Task<IReadOnlyList<AircraftResponse>> GetAircraftAsync(string bounds, CancellationToken cancellationToken);
}
