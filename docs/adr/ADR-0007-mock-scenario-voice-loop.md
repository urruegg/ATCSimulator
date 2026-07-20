# ADR-0007: Mock Scenario Voice Loop with Azure AI Speech

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | ADR-0007 — Mock Scenario Voice Loop with Azure AI Speech |
| Version | 0.1 (Draft) |
| Date | 2026-07-20 |
| Author | ATCSimulator team |
| Status | Accepted |
| Classification | Public — anonymized demo |

**Related documents:** [../BOM.md](../BOM.md) · [../SD.md](../SD.md) · [../AI.md](../AI.md) §4 · [../DATA.md](../DATA.md) §5 · [../SECURITY.md](../SECURITY.md) · [../COMPLIANCE.md](../COMPLIANCE.md) §5 · [../DESIGN-PRINCIPLES.md](../DESIGN-PRINCIPLES.md) DP-11/DP-16/DP-18 · [ADR-0002-agnostic-api-facade.md](./ADR-0002-agnostic-api-facade.md) · [ADR-0003-split-plane-data-residency.md](./ADR-0003-split-plane-data-residency.md) · [ADR-0004-voice-live-foundry-agent.md](./ADR-0004-voice-live-foundry-agent.md) · [spec](../specs/2026-07-20-simulator-scenarios-efficient-flightload-design.md) · [plan](../plans/2026-07-20-simulator-scenarios-efficient-flightload-plan.md)
**Related IDs:** `FR-01`, `FR-03`, `FR-04`, `FR-06`, `FR-09` · `CON-01`, `CON-03` · `DP-16`, `DP-18`

---

## Status

**Accepted.** Enables the mock scenario voice loop for demo/MVP (Scope 2) using Azure AI Speech STT/TTS (Switzerland North) with the existing deterministic command boundary (SimCommandValidator → FunctionCallHandler → MockSimulatorAdapter). Complements [ADR-0004](./ADR-0004-voice-live-foundry-agent.md) (Voice Live + Foundry agent for the live speech-to-speech path); the two paths coexist, selected by `GET /api/voice/capabilities` and a UI toggle.

## Context

The demo needs an end-to-end voice exercise that works **without the Foundry agent** being published and configured. [ADR-0004](./ADR-0004-voice-live-foundry-agent.md) chose Azure Voice Live + Foundry Agent Service for the real-time speech-to-speech loop, but this requires human-run agent publishing and app-setting configuration (`VoiceLive__AgentId` and `VoiceLive__ProjectId`).

The simulator scenarios feature (four seeded examples: EX-01..EX-04) needs a voice path that:

- Runs the full voice exercise with ATC and Pilot sides transcribed in the chat
- Uses only **public/synthetic data** (`CON-03` — no personal data in the demo)
- Stays **in-country** (Switzerland North) for audio processing (`DP-18`)
- Does **not route audio to a third party** (violation of residency/`CON-03`)
- Preserves the deterministic command boundary: **the LLM proposes, a deterministic layer disposes** ([AI.md](../AI.md) §4, `CON-01`)

Two candidate mechanisms:

- **Option A — Azure AI Speech (STT + TTS)** via a broker-minted Managed Identity token
- **Option B — Browser Web Speech API** (free; no setup)

Option B (Web Speech API) routes audio to a third party (typically Google/Chrome's servers), which violates the **data residency** constraint (`CON-03`, `DP-18`) and introduces a third-party processing dependency unacceptable for even the demo plane.

## Decision

Use **Azure AI Speech (STT + TTS)** in **Switzerland North** via a broker-minted short-lived authorization token for the **mock scenario voice loop**, plus the existing deterministic command boundary.

### Architecture

```text
Browser (mic)
   │ Azure AI Speech SDK (STT) ── token from GET /api/voice/speech/token
   ▼
ATC transcript (browser local)
   │ POST /api/voice/scenario/turn { scenarioId, atcTranscript }
   ▼
voice-agent-api broker (server-side)
   ├─ SimCommandValidator → FunctionCallHandler → MockSimulatorAdapter (deterministic)
   ├─ scripted grounded read-back text for the accepted command
   └─ TranscriptHub publishes { role: atc } and { role: pilot } events ── SSE ──▶ chat
   ▼ response { accepted, command, readBackText, phraseologyFlags }
Browser (speaker)
   │ Azure AI Speech SDK (TTS) speaks readBackText
   ▼
Pilot read-back audio (synthetic)
```

- **No free-text drives the simulator** — the recognized instruction is validated and mapped to a schema-validated command through the existing deterministic path; unknown/out-of-range commands are rejected ([AI.md](../AI.md) §4.1).
- **Token from server, not key** — `GET /api/voice/speech/token` mints a short-lived Azure AI Speech authorization token via the broker's Managed Identity; the browser never sees a key (`DP-11`).
- **Residency** — Azure AI Speech region is **Switzerland North**; audio is processed in-country; `personalData: false` (public/synthetic data only).
- **Grounded read-back** — the read-back text mirrors the actually dispatched command; scripted per scenario (no LLM this sprint).
- **Synthetic-voice disclosure** — the UI shows the disclosure "The virtual pilot voice is synthetic (AI-generated)." (`DP-16`).

### Four new endpoints (VoiceAgentApi broker, base path `/api/voice`)

1. **`GET /api/voice/capabilities`** → `{ "liveAvailable": bool, "mockAvailable": bool }`. `liveAvailable` is true only when VoiceLive `AgentId` AND `ProjectId` are configured; `mockAvailable` is always true. Drives the mock↔live UI toggle.
2. **`GET /api/voice/scenarios`** → array of `ScenarioSummary`: `{ id, title: { [lang]: string }, aircraftClass, expectedCommands }`. Four seeded scenarios (EX-01..EX-04) with localized titles (en/de/fr/it).
3. **`GET /api/voice/speech/token`** → `{ "token": string, "region": string }`. Short-lived authorization token minted server-side via the broker's Managed Identity; region is **Switzerland North**. `personalData: false`; audio processed in-country.
4. **`POST /api/voice/scenario/turn`** — request `{ "scenarioId": string, "atcTranscript": string }`; response `ScenarioTurnResponse` `{ accepted, command, readBackText, phraseologyFlags }`. Runs the deterministic SimCommandValidator + FunctionCallHandler/MockSimulatorAdapter boundary and publishes ATC + Pilot transcript events server-side. No LLM; demo scope; no persistence this sprint.

## Consequences

### Positive

- **Works without the Foundry agent** — the mock path is fully functional with only the broker deployment; no `VoiceLive__AgentId`/`ProjectId` required.
- **Preserves the deterministic command boundary** — every guardrail from [AI.md](../AI.md) §4 applies: schema validation, allow-list, range checks, server-side authorization. No free-text ever commands the simulator.
- **In-country audio processing** — Azure AI Speech (Switzerland North) keeps audio within the Swiss data boundary; no third-party routing (`CON-03`, `DP-18`).
- **No keys in the browser** — the Managed Identity token flow is server-mediated; the browser holds only a short-lived authorization token (`DP-11`).
- **Coexists with the live path** — the mock and live (Voice Live) paths are independent; `GET /api/voice/capabilities` tells the UI which is available; the toggle switches between them.

### Negative / trade-offs

- **Two voice paths** — mock (Azure AI Speech) and live (Voice Live) are separate code paths; the Agnostic API façade ([ADR-0002](./ADR-0002-agnostic-api-facade.md)) and the capabilities endpoint keep this from leaking into the client.
- **Scripted read-backs this sprint** — the mock path uses deterministic scripted read-backs; an LLM-generated read-back layer is deferred to a later sprint. The live path (Voice Live) uses the Foundry agent brain.
- **No persistence this sprint** — the mock scenario exercises are ephemeral; session/transcript storage is out of scope (decision D6).

## Alternatives considered

1. **Browser Web Speech API (Option B).** Rejected: routes audio to a third party (typically Google/Chrome servers), violating data residency (`CON-03`) and introducing a third-party processing dependency unacceptable even for the demo plane.
2. **Mock voice with the Foundry agent.** Rejected: would still require human-run agent publishing and app-setting configuration, defeating the purpose of a "works without the agent" path.
3. **No mock path; wait for Voice Live.** Rejected: blocks the end-to-end voice exercise until the Foundry agent is published and configured, slowing iteration.
4. **US region for Azure AI Speech in the demo.** Rejected: even though the demo carries no personal data, keeping audio in-country (Switzerland North) is a stronger residency posture and aligns with the production expectation (`DP-18`).

## References

- [ADR-0002](./ADR-0002-agnostic-api-facade.md) — Agnostic API façade (APIM)
- [ADR-0003](./ADR-0003-split-plane-data-residency.md) — Split-plane residency
- [ADR-0004](./ADR-0004-voice-live-foundry-agent.md) — Voice Live + Foundry agent (live speech-to-speech)
- [Spec](../specs/2026-07-20-simulator-scenarios-efficient-flightload-design.md) — Simulator scenarios + efficient flight load design
- [Plan](../plans/2026-07-20-simulator-scenarios-efficient-flightload-plan.md) — Implementation plan
- [AI.md](../AI.md) §4 — Deterministic command boundary
- [DATA.md](../DATA.md) §5.3 — Voice scenario contracts
- [BOM.md](../BOM.md) — Azure AI Speech (Switzerland North)
