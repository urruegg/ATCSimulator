# ADR-0005: Shared platform entry — Azure Front Door + Azure DNS (`swissshub`)

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | ADR-0005 — Shared platform entry (Front Door + DNS) |
| Version | 0.1 (Draft) |
| Date | 2026-07-16 |
| Author | ATCSimulator team |
| Status | Accepted (for demo/MVP scope) — revisit at design time |
| Classification | Public — anonymized demo |

**Related documents:** [../SD.md](../SD.md) §3 · [../BOM.md](../BOM.md) §3.2 · [../SECURITY.md](../SECURITY.md) §3 · [ADR-0002-agnostic-api-facade.md](./ADR-0002-agnostic-api-facade.md) · [ADR-0006-azure-maps-keyless-auth.md](./ADR-0006-azure-maps-keyless-auth.md)
**Related IDs:** `NFR-08` · `NFR-19` · `CON-01` · `DP-20`

---

## Status

**Accepted for the demo / MVP (Scope 2).** Aligns with [ADR-0002](./ADR-0002-agnostic-api-facade.md) (Agnostic API façade) at the network edge. The GoDaddy → Azure DNS delegation is a **human gate** (see Consequences). Region/service availability is volatile — **re-verify at design time**.

## Context

- The ZRH real-flight UX exposes a **single public `api` hostname** convention, but the demo runs **two backend App Services** — the flight-data API and the voice-agent API.
- Serving both backends under one `api` host requires an **edge façade** that path-routes a single hostname to two origins; this mirrors the single-entry principle of the Agnostic API ([ADR-0002](./ADR-0002-agnostic-api-facade.md)) at the network edge.
- Several solutions in the tenant can **share** one DNS zone and one edge profile rather than each standing up its own.
- Azure DNS requires a public zone to be named as the **fully-qualified domain name**; the zone must therefore be named **`swissshub.com`** (not a short label).
- The demo plane carries **no personal data** and has **no path to operational ATC** (`CON-01`, `NFR-19`).

## Decision

Adopt a shared, cross-solution resource group **`swissshub`** that hosts a single **Azure DNS zone `swissshub.com`** and a single **Azure Front Door Standard profile `fdswissshub`** as the public entry for all ATCSimulator (and future tenant) hostnames.

- **Shared resource group `swissshub`** holds the reusable platform services (DNS zone + Front Door), separate from per-solution resource groups.
- **Azure DNS zone `swissshub.com`** is authoritative for the domain; **GoDaddy delegates** the domain to Azure DNS via **NS records**.
- **Azure Front Door Standard `fdswissshub`** fronts all public hostnames — `app`, `appsit`, `api`, `apisit` under `*.atcsim.swissshub.com`.
- Front Door **path-routes the single `api` host** to the **flight-data** and **voice-agent** App Services (one hostname, two origins).
- **Front Door-managed TLS** issues/renews certificates for the fronted hostnames; **origin lock** ensures the App Service origins accept traffic only from `fdswissshub`.

## Consequences

### Positive

- **Reusable shared platform**: the DNS zone and Front Door profile can serve other solutions in the tenant without duplication.
- **Single edge entry** with **managed TLS** and origin lock — one place to govern public ingress, certificates, and routing.
- Preserves the **single-`api`-host convention** while still fronting two backend App Services via path routing.

### Negative / trade-offs

- Adds **Azure Front Door + Azure DNS** components and a **subscription-scoped deployment** for the shared `swissshub` resource group (beyond the per-solution resource-group scope).
- The DNS zone **must be named `swissshub.com`** (Azure requires the FQDN), so the shared naming convention is constrained by the domain.
- **Human gate:** the **GoDaddy NS change** delegating `swissshub.com` to Azure DNS is a manual, out-of-band action that must complete before Front Door-managed TLS and hostname routing work end to end.

## Alternatives considered

1. **Two separate API subdomains (one per backend App Service).** Rejected: deviates from the single-`api` hostname convention and pushes routing complexity onto every client.
2. **App Service managed certificates without Front Door.** Rejected: cannot present a **single `api` host** in front of two App Services, and provides no shared edge/TLS/origin-lock layer for the tenant.
