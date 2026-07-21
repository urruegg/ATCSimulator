using AtcSim.FlightDataApi.Contracts;
using Parquet.Serialization;

namespace AtcSim.FlightDataApi.Services;

public readonly record struct SnapshotContent(DateTimeOffset CapturedAt, IReadOnlyList<AircraftResponse> Aircraft);

public static class SnapshotSerializer
{
    public static async Task SerializeAsync(
        IReadOnlyList<AircraftResponse> aircraft, DateTimeOffset capturedAt, Stream destination)
    {
        var rows = aircraft.Select(a => new SnapshotRow
        {
            SnapshotAt = capturedAt.UtcDateTime,
            Callsign = a.Callsign,
            AircraftType = a.AircraftType,
            Registration = a.Registration,
            Latitude = a.Latitude,
            Longitude = a.Longitude,
            AltitudeFt = a.AltitudeFt,
            HeadingDeg = a.HeadingDeg,
            GroundSpeedKt = a.GroundSpeedKt,
        }).ToList();

        await ParquetSerializer.SerializeAsync(rows, destination);
    }

    public static async Task<SnapshotContent> DeserializeAsync(Stream source)
    {
        IList<SnapshotRow> rows = await ParquetSerializer.DeserializeAsync<SnapshotRow>(source);
        var capturedAt = rows.Count > 0
            ? new DateTimeOffset(DateTime.SpecifyKind(rows[0].SnapshotAt, DateTimeKind.Utc))
            : DateTimeOffset.MinValue;
        var aircraft = rows
            .Select(r => new AircraftResponse(
                r.Callsign, r.AircraftType, r.Registration,
                r.Latitude, r.Longitude, r.AltitudeFt, r.HeadingDeg, r.GroundSpeedKt))
            .ToList();
        return new SnapshotContent(capturedAt, aircraft);
    }
}
