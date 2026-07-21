using System.Globalization;

namespace AtcSim.FlightDataApi.Services;

public static class SnapshotPaths
{
    public static string Latest(string region) => $"region={region}/latest.parquet";

    public static string Archive(string region, DateTimeOffset capturedAt)
    {
        var utc = capturedAt.ToUniversalTime();
        var day = utc.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var time = utc.ToString("HH-mm-ss", CultureInfo.InvariantCulture);
        return $"region={region}/dt={day}/{time}.parquet";
    }

    public static string IdFromArchive(string archivePath, string region)
    {
        var prefix = $"region={region}/";
        var trimmed = archivePath.StartsWith(prefix, StringComparison.Ordinal)
            ? archivePath[prefix.Length..] : archivePath;
        return trimmed.EndsWith(".parquet", StringComparison.Ordinal)
            ? trimmed[..^".parquet".Length] : trimmed;
    }

    public static string ArchiveFromId(string region, string id) => $"region={region}/{id}.parquet";
}
