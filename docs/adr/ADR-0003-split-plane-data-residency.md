# ADR-0003: Split-plane data residency (Switzerland North vs EU Data Zone / US)

| Field | Value |
|---|---|
| Product | ATCSimulator |
| Document | ADR-0003 — Split-plane data residency |
| Version | 0.1 (Draft) |
| Date | 2026-07-14 |
| Author | Cloud Solution Architect (CSA), Microsoft |
| Status | Accepted |
| Classification | Confidential — anonymized |

**Related documents:** [../COMPLIANCE.md](../COMPLIANCE.md) §5 · [../DATA.md](../DATA.md) §4 · [../SECURITY.md](../SECURITY.md) §3/§6 · [../BOM.md](../BOM.md) §7 · [../AI.md](../AI.md) §1/§2 · [../DESIGN-PRINCIPLES.md](../DESIGN-PRINCIPLES.md) DP-18 · [ADR-0001-realtime-model-region.md](./ADR-0001-realtime-model-region.md)
**Related IDs:** `CON-01` · `CON-03` · `RISK-03` · `RISK-11` · `C-01` · `C-15` · `DP-18`

---

## Status

**Accepted.** This ADR is the residency backbone; [ADR-0001](./ADR-0001-realtime-model-region.md) (real-time model region) is a specialization of it. Availability facts are *as of Jul 2026 — verify at design time*.

## Context

- The Customer requires **personal data to stay in Switzerland where possible** (FADP/revDSG + GDPR; discovery call), and IT security to be "state of the art".
- **Azure AI Speech** (classic STT/TTS, Custom Speech, Neural TTS) is **GA in Switzerland North and Switzerland West** → in-country processing of trainee voice is achievable ([../BOM.md](../BOM.md) §7).
- The **Azure OpenAI real-time audio family is NOT in Switzerland North** (as of Jul 2026); Switzerland North hosts a broadened but **subset** Foundry/OpenAI catalog, with some newer models available only via **EU Data Zone** or `global-standard`.
- **EU Data Zone** deployments keep data within the **EU boundary** (EU-level sovereignty, not strictly Swiss-only).
- The **demo carries no personal data** (public + synthetic), so it can use EU/US regions; **production carries personal/biometric-adjacent data** and must not.
- ATCSimulator must also keep a **hard boundary to operational ATC** (`CON-01`) — a separate concern from residency, but enforced by the same segregation mechanics.

## Decision

Adopt a **split-plane pattern**: choose data location **by data classification**, not by convenience.

| Plane / workload | Data class | Region | Boundary outcome |
|---|---|---|---|
| **Production personal/sensitive plane** — trainee voice, transcripts, identity, performance; classic **Azure AI Speech STT/TTS**; storage; Key Vault; Purview | Personal / Sensitive | **Switzerland North** (Switzerland West for DR) | **In-country (Swiss)** |
| **Production reasoning / command-mapping** — GPT-4.1 / GPT-5.x-class | Transcripts (personal) | **Switzerland North** if the model is in-country; else **EU Data Zone (`data-zone-standard (EU)`)** | Swiss-preferred, **EU fallback** |
| **Demo real-time speech-to-speech** — `gpt-realtime`/`gpt-4o-realtime` family | **Synthetic + public only — NO personal data** | **Sweden Central (EU)** default; **East US 2 (US)** only if a Preview is US-only | EU (or US, demo-only) |
| **US region** | Demo, non-personal only | **East US 2** | **US — never personal data** |

**Rules of the road (`CON-03`):**
1. Personal/sensitive → **Switzerland North** by default; **Switzerland West** for DR pairing.
2. If a required model is not in Switzerland → **EU Data Zone**, only after DPO confirms EU processing is acceptable for that data class.
3. **US regions carry demo/synthetic/public data only — never personal data.**
4. Every deployment records its **region + data-boundary type** in the AI use-case register (`C-13`); availability is **re-verified at design time**.
5. Enforced by **Azure Policy** (allowed regions CH/EU; deny public endpoints on data services) + **Private Link** + the segregation controls in [../SECURITY.md](../SECURITY.md) §6.

## Consequences

**Positive**
- **Sovereignty-by-design** (`DP-18`): the Customer gets in-country residency for everything that legally matters, while still accessing cutting-edge capability where it exists.
- Turns an availability gap into a **deliberate, documented trade-off** rather than an accidental data-egress (`RISK-03` mitigated).
- The demo can move fast on GA/Preview AI **because** it holds no personal data; the heavy controls attach only when real voice enters production.
- Clean alignment with the segregation boundary to operational ATC (`CON-01`).

**Negative / trade-offs**
- **Operational complexity:** two planes, two regions, distinct pipelines (single-loop real-time demo vs decomposed STT+reason+TTS production).
- **Feature divergence:** the in-country production path may lag the flagship model features available in EU/US — must be managed via the reasoning-model EU Data Zone fallback and periodic re-verification.
- Requires disciplined **region tagging** and policy enforcement to prevent drift; a mis-scoped deployment is the top residual risk (`RISK-03`).
- Cross-border transfer paperwork for any EU/US path (`C-15`, `RISK-11`) even when non-personal — kept minimal by keeping the demo synthetic/public.

## Alternatives considered

1. **Everything in Switzerland North.** Rejected (for now): the flagship real-time speech-to-speech family is not available there; would kill the "art of the possible" demo. Remains the target if/when models land in-country.
2. **Everything in EU Data Zone (Sweden Central).** Rejected for production personal data: the Customer's stated preference is **in-country Swiss** residency, which Azure AI Speech supports today; EU is the **fallback**, not the default, for personal data.
3. **Everything in East US 2 (best model coverage).** Rejected outright for any personal data (`CON-03`); US is demo/non-personal only.
4. **Single real-time model for both demo and production personal data.** Rejected: would force personal data into a non-Swiss region; production decomposes into in-country Speech + reasoning instead ([../AI.md](../AI.md) §1, [ADR-0001](./ADR-0001-realtime-model-region.md)).
