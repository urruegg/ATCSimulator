using AtcSim.FlightDataApi.Contracts;
using AtcSim.FlightDataApi.Options;
using AtcSim.FlightDataApi.Services;
using Azure.Core;
using Azure.Storage.Files.DataLake;
using System.Net.Http.Headers;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<Fr24Options>(builder.Configuration.GetSection("Fr24"));
builder.Services.AddHttpClient<IFlightFeedService, Fr24FlightFeedService>(client =>
{
	client.BaseAddress = new Uri("https://fr24api.flightradar24.com/api/");
});

builder.Services.Configure<MapsOptions>(builder.Configuration.GetSection("Maps"));
builder.Services.AddSingleton<TokenCredential>(_ => new Azure.Identity.DefaultAzureCredential());
builder.Services.AddSingleton<MapsTokenService>();

builder.Services.Configure<StorageOptions>(builder.Configuration.GetSection("Storage"));
builder.Services.AddSingleton(sp =>
{
    var url = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<StorageOptions>>().Value.AccountUrl;
    // Fall back to a syntactically-valid placeholder so DI graph validation (ValidateOnBuild)
    // and the WebApplicationFactory health test do not fail when storage is unconfigured.
    // The client makes NO network call at construction; real I/O only happens on snapshot ops.
    if (string.IsNullOrWhiteSpace(url)) url = "https://placeholder.dfs.core.windows.net";
    var credential = sp.GetRequiredService<TokenCredential>();
    return new DataLakeServiceClient(new Uri(url), credential);
});
builder.Services.AddSingleton<ISnapshotStore, AdlsSnapshotStore>();
builder.Services.AddSingleton<IFlightFeedStatusProvider, FlightFeedStatusProvider>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<AircraftQueryService>();

builder.Services.AddHttpClient<IFr24UsageProbe, Fr24UsageProbe>((sp, client) =>
{
    client.BaseAddress = new Uri("https://fr24api.flightradar24.com/api/");
    var fr24 = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<Fr24Options>>().Value;
    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", fr24.Token);
    client.DefaultRequestHeaders.Add("Accept-Version", fr24.ApiVersion);
    client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
});

var webOrigin = builder.Configuration["Web:Origin"];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (!string.IsNullOrWhiteSpace(webOrigin))
        {
            policy.WithOrigins(webOrigin).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
        }
    });
});

var app = builder.Build();

app.UseCors();

if (string.IsNullOrWhiteSpace(webOrigin))
{
    app.Logger.LogWarning("Web:Origin is not configured; cross-origin requests will be blocked (same-origin only).");
}

app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "flight-data-api" }));
app.MapGet("/api/aircraft", async (string bounds, string? snapshot, AircraftQueryService query, ILoggerFactory loggerFactory, CancellationToken ct) =>
{
    try
    {
        var result = await query.GetAsync(snapshot, bounds, ct);
        return Results.Ok(result);
    }
    catch (SnapshotNotFoundException)
    {
        return Results.Json(new { error = "snapshot_not_found" }, statusCode: StatusCodes.Status404NotFound);
    }
    catch (SnapshotUnavailableException)
    {
        loggerFactory.CreateLogger("FlightData")
            .LogWarning("Flight feed unavailable and no snapshot to serve; returning 503.");
        return Results.Json(new { error = "feed_unavailable" }, statusCode: StatusCodes.Status503ServiceUnavailable);
    }
});
app.MapGet("/api/flight-snapshots", async (ISnapshotStore store, CancellationToken ct) =>
    Results.Ok(await store.ListRecentAsync(10, ct)));

app.MapGet("/api/flight-feed/status", async (IFlightFeedStatusProvider status, CancellationToken ct) =>
    Results.Ok(await status.GetStatusAsync(ct)));

app.MapGet("/api/maps/token", async (MapsTokenService svc, CancellationToken ct) =>
	Results.Ok(new { token = await svc.GetTokenAsync(ct) }));

app.Run();

public partial class Program;
