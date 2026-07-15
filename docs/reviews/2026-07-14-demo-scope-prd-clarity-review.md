# Demo Scope PRD Clarity Review

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | Demo Scope PRD Clarity Review |
| Type | Review |
| Version | 1.0 |
| Date | 2026-07-14 |
| Author | ATCSimulator team |
| Status | Complete |
| Classification | Confidential — anonymized |
| Review type | Starting-pack baseline review |
| Scope | Demo Scope 2 (primary) |
| Primary source of truth | [PRD.md](../PRD.md) |
| Supporting references | [BACKLOG.md](../BACKLOG.md), [SD.md](../SD.md), [AI.md](../AI.md), [DATA.md](../DATA.md) |
| Outcome | Proceed with Sprint 0 only after decision backlog items marked High are resolved |

## 1. Review objective

Establish a shared and implementation-ready baseline for the Demo scope by checking:

- functional clarity from PRD to backlog to architecture
- non-functional clarity for demo go/no-go confidence
- immediate decisions required before execution starts

## 2. Executive summary

The starting pack is strong on direction, boundaries, and architecture intent. The main risk is not missing content, but inconsistent or unresolved implementation contracts across the documents.

Most blockers are resolvable in Sprint 0 through explicit decision capture and contract freezing. The highest-priority items are FR traceability alignment, deterministic command contract finalization, session-state lifecycle definition, confidence/fail-safe thresholds, and measurable demo data-handling behavior.

## 3. Key findings

### 3.1 Functional findings

| # | Finding | Severity | Impacted PRD IDs | Impacted backlog IDs |
| --- | --- | --- | --- | --- |
| F-01 | FR mapping is inconsistent between PRD and backlog and breaks strict requirement-to-story traceability. | High | FR-01..FR-13 | all US in EP-01..EP-07 |
| F-02 | Canonical simulator command vocabulary is not fully normalized across examples and story wording. | High | FR-05, NFR-21 | US-030 |
| F-03 | Session lifecycle state machine is not explicitly documented (state transitions, preconditions, pause/resume/end rules). | High | FR-02, FR-09 | US-011, US-020 |
| F-04 | Multi-intent instruction semantics are not fixed (ordering, atomicity, partial failure behavior). | High | FR-04, FR-05, FR-06 | US-021, US-030 |
| F-05 | Confidence threshold policy is not parameterized for no-dispatch and clarification behavior. | High | NFR-05, NFR-21 | US-023 |
| F-06 | Demo transcript behavior is ambiguous between transient and persisted evidence expectations. | High | FR-08, NFR-13 | US-040 |
| F-07 | Phraseology feedback output contract is underdefined (payload schema, timing, and audience). | Medium | FR-10, FR-11 | US-031 |
| F-08 | Flight-feed behavior needs explicit snapshot/freshness and fallback rules for reproducible demos. | Medium | FR-01, FR-02 | US-010, US-011, US-012 |
| F-09 | Golden-set CI gate is present but pass/fail thresholds are not fully locked in one authoritative place. | Medium | NFR-22 | US-041 |
| F-10 | Barge-in interaction behavior is required but not constrained for MVP scope. | Medium | NFR-02 | US-021 |

### 3.2 Non-functional findings

| # | Finding | Severity | Impacted IDs |
| --- | --- | --- | --- |
| NF-01 | Demo identity/access model is not operationally fixed for workshop execution. | High | NFR-07, NFR-10 |
| NF-02 | Segregation proof from operational ATC is stated but not yet defined as a signed technical attestation checklist. | Critical | CON-01, NFR-10 |
| NF-03 | Region fallback process is architected but not operationalized (trigger, owner, rollback conditions). | High | NFR-04, NFR-05, NFR-12, CON-05 |
| NF-04 | End-to-end latency target exists without a per-hop latency budget and owner map. | High | NFR-01, NFR-02 |
| NF-05 | Concurrency target remains placeholder and needs a fixed workshop profile. | High | NFR-03, NFR-15 |
| NF-06 | Deterministic safety behavior lacks explicit threshold settings and rejection policy telemetry. | Critical | NFR-21, NFR-05 |
| NF-07 | Required observability exists at principle level but not as a frozen minimum telemetry schema. | High | NFR-06, NFR-20 |
| NF-08 | No-personal-data demo posture needs measurable field-level controls and retention timers. | High | CON-03, NFR-11, NFR-13 |
| NF-09 | Governance controls are defined but not yet consolidated into one workshop release gate. | Medium | CON-04, NFR-17, NFR-20 |
| NF-10 | Demo incident response and operator runbook for live session failure scenarios needs explicit ownership. | Medium | NFR-04, NFR-05, NFR-06 |

### 3.3 Stakeholder addendum: live flight tracker integration

Stakeholder focus: use publicly available live flight trackers in demo scope (FlightAware / Flightradar24) and confirm API-consumable integration patterns.

New input from subfolder analysis confirms a provider-decision draft in ADR form and documents a practical FR24 onboarding path with a free sandbox API key for build/test.

Key clarification:

- The tracker websites themselves are not the integration surface for automation.
- Both providers publish terms that restrict non-browser scraping and define API-specific usage paths.
- For demo implementation, integration should be API-first via licensed/compliant endpoints only.

#### Option analysis for Demo Scope 2

| Option | API consumable | Fit for demo | Key constraints / notes |
| --- | --- | --- | --- |
| FlightAware live website pages | No (for automated ingestion) | Do not use directly | Terms limit website access to human-operated browser except official data feeds/APIs; use AeroAPI or commercial data products instead. |
| FlightAware AeroAPI | Yes | Strong primary candidate | Query-based REST API with commercial tiers and clear docs; validate selected tier, query-volume cost, and permitted demo redistribution/display. |
| Flightradar24 live website pages | No (for automated ingestion) | Do not use directly | Terms distinguish website/browser access from FR24 API usage; no scraping/robot retrieval path for website pages. |
| Flightradar24 FR24 API (`fr24api.flightradar24.com`) | Yes | Recommended primary candidate | API is subscription + API-credit model, supports `bounds`-style area selection, and offers a free sandbox key for integration testing; production/demo usage still requires licensed plan and terms validation. |
| Community/public ADS-B sources (for fallback or backup only) | Often yes, varies by provider | Optional fallback | Usually lower SLA/coverage and tighter fair-use limits; suitable as resilience option, not default workshop dependency. |

#### Recommendation for current demo baseline

1. Primary: implement provider abstraction with Flightradar24 FR24 API first.
2. Secondary: keep a provider adapter contract for FlightAware AeroAPI so either source can be swapped without frontend changes.
3. Safety/compliance: do not scrape map webpages; only consume documented API endpoints under explicit license terms.
4. Reliability: add deterministic fallback path to seed scenario aircraft when external API is unavailable.
5. Delivery practicality: start implementation against FR24 sandbox key, then switch to paid tier credentials for customer-facing rehearsal/demo.

#### FR24 sandbox-key implications for this review

- Sandbox access reduces delivery risk in Sprint 0 because integration can start before commercial-credit activation.
- Sandbox behavior must be treated as non-production-like for quota/performance and data completeness.
- Go/no-go evidence must include one rehearsal run with paid-tier credentials, not sandbox-only proof.

#### Additional risks introduced by source-provider dependency

| Risk | Severity | Why it matters |
| --- | --- | --- |
| Provider contract/pricing changes close to workshop | High | Can break demo cost assumptions or access model unexpectedly. |
| Cache/storage restrictions violated accidentally | High | Can create legal/commercial non-compliance and force shutdown. |
| API quota exhaustion during rehearsal/demo | High | Causes live failures even when app logic is correct. |
| Dual-provider data model drift | Medium | Callsign/position schema differences can destabilize scenario seeding logic. |

## 4. Decision backlog (immediate)

| Decision | Owner | Due sprint | Default recommendation |
| --- | --- | --- | --- |
| D-01 Align PRD-to-backlog FR trace matrix | Product Owner | Sprint 0 | Keep [PRD.md](../PRD.md) as canonical FR source; update [BACKLOG.md](../BACKLOG.md) references accordingly. |
| D-02 Freeze deterministic command schema | Developer + Enterprise Architect + ATC SME | Sprint 0 | Use [openapi.yaml](../../api/openapi.yaml) as single source; align SD and backlog examples. |
| D-03 Publish session lifecycle state machine | Developer | Sprint 0 | Document explicit states and transitions in [SD.md](../SD.md) and link to US acceptance criteria. |
| D-04 Set confidence and no-dispatch thresholds | ATC SME + Responsible AI Officer | Sprint 1 | Define two thresholds: dispatch threshold and clarification threshold; always no-dispatch below threshold. |
| D-05 Resolve transcript/retention contract for demo | Responsible AI Officer + DPO | Sprint 1 | Keep transcript evidence with short TTL; no retained personal audio in demo scope. |
| D-06 Define phraseology feedback schema | ATC SME + Developer | Sprint 1 | Standard payload with category, severity, source phrase, canonical suggestion, and timestamp. |
| D-07 Freeze flight-feed snapshot/freshness policy | Developer + Product Owner | Sprint 1 | Snapshot at session start with explicit fallback path on feed unavailability. |
| D-08 Lock golden-set pass bars as CI blocker | Responsible AI Officer + ATC SME | Sprint 1 | Define numeric minimum pass thresholds and block merge on regression. |
| D-09 Publish segregation attestation checklist | Enterprise Architect + SecDevOps | Sprint 0 | Add signed pre-demo isolation verification covering network, identity, and secret boundaries. |
| D-10 Publish workshop go/no-go checklist | Product Owner + SecDevOps | Sprint 0 | Consolidate all release blockers into one checklist reviewed before demo day. |
| D-11 Select primary flight-data provider and commercial tier | Product Owner + Enterprise Architect | Sprint 0 | Select one provider-of-record (recommended: Flightradar24 FR24 API), and document quota, cost guardrails, and contract owner. |
| D-12 Define provider adapter contract and fallback behavior | Developer + Enterprise Architect | Sprint 0 | Implement a source-agnostic `FlightFeedProvider` interface and fallback to seeded scenario data on provider outage/rate limit. |
| D-13 Define FR24 sandbox-to-paid promotion checklist | SecDevOps + Developer | Sprint 0 | Separate sandbox and paid credentials in Key Vault, validate endpoint/path parity, and require paid-tier rehearsal evidence before workshop sign-off. |

## 5. Demo readiness thresholds (go/no-go)

All thresholds below must be satisfied before workshop demo sign-off:

1. Latency: p50 <= 1.2s and p95 <= 2.0s for conversational response.
2. Reliability: >= 99% successful completion rate across scripted demo scenarios.
3. Determinism: 100% dispatched simulator commands are schema-valid.
4. Safety: 100% low-confidence intents result in no-dispatch plus clarification response.
5. Isolation: 0 reachable paths from demo plane to operational ATC systems.
6. Data boundary: 0 personal-data-classified fields retained in demo stores/logs.
7. Observability: 100% sessions emit correlation IDs and required trace/safety events.
8. Governance: mandatory CI/release gates pass for security, policy, and eval checks.

## 6. Definition of ready (minimum for implementation)

A story is ready only if all are true:

- linked to one PRD FR or NFR and one backlog US identifier
- includes explicit API or state-transition contract impact
- includes deterministic validation/rejection behavior when commands are involved
- includes testable Given/When/Then acceptance criteria
- includes measurable telemetry expectation
- includes data handling statement for demo scope
- includes known dependency decisions (region, adapter mode, fallback path)
- includes required gate evidence for merge

## 7. Open follow-ups

- Confirm workshop concurrency target for NFR-03 sizing.
- Confirm acceptable region fallback policy under CON-03 for the demo.
- Confirm final decision owners and sign-off cadence for Sprint 0.
- Confirm primary external flight-data provider decision and commercial plan before Sprint 1 implementation.
- Confirm legal review of provider terms (automation, caching, display rights) and record accepted usage boundaries.
- Confirm FR24 sandbox key constraints and the exact production endpoint/parameter contract in the provider portal before locking adapter code.

## 8. Linked artifacts

- [PRD.md](../PRD.md)
- [BACKLOG.md](../BACKLOG.md)
- [SD.md](../SD.md)
- [AI.md](../AI.md)
- [DATA.md](../DATA.md)
- [COMPLIANCE.md](../COMPLIANCE.md)
- [SECURITY.md](../SECURITY.md)
- [FLIGHT-DATA-SOURCES.md](./2026-07-14-demo-scope-prd-clarity-review/FLIGHT-DATA-SOURCES.md)
- [ADR-0004-flight-data-provider.md](./2026-07-14-demo-scope-prd-clarity-review/ADR-0004-flight-data-provider.md)
- [SUPERPOWERS_CONTRACT.md](../../SUPERPOWERS_CONTRACT.md)
