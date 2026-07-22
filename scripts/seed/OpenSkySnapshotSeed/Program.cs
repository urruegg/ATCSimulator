using System.Globalization;
using System.Text.Json;
using AtcSim.FlightDataApi.Contracts;
using AtcSim.FlightDataApi.Options;
using AtcSim.FlightDataApi.Services;
using Azure.Identity;
using Azure.Storage.Files.DataLake;
using Microsoft.Extensions.Options;

var options = SeedOptions.Parse(args);
if (options.ShowHelp)
{
    SeedOptions.PrintHelp();
    return 0;
}

try
{
    using var json = await LoadOpenSkyJsonAsync(options, CancellationToken.None);
    var aircraft = OpenSkySnapshotMapper.Map(json.RootElement).ToList();
    if (aircraft.Count == 0)
    {
        Console.Error.WriteLine("No usable OpenSky state vectors were found for the requested input.");
        return 2;
    }

    var capturedAt = options.CapturedAt ?? DateTimeOffset.UtcNow;
    var wrote = false;

    if (!string.IsNullOrWhiteSpace(options.OutputDirectory))
    {
        await SaveLocalSnapshotAsync(options.OutputDirectory, options.Region, aircraft, capturedAt);
        wrote = true;
    }

    if (!string.IsNullOrWhiteSpace(options.AccountUrl))
    {
        var service = new DataLakeServiceClient(new Uri(options.AccountUrl), new DefaultAzureCredential());
        var store = new AdlsSnapshotStore(service, Options.Create(new StorageOptions
        {
            AccountUrl = options.AccountUrl,
            FileSystem = options.FileSystem,
            Region = options.Region,
        }));
        await store.SaveLatestAndArchiveAsync(aircraft, capturedAt, CancellationToken.None);
        wrote = true;
    }

    if (!wrote)
    {
        Console.Error.WriteLine("Set --account-url or Storage__AccountUrl to write ADLS, or pass --output-dir for a local dry run.");
        return 2;
    }

    Console.WriteLine($"Seeded {aircraft.Count} aircraft at {capturedAt:O} for region '{options.Region}'.");
    return 0;
}
catch (Exception ex) when (ex is not OperationCanceledException)
{
    Console.Error.WriteLine($"Seed failed: {ex.Message}");
    return 1;
}

static async Task<JsonDocument> LoadOpenSkyJsonAsync(SeedOptions options, CancellationToken ct)
{
    if (!string.IsNullOrWhiteSpace(options.FixturePath))
    {
        await using var fixture = File.OpenRead(options.FixturePath);
        return await JsonDocument.ParseAsync(fixture, cancellationToken: ct);
    }

    using var http = new HttpClient();
    http.DefaultRequestHeaders.UserAgent.ParseAdd("ATCSimulator-OpenSkySeed/1.0");
    var uri = string.Create(CultureInfo.InvariantCulture,
        $"https://opensky-network.org/api/states/all?lamin={options.LatitudeMin}&lomin={options.LongitudeMin}&lamax={options.LatitudeMax}&lomax={options.LongitudeMax}");
    await using var response = await http.GetStreamAsync(uri, ct);
    return await JsonDocument.ParseAsync(response, cancellationToken: ct);
}

static async Task SaveLocalSnapshotAsync(
    string outputDirectory,
    string region,
    IReadOnlyList<AircraftResponse> aircraft,
    DateTimeOffset capturedAt)
{
    await WriteSnapshotAsync(Path.Combine(outputDirectory, ToLocalPath(SnapshotPaths.Archive(region, capturedAt))), aircraft, capturedAt);
    await WriteSnapshotAsync(Path.Combine(outputDirectory, ToLocalPath(SnapshotPaths.Latest(region))), aircraft, capturedAt);
}

static async Task WriteSnapshotAsync(string path, IReadOnlyList<AircraftResponse> aircraft, DateTimeOffset capturedAt)
{
    Directory.CreateDirectory(Path.GetDirectoryName(path)!);
    await using var file = File.Create(path);
    await SnapshotSerializer.SerializeAsync(aircraft, capturedAt, file);
}

static string ToLocalPath(string snapshotPath) =>
    snapshotPath.Replace('/', Path.DirectorySeparatorChar);

internal sealed record SeedOptions(
    string? FixturePath,
    string? AccountUrl,
    string FileSystem,
    string Region,
    string? OutputDirectory,
    DateTimeOffset? CapturedAt,
    double LatitudeMin,
    double LongitudeMin,
    double LatitudeMax,
    double LongitudeMax,
    bool ShowHelp)
{
    public static SeedOptions Parse(string[] args)
    {
        string? fixture = null;
        string? outputDirectory = null;
        string? accountUrl = Environment.GetEnvironmentVariable("Storage__AccountUrl");
        var fileSystem = Environment.GetEnvironmentVariable("Storage__FileSystem") ?? "flight-snapshots";
        var region = Environment.GetEnvironmentVariable("Storage__Region") ?? "ch";
        DateTimeOffset? capturedAt = null;
        var lamin = 47.20;
        var lomin = 8.20;
        var lamax = 47.75;
        var lomax = 8.95;
        var showHelp = false;

        for (var i = 0; i < args.Length; i++)
        {
            var arg = args[i];
            switch (arg)
            {
                case "--help":
                case "-h":
                    showHelp = true;
                    break;
                case "--fixture":
                    fixture = Next(args, ref i, arg);
                    break;
                case "--output-dir":
                    outputDirectory = Next(args, ref i, arg);
                    break;
                case "--account-url":
                    accountUrl = Next(args, ref i, arg);
                    break;
                case "--filesystem":
                    fileSystem = Next(args, ref i, arg);
                    break;
                case "--region":
                    region = Next(args, ref i, arg);
                    break;
                case "--captured-at":
                    capturedAt = DateTimeOffset.Parse(Next(args, ref i, arg), CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal);
                    break;
                case "--bounds":
                    var parts = Next(args, ref i, arg).Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
                    if (parts.Length != 4) throw new ArgumentException("--bounds must be 'lamin,lomin,lamax,lomax'.");
                    lamin = double.Parse(parts[0], CultureInfo.InvariantCulture);
                    lomin = double.Parse(parts[1], CultureInfo.InvariantCulture);
                    lamax = double.Parse(parts[2], CultureInfo.InvariantCulture);
                    lomax = double.Parse(parts[3], CultureInfo.InvariantCulture);
                    break;
                default:
                    throw new ArgumentException($"Unknown argument '{arg}'. Use --help for usage.");
            }
        }

        return new SeedOptions(fixture, accountUrl, fileSystem, region, outputDirectory, capturedAt, lamin, lomin, lamax, lomax, showHelp);
    }

    public static void PrintHelp() => Console.WriteLine("""
Usage: dotnet run --project scripts\seed\OpenSkySnapshotSeed\OpenSkySnapshotSeed.csproj -- [options]

Fetches anonymous OpenSky state vectors for the ZRH box, maps them to AircraftResponse,
and writes schema-identical Parquet snapshots via the existing snapshot serializer/store.

Options:
  --fixture <path>       Use a checked-in OpenSky JSON fixture instead of the live API.
  --account-url <url>    ADLS Gen2 DFS endpoint. Defaults to Storage__AccountUrl.
  --filesystem <name>    ADLS filesystem. Default: flight-snapshots.
  --region <region>      Snapshot region partition. Default: ch.
  --output-dir <path>    Local dry-run directory that receives region=...\latest.parquet.
  --captured-at <iso>    Fixed capture timestamp for deterministic tests/dry runs.
  --bounds <csv>         lamin,lomin,lamax,lomax. Default: 47.20,8.20,47.75,8.95.
""");

    private static string Next(string[] args, ref int index, string name)
    {
        if (index + 1 >= args.Length) throw new ArgumentException($"{name} requires a value.");
        index++;
        return args[index];
    }
}
