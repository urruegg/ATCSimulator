using AtcSim.FlightDataApi.Contracts;
using AtcSim.FlightDataApi.Services;
using Xunit;

namespace AtcSim.FlightDataApi.Tests;

public class SnapshotSerializerTests
{
    [Fact]
    public async Task Round_trips_aircraft_through_parquet()
    {
        var capturedAt = new DateTimeOffset(2026, 7, 21, 10, 30, 0, TimeSpan.Zero);
        var aircraft = new List<AircraftResponse>
        {
            new("SWR123", "A320", "HB-IJJ", 47.45, 8.56, 15000, 270, 320),
            new("DLH456", "B738", null, 47.10, 8.20, 22000, 90, 410),
        };

        using var stream = new MemoryStream();
        await SnapshotSerializer.SerializeAsync(aircraft, capturedAt, stream);
        stream.Position = 0;
        var result = await SnapshotSerializer.DeserializeAsync(stream);

        Assert.Equal(capturedAt, result.CapturedAt);
        Assert.Equal(2, result.Aircraft.Count);
        Assert.Equal("SWR123", result.Aircraft[0].Callsign);
        Assert.Null(result.Aircraft[1].Registration);
        Assert.Equal(410, result.Aircraft[1].GroundSpeedKt);
    }
}
