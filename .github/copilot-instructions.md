# ATCSimulator — GitHub Copilot Custom Instructions

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | Repo-wide Copilot Custom Instructions |
| Version | 0.1 (Draft) |
| Date | 2026-07-14 |
| Author | Cloud Solution Architect (CSA), Microsoft |
| Status | Draft for Customer workshop (4 August 2026) |
| Classification | Confidential — anonymized |

<!--
These are repository-wide instructions for GitHub Copilot (chat, coding agent, and
code completion). Keep them concise and imperative. They are ALWAYS in context —
do not bloat. Deep detail lives in ../docs/ and ../SUPERPOWERS_CONTRACT.md.
Related: ../AGENTS.md · ../SUPERPOWERS_CONTRACT.md · ./agents/*.agent.md
-->

You are helping build **ATCSimulator**, a training simulator that automates the
**simulation-pilot** role for air-traffic-control (ATC) training. Follow these
instructions for every suggestion, chat answer, and coding-agent task in this repo.

## 1. Project context (read first)

- **Product:** ATCSimulator. **Customer:** referred to only as **"the Customer"** — Switzerland's national air navigation service provider (ANSP). Their training academy = **"the Academy"**.
- **What it does:** a trainee controller speaks R/T instructions; the system transcribes (ASR/STT), validates phraseology, maps the instruction to deterministic simulator commands, and voices a realistic **virtual-pilot read-back** (TTS), while transcribing for debrief.
- **It is NOT** an operational or safety-of-life system. It is a **segregated training environment with no connection to live/operational ATC**. It is **not** critical national infrastructure.
- Primary use case: **UC2 Virtual Simulation Pilot** (MVP). Challenger/Horizon-2: **UC1 Report Summarization** (build only after UC2).
- Start every design decision from `../docs/DESIGN-PRINCIPLES.md` (DP-01..DP-20) and the guardrails below.

## 2. Two scopes — always know which one you are coding

- **Scope 1 — Full / production:** vendor-agnostic voice services integrated to the Customer's real simulator(s) + LMS; **in-country (Switzerland) data residency**; full governance; processes **personal data** (trainee voice).
- **Scope 2 — Demo / MVP (Art of the Possible):** an ATC selects an aircraft from a **public live-flight feed** and runs a **real-time speech-to-speech** scenario with a virtual pilot. **Public + synthetic data only — NO personal data. NO operational-ATC connection.** Uses the latest GA/Preview cloud AI.
- Default working assumption for this repo is **Scope 2 (demo)** unless a file/path clearly targets production. When unsure, ask or choose the safer (demo) interpretation.

## 3. Mandatory guardrails (never violate)

1. **No operational-ATC connectivity (`CON-01`).** Never add a network path, shared identity, shared data plane, or integration that could link ATCSimulator to live/operational ATC. Any such request is out of scope — flag it, do not implement.
2. **No personal data in the demo (`CON-03`).** The demo plane processes only public flight data and synthetic voices. Never introduce real trainee voice, names, or performance data into demo code, fixtures, or config.
3. **Data residency / sovereignty (`CON-03`, DP-18).** Personal/production data and classic STT/TTS → **Switzerland North** (Switzerland West for DR). Use **EU Data Zone** only when a required model is not in-country. **US (East US 2) is demo/non-personal only.** Real-time speech-to-speech runs in **Sweden Central (EU)** or East US 2 (demo). Region availability is "**as of Jul 2026 — verify at design time**" on the live model-availability page.
4. **Responsible AI.** The LLM proposes, a **deterministic layer disposes**: never let free-text model output directly drive the simulator — go through schema-validated tool/function calls (`../docs/AI.md` §4). AI output is **advisory**; a human instructor is accountable. Disclose that virtual-pilot voices are synthetic. No non-consented voice cloning.
5. **No secrets in code.** Use Microsoft Entra ID + Managed Identity; secrets/keys/certs live in **Azure Key Vault**. Never commit keys, connection strings, or tokens. GitHub secret scanning + push protection are enforced.
6. **Cite ADRs.** When you make or follow an architectural decision, reference the relevant ADR in `../docs/adr/` (e.g., `ADR-0001` real-time model & region; `ADR-0002` APIM façade; `ADR-0003` split-plane residency). If you introduce a new decision, propose a new ADR.

## 4. Preferred stack

- **AI:** Azure AI Foundry (project, Agent Service, Evaluations, Content Safety); Azure OpenAI real-time audio (`gpt-realtime`/`gpt-4o-realtime` family) for the demo; GPT-4.1 / GPT-5.x-class for reasoning/command mapping; Azure AI Speech (STT, Custom Speech, Neural TTS) for the in-country plane.
- **Compute/host:** Azure Container Apps (default); Azure Functions for event-driven glue.
- **Integration:** Azure API Management = the **"Agnostic API"** façade (`../api/openapi.yaml`); Azure Web PubSub / Event Grid for real-time audio streaming.
- **Data:** Azure Cosmos DB (session/scenario state), Azure Blob/ADLS (transcripts/recordings), Azure AI Search (phraseology/scenario retrieval).
- **Security/gov:** Entra ID, Key Vault, Purview, Defender for Cloud, Azure Policy, Private Link/VNet.
- **DevEx / IaC:** **Azure Developer CLI (`azd`)** + **Bicep** (no click-ops); **GitHub Actions** CI/CD; **GitHub Advanced Security** (secret scanning, CodeQL, Dependabot).
- **Demo data:** public live-flight feed (FlightAware AeroAPI / Flightradar24), read-only, via APIM only.

## 5. Coding standards

- **IaC:** everything-as-code in Bicep; parameterize region and data-boundary; deny public endpoints for data services; allowed-regions policy (CH/EU). Scan IaC before deploy.
- **Determinism at the boundary:** simulator commands use the enum + validated ranges in `../api/openapi.yaml` / `../docs/DATA.md` §5 (`SELECT_AIRCRAFT`, `SET_HEADING` 0–360, `SET_FLIGHT_LEVEL`, `SET_ALTITUDE`, `SET_SPEED`, `SET_QNH`, `REPORT_POINT`, `TRAFFIC_INFO`). Reject unknown types/out-of-range values.
- **API-first:** change `../api/openapi.yaml` first; keep `../docs/DATA.md` §5 in sync; validate requests/responses against the schema at APIM.
- **Tests & evals:** add/extend unit tests and the **golden phraseology set** (`../docs/AI.md` §7, fixtures G-01..G-04; sample data in `../data/scenarios/sample-scenario.json`). A change that regresses read-back/command-mapping fidelity must not merge.
- **Observability:** emit latency/quality telemetry; **never** put personal audio payloads in logs; redact PII.
- **Traceability:** every PR links a user story (`US-###` in `../docs/BACKLOG.md`) and the requirement (`FR-##`/`NFR-##`) it satisfies, plus evidence (test/eval run). See `../SUPERPOWERS_CONTRACT.md`.
- **Style:** small, reviewable PRs; conventional commits; typed interfaces; no dead code; prefer managed/PaaS over bespoke.

## 6. How to use the custom agents (engineering agents `AG-E-##`)

Pick the custom agent that matches the task (see `../AGENTS.md` and `./agents/`).

**Role agents (`AG-E-##`, who/expertise):**

- **Product Owner** (`AG-E-01`, `agents/product-owner.agent.md`) — refine epics/stories, acceptance criteria, MoSCoW, demo narrative.
- **Developer** (`AG-E-02`, `agents/developer.agent.md`) — implement stories, write code/tests/IaC, drive issue → PR with the coding agent.
- **Enterprise Architect** (`AG-E-03`, `agents/enterprise-architect.agent.md`) — architecture, ADRs, residency/split-plane, API contract; **architecture sign-off gate**.
- **SecDevOps** (`AG-E-04`, `agents/secdevops.agent.md`) — CI/CD, GHAS, IaC scanning, policy-as-code, secrets, supply chain.
- **ATC Domain Expert** (`AG-E-05`, `agents/atc-domain-expert.agent.md`) — ICAO/R-T phraseology correctness, Swiss toponyms/dialect, golden-set authoring.
- **Responsible-AI & Compliance** (`AG-E-06`, `agents/responsible-ai-officer.agent.md`) — RAI/Content Safety, evaluations, residency & data-protection review; **RAI review gate**.

**Delivery agents (execution mode, complement the role agents):** `agents/feature.agent.md`, `agents/test.agent.md`, `agents/infra.agent.md`, `agents/docs.agent.md`, `agents/release.agent.md`. They execute the delegated workflow and defer to the role agents and human gates.

**Process docs:** `agents/AGENT_WORKFLOW.md` (issue → PR → merge flow + PR contract), `agents/NON_DELEGABLE_WORK.md` (human-only actions), `agents/KPI_BASELINE.md` (delivery + quality metrics).

Use `#codebase` to ground answers in this repo. Reference files explicitly (e.g., `#file:../api/openapi.yaml`). Human sign-off from EA (`AG-E-03`) and RAI (`AG-E-06`) is required before production-affecting merges — see `../SUPERPOWERS_CONTRACT.md`.

## 7. Instruction precedence

When guidance conflicts, apply the most specific that is safe: **explicit prompt** > **active custom agent** > **path-scoped `.github/instructions/*.instructions.md`** > **this repo file** > personal/organization defaults. The hard guardrails in §3 are non-negotiable regardless of precedence.

## 8. Key documents

`../docs/PRD.md` · `../docs/SD.md` · `../docs/BOM.md` · `../docs/DESIGN-PRINCIPLES.md` · `../docs/AI.md` · `../docs/DATA.md` · `../docs/SECURITY.md` · `../docs/COMPLIANCE.md` · `../docs/BACKLOG.md` · `../docs/VERSIONING.md` · `../docs/COPILOT-BUILD-GUIDE.md` · `../docs/adr/` · `../api/openapi.yaml` · `../AGENTS.md` · `../SUPERPOWERS_CONTRACT.md` · `./agents/AGENT_WORKFLOW.md` · `./agents/NON_DELEGABLE_WORK.md` · `./agents/KPI_BASELINE.md`

## 9. Build, test & delivery workflow

Follow the delegated flow in `./agents/AGENT_WORKFLOW.md`; respect `./agents/NON_DELEGABLE_WORK.md`; track quality against `./agents/KPI_BASELINE.md`.

**Build & test commands:**

- Frontend (shell): `npm install --prefix src/web/atcsim-shell`, `npm run test --prefix src/web/atcsim-shell`, `npm run build --prefix src/web/atcsim-shell`.
- Backend: `dotnet test tests/apis/AtcSim.FlightDataApi.Tests/AtcSim.FlightDataApi.Tests.csproj` and `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj`.
- Infra: `az bicep build --file infra/main.bicep`; `az bicep build-params --file infra/parameters/dev.bicepparam`.
- Docs: pre-commit runs `markdownlint-cli2 "**/*.md"` — keep docs lint-clean.
- Env notes: the npm proxy is age-gated, so `src/web/atcsim-shell/.npmrc` sets `min-release-age=7`; if `azd`/Azure auth is unavailable, validate infra with `az bicep build`.

**Scope guards (read before editing):**

- `src/web/atcsim-shell/**` → `../docs/SD.md`; if auth touched, `../docs/SECURITY.md`.
- `src/apis/**`, `../api/openapi.yaml` → `../docs/SD.md`; AI/command-mapping → `../docs/AI.md`; data → `../docs/DATA.md`.
- `infra/**`, `azure.yaml` → `../docs/SECURITY.md` + relevant `../docs/adr/`; enforce residency and deny public data endpoints.
- `docs/**`, `docs/adr/**` → keep ADRs/contracts in sync and markdownlint-clean.

**Delivery gates (hard):**

- Traceability `FR-##`/`NFR-##` → `US-###` → tests/evals → evidence in every PR.
- Golden-phraseology / command-mapping regressions must not merge.
- EA (`AG-E-03`) architecture sign-off and RAI (`AG-E-06`) review before production-affecting merges.
- Each sprint has a dedicated GitHub issue (backlog + WIP); feature work in a `.worktrees/` worktree on a `feat/` branch; merge `--no-ff`; push to origin only on explicit request. This is the **PoC-phase** model; once a PoC is proven the workstream switches to a **single-branch + `semantic-release`** model (see `../docs/VERSIONING.md`).
