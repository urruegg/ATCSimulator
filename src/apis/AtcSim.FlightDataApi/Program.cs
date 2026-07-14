using AtcSim.FlightDataApi.Options;
using AtcSim.FlightDataApi.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<Fr24Options>(builder.Configuration.GetSection("Fr24"));
builder.Services.AddHttpClient<IFlightFeedService, Fr24FlightFeedService>(client =>
{
	client.BaseAddress = new Uri("https://fr24api.flightradar24.com");
});

var app = builder.Build();

app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "flight-data-api" }));
app.MapGet("/api/aircraft", async (string bounds, IFlightFeedService service, CancellationToken ct) =>
{
	var aircraft = await service.GetAircraftAsync(bounds, ct);
	return Results.Ok(aircraft);
});

app.Run();

public partial class Program;
