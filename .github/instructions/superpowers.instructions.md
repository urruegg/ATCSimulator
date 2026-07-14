---
applyTo: "**"
---

# ATCSimulator Superpowers Path-Scoped Rules

Apply these rules to all edits in this repository.

1. Keep full traceability in PRs: requirement (FR/NFR) -> story (US-###) -> tests/evals -> evidence.
2. Never introduce secrets in code, fixtures, logs, or config.
3. Never add any integration path to operational/live ATC systems.
4. Demo scope stays public/synthetic only: no personal trainee data.
5. Simulator actions must remain deterministic and schema-validated against api/openapi.yaml.
6. Architecture-impacting changes should update or reference docs/adr files.
7. AI behavior remains advisory with human instructor accountability.

See SUPERPOWERS_CONTRACT.md and .github/copilot-instructions.md for full policy details.
