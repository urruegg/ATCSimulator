# Compliance & Regulatory Design

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | Compliance & Regulatory Design |
| Version | 0.1 (Draft) |
| Date | 2026-07-14 |
| Author | Cloud Solution Architect (CSA), Microsoft |
| Status | Draft for Customer workshop (4 August 2026) |
| Classification | Public — anonymized demo |

**Related documents:** [SECURITY.md](./SECURITY.md) · [DATA.md](./DATA.md) · [AI.md](./AI.md) · [BOM.md](./BOM.md) · [SD.md](./SD.md) · [DESIGN-PRINCIPLES.md](./DESIGN-PRINCIPLES.md)

> **Legal-validation banner.** This document is a solution-architecture compliance design authored by Microsoft. It is **not legal advice**. Every statement of legal obligation, lawful basis, retention period, and jurisdictional interpretation below is marked **[validate with Customer legal/DPO]** where it depends on Customer-specific facts, contracts, or a formal legal opinion. The Customer's Data Protection Officer (DPO) and legal function are the authoritative owners of all determinations in this document.

---

## 1. Scope framing — why this is *not* critical national infrastructure

The Customer is Switzerland's national air navigation service provider (ANSP). That fact tends to trigger a maximal "safety-of-life / critical infrastructure" compliance reflex. **For ATCSimulator that reflex is misplaced, and saying so precisely is the single most important de-risking move in this document.**

- ATCSimulator is a **segregated training and simulation environment**. It has **no connection to live or operational air traffic control systems**, no live radar/surveillance feed, no operational voice-comms network, and no ability to affect any real aircraft, controller working position, or airspace.
- It is therefore **not a safety-of-life system** and is **explicitly out of scope of operational ATC certification** (see §2.3). No EASA/national operational ATM certification is required to build, run, or evolve ATCSimulator.
- The material regulatory driver is **not** aviation safety law — it is **data protection law**, because ATCSimulator processes **personal data** (trainee voice, identity, and performance records; see §3).
- Consequence for governance: the compliance envelope is that of a **regulated-industry SaaS training workload handling biometric-adjacent personal data**, not that of an operational ATM platform. This is a materially lighter — but not trivial — envelope.

> `CON-01` ATCSimulator MUST maintain a hard technical and organizational boundary to operational ATC systems (no network path, no shared identity plane, no shared data plane). Segregation controls are specified in [SECURITY.md](./SECURITY.md) §6.

---

## 2. Regulatory landscape

### 2.1 Data-protection law (the binding driver)

| Regime | Applies because | Key obligations relevant to ATCSimulator | Owner |
| --- | --- | --- | --- |
| **Swiss FADP — revised Federal Act on Data Protection (revDSG / nFADP), in force since 1 Sept 2023**, with **Ordinance (revDSV) and DSG-specific requirements** | The Customer is a Swiss entity processing personal data of data subjects in Switzerland (trainees, instructors). | Lawful & good-faith processing, proportionality, purpose limitation, data security "state of the art", transparency/information duty, data-subject rights, **records of processing activities (RoPA)**, **DPIA (Datenschutz-Folgenabschätzung)** for high-risk processing, breach notification to the FDPIC, privacy-by-design/default. | Customer DPO |
| **EU GDPR (Regulation 2016/679)** | Likely applies via **Art. 3** if any monitoring/processing touches EU-based data subjects or establishments, and is contractually expected by the Customer. **[validate with Customer legal/DPO]** whether GDPR applies as primary or as an aligned-standard baseline. | Art. 5 principles, Art. 6/9 lawful basis (incl. special-category rules), Art. 30 RoPA, Art. 35 DPIA, Arts. 12–22 data-subject rights, Arts. 44–49 transfers, Art. 25 privacy-by-design. | Customer DPO |
| **Swiss data-transfer regime (FADP Art. 16/17 + FDPIC country list)** | Any processing outside Switzerland (EU Data Zone, US demo region). | Adequacy (EU is recognized adequate by Switzerland); for the US, **Swiss–U.S. Data Privacy Framework** or **Standard Contractual Clauses (SCC) + Transfer Impact Assessment** may be required. **[validate with Customer legal/DPO]** | Customer DPO + CSA |

**Design consequence:** because voice recordings are involved and voice is biometric-adjacent (see §3.2), the workload is treated as **high-risk processing → a DPIA is recommended and effectively required** before production go-live (see §4 and RISK-02).

### 2.2 Aviation-domain standards — as *training-content* references, not operational certification

The aviation standards below apply to ATCSimulator **only as sources of correct training content** (what "good" radiotelephony looks like), **never** as operational-certification obligations on the platform.

| Standard | How it is used in ATCSimulator | How it is **not** used |
| --- | --- | --- |
| **ICAO Annex 10 (Aeronautical Telecommunications), Vol. II** | Reference for standard R/T procedures the phraseology-validation guardrail checks trainee/virtual-pilot exchanges against. | Not a platform certification; ATCSimulator carries no ICAO approval and needs none. |
| **ICAO Doc 9432 (Manual of Radiotelephony)** | Source corpus for the **golden phraseology test set** and read-back-correctness scoring (see [AI.md](./AI.md) §7). | Not an operational compliance gate. |
| **ICAO Doc 4444 (PANS-ATM)** phraseology extracts | Optional enrichment of scenario content and clearance vocabulary. | Not operational procedure enforcement. |
| **EASA / national (Swiss, "SR"-series aviation regulation) controller-training frameworks** | Contextual alignment so the *training outcomes* map to how the Academy's syllabus and licensing pathway are structured. **[validate with Customer legal/aviation-training authority]** — the precise SR references and any FOCA/Academy accreditation implications are Customer-owned facts. | ATCSimulator is a training aid; it does **not** itself license or certify controllers. Pass/fail licensing decisions remain with accredited instructors/examiners (see §2.3, HITL in [AI.md](./AI.md) §6). |

> Note on "SR" (Systematische Sammlung des Bundesrechts) Swiss aviation provisions and any FOCA (Federal Office of Civil Aviation) accreditation of the Academy's training programme: these are referenced **lightly and for context only** and are flagged **[validate with Customer legal / aviation-training accreditation]**. Do not treat any specific SR article number as settled in this draft.

### 2.3 Explicit non-applicability statement (put this in front of the Customer's assurance/audit function)

- ATCSimulator is **not** an operational ATM/CNS system; **no operational ATC safety certification, ATSEP certification, or software-assurance-for-safety (e.g., operational DO-178C-class) obligation attaches to the simulator platform**. **[validate with Customer legal/assurance]**
- ATCSimulator does **not** make licensing/pass-fail determinations. **AI outputs are advisory**; an accredited human instructor retains full responsibility for assessment and certification (see [AI.md](./AI.md) §6 and RISK-05).
- If the Customer later connects any component to an operational or safety-relevant system, **that changes the classification entirely** and this compliance basis MUST be re-done. `CON-01` exists precisely to prevent that from happening silently.

---

## 3. Data classification & personal-data inventory

### 3.1 Classification scheme

Four tiers are used consistently across [DATA.md](./DATA.md), [SECURITY.md](./SECURITY.md), and this document:

| Tier | Definition | Handling baseline |
| --- | --- | --- |
| **Public** | Already public; no confidentiality obligation. | No residency constraint. |
| **Internal** | Customer business data, non-personal. | Encrypt; access-controlled; residency preferred CH/EU. |
| **Personal** | Data relating to an identified/identifiable person (FADP/GDPR). | Lawful basis + minimization + in-country residency preferred; DPIA input. |
| **Sensitive / special-category-adjacent** | Personal data warranting elevated protection (here: **voice biometrics-adjacent** + assessment/performance data). | Strictest controls; in-country Switzerland; explicit consent; shortest retention; CMK option. |

### 3.2 Personal-data inventory

| Data element | Domain (see [DATA.md](./DATA.md)) | Classification | Why | Notes |
| --- | --- | --- | --- | --- |
| **Trainee voice audio** (live R/T stream + any recording) | Voice audio streams | **Sensitive** | Voice is **biometric-adjacent**: raw voice can enable speaker identification. Whether it is *legally* "biometric data for the purpose of uniquely identifying" (GDPR Art. 9 / FADP special category) depends on whether ATCSimulator performs voiceprint identification — **it does not by design**, but the raw signal remains high-risk. **[validate with Customer legal/DPO]** | Prefer transient processing; avoid persistent storage unless justified (see §4, DATA.md retention). |
| **Trainee transcripts** (STT output of trainee speech) | Transcripts | **Personal** | Content attributable to an identified trainee. | Free-text may embed incidental personal data. |
| **Trainee identity** (name, Academy ID, cohort, role) | Session/performance records | **Personal** | Directly identifying. | Pseudonymize in analytics store where possible. |
| **Performance / assessment data** (scores, read-back correctness, errors, instructor notes) | Session/performance records | **Sensitive** (evaluative data about a person) | Evaluative data affecting a person's training progression; elevated sensitivity even if not special-category. | Advisory only; human-owned final assessment. |
| **Instructor identity & debrief annotations** | Session/performance records | **Personal** | Identifying + evaluative authorship. | |
| **Virtual-pilot synthetic voice output (TTS)** | Voice audio streams | **Internal** (not personal) | Machine-generated; not a real person's voice **provided no real person's voice is cloned without consent** (see CNV gating, [AI.md](./AI.md) §2). | |
| **Public live-flight data (demo)** | Live-flight public feed | **Public** | Read-only public feed (FlightAware/Flightradar24). | Demo only; no personal data. |
| **Fine-tune / domain-adaptation corpus** | Model training data | **Personal → Internal** | May contain trainee voice/transcripts unless de-identified. | Prefer synthetic + consented, de-identified corpora. |

### 3.3 Core FADP/GDPR obligations mapped to ATCSimulator

| Obligation | ATCSimulator position | Marker |
| --- | --- | --- |
| **Lawful basis** | Candidate bases: (a) **performance of the training relationship / task in the public interest**; (b) **legitimate interest** in effective controller training; (c) **consent** specifically for **voice capture and any recording retention**. Employment-context consent is fragile (imbalance of power) — do **not** rely on consent as sole basis for the *training* itself; use it specifically to authorize *voice recording/retention*. **[validate with Customer legal/DPO]** | RISK-01 |
| **Purpose limitation** | Voice/transcripts processed **only** for: real-time simulation interaction, debrief/documentation, and (with separate basis) model improvement. No secondary use (e.g., staff performance management, disciplinary use) without new basis. `CON-02` | RISK-06 |
| **Data minimization** | Prefer **transient, streamed** voice processing; persist recordings only when the training/debrief purpose requires it; default to **transcript-only retention** where feasible; aggressive TTL on raw audio (see [DATA.md](./DATA.md) §4). | — |
| **Data-subject rights** | Access, rectification, erasure, restriction, objection, portability (GDPR); analogous FADP rights. Erasure must reach recordings, transcripts, performance store, and any fine-tune set. **Design a data-subject-request (DSR) runbook** ([OPERATIONS.md]) and keep a data map ([DATA.md](./DATA.md)). | RISK-07 |
| **Consent for voice capture** | Explicit, informed, revocable consent captured **before first recording**; consent state stored and enforced at the session gate. Revocation stops future capture and triggers erasure workflow. | RISK-01 |
| **DPIA** | **Recommended and effectively required** (high-risk: systematic voice processing of employees/trainees, novel AI). See §4. | RISK-02 |
| **Transparency / information duty** | Trainees informed of processing, AI involvement, retention, rights (privacy notice + in-app disclosure). Aligns with RAI Transparency ([AI.md](./AI.md) §5). | — |
| **Records of processing (RoPA)** | Maintain an Art. 30 / FADP RoPA entry for ATCSimulator from MVP onward. | — |
| **Breach notification** | Notify FDPIC (FADP) / supervisory authority (GDPR) and data subjects per thresholds; incident runbook in [SECURITY.md](./SECURITY.md) §8 / [OPERATIONS.md]. | — |

---

## 4. DPIA recommendation

A **Data Protection Impact Assessment is recommended and should be treated as a production gate** for ATCSimulator, because the processing exhibits multiple high-risk markers under FADP/GDPR:

- Systematic processing of **voice** (biometric-adjacent) of **employees/trainees** (power-imbalance context),
- Use of **novel AI technologies** (real-time speech-to-speech, LLM command mapping),
- **Evaluative/performance** data about identifiable persons.

**DPIA scope should cover:** processing description & data map (from [DATA.md](./DATA.md)); necessity & proportionality; lawful basis confirmation; risks to data subjects (re-identification via voice, evaluative-data misuse, model-memorization/leakage, cross-border transfer); mitigations (in-country residency, minimization, CMK, purge, HITL, content safety); residual-risk sign-off by the DPO.

- **Demo scope: no DPIA blocker** — the demo processes **no personal data** (public + synthetic only), so a full DPIA is not a prerequisite for the Art-of-the-Possible demo. A short **screening assessment** confirming "no personal data" is sufficient. **[validate with Customer DPO]**
- **Full/production scope: DPIA required** before onboarding real trainee voice.

> `RISK-02` (below) tracks the DPIA. Owner: Customer DPO, with CSA support for the technical mitigation sections.

---

## 5. Data residency & sovereignty control mapping

This is the crux of the design tension: the Customer wants **data in Switzerland**, but the **cutting-edge real-time speech-to-speech** capability is **not currently available in Switzerland North** (as of Jul 2026; verify at design time — see [BOM.md](./BOM.md)). The answer is a **split-plane pattern** matched to data classification.

| Plane / workload | Data it touches | Target region | Residency outcome | Rationale |
| --- | --- | --- | --- | --- |
| **Production personal/sensitive plane** — trainee voice, transcripts, identity, performance records; classic **Azure AI Speech STT/TTS**; storage (Blob/ADLS, Cosmos, SQL); Key Vault; Purview | Personal / Sensitive | **Switzerland North** (Switzerland West for DR/pairing) | **In-country (Swiss) residency** | Azure AI Speech is **GA in Switzerland North & West**; data processed only in the resource's region → in-country STT/TTS is achievable. |
| **Reasoning / command-mapping (production)** — GPT-4.1 / GPT-5.x-class model for voice→command | Transcripts (personal) | **Switzerland North** if the required model is in-country; else **EU Data Zone (`data-zone-standard (EU)`)** | Swiss-preferred, **EU boundary as fallback** | Switzerland North hosts a broadened Foundry catalog but a subset vs EU/US; EU Data Zone keeps data within the EU. |
| **Real-time speech-to-speech (demo / Art-of-the-Possible)** — `gpt-realtime` / `gpt-4o-realtime` family | **Synthetic voice + public flight data only — NO personal data** | **Sweden Central (EU)** preferred; **East US 2 (US)** only if a Preview capability is US-only | EU (or US, demo-only) | Real-time family **not listed in Switzerland North**; demo carries **no personal data**, so EU/US processing is acceptable **for the demo**. |
| **Custom Neural Voice (production, optional)** | Voice model (potentially derived from a real consented voice) | Region with CNV availability; **RAI limited-access gated** | Per approval | CNV Pro is **limited-access / Responsible-AI-gated**; application required. See [AI.md](./AI.md) §2. |
| **US region** | **Demo, non-personal only** | **East US 2** | US, demo-only, **no personal data** | Hard rule: **no personal data ever lands in a US region.** `CON-03` |

**Sovereignty rules of the road (`CON-03`):**

1. **Personal/sensitive data → Switzerland North** (in-country) by default; **Switzerland West** for resiliency pairing.
2. If a required model is not in Switzerland → **EU Data Zone** (EU boundary), and only after **[validate with Customer legal/DPO]** that EU processing is acceptable for that data class.
3. **US regions carry demo/synthetic/public data only — never personal data.**
4. Every model deployment records its **region + data-boundary type** in the AI use-case register (§6). Availability is volatile — **re-confirm on the live model-availability page at design time**.

See [BOM.md](./BOM.md) for the authoritative regional-availability matrix and [SECURITY.md](./SECURITY.md) §3 for the network controls (Private Link, no public data-plane egress) that enforce these boundaries.

---

## 6. Minimal-viable governance for a green-field Customer

The Customer is **green-field** on cloud/AI governance and explicitly wants **minimal necessary governance — a frame, not a blocker**. The model below separates **what MUST exist for the MVP** from **what can follow (fast-follow)**. Anchored to CAF Govern (see [DESIGN-PRINCIPLES.md](./DESIGN-PRINCIPLES.md)).

### 6.1 MVP-mandatory vs fast-follow

| Governance element | MVP-mandatory? | What "minimal" looks like | Fast-follow (post-MVP) |
| --- | --- | --- | --- |
| **Named Data Owner** (for trainee personal data) | **MUST** | One accountable role named; owns lawful basis & retention. | Formal data-owner council. |
| **Architecture sign-off** | **MUST** for production; **not** for isolated sandbox/demo | Single EA + Governance/Compliance sign-off of the reference architecture (a "signed architecture" per the discovery call). Demo runs as **isolated sandbox → no sign-off needed**. | Standard architecture review board + ADR gate. |
| **AI use-case register** | **MUST** | One lightweight register (a table/list) recording: use case, owner, models used, region/data-boundary, RAI risk tier, HITL status, approval date. | Enterprise AI inventory + Purview/Foundry integration. |
| **DPIA / privacy screening** | **MUST** (screening for demo; full DPIA gate for production) | Screening template for demo; full DPIA before real voice. | Standing DPIA process + DPO tooling. |
| **Model / prompt change control** | **MUST (lightweight)** | Versioned prompts & model configs in Git; PR review; changelog; "no silent model swap" rule. | Formal MLOps promotion pipeline + eval gates (see [AI.md](./AI.md) §8). |
| **Consent management for voice** | **MUST** (production) | Consent captured & enforced at session gate; revocation runbook. | Consent lifecycle tooling. |
| **RoPA entry** | **MUST** (production) | One RoPA record for ATCSimulator. | Central RoPA system. |
| **Landing zone / policy guardrails** | **Fast-follow** (MVP can use a minimal secure subscription) | Baseline Azure Policy: allowed regions (CH/EU), deny public endpoints for data services, require encryption. | Full CAF landing zone. |
| **Content Safety & eval gates** | **MUST (basic)** for AI outputs | Content Safety on generative outputs; smoke eval on golden set. | Continuous eval + red-team cadence. |

### 6.2 RACI (minimal)

Roles use titles only (no personal names, per anonymization rules). R = Responsible, A = Accountable, C = Consulted, I = Informed.

| Activity | Data Protection / Compliance Officer (DPO) | Training Academy Manager (value owner) | Enterprise Architect | Cloud/Platform Ops Engineer | Responsible-AI Lead | CSA (Microsoft) |
| --- | --- | --- | --- | --- | --- | --- |
| Lawful basis & consent design | **A/R** | C | I | I | C | C |
| DPIA | **A/R** | C | C | C | C | C (technical mitigations) |
| Architecture sign-off (production) | C | I | **A/R** | C | C | C |
| AI use-case register upkeep | C | **A** | C | I | **R** | C |
| Model/prompt change control | I | I | C | **R** | **A** | C |
| Data classification & residency enforcement | **A** | I | C | **R** | C | C |
| Retention & purge operation | **A** | I | I | **R** | I | C |
| Incident / breach response | **A/R** | I | C | **R** | C | C |
| RAI evaluation & red-teaming | C | I | I | C | **A/R** | C |

> `NFR`-level and `RISK`-level controls that implement this governance are traced in [SECURITY.md](./SECURITY.md) and §8 below. Design principles are in [DESIGN-PRINCIPLES.md](./DESIGN-PRINCIPLES.md).

---

## 7. Compliance control matrix

Control → requirement → how ATCSimulator meets it → evidence artefact. IDs cross-reference [SECURITY.md](./SECURITY.md) (`NFR-##`), this doc (`CON-##`, `RISK-##`), and [AI.md](./AI.md).

| # | Control area | Requirement / obligation | How ATCSimulator meets it | Evidence artefact |
| --- | --- | --- | --- | --- |
| C-01 | Data residency | Keep personal data in Switzerland where possible (FADP; discovery call). | Split-plane: personal/sensitive + classic Speech in **Switzerland North**; `CON-03` region rules; Azure Policy allowed-regions. | Azure Policy assignment export; resource region inventory; BOM region matrix. |
| C-02 | Lawful basis & consent | FADP/GDPR Art. 6/9 basis; explicit consent for voice. | Documented lawful-basis memo; consent captured & enforced at session gate; revocation runbook. | Lawful-basis memo **[DPO]**; consent-log schema ([DATA.md](./DATA.md)); privacy notice. |
| C-03 | DPIA | High-risk processing → DPIA. | DPIA completed & signed before production; screening for demo. | Signed DPIA; demo screening record. |
| C-04 | Purpose limitation | No secondary use of voice/performance data. `CON-02` | Purpose tags on data domains; access policy; no disciplinary reuse. | Data-domain register ([DATA.md](./DATA.md)); access policy. |
| C-05 | Minimization & retention | Minimize + time-bound retention. | Transient-first voice processing; per-domain TTL/purge; transcript-preferred retention. | Retention schedule ([DATA.md](./DATA.md) §4); purge job logs. |
| C-06 | Data-subject rights | Access/erasure/rectification/etc. | DSR runbook reaching recordings, transcripts, performance store, fine-tune sets; data map. | DSR runbook; erasure job evidence; data map. |
| C-07 | Encryption | State-of-the-art protection at rest/in transit. | TLS in transit; platform encryption at rest + **CMK option** via Key Vault (`NFR` in [SECURITY.md](./SECURITY.md) §4). | Key Vault config; encryption settings export. |
| C-08 | Network isolation | No public data-plane egress for personal data. | Private Link/private endpoints for AI/Speech/Storage; APIM façade; VNet ([SECURITY.md](./SECURITY.md) §3). | Network diagram; private-endpoint inventory; NSG/firewall config. |
| C-09 | Identity & least privilege | Zero Trust identity. | Entra ID, Conditional Access, managed identities, PIM, least privilege ([SECURITY.md](./SECURITY.md) §2). | Entra CA policies; PIM audit; RBAC assignments. |
| C-10 | Segregation from operational ATC | Hard boundary to live ATC. `CON-01` | No network path/shared identity/shared data plane to operational systems; architectural boundary asserted & tested. | Architecture boundary diagram; segregation test evidence. |
| C-11 | AI content safety & grounding | Safe, grounded AI outputs. | Azure AI Content Safety; deterministic command mapping via schema/tool-calling; phraseology validation; groundedness eval ([AI.md](./AI.md) §3/§7). | Content Safety config; eval reports; golden-set results. |
| C-12 | Responsible AI | Microsoft RAI six principles; human accountability. | RAI deep-dive + Transparency Note; HITL advisory-only assessment; fairness/dialect-bias plan ([AI.md](./AI.md) §5/§6). | RAI assessment; Transparency Note; fairness eval report. |
| C-13 | Model/prompt governance | No silent model/prompt change. | Versioned in Git; PR review; eval gate; AI use-case register entry per deployment. | Git history; changelog; register entry; eval-gate run. |
| C-14 | Logging & audit | Auditability. | Azure Monitor/Log Analytics; Purview cataloguing/lineage; access & admin audit ([SECURITY.md](./SECURITY.md) §7). | Log Analytics workspace; Purview catalog; audit queries. |
| C-15 | Cross-border transfer | FADP Art. 16/17 + GDPR Ch. V for EU/US. | EU adequacy relied upon for EU Data Zone; SCC/DPF + TIA for any US demo transfer (non-personal only). **[validate with DPO]** | Transfer register; SCC/DPF records; TIA. |
| C-16 | Vendor/data-processing terms | Processor obligations. | Microsoft Product Terms / DPA + Azure OpenAI data-handling commitments (no training on customer data by default; abuse-monitoring settings reviewed). **[validate with DPO]** | Signed DPA reference; Azure OpenAI data-handling settings export. |

---

## 8. Risk register

Likelihood/Impact: L / M / H. Owner roles per anonymization rules.

| ID | Description | Likelihood | Impact | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- |
| `RISK-01` | **Lawful basis / consent for voice is invalid or fragile** (employee power-imbalance undermines consent; wrong basis chosen). | M | H | Documented lawful-basis memo separating training-relationship basis from voice-recording consent; DPO sign-off; consent enforced at session gate + revocation runbook. | Data Protection / Compliance Officer |
| `RISK-02` | **DPIA not completed before processing real voice**, exposing high-risk processing without assessment. | M | H | Treat DPIA as a hard production gate; demo screening only needs "no personal data" confirmation; CSA supplies technical mitigation sections. | Data Protection / Compliance Officer |
| `RISK-03` | **Personal data leaves Switzerland unintentionally** (model routed to EU/US; global-standard deployment; logging egress). | M | H | `CON-03` region rules; Azure Policy allowed-regions + deny-public-endpoint; Private Link; per-deployment region recorded in AI register; verify model-availability at design time. | Enterprise Architect / Cloud Ops |
| `RISK-04` | **Voice treated as special-category biometric** if any voiceprint/speaker-ID capability is added, raising the bar to Art. 9 / FADP special category. | L | H | By-design **no speaker identification**; if added, re-run DPIA + explicit consent + special-category basis; documented in AI register. | Data Protection / Compliance Officer |
| `RISK-05` | **AI assessment misused as authoritative pass/fail**, bypassing human instructor accountability. | M | H | Transparency Note + `CON` that AI is advisory only; UI labels AI output as advisory; instructor sign-off mandatory (HITL, [AI.md](./AI.md) §6). | Responsible-AI Lead / Academy Manager |
| `RISK-06` | **Function creep / secondary use** of voice or performance data (e.g., staff performance management, disciplinary action). | M | H | Purpose-limitation `CON-02`; purpose tags + access policy; DPO approval required for any new purpose (new basis + info duty). | Data Protection / Compliance Officer |
| `RISK-07` | **Data-subject erasure incomplete** — recordings/transcripts/performance/fine-tune copies not all deleted. | M | M | DSR runbook covering every store; data map ([DATA.md](./DATA.md)); erasure job evidence; avoid embedding personal data in fine-tune sets. | Cloud Ops / DPO |
| `RISK-08` | **Model memorization / leakage** of trainee voice or transcript content via generative output or fine-tune. | L | M | Prefer synthetic/de-identified fine-tune corpora; groundedness + Content Safety; no training on customer data by default (verify DPA); red-teaming ([AI.md](./AI.md) §7). | Responsible-AI Lead |
| `RISK-09` | **Boundary erosion to operational ATC** — a future integration silently links simulator to live systems, changing the entire compliance basis. | L | H | `CON-01` hard boundary; change control requires re-classification + new DPIA/assurance before any operational linkage; architecture review gate. | Enterprise Architect |
| `RISK-10` | **Over-governance stalls the MVP** (endless definition phases), contrary to Customer's minimal-viable-governance intent. | M | M | MVP-mandatory vs fast-follow split (§6); isolated sandbox needs no architecture sign-off; time-boxed governance artefacts. | Training Academy Manager / CSA |
| `RISK-11` | **Cross-border transfer non-compliance** for any US demo path (transfer mechanism missing). | L | M | US path is demo/non-personal only; SCC/DPF + TIA if ever needed; transfer register. **[validate with DPO]** | Data Protection / Compliance Officer |
| `RISK-12` | **Custom Neural Voice misuse / non-consented voice cloning** (impersonating a real pilot/controller). | L | H | CNV is RAI-gated limited-access; only consented voice talent; disclosure that pilot voice is synthetic; no cloning real controllers without consent ([AI.md](./AI.md) §2/§5). | Responsible-AI Lead |
| `RISK-13` | **Third-party public-feed licensing/ToS** (FlightAware/Flightradar24) constraints for the demo. | L | L | Confirm demo/eval use permitted under feed ToS; read-only; attribute; no redistribution. **[validate with Customer legal]** | CSA / Enterprise Architect |

---

## 9. Demo-scope vs full-scope compliance delta

The demo (Scope 2, Art-of-the-Possible) is **materially lighter** than production (Scope 1) because it processes **no personal data**.

| Dimension | Demo / MVP (Scope 2) | Full / production (Scope 1) |
| --- | --- | --- |
| **Personal data** | **None** — public flight feed + synthetic voices only. | Trainee voice, identity, transcripts, performance (personal/sensitive). |
| **FADP/GDPR trigger** | Minimal — no personal data processing; screening confirms. | Full applicability. |
| **DPIA** | **Not required** — short "no personal data" screening. | **Required** production gate (RISK-02). |
| **Consent management** | Not required (no real voices captured). | Required (voice capture + retention). |
| **Data residency** | Flexible — **Sweden Central (EU)** or **East US 2 (US)** allowed for real-time speech-to-speech, since data is non-personal. | **Switzerland North** in-country for personal/sensitive; EU Data Zone only as needed; **no US for personal data** (`CON-03`). |
| **Architecture sign-off** | **Not required** — runs as **isolated sandbox**. | **Required** — signed architecture (EA + Governance). |
| **Retention/erasure/DSR** | Trivial — no personal data to retain or erase. | Full retention schedule, purge, DSR runbook. |
| **RoPA entry** | Optional. | Required. |
| **Governance load** | Lightweight AI-use-case register entry + Content Safety + basic eval. | Full §6 MVP-mandatory set + fast-follow build-out. |
| **RAI** | Transparency + safety controls still apply (good practice), but no privacy-of-real-persons dimension. | Full RAI six-principle treatment incl. fairness/dialect-bias on real cohorts. |

> **Takeaway for the workshop:** the demo can move fast on the *latest & greatest* cloud capability in EU/US **precisely because** it carries no personal data. The compliance weight lands only when real trainee voice is introduced in production — and even then the workload is a **regulated training system**, not critical national infrastructure.

---

## 10. Open items to validate with the Customer

1. **Confirm applicability & primacy of GDPR vs FADP** for the Customer's data subjects and establishments. **[legal/DPO]**
2. **Confirm lawful basis** for the training processing and the **consent construct** for voice recording. **[legal/DPO]** (RISK-01)
3. **Confirm DPIA obligation & scope**; agree the DPIA is a production gate. **[DPO]** (RISK-02)
4. **Confirm data-residency risk appetite** for the EU Data Zone fallback and any US demo path. **[legal/DPO]** (RISK-03/11)
5. **Confirm SR / FOCA / EASA training-accreditation context** and that ATCSimulator is a training aid, not a certifying system. **[legal / aviation-training accreditation]**
6. **Confirm Microsoft DPA / Azure OpenAI data-handling settings** (no-training-on-data, abuse-monitoring opt-out where eligible). **[DPO/procurement]** (C-16)
7. **Confirm public-feed ToS** for demo use. **[legal]** (RISK-13)
8. **Confirm CNV eligibility & RAI gating** approach for production voices. **[RAI Lead]** (RISK-12)
