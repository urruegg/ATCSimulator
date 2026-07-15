using System.Diagnostics;
using System.Text;
using AtcSim.VoiceAgentApi.Contracts;
using AtcSim.VoiceAgentApi.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<MockKnowledgeTool>();

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

app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "voice-agent-api" }));

app.MapPost("/api/voice/respond", async (VoiceSessionRequest request, MockKnowledgeTool tool, CancellationToken ct) =>
{
    var started = Stopwatch.GetTimestamp();
    var answer = await tool.ResolveAsync(request.Transcript, ct);
    var elapsed = (long)Stopwatch.GetElapsedTime(started).TotalMilliseconds;

    return Results.Ok(new VoiceSessionResponse(
        request.Transcript,
        answer,
        Convert.ToBase64String(Encoding.UTF8.GetBytes(answer)),
        elapsed,
        elapsed));
});

app.Run();

public partial class Program;
