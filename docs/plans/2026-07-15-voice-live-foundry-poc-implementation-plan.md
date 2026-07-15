# Voice Live + Foundry Agent Service PoC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock virtual-pilot loop with a real-time Voice Live (WebRTC-direct audio) loop driven by a Foundry Agent Service agent, while all simulator commands are validated and dispatched server-side.

**Architecture:** Browser does WebRTC media only (mic + playback + data channel). The `voice-agent-api` broker holds the Voice Live **control WebSocket** (SDP relay + `session.update` + tool/function-call events), validates each `function_call` against the deterministic command schema, and dispatches it through the Agnostic API to a mock simulator. Demo plane only, Sweden Central, no personal data.

**Tech Stack:** .NET 8 minimal API (broker), React + TypeScript + Vite (SPA), Bicep (Foundry infra), xUnit (backend tests), Vitest (frontend tests), Azure Voice Live API + Foundry Agent Service.

**Spec:** [../specs/2026-07-15-voice-live-foundry-poc-scope-design.md](../specs/2026-07-15-voice-live-foundry-poc-scope-design.md)

---

## File structure

| File | Responsibility |
| --- | --- |
| `src/apis/AtcSim.VoiceAgentApi/Contracts/SimCommand.cs` | Simulator command DTO + result |
| `src/apis/AtcSim.VoiceAgentApi/Services/SimCommandValidator.cs` | Deterministic schema + range validation |
| `src/apis/AtcSim.VoiceAgentApi/Services/MockSimulatorAdapter.cs` | In-process mock simulator dispatch |
| `src/apis/AtcSim.VoiceAgentApi/Services/VoiceLiveToolSchema.cs` | Builds the Voice Live `tools` + `session.update` payload |
| `src/apis/AtcSim.VoiceAgentApi/Options/VoiceLiveOptions.cs` | Endpoint / model / agent config |
| `src/apis/AtcSim.VoiceAgentApi/Services/VoiceLiveControlChannel.cs` | Holds the control WebSocket; routes `function_call` |
| `src/apis/AtcSim.VoiceAgentApi/Program.cs` | Endpoint wiring (SDP relay, transcript ingest) |
| `tests/apis/AtcSim.VoiceAgentApi.Tests/SimCommandValidatorTests.cs` | Validation unit tests |
| `tests/apis/AtcSim.VoiceAgentApi.Tests/FunctionCallHandlerTests.cs` | function_call → validate → dispatch tests |
| `infra/modules/foundry.bicep` | Microsoft Foundry (AIServices) account + project + RBAC |
| `infra/main.bicep` | Instantiate foundry module; wire app settings + roles |
| `src/web/atcsim-shell/src/voice/voiceLiveClient.ts` | Browser WebRTC client (media only) |
| `src/web/atcsim-shell/src/voice/VoicePanel.tsx` | UI + synthetic-voice disclosure |
| `agents/voice-pilot/agent.yaml` | Foundry agent persona + tool binding (config) |
| `docs/adr/ADR-0004-voice-live-foundry-agent.md` | New ADR |

---

## Task 1: Simulator command contract

**Files:**

- Create: `src/apis/AtcSim.VoiceAgentApi/Contracts/SimCommand.cs`

- [ ] **Step 1: Create the contract**

```csharp
namespace AtcSim.VoiceAgentApi.Contracts;

public sealed record SimCommand(string Type, IReadOnlyDictionary<string, double> Parameters);

public sealed record SimCommandResult(bool Accepted, string Type, string? Reason = null);
```

- [ ] **Step 2: Build**

Run: `dotnet build src/apis/AtcSim.VoiceAgentApi/AtcSim.VoiceAgentApi.csproj`
Expected: Build succeeded.

- [ ] **Step 3: Commit**

```bash
git add src/apis/AtcSim.VoiceAgentApi/Contracts/SimCommand.cs
git commit -m "feat(voice): add SimCommand contract"
```

---

## Task 2: Deterministic command validator (TDD)

**Files:**

- Create: `src/apis/AtcSim.VoiceAgentApi/Services/SimCommandValidator.cs`
- Test: `tests/apis/AtcSim.VoiceAgentApi.Tests/SimCommandValidatorTests.cs`

- [ ] **Step 1: Write the failing tests**

```csharp
using AtcSim.VoiceAgentApi.Contracts;
using AtcSim.VoiceAgentApi.Services;
using Xunit;

namespace AtcSim.VoiceAgentApi.Tests;

public class SimCommandValidatorTests
{
    private static SimCommand Cmd(string type, params (string, double)[] p)
        => new(type, p.ToDictionary(x => x.Item1, x => x.Item2));

    [Fact]
    public void Accepts_valid_heading()
    {
        var r = new SimCommandValidator().Validate(Cmd("SET_HEADING", ("heading", 270)));
        Assert.True(r.Accepted);
    }

    [Fact]
    public void Rejects_out_of_range_heading()
    {
        var r = new SimCommandValidator().Validate(Cmd("SET_HEADING", ("heading", 400)));
        Assert.False(r.Accepted);
        Assert.Contains("heading", r.Reason);
    }

    [Fact]
    public void Rejects_unknown_command()
    {
        var r = new SimCommandValidator().Validate(Cmd("LAUNCH_MISSILE"));
        Assert.False(r.Accepted);
    }

    [Fact]
    public void Rejects_missing_parameter()
    {
        var r = new SimCommandValidator().Validate(Cmd("SET_HEADING"));
        Assert.False(r.Accepted);
    }
}
```

- [ ] **Step 2: Run to verify failure**

Run: `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj --filter SimCommandValidatorTests`
Expected: FAIL (SimCommandValidator does not exist).

- [ ] **Step 3: Implement the validator**

```csharp
using AtcSim.VoiceAgentApi.Contracts;

namespace AtcSim.VoiceAgentApi.Services;

public sealed class SimCommandValidator
{
    private sealed record Rule(string Param, double Min, double Max);

    // Deterministic allow-list mirrors api/openapi.yaml / DATA.md §5.
    private static readonly IReadOnlyDictionary<string, Rule?> Rules = new Dictionary<string, Rule?>
    {
        ["SELECT_AIRCRAFT"] = null,
        ["SET_HEADING"] = new Rule("heading", 0, 360),
        ["SET_FLIGHT_LEVEL"] = new Rule("flightLevel", 0, 600),
        ["SET_ALTITUDE"] = new Rule("altitudeFt", 0, 60000),
        ["SET_SPEED"] = new Rule("speedKt", 0, 600),
        ["SET_QNH"] = new Rule("qnh", 900, 1100),
        ["REPORT_POINT"] = null,
        ["TRAFFIC_INFO"] = null,
    };

    public SimCommandResult Validate(SimCommand command)
    {
        if (!Rules.TryGetValue(command.Type, out var rule))
        {
            return new SimCommandResult(false, command.Type, $"unknown command '{command.Type}'");
        }

        if (rule is null)
        {
            return new SimCommandResult(true, command.Type);
        }

        if (!command.Parameters.TryGetValue(rule.Param, out var value))
        {
            return new SimCommandResult(false, command.Type, $"missing parameter '{rule.Param}'");
        }

        if (value < rule.Min || value > rule.Max)
        {
            return new SimCommandResult(false, command.Type,
                $"{rule.Param} {value} out of range [{rule.Min}, {rule.Max}]");
        }

        return new SimCommandResult(true, command.Type);
    }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj --filter SimCommandValidatorTests`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/apis/AtcSim.VoiceAgentApi/Services/SimCommandValidator.cs tests/apis/AtcSim.VoiceAgentApi.Tests/SimCommandValidatorTests.cs
git commit -m "feat(voice): deterministic sim command validator with range checks"
```

---

## Task 3: Mock simulator adapter (TDD)

**Files:**

- Create: `src/apis/AtcSim.VoiceAgentApi/Services/MockSimulatorAdapter.cs`
- Test: add to `tests/apis/AtcSim.VoiceAgentApi.Tests/FunctionCallHandlerTests.cs`

- [ ] **Step 1: Write the failing test**

```csharp
using AtcSim.VoiceAgentApi.Contracts;
using AtcSim.VoiceAgentApi.Services;
using Xunit;

namespace AtcSim.VoiceAgentApi.Tests;

public class MockSimulatorAdapterTests
{
    [Fact]
    public void Dispatch_records_last_valid_command()
    {
        var sim = new MockSimulatorAdapter();
        sim.Dispatch(new SimCommand("SET_HEADING", new Dictionary<string, double> { ["heading"] = 90 }));
        Assert.Equal("SET_HEADING", sim.LastCommand?.Type);
    }
}
```

- [ ] **Step 2: Run to verify failure**

Run: `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj --filter MockSimulatorAdapterTests`
Expected: FAIL (type not found).

- [ ] **Step 3: Implement the adapter**

```csharp
using AtcSim.VoiceAgentApi.Contracts;

namespace AtcSim.VoiceAgentApi.Services;

public sealed class MockSimulatorAdapter
{
    private readonly object _gate = new();
    public SimCommand? LastCommand { get; private set; }

    public SimCommand? Dispatch(SimCommand command)
    {
        lock (_gate)
        {
            LastCommand = command;
        }

        return LastCommand;
    }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj --filter MockSimulatorAdapterTests`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/apis/AtcSim.VoiceAgentApi/Services/MockSimulatorAdapter.cs tests/apis/AtcSim.VoiceAgentApi.Tests/FunctionCallHandlerTests.cs
git commit -m "feat(voice): in-process mock simulator adapter"
```

---

## Task 4: function_call handler (TDD)

Combines validation + dispatch into the unit the control channel calls. This is the guardrail boundary.

**Files:**

- Create: `src/apis/AtcSim.VoiceAgentApi/Services/FunctionCallHandler.cs`
- Test: `tests/apis/AtcSim.VoiceAgentApi.Tests/FunctionCallHandlerTests.cs`

- [ ] **Step 1: Write the failing tests**

```csharp
using System.Text.Json;
using AtcSim.VoiceAgentApi.Services;
using Xunit;

namespace AtcSim.VoiceAgentApi.Tests;

public class FunctionCallHandlerTests
{
    [Fact]
    public void Valid_call_dispatches_and_returns_accepted_output()
    {
        var sim = new MockSimulatorAdapter();
        var handler = new FunctionCallHandler(new SimCommandValidator(), sim);

        var json = handler.Handle("SET_HEADING", """{ "heading": 120 }""");

        using var doc = JsonDocument.Parse(json);
        Assert.True(doc.RootElement.GetProperty("accepted").GetBoolean());
        Assert.Equal("SET_HEADING", sim.LastCommand?.Type);
    }

    [Fact]
    public void Invalid_call_is_rejected_and_not_dispatched()
    {
        var sim = new MockSimulatorAdapter();
        var handler = new FunctionCallHandler(new SimCommandValidator(), sim);

        var json = handler.Handle("SET_HEADING", """{ "heading": 999 }""");

        using var doc = JsonDocument.Parse(json);
        Assert.False(doc.RootElement.GetProperty("accepted").GetBoolean());
        Assert.Null(sim.LastCommand);
    }
}
```

- [ ] **Step 2: Run to verify failure**

Run: `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj --filter FunctionCallHandlerTests`
Expected: FAIL (FunctionCallHandler not found).

- [ ] **Step 3: Implement the handler**

```csharp
using System.Text.Json;
using AtcSim.VoiceAgentApi.Contracts;

namespace AtcSim.VoiceAgentApi.Services;

public sealed class FunctionCallHandler(SimCommandValidator validator, MockSimulatorAdapter simulator)
{
    public string Handle(string name, string argumentsJson)
    {
        var parameters = new Dictionary<string, double>();
        using (var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(argumentsJson) ? "{}" : argumentsJson))
        {
            foreach (var p in doc.RootElement.EnumerateObject())
            {
                if (p.Value.ValueKind == JsonValueKind.Number)
                {
                    parameters[p.Name] = p.Value.GetDouble();
                }
            }
        }

        var command = new SimCommand(name, parameters);
        var result = validator.Validate(command);
        if (result.Accepted)
        {
            simulator.Dispatch(command);
        }

        return JsonSerializer.Serialize(new { accepted = result.Accepted, type = result.Type, reason = result.Reason });
    }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj --filter FunctionCallHandlerTests`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/apis/AtcSim.VoiceAgentApi/Services/FunctionCallHandler.cs tests/apis/AtcSim.VoiceAgentApi.Tests/FunctionCallHandlerTests.cs
git commit -m "feat(voice): function_call handler enforces deterministic dispatch"
```

---

## Task 5: Voice Live tool schema + session config (TDD)

Builds the `session.update`/tool payload sent on the control channel. Tool names mirror the validator's allow-list.

**Files:**

- Create: `src/apis/AtcSim.VoiceAgentApi/Services/VoiceLiveToolSchema.cs`
- Test: `tests/apis/AtcSim.VoiceAgentApi.Tests/VoiceLiveToolSchemaTests.cs`

- [ ] **Step 1: Write the failing test**

```csharp
using System.Text.Json;
using AtcSim.VoiceAgentApi.Services;
using Xunit;

namespace AtcSim.VoiceAgentApi.Tests;

public class VoiceLiveToolSchemaTests
{
    [Fact]
    public void Includes_set_heading_tool()
    {
        var json = VoiceLiveToolSchema.BuildSessionUpdate();
        using var doc = JsonDocument.Parse(json);
        var tools = doc.RootElement.GetProperty("session").GetProperty("tools");
        var names = tools.EnumerateArray().Select(t => t.GetProperty("name").GetString()).ToList();
        Assert.Contains("SET_HEADING", names);
    }
}
```

- [ ] **Step 2: Run to verify failure**

Run: `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj --filter VoiceLiveToolSchemaTests`
Expected: FAIL.

- [ ] **Step 3: Implement the schema builder**

```csharp
using System.Text.Json;

namespace AtcSim.VoiceAgentApi.Services;

public static class VoiceLiveToolSchema
{
    // session.update payload. When bound to a Foundry agent, "instructions" is
    // owned by the agent and omitted here (see voice-live-how-to).
    public static string BuildSessionUpdate() => JsonSerializer.Serialize(new
    {
        type = "session.update",
        session = new
        {
            modalities = new[] { "text", "audio" },
            turn_detection = new { type = "azure_semantic_vad", remove_filler_words = true },
            tools = new object[]
            {
                Tool("SET_HEADING", "heading", 0, 360),
                Tool("SET_FLIGHT_LEVEL", "flightLevel", 0, 600),
                Tool("SET_ALTITUDE", "altitudeFt", 0, 60000),
                Tool("SET_SPEED", "speedKt", 0, 600),
                Tool("SET_QNH", "qnh", 900, 1100),
            },
        },
    });

    private static object Tool(string name, string param, double min, double max) => new
    {
        type = "function",
        name,
        description = $"Issue {name} to the training simulator.",
        parameters = new
        {
            type = "object",
            properties = new Dictionary<string, object>
            {
                [param] = new { type = "number", minimum = min, maximum = max },
            },
            required = new[] { param },
        },
    };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj --filter VoiceLiveToolSchemaTests`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/apis/AtcSim.VoiceAgentApi/Services/VoiceLiveToolSchema.cs tests/apis/AtcSim.VoiceAgentApi.Tests/VoiceLiveToolSchemaTests.cs
git commit -m "feat(voice): Voice Live session.update tool schema (sim command allow-list)"
```

---

## Task 6: Options + control-channel client

The control channel holds the outbound WebSocket to Voice Live. Verify the preview `api-version` (`2026-01-01-preview` for `voice-live/realtime/calls`) against the live docs before running.

**Files:**

- Create: `src/apis/AtcSim.VoiceAgentApi/Options/VoiceLiveOptions.cs`
- Create: `src/apis/AtcSim.VoiceAgentApi/Services/VoiceLiveControlChannel.cs`

- [ ] **Step 1: Options**

```csharp
namespace AtcSim.VoiceAgentApi.Options;

public sealed class VoiceLiveOptions
{
    public string Endpoint { get; init; } = string.Empty; // wss://<foundry>.services.ai.azure.com
    public string ApiVersion { get; init; } = "2026-01-01-preview";
    public string? Model { get; init; } = "gpt-realtime";
    public string? AgentId { get; init; }
    public string? ProjectId { get; init; }
}
```

- [ ] **Step 2: Control-channel client**

Grounded on the WebRTC control-channel flow (`rtc.call.sdp.create` → `rtc.call.sdp.created`; `response.function_call_arguments.done` for tool calls). Uses `DefaultAzureCredential` (Managed Identity) for the `Authorization: Bearer` token.

```csharp
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using AtcSim.VoiceAgentApi.Options;
using AtcSim.VoiceAgentApi.Services;
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
```

- [ ] **Step 3: Add package + build**

Run: `dotnet add src/apis/AtcSim.VoiceAgentApi/AtcSim.VoiceAgentApi.csproj package Azure.Identity`
Run: `dotnet build src/apis/AtcSim.VoiceAgentApi/AtcSim.VoiceAgentApi.csproj`
Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add src/apis/AtcSim.VoiceAgentApi/Options/VoiceLiveOptions.cs src/apis/AtcSim.VoiceAgentApi/Services/VoiceLiveControlChannel.cs src/apis/AtcSim.VoiceAgentApi/AtcSim.VoiceAgentApi.csproj
git commit -m "feat(voice): Voice Live control-channel client with server-side tool handling"
```

---

## Task 7: Broker endpoints (SDP relay + transcript ingest)

**Files:**

- Modify: `src/apis/AtcSim.VoiceAgentApi/Program.cs`
- Create: `src/apis/AtcSim.VoiceAgentApi/Contracts/SdpExchange.cs`

- [ ] **Step 1: Contracts**

```csharp
namespace AtcSim.VoiceAgentApi.Contracts;

public sealed record SdpOfferRequest(string SdpOffer);
public sealed record SdpAnswerResponse(string SdpAnswer);
public sealed record TranscriptEvent(string Role, string Text, long TimestampMs);
```

- [ ] **Step 2: Wire DI + endpoints in `Program.cs`**

Add after `builder.Services.AddSingleton<MockKnowledgeTool>();`:

```csharp
builder.Services.Configure<AtcSim.VoiceAgentApi.Options.VoiceLiveOptions>(
    builder.Configuration.GetSection("VoiceLive"));
builder.Services.AddSingleton<AtcSim.VoiceAgentApi.Services.SimCommandValidator>();
builder.Services.AddSingleton<AtcSim.VoiceAgentApi.Services.MockSimulatorAdapter>();
builder.Services.AddSingleton<AtcSim.VoiceAgentApi.Services.FunctionCallHandler>();
builder.Services.AddSingleton<AtcSim.VoiceAgentApi.Services.VoiceLiveControlChannel>();
```

Add before `app.Run();`:

```csharp
app.MapPost("/api/voice/session", async (
    AtcSim.VoiceAgentApi.Contracts.SdpOfferRequest req,
    AtcSim.VoiceAgentApi.Services.VoiceLiveControlChannel channel,
    CancellationToken ct) =>
{
    var answer = await channel.NegotiateAsync(req.SdpOffer, ct);
    return Results.Ok(new AtcSim.VoiceAgentApi.Contracts.SdpAnswerResponse(answer));
});

app.MapPost("/api/voice/transcript", (
    AtcSim.VoiceAgentApi.Contracts.TranscriptEvent evt,
    ILoggerFactory lf) =>
{
    // Audit only; no personal data in the demo. Never log audio payloads.
    lf.CreateLogger("Debrief").LogInformation("transcript {Role} @ {Ts}ms", evt.Role, evt.TimestampMs);
    return Results.Accepted();
});
```

- [ ] **Step 3: Build**

Run: `dotnet build src/apis/AtcSim.VoiceAgentApi/AtcSim.VoiceAgentApi.csproj`
Expected: Build succeeded.

- [ ] **Step 4: Run the full backend test suite**

Run: `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/apis/AtcSim.VoiceAgentApi/Program.cs src/apis/AtcSim.VoiceAgentApi/Contracts/SdpExchange.cs
git commit -m "feat(voice): SDP relay + transcript ingest endpoints"
```

---

## Task 8: Foundry infrastructure (Bicep)

**Files:**

- Create: `infra/modules/foundry.bicep`
- Modify: `infra/main.bicep`

- [ ] **Step 1: Foundry module**

```bicep
@description('Name of the Foundry (AI Services) account.')
param name string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object = {}

@description('Principal id of the broker managed identity to grant access.')
param brokerPrincipalId string

resource account 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: name
  location: location
  tags: tags
  kind: 'AIServices'
  sku: { name: 'S0' }
  properties: {
    customSubDomainName: name
    publicNetworkAccess: 'Enabled'
  }
}

// Cognitive Services User (data-plane) for the broker identity.
var cognitiveServicesUser = 'a97b65f3-24c7-4388-baec-2e87135dc908'
resource roleAssign 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(account.id, brokerPrincipalId, cognitiveServicesUser)
  scope: account
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesUser)
    principalId: brokerPrincipalId
    principalType: 'ServicePrincipal'
  }
}

output endpoint string = 'wss://${name}.services.ai.azure.com'
output name string = account.name
```

- [ ] **Step 2: Wire into `infra/main.bicep`**

Add after the `voiceAgentApi` module (so its `principalId` output exists):

```bicep
module foundry './modules/foundry.bicep' = {
  name: 'foundry'
  params: {
    name: take('${prefix}fdry${resourceToken}', 24)
    location: location
    tags: tags
    brokerPrincipalId: voiceAgentApi.outputs.principalId
  }
}
```

Then add a `VoiceLive__Endpoint` app setting to the `voiceAgentApi` module's `appSettings` array:

```bicep
    appSettings: [
      {
        name: 'VoiceLive__Endpoint'
        value: foundry.outputs.endpoint
      }
    ]
```

- [ ] **Step 3: Validate the Bicep build**

Run: `az bicep build --file infra/main.bicep`
Expected: Compiles (only the version-upgrade warning on stderr).

- [ ] **Step 4: Commit**

```bash
git add infra/modules/foundry.bicep infra/main.bicep
git commit -m "feat(infra): Foundry (AI Services) account + broker RBAC for Voice Live"
```

> Note: verify Voice Live region availability for Sweden Central at design time (`CON-05`). The Foundry Agent Service `AgentId`/`ProjectId` are set as app settings once the agent (Task 10) is published.

---

## Task 9: React WebRTC media client (TDD-lite)

**Files:**

- Create: `src/web/atcsim-shell/src/voice/voiceLiveClient.ts`
- Test: `src/web/atcsim-shell/src/voice/__tests__/voiceLiveClient.test.ts`

- [ ] **Step 1: Write the failing test (offer-relay contract)**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { requestSdpAnswer } from '../voiceLiveClient';

describe('requestSdpAnswer', () => {
  it('posts the SDP offer to the broker and returns the answer', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sdpAnswer: 'v=0...answer' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const answer = await requestSdpAnswer('https://broker', 'v=0...offer');

    expect(answer).toBe('v=0...answer');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://broker/api/voice/session',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test --prefix src/web/atcsim-shell -- voiceLiveClient`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the client**

WebRTC media flow grounded on the official Voice Live WebRTC sample (offer → broker relay → answer). The browser never contacts Voice Live's control endpoint directly.

```typescript
export async function requestSdpAnswer(brokerBaseUrl: string, sdpOffer: string): Promise<string> {
  const res = await fetch(`${brokerBaseUrl}/api/voice/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sdpOffer }),
  });
  if (!res.ok) {
    throw new Error(`SDP relay failed: ${res.status}`);
  }
  const data = (await res.json()) as { sdpAnswer: string };
  return data.sdpAnswer;
}

export interface VoiceSession {
  stop: () => void;
}

export async function startVoiceSession(brokerBaseUrl: string): Promise<VoiceSession> {
  const pc = new RTCPeerConnection();

  const audio = document.createElement('audio');
  audio.autoplay = true;
  document.body.appendChild(audio);
  pc.ontrack = (e) => { audio.srcObject = e.streams[0]; };

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((t) => pc.addTrack(t, stream));

  // Data channel: VAD + transcripts (forwarded to the broker for audit).
  const dc = pc.createDataChannel('voice-live-events');
  dc.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'response.audio_transcript.done' || msg.type?.includes('transcription')) {
        void fetch(`${brokerBaseUrl}/api/voice/transcript`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'agent', text: '', timestampMs: Date.now() }),
        });
      }
    } catch { /* ignore non-JSON */ }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await new Promise<void>((resolve) => {
    if (pc.iceGatheringState === 'complete') resolve();
    else {
      pc.addEventListener('icegatheringstatechange', () => {
        if (pc.iceGatheringState === 'complete') resolve();
      });
      setTimeout(resolve, 3000);
    }
  });

  const answer = await requestSdpAnswer(brokerBaseUrl, pc.localDescription!.sdp);
  await pc.setRemoteDescription({ type: 'answer', sdp: answer });

  return {
    stop: () => {
      stream.getTracks().forEach((t) => t.stop());
      pc.close();
      audio.remove();
    },
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test --prefix src/web/atcsim-shell -- voiceLiveClient`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/web/atcsim-shell/src/voice/voiceLiveClient.ts src/web/atcsim-shell/src/voice/__tests__/voiceLiveClient.test.ts
git commit -m "feat(web): Voice Live WebRTC media client (media only, broker SDP relay)"
```

---

## Task 10: Voice panel UI with synthetic-voice disclosure (TDD)

**Files:**

- Create: `src/web/atcsim-shell/src/voice/VoicePanel.tsx`
- Test: `src/web/atcsim-shell/src/voice/__tests__/VoicePanel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { VoicePanel } from '../VoicePanel';

describe('VoicePanel', () => {
  it('shows the synthetic-voice disclosure (DP-16)', () => {
    render(<VoicePanel brokerBaseUrl="https://broker" />);
    expect(screen.getByText(/synthetic/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test --prefix src/web/atcsim-shell -- VoicePanel`
Expected: FAIL.

- [ ] **Step 3: Implement the panel**

```tsx
import { useState } from 'react';
import { startVoiceSession, type VoiceSession } from './voiceLiveClient';

export function VoicePanel({ brokerBaseUrl }: { brokerBaseUrl: string }) {
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [status, setStatus] = useState('idle');

  async function start() {
    setStatus('connecting');
    try {
      setSession(await startVoiceSession(brokerBaseUrl));
      setStatus('connected');
    } catch (e) {
      setStatus(`error: ${(e as Error).message}`);
    }
  }

  function stop() {
    session?.stop();
    setSession(null);
    setStatus('idle');
  }

  return (
    <section aria-label="virtual pilot">
      <p role="note">The virtual pilot voice is synthetic (AI-generated).</p>
      <button onClick={session ? stop : start}>
        {session ? 'Stop' : 'Start'} virtual pilot
      </button>
      <span>{status}</span>
    </section>
  );
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test --prefix src/web/atcsim-shell -- VoicePanel`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/web/atcsim-shell/src/voice/VoicePanel.tsx src/web/atcsim-shell/src/voice/__tests__/VoicePanel.test.tsx
git commit -m "feat(web): voice panel with synthetic-voice disclosure (DP-16)"
```

---

## Task 11: Foundry agent definition (config)

**Files:**

- Create: `agents/voice-pilot/agent.yaml`

- [ ] **Step 1: Author the agent**

Persona owns instructions (not sent in `session.update` when bound to an agent). Tool names match the validator allow-list.

```yaml
name: atcsim-virtual-pilot
description: ATCSimulator virtual simulation pilot (demo plane).
model: gpt-realtime
instructions: |
  You are a virtual pilot in an ATC training simulator. Use standard ICAO R/T
  phraseology. When the controller issues an instruction, call the matching tool
  (SET_HEADING, SET_FLIGHT_LEVEL, SET_ALTITUDE, SET_SPEED, SET_QNH) and then read
  back only the values that were accepted. Never invent read-backs for rejected
  commands. Disclose you are a synthetic voice if asked.
tools:
  - type: function
    name: SET_HEADING
    parameters:
      type: object
      properties:
        heading: { type: number, minimum: 0, maximum: 360 }
      required: [heading]
  - type: function
    name: SET_FLIGHT_LEVEL
    parameters:
      type: object
      properties:
        flightLevel: { type: number, minimum: 0, maximum: 600 }
      required: [flightLevel]
```

- [ ] **Step 2: Commit**

```bash
git add agents/voice-pilot/agent.yaml
git commit -m "feat(agent): Foundry virtual-pilot agent definition (persona + sim tools)"
```

> Publishing the agent to Foundry Agent Service and setting `VoiceLive__AgentId` / `VoiceLive__ProjectId` app settings is a deploy-time action performed via the Foundry portal or `az`/SDK once the Foundry resource (Task 8) exists.

---

## Task 12: Documentation and ADRs

**Files:**

- Create: `docs/adr/ADR-0004-voice-live-foundry-agent.md`
- Modify: `docs/adr/ADR-0001-realtime-model-region.md` (annotate as superseded for the demo plane)
- Modify: `docs/BOM.md`, `docs/SD.md`, `docs/AI.md`, `AGENTS.md`

- [ ] **Step 1: Write ADR-0004**

Capture: decision (Voice Live + Foundry Agent Service + WebRTC-direct media with server-held control channel), context, consequences, alternatives — mirroring the spec. Use the standard header table.

- [ ] **Step 2: Annotate ADR-0001**

Add a `> Superseded for the demo plane by ADR-0004` note under its Status.

- [ ] **Step 3: Update BOM/SD/AI/AGENTS**

- `BOM.md` §3.1: add *Azure Voice Live API*; mark A6–A8 superseded-for-demo.
- `AI.md` §4: note function-calling on the server-held control channel is the deterministic boundary.
- `AGENTS.md`: map AG-F-02/03/04/05 onto Voice Live components.

- [ ] **Step 4: Lint the docs**

Run: `npx markdownlint-cli2 "docs/**/*.md" "AGENTS.md"`
Expected: `Summary: 0 error(s)`.

- [ ] **Step 5: Commit**

```bash
git add docs/adr/ADR-0004-voice-live-foundry-agent.md docs/adr/ADR-0001-realtime-model-region.md docs/BOM.md docs/SD.md docs/AI.md AGENTS.md
git commit -m "docs: ADR-0004 Voice Live + Foundry Agent Service; update BOM/SD/AI/AGENTS"
```

---

## Task 13: Full validation

- [ ] **Step 1: Backend tests**

Run: `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj`
Expected: PASS (all).

- [ ] **Step 2: Frontend tests + build**

Run: `npm run test --prefix src/web/atcsim-shell`
Run: `npm run build --prefix src/web/atcsim-shell`
Expected: PASS + build succeeds.

- [ ] **Step 3: Infra build**

Run: `az bicep build --file infra/main.bicep`
Expected: Compiles.

- [ ] **Step 4: Docs lint**

Run: `npx markdownlint-cli2 "**/*.md"`
Expected: `Summary: 0 error(s)`.

---

## Traceability

Every task links back to the spec: Tasks 1–5, 7 realize §4 (deterministic server-side commands); Task 6 realizes §3 (control channel); Tasks 9–10 realize §3/§5 (browser media client, `DP-16` disclosure); Task 8 realizes §5/§7 (Foundry infra, residency); Task 11 realizes §2 D2 (Foundry Agent Service brain); Task 12 realizes §12 (docs/ADRs). Golden-phraseology evals (§13) remain the merge gate.
