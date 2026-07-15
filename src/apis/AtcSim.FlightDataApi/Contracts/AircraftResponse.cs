namespace AtcSim.FlightDataApi.Contracts;

public sealed record AircraftResponse(
    string Callsign,
    string AircraftType,
    string? Registration,
    double Latitude,
    double Longitude,
    int AltitudeFt,
    int HeadingDeg,
    int GroundSpeedKt);
