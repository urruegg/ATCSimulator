using AtcSim.FlightDataApi.Services;
using Xunit;

namespace AtcSim.FlightDataApi.Tests;

public class OpenSkyColdStartSnapshotProviderTests
{
    private static string FixturePath => Path.Combine("Fixtures", "opensky-zrh-sample.json");

    [Fact]
    public void Loads_and_maps_bundled_fixture_into_a_snapshot()
    {
        var provider = new OpenSkyColdStartSnapshotProvider(FixturePath);

        var snapshot = provider.GetSnapshot();

        Assert.NotNull(snapshot);
        Assert.NotEmpty(snapshot!.Value.Aircraft);
        Assert.Contains(snapshot.Value.Aircraft, a => a.Callsign == "SWR14U");
    }

    [Fact]
    public void Honours_the_fixture_capture_time()
    {
        var provider = new OpenSkyColdStartSnapshotProvider(FixturePath);

        var snapshot = provider.GetSnapshot();

        // Fixture "time" is 1784710800 (epoch seconds).
        Assert.Equal(DateTimeOffset.FromUnixTimeSeconds(1784710800), snapshot!.Value.CapturedAt);
    }

    [Fact]
    public void Returns_null_when_the_fixture_is_absent()
    {
        var provider = new OpenSkyColdStartSnapshotProvider(Path.Combine("Fixtures", "does-not-exist.json"));

        Assert.Null(provider.GetSnapshot());
    }
}
