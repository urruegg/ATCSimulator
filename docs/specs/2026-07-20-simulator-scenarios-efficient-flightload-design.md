# Simulator Scenarios + Efficient Flight Load — Design

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | Simulator Scenarios + Efficient Flight Load — Design (Spec) |
| Type | Spec |
| Version | 0.1 (Draft) |
| Date | 2026-07-20 |
| Author | ATCSimulator team |
| Status | Draft for review |
| Sprint issue | [#8](https://github.com/urruegg/ATCSimulator/issues/8) |
| Classification | Public — anonymized demo |
| Subscription | `75102af9-fc92-45d4-99a8-5510a24b5421` (ME-MngEnvMCAP164444-urruegg-2) |
| Region | Azure AI Speech mock plane → **Switzerland North**; live Voice Live → **Sweden Central** (EU) |

**Related documents:** [SD.md](../SD.md) · [AI.md](../AI.md) · [DATA.md](../DATA.md) · [SECURITY.md](../SECURITY.md) · [BOM.md](../BOM.md) · [BACKLOG.md](../BACKLOG.md) · [ADR-0002 Agnostic API](../adr/ADR-0002-agnostic-api-facade.md) · [ADR-0004 Voice Live + Foundry](../adr/ADR-0004-voice-live-foundry-agent.md) · [ADR-0007 Mock Scenario Voice Loop](../adr/ADR-0007-mock-scenario-voice-loop.md) (Accepted) · [PoC E2E validation runbook](../runbooks/poc-e2e-validation-runbook.md) · [sample scenario](../../data/scenarios/sample-scenario.json) · [../../api/openapi.yaml](../../api/openapi.yaml) · ZRH design [2026-07-16](./2026-07-16-zrh-realflight-ux-shared-platform-design.md) · [Implementation plan](../plans/2026-07-20-simulator-scenarios-efficient-flightload-plan.md)

---

## 1. Objective

Two demo-plane features plus the carried-over open points from the PoC foundation:

1. **Efficient flight load** — stop the continuous FR24 polling. Load **all Swiss traffic once at startup** and let the user reload on demand with a **refresh** map control. Reduces third-party feed consumption and 429 rate-limiting.
2. **Simulator scenarios** — after selecting an aircraft, the trainee picks a **simulation scenario** from a searchable dropdown (four seeded examples), which **arms the microphone**. A **mock scenario service** drives an **end-to-end voice** exercise (Azure AI Speech STT/TTS + a deterministic scripted pilot), with **both sides transcribed** in the chat. A **toggle** switches to the real Azure Voice Live loop once the Foundry agent is published.

Demo plane only (Scope 2): public/synthetic data, **no personal data**, **no operational-ATC connectivity** (`CON-01`, `CON-03`). The LLM/agent proposes; a **deterministic, schema-validated layer disposes** — no free-text ever commands the simulator ([AI.md](../AI.md) §4).

## 2. Approved decisions

| # | Decision | Choice |
| --- | --- | --- |
| D1 | Flight data cadence | **Load all Switzerland once at startup**; remove the 5 s auto-poll; manual **refresh** reloads all-Switzerland; airport dropdown only re-centers/zooms |
| D2 | Mock voice mechanism | **Option A — Azure AI Speech (STT + TTS)** via the broker; scripted deterministic pilot; **no third-party audio**, in-country residency; works **without** the Foundry agent |
| D3 | Voice engine selection | **Both** — Mock is the default demo path; a **toggle** switches to real Voice Live when the broker reports the agent is configured |
| D4 | Scenario picker placement | On the Chat/simulator view, between the selected-flight header and the mic; gating order **aircraft → scenario → mic enabled** |
| D5 | Open points | Carry all three: publish Foundry agent + `VoiceLive__AgentId`/`ProjectId` (§5.2), approve PROD promotion, delete merged `feat/zrh-realflight-ux` |
| D6 | Persistence | **Out of scope** — no storage of the simulation this sprint (later sprint) |

## 3. Feature 1 — One-shot Switzerland load + manual refresh

### 3.1 Behaviour

- On app start the map loads **all aircraft within Switzerland** in a single request; no interval timer runs.
- A **refresh** control reloads the all-Switzerland set on demand; it is disabled while a load is in flight.
- Selecting an airport in the header **only re-centers/zooms** the camera — it does **not** refetch.
- The bottom ribbon shows **"Last updated HH:MM:SS"** instead of a polling-cadence control.

### 3.2 Components

| Unit | Change | Purpose / interface |
| --- | --- | --- |
| `data/airports.ts` (or new `data/switzerland.ts`) | add `SWITZERLAND_BOUNDS` | Country bbox `N47.95,S45.75,W5.85,E10.55` (`N,S,W,E` per the flight API) |
| `features/flight-data/useFlightData.ts` | **new**, replaces `useFlightPolling` | `useFlightData(bounds)` → `{ aircraft, error, loading, lastUpdated, refresh }`; fetch once on mount, `refresh()` re-fetches; keep last-known aircraft on error |
| `features/flight-data/AircraftMapPage.tsx` | use `useFlightData(SWITZERLAND_BOUNDS)` | Render all Swiss markers; add a 4th **refresh** button to the existing bottom-right control group (`aria-label` `map.refresh`), disabled while `loading` |
| `app/BottomRibbon.tsx` | replace cadence control with last-updated | Show `t('map.lastUpdated', { time })`; remove `refreshCadenceSec` usage |
| `state/AppStateContext.tsx` | remove `refreshCadenceSec` (+ persistence key) | No longer needed once polling is gone |

### 3.3 Tests

Vitest: `useFlightData` fetches once + `refresh()` refetches + error keeps last aircraft; refresh button disabled while loading; BottomRibbon renders last-updated; map renders Switzerland-wide markers. Update the existing BottomRibbon + `AppStateContext` tests that referenced the cadence control.

## 4. Feature 2 — Simulator scenarios, mock voice loop, live toggle

### 4.1 Scenario catalog (four seeded examples)

New `data/scenarios/examples/*.json`, schema-consistent with [sample-scenario.json](../../data/scenarios/sample-scenario.json) (`scope=demo`, `personalData=false`, `operationalUse=false`), reusing the golden fixtures G-01..G-04:

| Id | Title (de) | Aircraft class | Command focus | Golden ref |
| --- | --- | --- | --- | --- |
| `EX-01` | Anweisung an Verkehrsflugzeug | airliner | `SET_HEADING`, `SET_FLIGHT_LEVEL` | G-01 |
| `EX-02` | Wegpunktanweisung an Kleinflugzeug | light | `REPORT_POINT` (waypoint) | G-02 |
| `EX-03` | Traffic Info | any | `TRAFFIC_INFO` | G-04 |
| `EX-04` | Traffic Info an IFR | IFR | `TRAFFIC_INFO` (IFR) | G-04 |

Each scenario carries: `id`, localized `title` (en/de/fr/it), `aircraftClass`, `expectedCommands` (from the enum), and scripted `pilotReadBack` text per accepted command.

### 4.2 Scenario picker + gating

- New `features/simulator/ScenarioPicker.tsx` — Fluent **`Combobox`** (searchable/filterable) listing the four scenarios (localized), placed on the Chat view between `SelectedFlightHeader` and `MicControl`.
- `AppState` gains `selectedScenario: ScenarioSummary | null` + setter; reset when the airport or selected flight changes.
- `MicControl` is **disabled** until **both** a flight and a scenario are selected (gating order aircraft → scenario → mic).

### 4.3 Mock voice loop (Option A — Azure AI Speech)

```text
mic ──(Azure Speech SDK, token from broker)──▶ ATC transcript (browser)
      │
      ▼  POST /api/voice/scenario/turn { scenarioId, atcTranscript }
   voice-agent-api (broker)
      ├─ SimCommandValidator → FunctionCallHandler → MockSimulatorAdapter   (deterministic disposer)
      ├─ scripted grounded read-back for the accepted command
      └─ TranscriptHub emits { role: atc } and { role: pilot }  ── SSE ─▶ chat columns
      ▼  response { accepted, command, readBackText, phraseologyFlags }
browser TTS (Azure Speech SDK) speaks readBackText
```

- **No free-text drives the simulator** — the recognized instruction is mapped to a schema-validated command through the existing deterministic path; unknown/out-of-range are rejected (`AI.md` §4.1).
- **Grounded read-back** mirrors the actually dispatched command; the **synthetic-voice disclosure** (`DP-16`) is already shown by `MicControl`.
- **No personal data / no third party** — audio is handled by **Azure AI Speech in Switzerland North** via a short-lived token minted by the broker (Managed Identity; no key in the browser). Nothing is persisted (D6).

### 4.4 Voice-engine toggle (mock ↔ live)

- UI switch "Voice engine: **Mock** (default) | **Live (preview)**". Live is enabled only when the broker reports the Foundry agent is configured.
- Live path reuses the existing WebRTC `startVoiceSession` (→ Voice Live). Mock path uses §4.3.

## 5. Backend / API contract changes (API-first)

Update [../../api/openapi.yaml](../../api/openapi.yaml) **first**, keep [DATA.md](../DATA.md) §5 in sync, validate at APIM.

| Method + path | Purpose | Notes |
| --- | --- | --- |
| `GET /api/voice/capabilities` | `{ liveAvailable, mockAvailable }` | `liveAvailable` = `VoiceLive__AgentId` + `ProjectId` set; drives the toggle |
| `GET /api/voice/scenarios` | List the four catalog scenarios (localized titles) | Single source of truth for the picker |
| `GET /api/voice/speech/token` | `{ token, region }` short-lived Azure Speech token | Minted via Managed Identity; **no key in the browser** |
| `POST /api/voice/scenario/turn` | `{ scenarioId, atcTranscript }` → `{ accepted, command, readBackText, phraseologyFlags }` | Runs the deterministic boundary + emits ATC/Pilot transcript events |

New services in `AtcSim.VoiceAgentApi`: `MockScenarioService` (scenario catalog + scripted read-back, reusing `SimCommandValidator`/`FunctionCallHandler`/`MockSimulatorAdapter`), `SpeechTokenService` (MI-based Azure Speech token), `CapabilitiesEndpoint`. New web dep: `microsoft-cognitiveservices-speech-sdk` (respect `.npmrc` `min-release-age=7`).

## 6. Guardrails & compliance

- `CON-01` no operational-ATC path; `CON-03` public/synthetic only, **no personal data**; nothing persisted (D6).
- **Residency (DP-18):** classic Azure AI Speech STT/TTS → **Switzerland North**; live real-time speech-to-speech → Sweden Central (EU). Region availability "as of Jul 2026 — verify at design time" ([BOM.md](../BOM.md)).
- Deterministic disposer preserved; **golden-phraseology / command-mapping regressions must not merge**.
- New architecture decision captured as [ADR-0007](../adr/ADR-0007-mock-scenario-voice-loop.md) (Accepted) — mock scenario voice loop via Azure AI Speech + deterministic engine.

## 7. Traceability

| Feature | Epic | FR/NFR | New story |
| --- | --- | --- | --- |
| F1 one-shot load + refresh | `EP-02` | `FR-08`, `FR-11`, `DP-07` | `US-013` |
| F2 scenario selection | `EP-06` | `FR-07` | `US-052` |
| F2 mock voice loop + transcription | `EP-03`/`EP-04` | `FR-01/03/04/06/09`, `DP-16` | `US-024` |
| F2 voice-engine toggle | `EP-03` | `FR-09`, `ADR-0004` | `US-025` |

Requirement → story → tests/evals → evidence is maintained in each PR and the sprint issue.

## 8. Open points (human-gated, carried into this sprint)

- Publish the Foundry virtual-pilot agent + set `VoiceLive__AgentId`/`VoiceLive__ProjectId` on `voice-agent-api` (§5.2 of the E2E runbook).
- Approve the PROD promotion gate.
- Delete the merged `feat/zrh-realflight-ux` branch (local + remote).

## 9. Testing & validation

- **Frontend (Vitest):** `useFlightData` once-load + refresh + error; refresh button + last-updated; `ScenarioPicker` filter + selection; mic gating (aircraft → scenario → mic); capabilities-driven toggle; transcript rendering unchanged.
- **Backend (xUnit):** `MockScenarioService` maps each example to a validated command + grounded read-back + emits ATC/Pilot transcript; rejects out-of-range/unknown; `capabilities` reflects config; `speech/token` returns a token (mocked credential).
- **Infra:** `az bicep build` for the Azure AI Speech resource (Switzerland North) + role assignment.
- **E2E:** extend the [PoC E2E validation runbook](../runbooks/poc-e2e-validation-runbook.md) — startup one-shot load + refresh; scenario select → armed mic → spoken exercise for each example with both sides transcribed; toggle mock↔live.
- Golden-phraseology / command-mapping evals remain the **merge gate**.

## 10. Out of scope (YAGNI)

- **Any persistence/storage of the simulation** (transcripts, results) — deferred to a later sprint.
- LLM/agent-generated pilot brain for the mock (mock is scripted/deterministic); Custom Neural Voice; in-country GA hardening of the live plane; multi-aircraft team sim; FR24 production feed.
