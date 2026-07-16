# ADR-0006: Keyless Azure Maps authentication via a backend token endpoint

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | ADR-0006 — Keyless Azure Maps authentication |
| Version | 0.1 (Draft) |
| Date | 2026-07-16 |
| Author | ATCSimulator team |
| Status | Accepted (for demo/MVP scope) — revisit at design time |
| Classification | Public — anonymized demo |

**Related documents:** [../SD.md](../SD.md) §3 · [../BOM.md](../BOM.md) §3.2 · [../SECURITY.md](../SECURITY.md) §3 · [../../api/openapi.yaml](../../api/openapi.yaml) · [ADR-0005-shared-platform-frontdoor-dns.md](./ADR-0005-shared-platform-frontdoor-dns.md)
**Related IDs:** `NFR-08` · `CON-03` · `DP-20`

---

## Status

**Accepted for the demo / MVP (Scope 2).** Realizes the **no-secrets** guardrail ([../SECURITY.md](../SECURITY.md) §3) for the browser map. Service/region availability is volatile — **re-verify at design time**.

## Context

- The ZRH real-flight UX renders map tiles in the browser using the **Azure Maps Web SDK**, which must authenticate to the Azure Maps service.
- The repository **no-secrets guardrail** forbids keys, connection strings, or tokens in client code or config ([../SECURITY.md](../SECURITY.md) §3): a **subscription key must never be shipped in the SPA**.
- The demo carries **no personal data**; map users are arbitrary/anonymous demo visitors, so per-user identity cannot be assumed.

## Decision

Authenticate the browser **Azure Maps SDK** via a **backend token endpoint** rather than a subscription key.

- The flight-data API exposes **`GET /api/maps/token`**, which **mints short-lived Azure Maps access tokens** on demand.
- The endpoint authenticates to Azure Maps using the API's **Managed Identity**, which is granted the **Azure Maps Data Reader** role (RBAC).
- The browser calls the token endpoint and initializes the Maps SDK with the **short-lived token** — **no subscription key is ever present in the browser**.

## Consequences

### Positive

- **Keyless in the client**: no Azure Maps subscription key in the SPA or its config — directly satisfies the no-secrets guardrail (`CON-03`, [../SECURITY.md](../SECURITY.md) §3).
- **Short-lived tokens** limit exposure; identity and RBAC are centralized on the backend Managed Identity.

### Negative / trade-offs

- Adds a **token endpoint** to the flight-data API plus an **RBAC role assignment** (Azure Maps Data Reader) to provision and maintain.
- The backend becomes a (small) dependency in the map render path.

## Alternatives considered

1. **Ship the Azure Maps subscription key in the SPA.** Rejected: exposes a secret in client code, violating the no-secrets guardrail ([../SECURITY.md](../SECURITY.md) §3).
2. **Per-user Microsoft Entra RBAC for Azure Maps.** Rejected: impractical for arbitrary/anonymous demo users, who have no assignable tenant identity.
