using System.Text.Json;
using AtcSim.FlightDataApi.Contracts;

namespace AtcSim.FlightDataApi.Services;

public static class OpenSkySnapshotMapper
{
    private const double FeetPerMeter = 3.280839895;
    private const double KnotsPerMeterPerSecond = 1.943844492;

    public static IEnumerable<AircraftResponse> Map(JsonElement openSkyResponse)
    {
        if (!openSkyResponse.TryGetProperty("states", out var states) || states.ValueKind != JsonValueKind.Array)
        {
            yield break;
        }

        foreach (var state in states.EnumerateArray())
        {
            if (state.ValueKind != JsonValueKind.Array || state.GetArrayLength() < 11)
            {
                continue;
            }

            var callsign = ReadString(state[1]);
            if (string.IsNullOrWhiteSpace(callsign))
            {
                callsign = ReadString(state[0]).ToUpperInvariant();
            }

            if (string.IsNullOrWhiteSpace(callsign)
                || !TryReadDouble(state[5], out var longitude)
                || !TryReadDouble(state[6], out var latitude))
            {
                continue;
            }

            var altitudeFt = TryReadDouble(state[7], out var altitudeMeters)
                ? ConvertToInt(altitudeMeters * FeetPerMeter)
                : 0;
            var groundSpeedKt = TryReadDouble(state[9], out var velocityMetersPerSecond)
                ? ConvertToInt(velocityMetersPerSecond * KnotsPerMeterPerSecond)
                : 0;
            var headingDeg = TryReadDouble(state[10], out var trueTrack)
                ? NormalizeHeading(ConvertToInt(trueTrack))
                : 0;

            yield return new AircraftResponse(
                callsign,
                "UNKNOWN",
                null,
                latitude,
                longitude,
                altitudeFt,
                headingDeg,
                groundSpeedKt);
        }
    }

    private static string ReadString(JsonElement element) =>
        element.ValueKind == JsonValueKind.String ? element.GetString()?.Trim() ?? string.Empty : string.Empty;

    private static bool TryReadDouble(JsonElement element, out double value)
    {
        if (element.ValueKind == JsonValueKind.Number)
        {
            return element.TryGetDouble(out value);
        }

        value = 0;
        return false;
    }

    private static int ConvertToInt(double value) =>
        (int)Math.Round(value, MidpointRounding.AwayFromZero);

    private static int NormalizeHeading(int heading)
    {
        var normalized = heading % 360;
        return normalized < 0 ? normalized + 360 : normalized;
    }
}
