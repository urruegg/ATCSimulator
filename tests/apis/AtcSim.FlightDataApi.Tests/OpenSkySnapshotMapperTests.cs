using System.Text.Json;
using AtcSim.FlightDataApi.Contracts;
using AtcSim.FlightDataApi.Services;
using Xunit;

namespace AtcSim.FlightDataApi.Tests;

public class OpenSkySnapshotMapperTests
{
    [Fact]
    public async Task Maps_open_sky_state_vectors_to_snapshot_aircraft_contract()
    {
        await using var stream = File.OpenRead(Path.Combine("Fixtures", "opensky-zrh-sample.json"));
        using var document = await JsonDocument.ParseAsync(stream);
        var expected = document.RootElement.GetProperty("expectedAircraft")
            .Deserialize<IReadOnlyList<AircraftResponse>>(new JsonSerializerOptions(JsonSerializerDefaults.Web));

        var aircraft = OpenSkySnapshotMapper.Map(document.RootElement).ToList();

        Assert.Equal(expected, aircraft);
    }

    [Fact]
    public async Task Mapped_open_sky_fixture_round_trips_through_snapshot_serializer()
    {
        await using var stream = File.OpenRead(Path.Combine("Fixtures", "opensky-zrh-sample.json"));
        using var document = await JsonDocument.ParseAsync(stream);
        var capturedAt = DateTimeOffset.Parse("2026-07-22T09:00:00Z");
        var aircraft = OpenSkySnapshotMapper.Map(document.RootElement).ToList();

        using var parquet = new MemoryStream();
        await SnapshotSerializer.SerializeAsync(aircraft, capturedAt, parquet);
        parquet.Position = 0;
        var snapshot = await SnapshotSerializer.DeserializeAsync(parquet);

        Assert.Equal(capturedAt, snapshot.CapturedAt);
        Assert.Equal(aircraft, snapshot.Aircraft);
    }
}
