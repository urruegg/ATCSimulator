using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using AtcSim.VoiceAgentApi.Options;
using Azure.Core;
using Azure.Identity;
using Microsoft.Extensions.Options;

namespace AtcSim.VoiceAgentApi.Services;

public sealed class VoiceLiveControlChannel(IOptions<VoiceLiveOptions> options, FunctionCallHandler handler)
{
    private static readonly TokenRequestContext TokenScope = new(new[] { "https://ai.azure.com/.default" });
    private readonly TokenCredential _credential = new DefaultAzureCredential();

    // Opens the control WS, negotiates SDP, returns the SDP answer, then pumps
    // control events (tool calls handled server-side) until the socket closes.
    public async Task<string> NegotiateAsync(string sdpOffer, CancellationToken ct)
    {
        var o = options.Value;
        var token = await _credential.GetTokenAsync(TokenScope, ct);
        var idPart = o.AgentId is { Length: > 0 }
            ? $"agent_id={o.AgentId}&project_id={o.ProjectId}"
            : $"model={o.Model}";
        var uri = new Uri($"{o.Endpoint}/voice-live/realtime/calls?api-version={o.ApiVersion}&{idPart}");

        using var ws = new ClientWebSocket();
        ws.Options.SetRequestHeader("Authorization", $"Bearer {token.Token}");
        await ws.ConnectAsync(uri, ct);

        var create = JsonSerializer.Serialize(new { type = "rtc.call.sdp.create", sdp_offer = sdpOffer });
        await SendAsync(ws, create, ct);

        // Configure tools/session immediately after negotiation.
        await SendAsync(ws, VoiceLiveToolSchema.BuildSessionUpdate(), ct);

        string? answer = null;
        var buffer = new byte[16 * 1024];
        while (ws.State == WebSocketState.Open && !ct.IsCancellationRequested)
        {
            var msg = await ReceiveAsync(ws, buffer, ct);
            if (msg is null) break;
            using var doc = JsonDocument.Parse(msg);
            var type = doc.RootElement.GetProperty("type").GetString();

            if (type == "rtc.call.sdp.created")
            {
                answer = doc.RootElement.GetProperty("sdp_answer").GetString();
                // Do not break: keep the channel open to handle tool calls.
            }
            else if (type == "response.function_call_arguments.done")
            {
                var name = doc.RootElement.GetProperty("name").GetString()!;
                var callId = doc.RootElement.GetProperty("call_id").GetString()!;
                var args = doc.RootElement.GetProperty("arguments").GetString() ?? "{}";
                var output = handler.Handle(name, args);
                var item = JsonSerializer.Serialize(new
                {
                    type = "conversation.item.create",
                    item = new { type = "function_call_output", call_id = callId, output },
                });
                await SendAsync(ws, item, ct);
                await SendAsync(ws, JsonSerializer.Serialize(new { type = "response.create" }), ct);
            }

            if (answer is not null && ct.IsCancellationRequested) break;
        }

        return answer ?? throw new InvalidOperationException("No SDP answer received from Voice Live.");
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
