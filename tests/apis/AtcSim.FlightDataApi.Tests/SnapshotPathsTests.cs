using AtcSim.FlightDataApi.Services;
using Xunit;

namespace AtcSim.FlightDataApi.Tests;

public class SnapshotPathsTests
{
    [Fact]
    public void Builds_archive_path_from_utc_timestamp()
    {
        var at = new DateTimeOffset(2026, 7, 21, 10, 30, 5, TimeSpan.Zero);
        Assert.Equal("region=ch/dt=2026-07-21/10-30-05.parquet", SnapshotPaths.Archive("ch", at));
    }

    [Fact]
    public void Builds_latest_path()
    {
        Assert.Equal("region=ch/latest.parquet", SnapshotPaths.Latest("ch"));
    }

    [Fact]
    public void Id_round_trips_to_archive_path()
    {
        var id = SnapshotPaths.IdFromArchive("region=ch/dt=2026-07-21/10-30-05.parquet", "ch");
        Assert.Equal("dt=2026-07-21/10-30-05", id);
        Assert.Equal("region=ch/dt=2026-07-21/10-30-05.parquet", SnapshotPaths.ArchiveFromId("ch", id));
    }

    [Fact]
    public void Archive_uses_utc_even_for_offset_timestamps()
    {
        // 12:30:05 +02:00 == 10:30:05 UTC
        var at = new DateTimeOffset(2026, 7, 21, 12, 30, 5, TimeSpan.FromHours(2));
        Assert.Equal("region=ch/dt=2026-07-21/10-30-05.parquet", SnapshotPaths.Archive("ch", at));
    }
}
