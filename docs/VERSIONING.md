# ATCSimulator — Versioning

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | Versioning |
| Type | Key |
| Version | 1.0 |
| Date | 2026-07-15 |
| Author | ATCSimulator team |
| Status | Active |
| Classification | Public — anonymized demo |

**Related documents:** [../AGENTS.md](../AGENTS.md) · [.github/agents/AGENT_WORKFLOW.md](../.github/agents/AGENT_WORKFLOW.md) · [.github/copilot-instructions.md](../.github/copilot-instructions.md)

---

## 1. Scheme

ATCSimulator uses **Semantic Versioning 2.0.0** (`MAJOR.MINOR.PATCH`):

- **MAJOR** — incompatible/breaking changes to a shipped contract (e.g. `api/openapi.yaml`).
- **MINOR** — backwards-compatible functionality.
- **PATCH** — backwards-compatible fixes.

While the product is a pre-release proof-of-concept it stays on the `0.x` line
(e.g. `src/web/atcsim-shell/package.json` is `0.1.0`). `0.x` signals that public
contracts may still change.

## 2. Conventional Commits (already in use)

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).
These prefixes drive the version bump when release automation is enabled:

| Prefix | Change | Bump |
| --- | --- | --- |
| `fix:` | Bug fix | PATCH |
| `feat:` | New feature | MINOR |
| `feat!:` / `BREAKING CHANGE:` | Breaking change | MAJOR |
| `docs:` / `chore:` / `refactor:` / `test:` / `ci:` | No release | none |

## 3. Phased rollout (aligned to the branching model)

Versioning maturity follows the same PoC → production transition as the branching
model in [AGENT_WORKFLOW.md](../.github/agents/AGENT_WORKFLOW.md):

- **Phase 1 — PoC (current).** Isolated `.worktrees/` + `feat/` branches, `--no-ff`
  merge to `main`, one GitHub issue per sprint. Versioning is **manual and
  documented**: keep `0.x`, bump `package.json`/project versions by hand when a
  milestone warrants it, and record scope in the sprint issue. No tags/CHANGELOG
  automation yet.
- **Phase 2 — Post-PoC (planned).** After the PoC is proven, switch to a
  **single-branch model with `semantic-release`**: Conventional Commits on `main`
  auto-compute the next SemVer, create the Git tag and GitHub release, and generate
  `CHANGELOG.md`. This is the point at which `git tag`, `CHANGELOG.md`, and a
  release GitHub Actions workflow are introduced.

## 4. Establishing Phase 2 (checklist, do when PoC graduates)

1. Add a release config (`.releaserc`/`release.config.js`) with the Conventional Commits preset.
2. Add a GitHub Actions release workflow triggered on `main`.
3. Generate the initial `CHANGELOG.md` and first `vX.Y.Z` tag.
4. Update [AGENT_WORKFLOW.md](../.github/agents/AGENT_WORKFLOW.md) and
   [.github/copilot-instructions.md](../.github/copilot-instructions.md) to make the
   single-branch model the default and retire the worktree flow.

## 5. Current state (2026-07-15)

- SemVer + Conventional Commits: **adopted** (documented here; commits already comply).
- `semantic-release`, Git tags, `CHANGELOG.md`, release workflow: **not yet enabled**
  (deferred to Phase 2 by design).
