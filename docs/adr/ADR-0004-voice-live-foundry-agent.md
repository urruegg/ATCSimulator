# ADR-0004: Voice Live + Foundry Agent Service for the demo voice loop

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | ADR-0004 — Voice Live + Foundry Agent Service (demo plane) |
| Version | 0.1 (Draft) |
| Date | 2026-07-15 |
| Author | ATCSimulator team |
| Status | Accepted (for demo/MVP scope) — revisit at design time |
| Classification | Public — anonymized demo |

**Related documents:** [../BOM.md](../BOM.md) · [../SD.md](../SD.md) · [../AI.md](../AI.md) §1/§4 · [../SECURITY.md](../SECURITY.md) · [../COMPLIANCE.md](../COMPLIANCE.md) §5 · [../DESIGN-PRINCIPLES.md](../DESIGN-PRINCIPLES.md) DP-11/DP-16/DP-18 · [ADR-0001-realtime-model-region.md](./ADR-0001-realtime-model-region.md) · [ADR-0002-agnostic-api-facade.md](./ADR-0002-agnostic-api-facade.md) · [ADR-0003-split-plane-data-residency.md](./ADR-0003-split-plane-data-residency.md) · [spec](../specs/2026-07-15-voice-live-foundry-poc-scope-design.md)
**Related IDs:** `FR` real-time voice loop · `NFR` latency (AI.md §7.2) · `CON-01`, `CON-03`, `CON-05` · `DP-11`, `DP-16`, `DP-18`

---

## Status

**Accepted for the demo / MVP (Scope 2).** **Supersedes [ADR-0001](./ADR-0001-realtime-model-region.md) for the demo plane** (the hand-orchestrated `gpt-realtime` loop). Constrained by [ADR-0002](./ADR-0002-agnostic-api-facade.md) (Agnostic API façade) and [ADR-0003](./ADR-0003-split-plane-data-residency.md) (split-plane residency). Voice Live regional availability is volatile — **re-verify at design time** (`CON-05`).

## Context

The demo (Scope 2) needs a **real-time speech-to-speech** virtual pilot with a
conversational latency budget. [ADR-0001](./ADR-0001-realtime-model-region.md)
chose the Azure OpenAI real-time audio family, hand-orchestrated by our code
(STT → reasoning → TTS wiring, model deployment, capacity planning).

Following Foundry CSA guidance, the **Azure Voice Live API** now offers a single
managed speech-to-speech loop with **WebRTC-direct** media and pluggable
intelligence via **Microsoft Foundry Agent Service**. This removes model
deployment/capacity work and lowers both latency and engineering effort, while
every ATCSimulator guardrail can be preserved (the LLM proposes, a deterministic
server-side layer disposes — [AI.md](../AI.md) §4, `CON-01`).

## Decision

For the **demo/MVP**, run the real-time voice loop on the **Azure Voice Live API
in Sweden Central (EU)**, with the virtual-pilot intelligence hosted in a
**Foundry Agent Service** agent, and **WebRTC-direct** audio between the browser
and Voice Live.

- **Media transport: WebRTC direct** (browser ↔ Voice Live) for lowest latency (spec D1).
- **Brain: Foundry Agent Service** (`agent_id`/`project_id`) behind Voice Live (spec D2); models are managed by Voice Live — no deployment/capacity planning.
- **Command path: server-side.** The `voice-agent-api` **broker holds the Voice Live control WebSocket**, receives every `function_call` server-side, validates it (schema + range + authorization), and dispatches it through the Agnostic API to the mock simulator. The **browser handles media only** and holds no Voice Live credential (spec D5, §4/§8).
- **Scope: demo plane only** (spec D4). Production (Scope 1) stays in-country decomposed (Azure AI Speech STT/TTS + reasoning model) per [ADR-0003](./ADR-0003-split-plane-data-residency.md).
- **Keyless auth:** the broker authenticates to Voice Live with **Managed Identity** (`ai.azure.com/.default`); Foundry RBAC grants `Cognitive Services User` to the broker identity.
- Every deployment records **model + region + data-boundary** in the AI use-case register (`C-13`).

## Consequences

### Positive

- Lower latency and far less orchestration/engineering than the hand-wired ADR-0001 loop.
- The deterministic simulator-command boundary is **strengthened**: commands never leave the trusted server boundary (control channel is server-held).
- Keeps demo processing in the **EU boundary** (Sweden Central); no personal data (`CON-03`).
- Agent persona/tooling is configuration (Foundry Agent Service), decoupled from the transport.

### Negative / trade-offs

- Introduces a dependency on the **Voice Live API** (Preview) and a **Microsoft Foundry** resource (not Speech-only).
- Creates a **two-path** reality (demo Voice Live vs production decomposed pipeline); the Agnostic API façade ([ADR-0002](./ADR-0002-agnostic-api-facade.md)) keeps this from leaking into clients.
- Voice Live availability/`api-version` can change and must be **re-verified at design time** (`CON-05`); not currently in Switzerland North.
- The broker must hold a per-session outbound control WebSocket (fine at PoC concurrency; **Container Apps** is the documented scale path).

## Alternatives considered

1. **Keep the ADR-0001 hand-orchestrated `gpt-realtime` loop.** Rejected for the demo: more engineering (model deployment, capacity, STT/TTS wiring) and higher latency than the managed Voice Live loop. Retained as the conceptual fallback and for the production decomposition.
2. **Browser-relayed control channel (browser holds the Voice Live control socket).** Rejected: would place command-bearing events on an untrusted client. The server-held control channel is a stronger guardrail realization (§4).
3. **Voice Live with a raw model instead of a Foundry agent.** Viable, but the Foundry Agent Service keeps the phraseology persona and tool binding as managed configuration and aligns with the AG-F-01 orchestrator role.
4. **In-country (Switzerland North) Voice Live for the demo.** Not available as of Jul 2026 (`CON-05`); demo carries no personal data so the EU boundary is acceptable.
