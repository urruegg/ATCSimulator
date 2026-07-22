# PoC End-to-End Validation Runbook — Evidence for the Two PoCs

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | PoC End-to-End Validation Runbook — Evidence for the Two PoCs |
| Type | Runbook |
| Version | 0.1 (Draft) |
| Date | 2026-07-15 |
| Author | ATCSimulator team |
| Status | Active |
| Classification | Public — anonymized demo |

**Related documents:** [cicd-deployment-runbook.md](./cicd-deployment-runbook.md) · [SD.md](../SD.md) · [AI.md](../AI.md) · [TEST.md](../TEST.md) · [two-PoCs plan](../plans/2026-07-14-two-pocs-demo-foundation-implementation-plan.md) · [Voice Live plan](../plans/2026-07-15-voice-live-foundry-poc-implementation-plan.md) · [Voice Live spec](../specs/2026-07-15-voice-live-foundry-poc-scope-design.md) · [ADR-0004](../adr/ADR-0004-voice-live-foundry-agent.md) · [api/openapi.yaml](../../api/openapi.yaml)

---

## Purpose

Give an operator an exact, ordered procedure to validate the two PoCs end-to-end on
the deployed **SIT** environment and capture the **PoC evidence**:

- **PoC 1 — Aircraft selection:** FR24 sandbox → `flight-data-api` → Azure Maps render → signed-in aircraft selection.
- **PoC 2 — Virtual pilot:** deterministic, schema-validated simulator command path and (once the Foundry agent is published) the Voice Live speech-to-speech loop, with the synthetic-voice disclosure.

This runbook validates **demo plane (Scope 2) only** — public + synthetic data, no
personal data, no operational-ATC connectivity (`CON-01`, `CON-03`).

## Scope of "deployed today" vs "next step"

| Capability | Status today | How validated here |
| --- | --- | --- |
| PoC 1 aircraft selection (FR24 + Azure Maps) | Deployed | §3 (UI) + §2 smoke test |
| PoC 2 deterministic command guardrail | Deployed (broker) + code-complete | §4 (unit/contract evidence) |
| PoC 2 mock virtual-pilot answer | Deployed (`/api/voice/respond`) | §2 smoke test + §5.1 |
| PoC 2 live Voice Live speech-to-speech | **Next step** — needs Foundry agent published + `VoiceLive__AgentId`/`VoiceLive__ProjectId` app settings | §5.2 (procedure ready; run after agent publish) |

## Roles

- **Any team member** may run §1–§5 read-only checks against SIT.
- **Human operator (Owner)** publishes the Foundry agent and sets the Voice Live app settings (§5.2 prerequisites) — see [NON_DELEGABLE_WORK.md](../../.github/agents/NON_DELEGABLE_WORK.md).

## Prerequisites

- `az login` with at least Reader on resource group `rg-atcsim-sit`.
- A test user in the Entra tenant that can sign in to the web shell.
- PowerShell 7 (`pwsh`) and the repo checked out (for the verify script and backend tests).

## 1. Resolve the deployed endpoints

```powershell
$rg = 'rg-atcsim-sit'
$web    = 'https://' + (az deployment group show -g $rg -n main --query properties.outputs.webHostName.value -o tsv)
$flight = 'https://' + (az deployment group show -g $rg -n main --query properties.outputs.flightDataApiHostName.value -o tsv)
$voice  = 'https://' + (az deployment group show -g $rg -n main --query properties.outputs.voiceAgentApiHostName.value -o tsv)
"$web`n$flight`n$voice"
```

Expected: three `https://*.azurewebsites.net` URLs (web shell, `flight-data-api`, `voice-agent-api`).

## 2. Automated smoke test (fastest evidence)

```powershell
pwsh ./scripts/verify-environment.ps1 -WebUrl $web -FlightApiUrl $flight -VoiceApiUrl $voice
```

Expected output ends with `All environment checks passed.` and PASS lines for:

- `flight-data /health` (200)
- `voice-agent /health` (200)
- `aircraft returns live data` (≥ 1 FR24 aircraft)
- `voice respond (mock)` (non-empty `answerText`)
- `web root reachable` (200)

This is the same gate CD runs after every SIT deploy — capture the console output as evidence.

## 3. PoC 1 — aircraft selection (manual UI, `FR-01/02`)

1. Open `$web` in a browser and **sign in** with the test user (Entra/MSAL). Expected: the sign-in redirect completes and the shell loads (no "Sign in" button remaining).
2. Open the aircraft map page. Expected: the Azure Maps canvas renders and aircraft markers appear over the Swiss bounds. If the shell shows "Azure Maps client ID is not configured", the web bundle was built without `VITE_MAPS_CLIENT_ID`; rerun the environment deploy so `infra/main.bicep` outputs are captured before web packaging.
3. **Select an aircraft.** Expected: its details (callsign, type, registration, altitude, heading, ground speed) are shown.
4. Direct API cross-check (public data only):

```powershell
$bounds = '47.7,47.2,8.3,8.8'  # N,S,W,E — Zürich area
Invoke-RestMethod "$flight/api/aircraft?bounds=$([uri]::EscapeDataString($bounds))" | Select-Object -First 3 callsign, aircraftType, latitude, longitude
```

Expected: at least one aircraft with a callsign and type. **Evidence:** screenshot of the map + selected aircraft, plus the JSON response.

## 4. PoC 2 — deterministic command guardrail (evidence, `AI.md` §4, `CON-01`)

The core PoC-2 claim is *the LLM proposes, a deterministic server-side layer disposes*.
Prove it without any model, from the repo root:

```powershell
dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj
```

Expected: all tests pass, including:

- `SimCommandValidator` accepts a valid `SET_HEADING`, **rejects out-of-range heading (400)**, rejects unknown command, rejects missing parameter.
- `FunctionCallHandler` validates then dispatches accepted commands and returns a structured `accepted/type/reason` result.
- `VoiceLiveToolSchema` exposes only the allow-listed sim commands.

**Evidence:** test summary showing the rejection cases pass — this is the schema + range + allow-list boundary that guarantees no free-text ever commands the simulator.

## 5. PoC 2 — virtual-pilot response

### 5.1 Mock answer path (deployed today)

```powershell
$body = @{ transcript = 'What does the aircraft selection PoC prove?'; audioBase64 = '' } | ConvertTo-Json
Invoke-RestMethod "$voice/api/voice/respond" -Method Post -ContentType 'application/json' -Body $body |
  Select-Object answerText, agentLatencyMs, totalLatencyMs
```

Expected: a non-empty `answerText` and latency values. **Evidence:** the JSON response.

### 5.2 Live Voice Live speech-to-speech (next step — after Foundry agent publish)

Prerequisites (human-run, one-time):

1. Publish the Foundry virtual-pilot agent from [agents/voice-pilot/agent.yaml](../../agents/voice-pilot/agent.yaml) to the Foundry project in `rg-atcsim-sit`.
2. Set app settings on `voice-agent-api`:

```powershell
$voiceApp = (az deployment group show -g $rg -n main --query properties.outputs.voiceAgentApiHostName.value -o tsv).Split('.')[0]
az webapp config appsettings set -g $rg --name $voiceApp --settings `
  VoiceLive__AgentId='<agent-id>' VoiceLive__ProjectId='<project-id>'
```

Then validate in the browser:

1. Sign in to `$web`, open the virtual-pilot (voice) panel. Expected: the **synthetic-voice disclosure** is visible ("The virtual pilot voice is synthetic (AI-generated)." — `DP-16`).
2. Click **Start virtual pilot**, allow the microphone, and speak a clearance, e.g. *"Swiss one two three, turn right heading two seven zero."*
3. Expected: the virtual pilot voices a **read-back of only the accepted values**; the broker (not the browser) received the `function_call`, validated it, and dispatched `SET_HEADING 270` to the mock simulator.
4. Speak an out-of-range instruction, e.g. *"…turn right heading four zero zero."* Expected: **no read-back of the invalid value** (deterministic rejection).

**Evidence:** screen recording showing the disclosure, a valid read-back, and a rejected out-of-range command; broker logs showing the server-side `function_call` validation.

## 6. Evidence pack checklist (attach to the sprint issue / PR)

- [ ] §2 smoke-test console output (`All environment checks passed.`).
- [ ] §3 map screenshot + selected-aircraft details + `/api/aircraft` JSON.
- [ ] §4 backend test summary (rejection cases green).
- [ ] §5.1 `/api/voice/respond` JSON.
- [ ] §5.2 recording (once the agent is published).
- [ ] Traceability note: requirement (`FR-##`/`NFR-##`) → story (`US-###`) → this evidence.

## 7. ZRH UX + shared platform validation (sprint #5)

Extends the runbook for the ZRH real-flight UX and shared platform (issue #5).

### 7.1 Local validation gate (pre-merge)

Run from the sprint worktree/branch; all must pass before merge:

```powershell
dotnet test tests/apis/AtcSim.FlightDataApi.Tests/AtcSim.FlightDataApi.Tests.csproj
dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj
npm run test --prefix src/web/atcsim-shell
npm run build --prefix src/web/atcsim-shell
az bicep build --file infra/main.bicep
az bicep build --file infra/shared/main.bicep
```

Expected: FlightData 5/5, VoiceAgent 12/12, frontend 36/36 + build succeeds, both Bicep templates compile.

### 7.2 Deployed UX checks (signed in)

1. **Shell:** sign in; confirm the Teams-like left rail (Map/Chat, Fluent icons + labels), brandkit logo top-left, and that switching the header **language** (EN/DE/FR/IT) re-translates all views. Confirm the airport dropdown lists **all Swiss airports** (full scope, 21 in `data/airports.ts`) with **ZRH** as the default anchor.
2. **Map view:** the ZRH Azure Map renders live FR24-sandbox flights in one view; the refresh cadence control (default 5 s) is present; clicking an aircraft selects it and updates the real-time selected-flight header; with nothing selected the advisory shows.
3. **Chat view:** the selected flight arms the chat; the ATC (left) / Pilot (right) columns show role-tagged transcribed turns; the synthetic-voice disclosure (`DP-16`) is visible. (Live speech-to-speech requires the Foundry agent publish — §5.2.)

### 7.2.1 Validation record — 2026-07-20 (SIT)

Validated end-to-end against SIT (`rg-atcsim-sit`, web host `atcsim-web-tnaephc6ssguk`). Automated
Playwright (Google Chrome, headed) drove the signed-in journey after manual Entra sign-in.

| Check | Evidence | Result |
| --- | --- | --- |
| Local gate — backend xUnit | VoiceAgent **12/12**, FlightData **5/5** | Pass |
| Local gate — frontend Vitest + build | **36/36** + `vite build` succeeds | Pass |
| Local gate — Bicep compile | `infra/main.bicep` + `infra/shared/main.bicep` | Pass |
| §2 SIT smoke | `verify-environment.ps1` → *All environment checks passed* (5/5) | Pass |
| §3.4 Aircraft API | `/api/aircraft` (ZRH bbox) → 20 live FR24-sandbox aircraft | Pass |
| §5.1 Voice respond (mock) | `/api/voice/respond` → non-empty `answerText` | Pass |
| §7.2 Shell + i18n | app rail, brandkit logo, EN↔DE re-translation of all views | Pass |
| §7.2 Airport picker | **all 21 Swiss airports** listed, ZRH default (full scope) | Pass |
| §7.2 Map + selection | 20 live markers; click selects → live selected-flight header | Pass |
| §7.2 Chat disclosure | ATC/Pilot columns + synthetic-voice disclosure (`DP-16`) | Pass |
| §5.2 Live Voice Live speech-to-speech | Pending Foundry agent publish + `VoiceLive__AgentId`/`VoiceLive__ProjectId` | Not yet run |

## 7.4. Simulator scenarios + mock voice loop (sprint #8)

Validates the one-shot Switzerland-wide flight load, manual refresh, scenario selection, and mock voice exercise with Azure AI Speech.

### 7.4.1 One-shot flight load + manual refresh

1. **Startup load:** open the signed-in shell, navigate to Map. Expected: all aircraft within Switzerland load in a single request (no interval timer); the bottom ribbon shows **"Last updated HH:MM:SS"** instead of a polling-cadence control.
2. **Manual refresh:** click the **refresh** button in the bottom-right control group. Expected: the button is disabled while the load is in flight; all Switzerland aircraft reload on completion; the "Last updated" timestamp updates.
3. **Airport dropdown:** select a different airport from the header dropdown. Expected: the map **re-centers and zooms** to the new airport; **no refetch** occurs (aircraft stay from the last load).

### 7.4.2 Scenario selection + gating

1. **Gating order (aircraft → scenario → mic):** with no aircraft selected, navigate to Chat. Expected: the scenario picker is present between the selected-flight header and the mic control; the mic is **disabled**.
2. **Select aircraft:** return to Map, select an aircraft. Return to Chat. Expected: the scenario picker is **enabled** (aircraft selected); the mic is still **disabled** (no scenario).
3. **Select scenario:** open the scenario picker (searchable Combobox), select **EX-01** (Anweisung an Verkehrsflugzeug). Expected: the mic is now **enabled** (both aircraft and scenario selected).

### 7.4.3 Mock voice capabilities + toggle

1. **Capabilities check:** inspect `GET /api/voice/capabilities` (via browser DevTools or curl). Expected: `{ "liveAvailable": false, "mockAvailable": true }` (live requires Foundry agent publish + app settings).
2. **UI toggle:** the voice-engine toggle control in the Chat view shows **Mock** as available and selected; **Live** is disabled/grayed.

### 7.4.4 Mock voice exercise (Azure AI Speech STT/TTS, deterministic pilot)

This validates the full mock scenario voice loop: browser → Azure AI Speech STT → broker deterministic command boundary → scripted read-back → Azure AI Speech TTS → browser, with both ATC and Pilot sides transcribed in the chat.

**Prerequisites:** microphone permission granted; EX-01 scenario selected; mic enabled.

1. **Start exercise:** click the mic control to start. Expected: the mic turns active; the synthetic-voice disclosure (`DP-16`) is visible.
2. **Speak a valid instruction** (e.g., *"Swiss four five six, turn right heading two seven zero and climb flight level three seven zero."*). Expected:
   - The ATC transcript appears in the **left (ATC)** column.
   - The broker runs `POST /api/voice/scenario/turn` → `SimCommandValidator` → `FunctionCallHandler` → `MockSimulatorAdapter`.
   - The Pilot read-back transcript appears in the **right (Pilot)** column: *"Turning right heading 270 degrees and climbing to flight level 370, Swiss 456."*
   - The browser TTS speaks the read-back audio (Azure AI Speech, Switzerland North).
3. **Speak an out-of-range instruction** (e.g., *"…turn right heading four zero zero."*). Expected: the deterministic validator **rejects** the out-of-range heading (heading 0–360); **no read-back** of the invalid value; the chat shows the rejection or a "say again" style response.
4. **Phraseology flags:** speak an instruction with a phraseology deviation. Expected: the `phraseologyFlags` array in the response is non-empty; the chat or a debrief view flags the deviation.

**Evidence:** screen recording showing:

- The one-shot Switzerland load + manual refresh working correctly.
- The aircraft → scenario → mic gating order.
- The mock voice exercise with a valid instruction transcribed on both sides + TTS read-back audio.
- An out-of-range instruction rejected (no read-back of the invalid value).

### 7.3 Shared platform checks (after DNS delegation + Front Door go-live)

1. **DNS delegation:** `Resolve-DnsName -Type NS swissshub.com` returns the Azure name servers (after the GoDaddy NS change).
2. **Custom domains over HTTPS via Front Door:**

```powershell
foreach ($h in 'https://appsit.atcsim.swissshub.com','https://apisit.atcsim.swissshub.com/health') {
  try { "$h -> $((Invoke-WebRequest -UseBasicParsing $h -TimeoutSec 60).StatusCode)" } catch { "$h -> $($_.Exception.Message)" }
}
```

Expected: 200 with a valid Front Door-managed certificate; the `api` host path-routes `/api/aircraft` + `/api/maps/token` to flight-data and `/api/voice/*` to voice-agent.

**Human gates:** GoDaddy NS change · Foundry agent publish · PROD approval.

## 8. Rollback / cleanup

No destructive steps are in this runbook. SIT resources persist between runs; to
tear down a SIT environment, follow the recovery section of the
[CI/CD deployment runbook](./cicd-deployment-runbook.md) (human-run, Owner).
