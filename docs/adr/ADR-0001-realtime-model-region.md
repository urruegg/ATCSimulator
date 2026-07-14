# ADR-0001: Real-time speech-to-speech model & region for the demo

| Field | Value |
|---|---|
| Product | ATCSimulator |
| Document | ADR-0001 — Real-time speech-to-speech model & region (demo) |
| Version | 0.1 (Draft) |
| Date | 2026-07-14 |
| Author | Cloud Solution Architect (CSA), Microsoft |
| Status | Accepted (for demo/MVP scope) — revisit at design time |
| Classification | Confidential — anonymized |

**Related documents:** [../BOM.md](../BOM.md) · [../COMPLIANCE.md](../COMPLIANCE.md) §5 · [../AI.md](../AI.md) §1/§2 · [../SECURITY.md](../SECURITY.md) §3 · [../DESIGN-PRINCIPLES.md](../DESIGN-PRINCIPLES.md) DP-11/DP-18 · [ADR-0003-split-plane-data-residency.md](./ADR-0003-split-plane-data-residency.md)
**Related IDs:** `FR` real-time voice loop · `NFR` latency (AI.md §7.2) · `CON-03` · `RISK-03` · `DP-11`, `DP-18`

---

## Status

**Accepted for the demo / MVP (Scope 2).** Region/model availability is volatile — **re-verify on the live Azure model-availability page at design time** (as of Jul 2026). Supersedes nothing. Constrained by [ADR-0003](./ADR-0003-split-plane-data-residency.md) (split-plane residency).

## Context

The demo (Scope 2, "Art of the Possible") must deliver a **real-time speech-to-speech** experience: a trainee controller speaks an R/T instruction and a **virtual pilot** answers with a natural, low-latency voice read-back. This requires the Azure OpenAI **real-time audio** family (`gpt-realtime`, `gpt-audio`, `gpt-4o-realtime`, `gpt-4o-mini-tts`, `gpt-4o-transcribe`).

Grounded availability facts (as of Jul 2026 — verify at design time; [../BOM.md](../BOM.md)):

- The real-time audio family is available in **East US 2** (flagship, full stack) and **Sweden Central (EU)**, plus parts of the family in other US/EU regions.
- The real-time family is **not currently listed in Switzerland North**.
- The Customer wants **data in Switzerland** where possible (FADP/revDSG + GDPR), but the **demo carries no personal data** (public flight feed + synthetic voices), which materially relaxes the residency constraint **for the demo only** ([../COMPLIANCE.md](../COMPLIANCE.md) §9).
- A conversational **latency budget** (illustrative p95 ≤ ~1,000 ms utterance-end → read-back-start) is a first-class realism requirement (`DP-11`, [../AI.md](../AI.md) §7.2).

The tension: cutting-edge real-time capability is **not in-country**, yet we want to honour sovereignty-by-design.

## Decision

For the **demo/MVP**, run the real-time speech-to-speech loop on the **Azure OpenAI real-time audio family in Sweden Central (EU) as the default region**, with **East US 2 (US) as an explicit fallback** used **only** when a required Preview capability is US-only.

- **Sweden Central (EU)** is preferred because it keeps demo processing within the **EU data boundary** (closest to Swiss expectations while the capability is absent from Switzerland North), and is close enough to meet the latency budget from Switzerland.
- **East US 2 (US)** is permitted **only** for the demo, **only** for non-personal (public + synthetic) data, and only where a needed Preview feature is not yet in EU (`CON-03`, [ADR-0003](./ADR-0003-split-plane-data-residency.md)).
- **Production personal data does NOT use this model as a single black box.** For Scope 1 the pipeline decomposes into **Azure AI Speech STT/TTS in Switzerland North** + a reasoning model (Switzerland North or EU Data Zone), per [../AI.md](../AI.md) §1 and [ADR-0003](./ADR-0003-split-plane-data-residency.md).
- Every deployment records **model + region + data-boundary** in the AI use-case register (`C-13`).

## Consequences

**Positive**
- Delivers the "latest & greatest" real-time voice demo the Customer asked for, fast, without waiting for Switzerland North.
- Keeps demo data in the **EU boundary** by default (Sweden Central), minimizing sovereignty friction.
- No personal data ever leaves the appropriate boundary; US is a bounded, documented exception (`RISK-03` mitigated).

**Negative / trade-offs**
- Demo real-time processing is **not in-country** — must be clearly communicated as a **demo-only** posture, not the production residency answer.
- Creates a **two-path** reality (demo real-time vs production decomposed pipeline); the vendor-agnostic API façade ([ADR-0002](./ADR-0002-agnostic-api-facade.md)) is what keeps this from leaking into clients.
- Availability can change; the decision must be **re-verified at design time** and may move to Switzerland North if/when the real-time family lands there.
- A US fallback carries transfer-mechanism obligations even for non-personal data — keep it exceptional (`C-15`, `RISK-11`).

## Alternatives considered

1. **Wait for the real-time family in Switzerland North.** Rejected: not available as of Jul 2026; would block the demo and the workshop momentum (contradicts DP-01/DP-02 "start small, scale fast").
2. **Run the demo in East US 2 by default.** Rejected as default: EU (Sweden Central) is closer to Swiss sovereignty expectations and latency; US is kept as a narrow fallback only.
3. **Decompose into classic STT + reasoning + TTS in Switzerland North even for the demo.** Viable and it is exactly the **production** pattern, but it does **not** showcase the flagship single-loop real-time speech-to-speech "art of the possible", and adds latency/integration for a demo that needs none of the in-country protection (no personal data). Kept for Scope 1.
4. **EU Data Zone deployment of the real-time model.** Considered; Sweden Central already satisfies the EU-boundary goal for the demo. EU Data Zone is the primary tool for the **production reasoning model**, not the demo real-time loop ([ADR-0003](./ADR-0003-split-plane-data-residency.md)).
