# ATCSimulator — Test Strategy (TEST)

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | Test Strategy & Quality Gates |
| Version | 0.1 (Draft) |
| Date | 2026-07-14 |
| Author | Cloud Solution Architect (CSA), Microsoft |
| Status | Draft for Customer workshop (4 August 2026) |
| Classification | Confidential — anonymized |

**Related documents:** [PRD.md](./PRD.md) · [SD.md](./SD.md) · [AI.md](./AI.md) · [BACKLOG.md](./BACKLOG.md) · [OPERATIONS.md](./OPERATIONS.md) · [COPILOT-BUILD-GUIDE.md](./COPILOT-BUILD-GUIDE.md) · [../data/scenarios/sample-scenario.json](../data/scenarios/sample-scenario.json)

---

## 1. Test approach

Quality is **traceable** (requirement → story → test → evidence) and **automated in CI**. Because ATCSimulator is a **real-time voice AI**, testing combines classic software testing with **AI evaluation** (accuracy, safety, fairness, latency). The **instructor remains the human authority**; automated assessment is advisory (NFR-24).

## 2. Test lanes & quality gates

| Lane | What it validates | Tooling | Gate |
| --- | --- | --- | --- |
| Unit | Command mapping, tokenization, adapters | pytest / language-native | PR merge |
| Contract | Agnostic API conforms to `api/openapi.yaml` | schema/contract tests | PR merge |
| Integration | ASR→NLP→command→TTS loop, feed connector, mock simulator | test harness | PR merge |
| **AI evaluation** | Read-back correctness, WER, phraseology, groundedness | Foundry Evaluations + golden set | release gate |
| Latency / load | p50/p95 conversational latency, concurrency (NFR-01/03) | load harness | release gate |
| Security | IaC scan, SAST, secret scan, dependency scan | GitHub Advanced Security, Defender | release gate |
| Responsible AI | Content Safety, fairness/dialect bias, red-team | RAI checklist ([AI.md](./AI.md)) | release gate |
| Residency | Deployed regions match allow-list (CON-03) | Azure Policy compliance | release gate |
| UAT | Trainee/instructor acceptance | Academy pilot | production go |

## 3. Golden phraseology test set

Seeded from the Customer's example R/T exchanges (fixtures **G-01…G-04** in [../data/scenarios/sample-scenario.json](../data/scenarios/sample-scenario.json)), including Swiss place names (*Schrattenfluh*, *Evolène*) and Swiss/English mixed phraseology:

| ID | Trainee instruction (input) | Expected read-back (assert) |
| --- | --- | --- |
| G-01 | "Swiss 456, turn right heading 290 degrees, and climb flight level 370." | "Turning right heading 290 degrees and climbing to flight level 370, Swiss 456." |
| G-02 | "N123AB, crossing to Schrattenfluh approved, descend 5'000 feet, QNH 1019, report crossing completed." | "Crossing to Schrattenfluh approved and descending to 5,000 feet, QNH 1019, call you completed N123AB." |
| G-03 | "Heli-NA, Report HE, QNH 1023, look out for opposite helicopter just departed FATO climbing direction Evolène." | "Call you HE, QNH 1023, looking out for traffic Heli-NA." |
| G-04 | "NJE396J, opposite traffic 11 o'clock position 6 miles 4'900 feet climbing eastbound, maintain south of the IGS axis." | "Looking out NJE396J." |

## 4. AI evaluation metrics & targets (validate/calibrate with Academy SMEs)

- **Read-back correctness rate** — % of golden fixtures where the read-back matches expected phraseology (target set with the ATC Domain Expert, [../.github/agents/atc-domain-expert.agent.md](../.github/agents/atc-domain-expert.agent.md)).
- **Word Error Rate (WER)** — ASR accuracy, evaluated **per Swiss language & accent** (fairness, NFR-23).
- **Command-mapping accuracy** — correct simulator command(s) generated & dispatched (deterministic schema; false command rate → 0, NFR-21).
- **Groundedness / hallucination rate** — the pilot never invents unsafe or out-of-scope content.
- **Latency** — p50/p95 conversational latency (NFR-01).
- **Safety** — Content Safety pass rate; red-team pass.

## 5. Definition of Done (demo)

Mirrors PRD §9.2: aircraft-from-feed selection, real-time voice loop within latency target, ≥ the four golden fixtures pass, transcript produced, **no personal data / no operational ATC**, residency & RAI gates green, and full requirement→test traceability recorded.

## 6. Traceability

Each test references the `FR-##`/`NFR-##` it validates and the `US-###` story. CI publishes an **evidence bundle** (test results + eval scores + policy compliance) attached to the PR/release, per the traceability model in [COPILOT-BUILD-GUIDE.md](./COPILOT-BUILD-GUIDE.md).

## 7. PoC Validation Addendum

- PoC 1 validates authenticated FR24 sandbox reading, Azure Maps rendering, and aircraft selection.
- PoC 2 validates full voice-in/voice-out flow with tool-first mock knowledge.
- Latency evidence must be recorded for capture, backend, agent/model, and spoken response stages.
