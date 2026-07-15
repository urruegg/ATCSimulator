# Non-Delegable Work Policy — ATCSimulator

## Purpose

Define work categories that require explicit **human ownership and approval** on
ATCSimulator. Agents may prepare and propose; only a named human may authorize
and execute the items below. This policy backs the guardrails in
[../copilot-instructions.md](../copilot-instructions.md) §3 and the accountability
model in [../../docs/COMPLIANCE.md](../../docs/COMPLIANCE.md) §6.

## Human-only tasks

1. **Any bridge to operational/live ATC.** Proposing or building connectivity to
   live/operational ATC, surveillance, or voice-comms systems is a
   classification-changing event (`CON-01`, RISK-09) — stop and escalate to the
   Enterprise Architect; never implement.
2. **Destructive cloud/Foundry/identity operations** — resource or model-deployment
   deletion, destructive data migration, identity/Entra configuration changes.
   (User standing rule: explicit approval required before any delete.)
3. **Secret rotation and privileged credential handling** in production (Key Vault
   production secrets, signing keys, tokens).
4. **Data-residency or sovereignty decisions** — moving personal/production data or
   classic STT/TTS outside Switzerland North, or changing the split-plane
   boundary (DP-18, `CON-03`).
5. **Compliance-significant legal/privacy decisions** — DPIA outcomes, retention
   changes, DSR handling, FADP/GDPR breach assessments (DPO owns).
6. **Responsible-AI limited-access enablement** — e.g. Custom Neural Voice; any
   change that weakens the "deterministic layer disposes" boundary (RAI Lead owns).
7. **Production release approval** and deployment-window authorization.
8. **Incident severity declaration** and customer/stakeholder impact communications.

## Human sign-off gates (from the agent registry)

- **Enterprise Architect** — architecture sign-off gate for production-affecting
  changes ([enterprise-architect.agent.md](./enterprise-architect.agent.md)).
- **Responsible-AI & Compliance Officer** — RAI review gate for AI behaviour,
  fairness/dialect bias, content safety, and residency
  ([responsible-ai-officer.agent.md](./responsible-ai-officer.agent.md)).

## Delegation guardrails

1. Agents may prepare plans, scripts, IaC, and validation steps.
2. Agents may not execute restricted actions without explicit written approval.
3. All approvals for restricted actions must be captured in issue/PR history.

## Approval pattern

1. State the intended action, blast radius/impact, and rollback strategy.
2. Obtain explicit approval from the designated human owner (named above).
3. Execute with evidence capture.
4. Record completion and outcome in the issue/PR comments.
