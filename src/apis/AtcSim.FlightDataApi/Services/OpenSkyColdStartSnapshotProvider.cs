using System.Text.Json;

namespace AtcSim.FlightDataApi.Services;

/// <summary>
/// Loads the checked-in OpenSky ZRH fixture bundled with the API and maps it
/// (via <see cref="OpenSkySnapshotMapper"/>) into a cold-start snapshot. The
/// fixture is loaded once and cached. Public flight data only (CON-03).
/// </summary>
public sealed class OpenSkyColdStartSnapshotProvider : IColdStartSnapshotProvider
{
    private readonly string _fixturePath;
    private readonly Lazy<SnapshotContent?> _snapshot;

    public OpenSkyColdStartSnapshotProvider(string? fixturePath = null)
    {
        _fixturePath = fixturePath
            ?? Path.Combine(AppContext.BaseDirectory, "Seed", "opensky-zrh-cold-start.json");
        _snapshot = new Lazy<SnapshotContent?>(Load, LazyThreadSafetyMode.ExecutionAndPublication);
    }

    public SnapshotContent? GetSnapshot() => _snapshot.Value;

    private SnapshotContent? Load()
    {
        if (!File.Exists(_fixturePath))
        {
            return null;
        }

        using var stream = File.OpenRead(_fixturePath);
        using var document = JsonDocument.Parse(stream);

        var aircraft = OpenSkySnapshotMapper.Map(document.RootElement).ToList();
        if (aircraft.Count == 0)
        {
            return null;
        }

        // Honour the fixture's own capture time so the snapshot timestamp is
        // truthful rather than "now"; fall back to the Unix epoch if absent.
        var capturedAt = document.RootElement.TryGetProperty("time", out var time)
            && time.ValueKind == JsonValueKind.Number
            && time.TryGetInt64(out var epochSeconds)
                ? DateTimeOffset.FromUnixTimeSeconds(epochSeconds)
                : DateTimeOffset.UnixEpoch;

        return new SnapshotContent(capturedAt, aircraft);
    }
}
