# SUPERPOWERS CONTRACT — Agent-Driven Build Governance

| Field | Value |
|---|---|
| Product | ATCSimulator |
| Document | Superpowers Contract (agent operating rules) |
| Version | 0.1 (Draft) |
| Date | 2026-07-14 |
| Author | Cloud Solution Architect (CSA), Microsoft |
| Status | Draft for Customer workshop (4 August 2026) |
| Classification | Confidential — anonymized |

**Related documents:** [.github/copilot-instructions.md](./.github/copilot-instructions.md) · [AGENTS.md](./AGENTS.md) · [docs/COPILOT-BUILD-GUIDE.md](./docs/COPILOT-BUILD-GUIDE.md) · [docs/COMPLIANCE.md](./docs/COMPLIANCE.md) · [docs/SECURITY.md](./docs/SECURITY.md) · [docs/AI.md](./docs/AI.md) · [api/openapi.yaml](./api/openapi.yaml)

> **Purpose.** This is the binding operating contract for **every GitHub Copilot agent** — the coding agent, the custom agents (`AG-E-01..AG-E-06`), and any MCP-driven automation — working in this repository. It exists so that the Customer (a green-field cloud/AI organization) gets the **speed of agent-driven engineering with the safety of governance-by-default**. If a request cannot be completed within these rules, the agent **stops and escalates** rather than working around them.

---

## 1. The ten operating rules

1. **Traceability is required.** No code, IaC, prompt, or scenario is added without a link chain **requirement (`FR-##`/`NFR-##`) → user story (`US-###`) → PR → test/eval → evidence**. Every PR references its story and requirement in the description (see [docs/COPILOT-BUILD-GUIDE.md](./docs/COPILOT-BUILD-GUIDE.md) §6).

2. **No secrets in code.** Credentials, keys, connection strings, and tokens never enter source, config, fixtures, or logs. Use **Microsoft Entra ID + Managed Identity**; store secrets in **Azure Key Vault**. Secret scanning + push protection are enforced and must stay green (`NFR-13`, `NFR-15`).

3. **Swiss residency & sovereignty guardrails (`CON-03`, DP-18).** Personal/production data and classic STT/TTS stay in **Switzerland North** (Switzerland West for DR). **EU Data Zone** only when a required model is not in-country. **US (East US 2) = demo, non-personal only.** Every deployable records its **region + data-boundary** in the AI use-case register. Region availability is *as of Jul 2026 — verify at design time*.

4. **No personal data in the demo (`CON-03`).** The demo/MVP plane processes only **public flight data + synthetic voices**. Agents must never introduce real trainee voice, identity, or performance data into demo code, tests, fixtures, or config.

5. **No operational-ATC wiring (`CON-01`).** Agents must never create a network path, shared identity plane, shared data plane, or integration between ATCSimulator and any live/operational ATC system. Such a request is a **classification-changing event** — stop and escalate to the Enterprise Architect (`AG-E-03`); do not implement.

6. **Deterministic boundary for AI actions.** Free-text model output must never directly drive the simulator. All simulator actions go through the **schema-validated command enum** ([api/openapi.yaml](./api/openapi.yaml), [docs/DATA.md](./docs/DATA.md) §5); unknown types / out-of-range values are rejected ([docs/AI.md](./docs/AI.md) §4). Read-backs must be **grounded** in the command actually dispatched.

7. **Responsible AI is enforced, not assumed.** Azure AI Content Safety on generative output; **advisory-only** AI (a human instructor is accountable); synthetic-voice disclosure; no non-consented voice cloning. RAI/eval gates block merges that regress (`AG-E-06`, [docs/AI.md](./docs/AI.md) §5/§7).

8. **Human sign-off gates.** Two decisions cannot be made by an agent alone:
   - **EA architecture approval** (`AG-E-03`) for any change to architecture, the API contract, residency/region, or the split-plane topology — and the production **signed architecture**.
   - **RAI/compliance review** (`AG-E-06`) for any change to models, prompts, evaluations, content-safety config, or data handling.
   These are enforced as **required reviewers + protected environments** in GitHub (see §3).

9. **Evidence-in-PR.** Every PR carries its own proof: passing CI (build, unit, GHAS, IaC scan), the relevant **golden-set / eval run output**, and a filled **Definition-of-Done checklist**. "It works on my machine" is not evidence; a green, linked run is.

10. **No silent changes.** Models, prompts, tool schemas, and scenarios are **versioned in Git**, PR-reviewed, and changelogged. No swapping a model or prompt without an ADR or register entry (`C-13`, [docs/AI.md](./docs/AI.md) §9). When a decision is architectural, add/update an ADR in [docs/adr/](./docs/adr/).

---

## 2. Roles & authority (who may approve what)

| Agent (custom agent) | May propose | Must NOT decide alone | Human gate it enforces |
|---|---|---|---|
| `AG-E-01` Product Owner | stories, acceptance criteria, priorities | scope changes affecting residency/compliance | — |
| `AG-E-02` Developer | code, tests, IaC, issue→PR | merging to protected branches | — |
| `AG-E-03` Enterprise Architect | ADRs, API contract, topology | production go-live without signed architecture | **Architecture approval** |
| `AG-E-04` SecDevOps | CI/CD, policy-as-code, GHAS config | disabling a security gate | pipeline/policy gate |
| `AG-E-05` ATC Domain Expert | phraseology, golden-set cases | overriding safety/phraseology gate | phraseology correctness |
| `AG-E-06` Responsible-AI & Compliance | RAI/eval/content-safety, residency review | shipping a model/prompt that fails evals | **RAI review** |

Runtime agents (`AG-F-01..AG-F-08`) are the *product*; the agents above are the *builders*. See [AGENTS.md](./AGENTS.md).

---

## 3. How the contract is enforced (mechanics)

- **Branch protection:** protected `main`; PRs require green CI + the correct **required reviewers** (EA for architecture/contract/residency paths; RAI for model/prompt/eval paths — wired via `CODEOWNERS`).
- **Protected environments:** deploy jobs target GitHub **Environments** with required approvals; production environment additionally requires the **signed architecture** artefact to be linked.
- **Policy-as-code:** Azure Policy (allowed regions CH/EU; deny public endpoints on data services; require encryption) runs in CI (`what-if` / PSRule) and at the subscription — a violation fails the PR (`AG-E-04`).
- **Eval gate:** the golden phraseology set + groundedness + fairness smoke run in CI; regression blocks merge (`AG-E-06`, [docs/AI.md](./docs/AI.md) §7.4).
- **Secret & supply-chain gates:** secret scanning/push protection, CodeQL, Dependabot, OIDC-federated deploys (no long-lived cloud creds) — all must pass (`NFR-15..18`).
- **Traceability check:** PR template requires `FR/NFR` + `US-###` links and an evidence link; unlinked PRs are not mergeable.

---

## 4. Escalation

If a task requires breaking any rule in §1 — especially **`CON-01` (operational wiring)**, **`CON-03` (residency / personal data in demo)**, or a **human sign-off gate** — the agent must **halt, explain, and open an issue** tagged `governance-escalation` for the Enterprise Architect (`AG-E-03`) and Responsible-AI & Compliance (`AG-E-06`), rather than attempting a workaround.

> **One-line contract:** *Move fast with the Copilot superpowers — but never past the guardrails. Trace everything, prove everything in the PR, keep personal data in Switzerland, keep the demo synthetic, and keep the simulator off the live network.*
