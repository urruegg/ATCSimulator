using AtcSim.FlightDataApi.Options;
using AtcSim.FlightDataApi.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<Fr24Options>(builder.Configuration.GetSection("Fr24"));
builder.Services.AddHttpClient<IFlightFeedService, Fr24FlightFeedService>(client =>
{
	client.BaseAddress = new Uri("https://fr24api.flightradar24.com/api/");
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
app.MapGet("/api/aircraft", async (string bounds, IFlightFeedService service, CancellationToken ct) =>
{
	var aircraft = await service.GetAircraftAsync(bounds, ct);
	return Results.Ok(aircraft);
});

app.Run();

public partial class Program;
