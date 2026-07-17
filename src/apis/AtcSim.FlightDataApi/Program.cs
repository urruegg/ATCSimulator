using AtcSim.FlightDataApi.Options;
using AtcSim.FlightDataApi.Services;
using Azure.Core;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<Fr24Options>(builder.Configuration.GetSection("Fr24"));
builder.Services.AddHttpClient<IFlightFeedService, Fr24FlightFeedService>(client =>
{
	client.BaseAddress = new Uri("https://fr24api.flightradar24.com/api/");
});

builder.Services.Configure<MapsOptions>(builder.Configuration.GetSection("Maps"));
builder.Services.AddSingleton<TokenCredential>(_ => new Azure.Identity.DefaultAzureCredential());
builder.Services.AddSingleton<MapsTokenService>();

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
app.MapGet("/api/aircraft", async (string bounds, IFlightFeedService service, ILoggerFactory loggerFactory, CancellationToken ct) =>
{
	try
	{
		var aircraft = await service.GetAircraftAsync(bounds, ct);
		return Results.Ok(aircraft);
	}
	catch (FlightFeedRateLimitedException)
	{
		loggerFactory.CreateLogger("FlightData").LogWarning("FR24 rate limited (429); returning 503.");
		return Results.Json(new { error = "rate_limited" }, statusCode: StatusCodes.Status503ServiceUnavailable);
	}
});
app.MapGet("/api/maps/token", async (MapsTokenService svc, CancellationToken ct) =>
	Results.Ok(new { token = await svc.GetTokenAsync(ct) }));

app.Run();

public partial class Program;
