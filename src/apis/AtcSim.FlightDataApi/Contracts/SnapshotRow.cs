namespace AtcSim.FlightDataApi.Contracts;

public sealed class SnapshotRow
{
    public DateTime SnapshotAt { get; set; }
    public string Callsign { get; set; } = "";
    public string AircraftType { get; set; } = "";
    public string? Registration { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int AltitudeFt { get; set; }
    public int HeadingDeg { get; set; }
    public int GroundSpeedKt { get; set; }
}
