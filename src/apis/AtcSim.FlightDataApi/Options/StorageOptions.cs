namespace AtcSim.FlightDataApi.Options;

public sealed class StorageOptions
{
    /// <summary>ADLS Gen2 DFS endpoint, e.g. https://acct.dfs.core.windows.net.</summary>
    public string AccountUrl { get; set; } = "";
    public string FileSystem { get; set; } = "flight-snapshots";
    public string Region { get; set; } = "ch";
}
