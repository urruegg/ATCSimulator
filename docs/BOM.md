# ATCSimulator — Bill of Materials & Cloud-Service Availability Assessment (BOM)

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | Bill of Materials (BOM) & Availability Assessment |
| Version | 0.1 (Draft) |
| Date | 2026-07-14 |
| Author | Cloud Solution Architect (CSA), Microsoft |
| Status | Draft for Customer workshop (4 August 2026) |
| Classification | Public — anonymized demo |

**Related documents:** [SD.md](./SD.md) · [AI.md](./AI.md) · [BVA.md](./BVA.md) · [COMPLIANCE.md](./COMPLIANCE.md) · [SECURITY.md](./SECURITY.md) · [adr/ADR-0001-realtime-model-region.md](./adr/ADR-0001-realtime-model-region.md) · [adr/ADR-0003-split-plane-data-residency.md](./adr/ADR-0003-split-plane-data-residency.md)

---

> **Freshness & method.** Availability below was retrieved on **14 July 2026** from Microsoft's live sources and is **directional — model/region availability changes frequently (often weekly). Re-verify at design time.**
> Authoritative live sources to check:
>
> - Azure OpenAI model regional availability matrix (updates ~every 10 min): `https://model-availability.azurewebsites.net/`
> - Microsoft Learn — *Region availability for Foundry Models sold by Azure*
> - Microsoft Learn — *Supported regions for Azure Speech*
> - Microsoft Learn — *Microsoft Foundry feature availability across cloud regions*
> - Azure — *Products available by region*
>
> Legend: **GA** = generally available · **Prev** = preview/limited · **EUDZ** = available via EU Data Zone deployment (EU-boundary residency) · **—** = not currently listed. "US" reference region = **East US 2** (`eastus2`), the flagship for real-time/audio models; EU reference region = **Sweden Central** (`swedencentral`).

---

## 1. Executive summary — the availability headline

The single most consequential finding for ATCSimulator:

- ✅ **Azure AI Speech (STT, Neural TTS, translation, pronunciation assessment) is GA in Switzerland North *and* Switzerland West** → a **fully in-country Swiss** speech path is available today for production personal data.
- ⚠️ **Azure OpenAI real-time audio / speech-to-speech models** (`gpt-realtime*`, `gpt-audio*`, `gpt-4o-transcribe`, `gpt-4o-mini-tts`) — the "art of the possible" for the demo — are **NOT currently listed in Switzerland North**. They run in **Sweden Central (EU)** and **US regions (East US 2 flagship)**, among others.
- 🧭 **Consequence:** adopt a **split-plane** design (see [ADR-0003](./adr/ADR-0003-split-plane-data-residency.md)):
  1. **Demo (Scope 2):** use the **real-time audio model in Sweden Central (EU, preferred)** or East US 2 (US) — acceptable because the **demo carries no personal data**.
  2. **Production (Scope 1):** keep personal data & classic Speech **in Switzerland North (in-country)**; use an **EU Data Zone** model only for capabilities not yet in Switzerland, and only for de-identified/non-personal requests.
- ℹ️ **Azure OpenAI text/reasoning models in Switzerland North** have historically been a **subset** (GPT-4o was the primary advanced in-country model through 2025; the catalog has since broadened to 120+ Foundry models, but newer top-tier models often arrive first via **EU Data Zone / global** deployment). GPT-4o Standard in Switzerland North carried a retirement notice — plan for **GPT-4.1 / GPT-5.x-class** successors.

## 2. Region reference set

| Purpose | Region | Identifier | Residency |
| --- | --- | --- | --- |
| In-country Swiss (production personal data) | Switzerland North | `switzerlandnorth` | 🇨🇭 Swiss |
| In-country Swiss (DR / secondary) | Switzerland West | `switzerlandwest` | 🇨🇭 Swiss |
| EU cutting-edge models (fallback / demo) | Sweden Central | `swedencentral` | 🇪🇺 EU boundary |
| US flagship for real-time/audio (demo only) | East US 2 | `eastus2` | 🇺🇸 US |

## 3. Bill of Materials — by capability

### 3.1 AI & speech services (the core of ATCSimulator)

| # | Service / model | Role in ATCSimulator | Switzerland North | Switzerland West | Sweden Central (EU) | East US 2 (US) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | **Azure AI Speech — Speech-to-Text (real-time & batch)** | Production ASR of Swiss R/T | **GA** | GA | GA | GA | In-country STT available today; data processed only in the resource region. |
| A2 | **Azure AI Speech — Custom Speech** (domain adaptation for R/T & dialects) | Improve ASR on aviation vocabulary/place names | GA (train in dedicated-HW regions, then copy) | GA | GA | GA | Custom training may require specific HW regions; deploy copy in CH. |
| A3 | **Azure AI Speech — Neural TTS (standard voices)** | Virtual-pilot voice output | **GA** | GA | GA | GA | Multiple Swiss-language voices; SSML for prosody. |
| A4 | **Azure AI Speech — Custom Neural Voice (CNV Pro / Lite)** | Bespoke pilot voice(s) | GA service; **limited-access (RAI-gated)**; CNV Lite = Prev | as service | as service | as service | Requires application + Microsoft-managed-customer eligibility; see [AI.md](./AI.md). |
| A5 | **Azure AI Speech — Pronunciation Assessment** | Phraseology/read-back scoring (advisory) | GA | GA | GA | GA | Feeds FR-10 feedback. |
| A6 | **Azure OpenAI — real-time audio (speech-to-speech)** `gpt-realtime` / `gpt-audio` family | **Demo** low-latency virtual pilot | **—** (not listed) | — | **GA/Prev** | **GA/Prev** | **Superseded for the demo by A14 (Voice Live)** ([ADR-0004](./adr/ADR-0004-voice-live-foundry-agent.md)); retained as fallback. **Key gap for in-country.** |
| A7 | **Azure OpenAI — audio transcribe** `gpt-4o-transcribe` / `-mini-transcribe` | Alt STT (demo) | — | — | GA/Prev | GA/Prev | Superseded for the demo by A14 (Voice Live); retained as fallback. Not in CH. |
| A8 | **Azure OpenAI — audio TTS** `gpt-4o-mini-tts` | Alt TTS (demo) | — | — | GA/Prev | GA/Prev | Superseded for the demo by A14 (Voice Live); retained as fallback. |
| A9 | **Azure OpenAI — reasoning/chat** (GPT-4.1, GPT-5.x class) | Intent & command mapping (structured output/tools) | **Subset GA + EUDZ** | subset | GA | GA | Newer top-tier models often via EU Data Zone/global first; GPT-4o retiring. |
| A10 | **Azure OpenAI — Whisper** (batch STT) | Offline transcript refinement | via availability | — | GA | GA | Optional for post-session transcription. |
| A11 | **Azure AI Foundry — project + Agent Service** | Host/orchestrate the runtime agents | **Prev/GA (subset)** | subset | GA | GA | Verify Agent Service + chosen model in region at design time. |
| A12 | **Azure AI Content Safety** | RAI guardrail on generated text/voice | GA (broad) | GA | GA | GA | Enabled across planes. |
| A13 | **Azure AI Search** | Scenario & phraseology retrieval (RAG) | GA | GA | GA | GA | In-country for production. |
| A14 | **Azure Voice Live API** (Foundry, managed speech-to-speech + Agent Service) | **Demo primary** virtual-pilot loop (WebRTC-direct; server-held control channel) | **—** (verify) | — | **Prev** | **Prev** | **Demo primary, supersedes A6–A8** ([ADR-0004](./adr/ADR-0004-voice-live-foundry-agent.md)). Sweden Central (EU), no personal data; re-verify availability/`api-version` at design time (`CON-05`). |

> **How to read A6–A8:** these were the raw models for a hand-orchestrated speech-to-speech loop. The demo now uses **A14 (Azure Voice Live API)** as the managed single-loop primary ([ADR-0004](./adr/ADR-0004-voice-live-foundry-agent.md)); A6–A8 are retained only as the conceptual fallback. Because these run in **Sweden Central/East US 2** (not Switzerland North), the demo carries **no personal data**. The **in-country production** alternative is the classic **A1+A3 (Speech STT/TTS) + A9 (reasoning model)** composition, at somewhat higher latency but full Swiss residency.

### 3.2 Application, integration & compute

| # | Service | Role | Switzerland North | Sweden Central | East US 2 | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | **Azure API Management** | The **Agnostic API** façade (simulator-vendor-independent) | GA | GA | GA | Policy layer also enforces residency routing. |
| B2 | **Azure Container Apps** | Host orchestrator & agents | GA | GA | GA | Serverless scale for concurrent sessions. |
| B3 | **Azure Kubernetes Service (AKS)** | Production-scale alt to B2 | GA | GA | GA | Optional at scale. |
| B4 | **Azure App Service / Static Web Apps** | Trainee web client | GA | GA | GA | Browser + headset UX. |
| B5 | **Azure Functions** | Event glue (feed polling, post-processing) | GA | GA | GA | — |
| B6 | **Azure Web PubSub / SignalR** | Real-time audio/control channel (WebSocket) | GA | GA | GA | Co-locate with compute/model. |
| B7 | **Azure Event Grid / Service Bus** | Async events between agents | GA | GA | GA | — |

### 3.3 Data & analytics

| # | Service | Role | Switzerland North | Notes |
| --- | --- | --- | --- | --- |
| C1 | **Azure Blob Storage / ADLS Gen2** | Audio recordings, transcripts (prod) | GA | In-country; lifecycle/retention per [DATA.md](./DATA.md). |
| C2 | **Azure Cosmos DB** | Session/scenario state | GA | Low-latency state store. |
| C3 | **Azure SQL Database** | Structured session/performance records | GA | — |
| C4 | **Microsoft Fabric / Power BI** | Closed-loop training analytics | GA (Fabric broadly; verify capacity region) | Feeds continuous-improvement loop. |

### 3.4 Security, identity & governance

| # | Service | Role | Availability | Notes |
| --- | --- | --- | --- | --- |
| D1 | **Microsoft Entra ID** (+ Conditional Access, PIM) | Identity, Zero Trust | Global | Non-regional identity plane. |
| D2 | **Azure Key Vault / Managed HSM** | Secrets, keys, CMK | GA (CH North) | Customer-managed keys for production. |
| D3 | **Microsoft Purview** | Data catalog, DLP, audit, residency evidence | GA | Governance evidence for [COMPLIANCE.md](./COMPLIANCE.md). |
| D4 | **Microsoft Defender for Cloud** | Posture & workload protection | GA | — |
| D5 | **Azure Policy** | Guardrails (allowed regions, SKUs, residency) | GA | Enforces CON-03 region allow-list. |
| D6 | **Azure Monitor / App Insights / Log Analytics** | Observability | GA (CH North) | Latency/WER dashboards. |
| D7 | **Private Link / Private Endpoints, VNet** | Private data planes | GA (CH North) | For in-country personal-data plane. |

### 3.5 Developer experience & delivery (GitHub Copilot "superpowers")

| # | Tool | Role | Notes |
| --- | --- | --- | --- |
| E1 | **GitHub (repos, Issues, Projects)** | Source of truth & traceability | Mirrors reference-repo pattern. |
| E2 | **GitHub Actions** | CI/CD, what-if, approval-gated promotion | See [COPILOT-BUILD-GUIDE.md](./COPILOT-BUILD-GUIDE.md). |
| E3 | **GitHub Advanced Security** | Code/secret/dependency scanning | Release gate. |
| E4 | **GitHub Copilot** (coding agent + custom agents) | Agent-driven design/build/validate | Custom agents in [../.github/agents/](../.github/agents/). |
| E5 | **Azure Developer CLI (`azd`) + Bicep** | IaC & environment provisioning | Reproducible envs. |

### 3.6 Demo data source (Scope 2)

| # | Source | Role | Notes |
| --- | --- | --- | --- |
| F1 | **Public live-flight feed** — FlightAware AeroAPI / Flightradar24 | Select an aircraft to seed the scenario | **Read-only, public data**; fronted by APIM; validate provider **Terms of Service** (ASS-03). No personal data. |

### 3.7 Optional — UC1 challenger (Horizon-2)

| # | Service | Role | Notes |
| --- | --- | --- | --- |
| G1 | **Microsoft Copilot Studio** | Low-code Report Summarization agent | Human-in-the-loop approval. |
| G2 | **Microsoft 365 Copilot / Graph connectors** | LMS content access | Only if LMS integrates with M365. |
| G3 | **Azure OpenAI (summarization)** | Summary generation | In-country/EU per availability. |

## 4. Availability matrix — condensed decision view

| Capability | In-country CH today? | EU (Sweden Central)? | US (East US 2)? | ATCSimulator decision |
| --- | --- | --- | --- | --- |
| Classic STT/TTS (Azure AI Speech) | ✅ GA | ✅ | ✅ | **Production: in-country CH** |
| Custom Speech / Custom Neural Voice | ✅ GA (CNV RAI-gated) | ✅ | ✅ | Production voice in CH; CNV needs RAI approval |
| Real-time speech-to-speech (GPT audio) | ❌ not listed | ✅ | ✅ | **Demo: Sweden Central (EU) preferred** |
| Top-tier reasoning models (GPT-4.1/5.x) | ⚠️ subset / EUDZ | ✅ | ✅ | Command mapping: CH subset or EU Data Zone |
| Foundry Agent Service | ⚠️ verify | ✅ | ✅ | Verify at design time; EU acceptable for demo |
| App/compute/data/security | ✅ GA | ✅ | ✅ | In-country for production |

## 5. Recommendation

1. **Build the demo now** on **Azure OpenAI real-time audio in Sweden Central (EU)** + Container Apps + APIM + Static Web Apps + Content Safety, with a **mock simulator** and a **public flight feed** — **no personal data, no operational ATC** (satisfies CON-01, CON-03, [ADR-0001](./adr/ADR-0001-realtime-model-region.md)).
2. **Design production** as the **in-country Swiss plane** (Azure AI Speech STT/TTS + reasoning model + private data plane in Switzerland North), with an **EU Data Zone fallback** for capabilities not yet in Switzerland, gated to **de-identified/non-personal** requests ([ADR-0003](./adr/ADR-0003-split-plane-data-residency.md)).
3. **Enforce residency with Azure Policy** (allowed-regions allow-list) and **APIM routing policies**; evidence via **Purview**.
4. **Track model/region availability** as a standing design task — real-time audio in Switzerland North would let the demo pattern move fully in-country; re-check the live matrix before each milestone (CON-05).

## 6. Cost drivers (link to [BVA.md](./BVA.md))

Primary run-rate drivers: **real-time-audio model minutes** (demo), **Speech STT/TTS minutes** (production), **reasoning-model tokens**, **compute** (Container Apps/AKS), **storage** (audio + transcripts), **APIM tier**, and **observability**. These feed the ROM TCO and must be monitored against NFR-25.

## 7. Assumptions & caveats

- Availability reflects **14 July 2026**; **verify at design time** (CON-05).
- "GA/Prev" for Azure OpenAI audio models reflects the current model matrix; specific model *versions* and *deployment types* (standard / global-standard / data-zone-standard) vary by region.
- Custom Neural Voice and some Preview features require **application/limited-access approval**.
- Public flight-feed use is subject to the provider's **Terms of Service** and rate limits (ASS-03).
