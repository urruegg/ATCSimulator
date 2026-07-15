# Voice Live + Foundry Agent Service — PoC Scope Readjustment Design

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | Voice Live + Foundry Agent Service — PoC Scope Readjustment (Design) |
| Type | Spec |
| Version | 0.1 (Draft) |
| Date | 2026-07-15 |
| Author | ATCSimulator team |
| Status | Draft approved for planning |
| Classification | Public — anonymized demo |
| Subscription | `75102af9-fc92-45d4-99a8-5510a24b5421` (ME-MngEnvMCAP164444-urruegg-2) |
| Region | Sweden Central (EU) — demo plane |

**Related documents:** [BOM.md](../BOM.md) · [SD.md](../SD.md) · [AI.md](../AI.md) · [SECURITY.md](../SECURITY.md) · [COMPLIANCE.md](../COMPLIANCE.md) · [DESIGN-PRINCIPLES.md](../DESIGN-PRINCIPLES.md) · [AGENTS.md](../../AGENTS.md) · [ADR-0001](../adr/ADR-0001-realtime-model-region.md) · [ADR-0002](../adr/ADR-0002-agnostic-api-facade.md) · [ADR-0003](../adr/ADR-0003-split-plane-data-residency.md) · [api/openapi.yaml](../../api/openapi.yaml) · [cloud-platform design](./2026-07-15-cloud-platform-cicd-design.md)

---

## 1. Objective

Readjust the **PoC / demo plane (Scope 2)** real-time voice loop to adopt the
**Azure Voice Live API** (managed speech-to-speech) driven by **Microsoft Foundry
Agent Service**, following guidance from the Foundry CSA. This supersedes the
hand-orchestrated `gpt-realtime` approach of [ADR-0001](../adr/ADR-0001-realtime-model-region.md)
for the demo, while preserving every ATCSimulator guardrail.

Desired outcomes:

1. A lower-latency, lower-engineering virtual-pilot loop using a single managed API.
2. The virtual pilot's intelligence lives in a **Foundry Agent Service** agent.
3. The deterministic simulator-command boundary and residency posture are unchanged.

## 2. Approved decisions

| # | Decision | Choice |
| --- | --- | --- |
| D1 | Real-time audio transport | **WebRTC direct** (browser ↔ Voice Live), latency-first |
| D2 | Virtual-pilot brain | **Foundry Agent Service** (`agent_id`/`project_id`) behind Voice Live |
| D3 | Avatar | **Voice-only** for the PoC (no talking-head avatar) |
| D4 | Scope of change | **Demo plane only**; production (Scope 1) in-country pipeline unchanged |
| D5 | Command path | **Server-side** deterministic dispatch via the Agnostic API (see §4) |

## 3. Architecture (demo plane, Sweden Central / EU, no personal data)

```mermaid
flowchart TB
    subgraph Browser["React SPA (App Service) — WebRTC media client"]
      MIC["mic capture / audio playback"]
      SDP["SDP offer/answer (via broker)"]
    end
    subgraph CA["Broker (voice-agent-api on App Service; Container Apps at scale)"]
      SIG["Signaling + control-channel holder<br/>(holds Voice Live control WebSocket)"]
      SIM["Sim Command dispatch<br/>(deterministic: schema + range + authz)"]
      DBR["Transcription / Debrief (AG-F-06 audit)"]
    end
    APIM["Azure API Management — Agnostic API facade"]
    subgraph Foundry["Microsoft Foundry (Sweden Central)"]
      VL["Voice Live API (voice-live/realtime/calls)"]
      AG["Agent Service — virtual pilot AG-F-01"]
    end
    MOCK["Mock simulator adapter"]

    SDP -->|"1. SDP offer"| SIG
    SIG <-->|"2. control WebSocket: SDP + session.update + tool calls"| VL
    SIG -->|"3. SDP answer"| SDP
    MIC <-->|"4. WebRTC media (RTP) + data channel: audio, VAD, transcripts"| VL
    VL --- AG
    SIG -->|"5. function_call (server-side)"| APIM --> SIM --> MOCK
    SIM -->|"6. function_call_output"| SIG --> VL
    DBR -.->|"transcripts"| SIG
```

Flow:

1. The browser creates the `RTCPeerConnection`, captures the microphone, and sends its SDP offer to the broker.
2. The broker holds the Voice Live **control WebSocket** (`voice-live/realtime/calls`), performs the SDP exchange, sends `session.update`, and receives **tool/function-call events server-side**.
3. The broker returns the SDP answer to the browser.
4. Audio (RTP) and the data channel (VAD, transcripts) flow **directly** browser ↔ Voice Live for lowest latency.
5. When the agent emits a `function_call` (for example `SET_HEADING`), it arrives on the **server-held control channel**; the broker validates (schema + range + authorization) and dispatches via the Agnostic API to the mock simulator.
6. The broker returns `function_call_output` to Voice Live; the agent voices the read-back. Transcripts captured for audit (`AG-F-06`).

## 4. Guardrail reconciliation (WebRTC direct)

WebRTC direct keeps the **audio media** path browser ↔ Voice Live. The
non-negotiable guardrail — *the LLM proposes, a deterministic layer disposes; no
free-text or untrusted path ever commands the simulator; server-side
authorization* ([AI.md](../AI.md) §4, [AGENTS.md](../../AGENTS.md) AG-F-04,
`CON-01`) — is preserved by holding the **control channel server-side**:

- Per the official WebRTC guidance, the control WebSocket "is typically initiated by your server" and carries the tool/function-call events "that need to reach your backend for processing." The broker holds this channel.
- The **broker** is the only component that receives `function_call` events, validates them (schema + range + authorization), and dispatches to the simulator via the Agnostic API.
- The **browser** handles only WebRTC media + the data channel (audio, VAD, transcripts). It never sees, relays, or executes simulator commands, and holds no long-lived secrets.

This is a stronger realization than a browser relay: commands never leave the trusted server boundary.

## 5. Component changes

Changed:

- **New:** Microsoft Foundry resource + project + **Agent Service** virtual-pilot agent (phraseology persona + function tools = the deterministic sim commands). Models are managed by Voice Live — no model deployment or capacity planning.
- **`voice-agent-api` (mock) → Broker service**: holds the Voice Live control WebSocket per session, relays the SDP offer/answer for WebRTC negotiation, sends `session.update`, and handles `function_call` events server-side (validate + dispatch via the Agnostic API). Also ingests transcripts for audit. Hosted on the existing **App Service** for the PoC (an outbound control WebSocket is fine at PoC concurrency); **Container Apps** is the documented scale path for many concurrent sessions.
- **React SPA** gains a WebRTC media client (mic capture, `RTCPeerConnection`, SDP offer to the broker, audio playback, data-channel VAD/transcript handling). Continues to run on App Service.

Unchanged:

- **Agnostic API contract** ([api/openapi.yaml](../../api/openapi.yaml)) and the deterministic Sim Command validation remain the disposer.
- **Production (Scope 1)** stays in-country decomposed (Azure AI Speech STT/TTS + reasoning model) per [ADR-0003](../adr/ADR-0003-split-plane-data-residency.md).
- `flight-data-api` and the public flight feed are unaffected.

## 6. Bill of Materials deltas

- **Add:** *Azure Voice Live API* (Foundry, managed speech-to-speech) as the demo virtual-pilot loop.
- **Supersede for the demo:** raw `gpt-realtime` / `gpt-4o-transcribe` / `gpt-4o-mini-tts` (BOM A6–A8) — retained only as the conceptual fallback.
- **Confirm:** Azure Container Apps (B2) hosts the Token/Broker + Sim Command + Debrief services.
- **Confirm:** App Service (B4) continues to host the React SPA.
- **Drop for demo audio:** Azure Web PubSub / SignalR (B6) is not needed — WebRTC replaces it (may still serve control/telemetry later).

## 7. Residency & compliance

- Demo plane only: Voice Live runs in **Sweden Central (EU)** with **no personal data** (`CON-03`); public flight data + synthetic voices only.
- **No operational-ATC connectivity** (`CON-01`) — the only external write target remains the training mock simulator via the Agnostic API.
- Voice Live regional availability (and any Switzerland North availability) must be **re-verified at design time** (`CON-05`); production residency answer is unchanged.

## 8. Security

- Keyless: the **broker** authenticates to Voice Live with **Managed Identity** (Entra token, `ai.azure.com/.default` scope) over the control WebSocket. The **browser never connects to the Voice Live control endpoint** and holds no Voice Live credential — it only exchanges SDP via the broker and streams WebRTC media ([SECURITY.md](../SECURITY.md)).
- Foundry RBAC: `Cognitive Services User` + `Foundry User` assigned to the broker's identity.
- Content Safety and synthetic-voice disclosure ([AI.md](../AI.md), `DP-16`) remain in force.

## 9. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| WebRTC direct weakens governance of the command path | Server-held **control channel**; the broker (not the browser) receives and dispatches all function-calls (§4) |
| Voice Live not available in Switzerland North | Demo plane only; production stays in-country decomposed (`CON-05`) |
| Transcript/audit gap because backend is out of the audio path | Forward Voice Live transcription events to the Debrief service (`AG-F-06`) |
| Foundry Agent Service requires a Foundry resource (not Speech-only) | Provision a Microsoft Foundry resource explicitly |

## 10. Out of scope (YAGNI)

Avatar, Custom Neural Voice, in-country (Switzerland North) Voice Live, and real
simulator integration.

## 11. Traceability

- Requirements: real-time voice loop (`FR` in [AI.md](../AI.md) §1) · latency budget (`NFR`, [AI.md](../AI.md) §7.2).
- Constraints: `CON-01`, `CON-03`, `CON-05`. Principles: `DP-11`, `DP-16`, `DP-18`.
- ADRs: supersedes/annotates [ADR-0001](../adr/ADR-0001-realtime-model-region.md); constrained by [ADR-0002](../adr/ADR-0002-agnostic-api-facade.md) and [ADR-0003](../adr/ADR-0003-split-plane-data-residency.md).

## 12. Documentation to update during implementation

- New **ADR-0004** — Voice Live + Foundry Agent Service + WebRTC transport for the demo.
- Annotate **ADR-0001** as superseded for the demo plane.
- Update `BOM.md` (§3.1/§3.2), `SD.md`, `AI.md` (§1/§4), and `AGENTS.md` (AG-F mapping to Voice Live).

## 13. Testing & evaluation

- Golden-phraseology / command-mapping evals unchanged and still gate merges ([AI.md](../AI.md) §7).
- Add contract tests for the server-side `function_call` → Agnostic API path (schema + range rejection).
- Verify the broker authenticates via Managed Identity and that the browser holds no Voice Live credential.

## 14. Next step

On approval, this design transitions to an implementation plan in
[../plans](../plans) via the writing-plans skill.
