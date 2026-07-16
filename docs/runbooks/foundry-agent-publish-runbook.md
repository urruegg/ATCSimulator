# Foundry Virtual-Pilot Agent Publish Runbook

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | Foundry Virtual-Pilot Agent Publish Runbook |
| Type | Runbook |
| Version | 0.1 (Draft) |
| Date | 2026-07-16 |
| Author | ATCSimulator team |
| Status | Active |
| Classification | Public — anonymized demo |

**Related documents:** [ADR-0004 Voice Live + Foundry](../adr/ADR-0004-voice-live-foundry-agent.md) · [agents/voice-pilot/agent.yaml](../../agents/voice-pilot/agent.yaml) · [PoC E2E validation runbook](./poc-e2e-validation-runbook.md) §5.2 · [AI.md](../AI.md) · [NON_DELEGABLE_WORK.md](../../.github/agents/NON_DELEGABLE_WORK.md) · GitHub issue #5

---

## Purpose

Publish the **virtual-pilot agent** to Microsoft Foundry Agent Service and wire the `voice-agent-api` broker to it, enabling the live Azure Voice Live speech-to-speech loop in the Chat view.

## Roles

- **Human operator (Azure AI / Foundry contributor):** publishes the agent and sets the app settings. Enabling the live voice loop and confirming the synthetic-voice disclosure are [non-delegable](../../.github/agents/NON_DELEGABLE_WORK.md) accountability steps (RAI).

## Prerequisites

- The Microsoft Foundry (AIServices) account + project are deployed (`infra/modules/foundry.bicep`) in the target RG (`rg-atcsim-sit` / `rg-atcsim-prod`).
- The agent definition [agents/voice-pilot/agent.yaml](../../agents/voice-pilot/agent.yaml) exists (persona + sim-command tools matching the deterministic allow-list).
- Azure Voice Live availability confirmed in the target region (`CON-05`).
- `az login` with contributor rights on the Foundry resource.

## 1. Confirm the Foundry resource

```powershell
$rg = 'rg-atcsim-sit'
az cognitiveservices account show -g $rg -n (az deployment group show -g $rg -n main --query properties.outputs.foundryName.value -o tsv) --query "{name:name,kind:kind,endpoint:properties.endpoint}" -o json
```

Expected: an `AIServices` account with an endpoint.

## 2. Publish the agent

Publish the persona + tools from [agents/voice-pilot/agent.yaml](../../agents/voice-pilot/agent.yaml) to the Foundry project. Either:

- **Foundry portal:** Agents → **New agent** → set name `atcsim-virtual-pilot`, model `gpt-realtime`, paste the `instructions`, and add the function tools (`SET_HEADING`, `SET_FLIGHT_LEVEL`, `SET_ALTITUDE`, `SET_SPEED`, `SET_QNH`) exactly as in the YAML; **Publish**. — or —
- **az/SDK:** create the agent from the YAML via the Foundry Agent Service API/SDK.

- [ ] Capture the resulting **`AgentId`** and **`ProjectId`**.

> The agent (not `session.update`) owns the instructions when bound. The tool names MUST match the broker's deterministic validator allow-list — the broker rejects anything else server-side (`CON-01`, ADR-0004).

## 3. Wire the broker (`voice-agent-api`)

```powershell
$voiceApp = (az deployment group show -g $rg -n main --query properties.outputs.voiceAgentApiHostName.value -o tsv).Split('.')[0]
az webapp config appsettings set -g $rg --name $voiceApp --settings `
  VoiceLive__AgentId='<agent-id>' VoiceLive__ProjectId='<project-id>'
```

Expected: the settings apply and the app restarts. The broker already holds the Voice Live control channel and validates every `function_call` server-side.

## 4. Validate the live loop (signed in)

Follow [poc-e2e-validation-runbook.md](./poc-e2e-validation-runbook.md) §5.2:

- [ ] Open the **Chat** view; confirm the **synthetic-voice disclosure** (`DP-16`) is visible.
- [ ] Start the mic; speak *"Swiss one two three, turn right heading two seven zero."* — expect a spoken read-back of the **accepted** value and `SET_HEADING 270` dispatched server-side.
- [ ] Speak an out-of-range instruction (*"…heading four zero zero."*) — expect **no read-back of the invalid value** (deterministic rejection).
- [ ] Confirm both sides appear in the role-tagged transcript.

**Evidence:** a screen recording of the disclosure, a valid read-back, and a rejected out-of-range command; broker logs showing the server-side `function_call` validation (no audio/personal data logged).

## 5. Guardrails & rollback

- Synthetic-voice disclosure is mandatory; never clone a real controller/pilot voice (RISK-12).
- To disable the live loop, remove/clear `VoiceLive__AgentId` / `VoiceLive__ProjectId`; the broker falls back to the mock answer path. No resources are deleted.
