using System.Diagnostics;
using System.Text;
using System.Text.Json;
using AtcSim.VoiceAgentApi.Contracts;
using AtcSim.VoiceAgentApi.Options;
using AtcSim.VoiceAgentApi.Services;
using Azure.Monitor.OpenTelemetry.AspNetCore;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

var openTelemetry = builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource.AddService("voice-agent-api"))
    .WithTracing(tracing => tracing.AddSource(VoiceLoopTelemetry.ActivitySourceName))
    .WithMetrics(metrics => metrics.AddMeter(VoiceLoopTelemetry.MeterName));
if (!string.IsNullOrWhiteSpace(builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"]))
{
    openTelemetry.UseAzureMonitor();
}

builder.Services.AddSingleton<MockKnowledgeTool>();
builder.Services.Configure<VoiceLiveOptions>(builder.Configuration.GetSection("VoiceLive"));
builder.Services.Configure<SpeechOptions>(builder.Configuration.GetSection("Speech"));
builder.Services.AddSingleton<SimCommandValidator>();
builder.Services.AddSingleton<MockSimulatorAdapter>();
builder.Services.AddSingleton<FunctionCallHandler>();
builder.Services.AddSingleton<VoiceLiveControlChannel>();
builder.Services.AddSingleton<TranscriptHub>();
builder.Services.AddSingleton<MockScenarioService>();
builder.Services.AddSingleton<IVoiceLoopTelemetry, VoiceLoopTelemetry>();
builder.Services.AddHttpClient();
builder.Services.AddSingleton<Azure.Core.TokenCredential>(_ => new Azure.Identity.DefaultAzureCredential());
builder.Services.AddSingleton<ISpeechStsClient, AadSpeechStsClient>();
builder.Services.AddSingleton<SpeechTokenService>();

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

app.MapPost("/api/voice/respond", async (
    VoiceSessionRequest request,
    MockKnowledgeTool tool,
    IVoiceLoopTelemetry telemetry,
    CancellationToken ct) =>
{
    var started = Stopwatch.GetTimestamp();
    var answer = await tool.ResolveAsync(request.Transcript, ct);
    var elapsed = (long)Stopwatch.GetElapsedTime(started).TotalMilliseconds;
    telemetry.TrackStageLatency("stt", 0);
    telemetry.TrackStageLatency("intent", elapsed);
    telemetry.TrackStageLatency("read_back", elapsed);
    telemetry.TrackStageLatency("tts", elapsed);

    return Results.Ok(new VoiceSessionResponse(
        request.Transcript,
        answer,
        Convert.ToBase64String(Encoding.UTF8.GetBytes(answer)),
        elapsed,
        elapsed));
});

app.MapPost("/api/voice/session", async (
    SdpOfferRequest request,
    VoiceLiveControlChannel channel,
    CancellationToken ct) =>
{
    var answer = await channel.NegotiateAsync(request.SdpOffer, ct);
    return Results.Ok(new SdpAnswerResponse(answer));
});

app.MapPost("/api/voice/transcript", (TranscriptEvent transcriptEvent, TranscriptHub hub, ILoggerFactory loggerFactory) =>
{
    // Audit only; no personal data in the demo. Never log audio payloads.
    loggerFactory.CreateLogger("Debrief")
        .LogInformation("transcript {Role} @ {Ts}ms", transcriptEvent.Role, transcriptEvent.TimestampMs);
    hub.Publish(transcriptEvent);
    return Results.Accepted();
});

app.MapGet("/api/voice/transcript/stream", async (TranscriptHub hub, HttpContext ctx, CancellationToken ct) =>
{
    ctx.Response.Headers.Append("Content-Type", "text/event-stream");
    ctx.Response.Headers.Append("Cache-Control", "no-cache");
    await foreach (var evt in hub.Subscribe(ct))
    {
        var json = JsonSerializer.Serialize(evt);
        await ctx.Response.WriteAsync($"data: {json}\n\n", ct);
        await ctx.Response.Body.FlushAsync(ct);
    }
});

app.MapGet("/api/voice/scenarios", (MockScenarioService svc) => Results.Ok(svc.List()));

app.MapPost("/api/voice/scenario/turn", (ScenarioTurnRequest request, MockScenarioService svc) =>
        Results.Ok(svc.Turn(request)));

app.MapGet("/api/voice/capabilities", (Microsoft.Extensions.Options.IOptions<VoiceLiveOptions> voiceLive) =>
{
        var o = voiceLive.Value;
        var liveAvailable = !string.IsNullOrWhiteSpace(o.AgentId) && !string.IsNullOrWhiteSpace(o.ProjectId);
        return Results.Ok(new { liveAvailable, mockAvailable = true });
});

app.MapGet("/api/voice/speech/token", async (SpeechTokenService svc, CancellationToken ct) =>
{
    var t = await svc.IssueAsync(ct);
    return Results.Ok(new { token = t.Token, region = t.Region });
});

app.Run();

public partial class Program;
