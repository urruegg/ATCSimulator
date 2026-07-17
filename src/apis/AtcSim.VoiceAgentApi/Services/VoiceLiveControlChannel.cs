using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using AtcSim.VoiceAgentApi.Options;
using Azure.Core;
using Azure.Identity;
using Microsoft.Extensions.Options;

namespace AtcSim.VoiceAgentApi.Services;

public sealed class VoiceLiveControlChannel(
    IOptions<VoiceLiveOptions> options,
    FunctionCallHandler handler,
    ILogger<VoiceLiveControlChannel> logger)
{
    private static readonly TokenRequestContext TokenScope = new(new[] { "https://ai.azure.com/.default" });
    private readonly TokenCredential _credential = new DefaultAzureCredential();

    // Opens the Voice Live control WS, negotiates SDP, and RETURNS the SDP answer
    // as soon as it arrives so the browser can complete the WebRTC handshake. The
    // control channel (server-side function-call validation/dispatch) then keeps
    // running in the background for the session's lifetime.
    public async Task<string> NegotiateAsync(string sdpOffer, CancellationToken ct)
    {
        var o = options.Value;
        var token = await _credential.GetTokenAsync(TokenScope, ct);
        var idPart = o.AgentId is { Length: > 0 }
            ? $"agent_id={o.AgentId}&project_id={o.ProjectId}"
            : $"model={o.Model}";
        var uri = new Uri($"{o.Endpoint}/voice-live/realtime/calls?api-version={o.ApiVersion}&{idPart}");
        logger.LogInformation("Voice Live: connecting {Uri}", uri);

        var ws = new ClientWebSocket();
        ws.Options.SetRequestHeader("Authorization", $"Bearer {token.Token}");
        try
        {
            await ws.ConnectAsync(uri, ct);
            logger.LogInformation("Voice Live: WS connected; sending SDP offer + session config");
            await SendAsync(ws, JsonSerializer.Serialize(new { type = "rtc.call.sdp.create", sdp_offer = sdpOffer }), ct);

            // Configure tools/session immediately after negotiation.
            await SendAsync(ws, VoiceLiveToolSchema.BuildSessionUpdate(), ct);

            var buffer = new byte[16 * 1024];
            while (ws.State == WebSocketState.Open && !ct.IsCancellationRequested)
            {
                var msg = await ReceiveAsync(ws, buffer, ct);
                if (msg is null) break;
                using var doc = JsonDocument.Parse(msg);
                var type = doc.RootElement.GetProperty("type").GetString();

                if (type == "rtc.call.sdp.created")
                {
                    var answer = doc.RootElement.GetProperty("sdp_answer").GetString()
                        ?? throw new InvalidOperationException("Voice Live returned an empty SDP answer.");
                    logger.LogInformation("Voice Live: SDP answer received; backgrounding control pump");
                    // Hand the socket to a background pump for the session lifetime.
                    _ = Task.Run(() => PumpControlChannelAsync(ws));
                    return answer;
                }

                if (type == "error")
                {
                    logger.LogError("Voice Live: error during negotiation: {Message}", msg);
                    throw new InvalidOperationException("Voice Live returned an error during negotiation.");
                }
            }

            throw new InvalidOperationException("No SDP answer received from Voice Live.");
        }
        catch
        {
            ws.Dispose();
            throw;
        }
    }

    // Long-lived control pump: validates and dispatches server-side function calls
    // until the socket closes. Runs on its own lifetime (not the HTTP request's
    // cancellation token, which is cancelled once the SDP answer is returned).
    private async Task PumpControlChannelAsync(ClientWebSocket ws)
    {
        var buffer = new byte[16 * 1024];
        try
        {
            while (ws.State == WebSocketState.Open)
            {
                var msg = await ReceiveAsync(ws, buffer, CancellationToken.None);
                if (msg is null) break;
                using var doc = JsonDocument.Parse(msg);
                if (doc.RootElement.GetProperty("type").GetString() != "response.function_call_arguments.done")
                {
                    continue;
                }

                var name = doc.RootElement.GetProperty("name").GetString()!;
                var callId = doc.RootElement.GetProperty("call_id").GetString()!;
                var args = doc.RootElement.GetProperty("arguments").GetString() ?? "{}";
                var output = handler.Handle(name, args);
                var item = JsonSerializer.Serialize(new
                {
                    type = "conversation.item.create",
                    item = new { type = "function_call_output", call_id = callId, output },
                });
                await SendAsync(ws, item, CancellationToken.None);
                await SendAsync(ws, JsonSerializer.Serialize(new { type = "response.create" }), CancellationToken.None);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Voice Live: control pump ended");
        }
        finally
        {
            ws.Dispose();
        }
    }

    private static Task SendAsync(ClientWebSocket ws, string json, CancellationToken ct) =>
        ws.SendAsync(Encoding.UTF8.GetBytes(json), WebSocketMessageType.Text, true, ct);

    private static async Task<string?> ReceiveAsync(ClientWebSocket ws, byte[] buffer, CancellationToken ct)
    {
        var sb = new StringBuilder();
        WebSocketReceiveResult result;
        do
        {
            result = await ws.ReceiveAsync(buffer, ct);
            if (result.MessageType == WebSocketMessageType.Close) return null;
            sb.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));
        }
        while (!result.EndOfMessage);
        return sb.ToString();
    }
}
