# Superpowers Docs Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish `docs/ideas`, `docs/specs`, `docs/plans`, `docs/sprints`, and `docs/reviews` directly under `docs` and make the new workflow discoverable in repository documentation.

**Architecture:** This change is documentation-only. The implementation creates committed placeholder/index files so the folders exist in git, updates the approved spec status, and refreshes the top-level repo documentation so contributors discover the new workflow path without relying on tribal knowledge.

**Tech Stack:** Markdown, git, PowerShell, GitHub Copilot custom docs workflow

---

## Task 1: Create workflow folder index files

**Files:**

- Create: `docs/ideas/README.md`
- Create: `docs/plans/README.md`
- Create: `docs/reviews/README.md`
- Create: `docs/sprints/README.md`
- Modify: `docs/specs/2026-07-14-superpowers-docs-workflow-spec.md`

- [ ] **Step 1: Update the approved spec status**

Change the metadata line in `docs/specs/2026-07-14-superpowers-docs-workflow-spec.md` from:

```md
| Status | Draft for review |
```

to:

```md
| Status | Approved |
```

- [ ] **Step 2: Create the ideas folder index**

Add `docs/ideas/README.md` with:

```md
# Ideas

Use this folder for raw stakeholder input before scope, ownership, or implementation approach is finalized.

Recommended filename pattern:

- `YYYY-MM-DD-<topic>.md`

Typical contents:

- workshop notes
- stakeholder suggestions
- candidate problem statements
- prompts for future brainstorming sessions
```

- [ ] **Step 3: Create the plans folder index**

Add `docs/plans/README.md` with:

```md
# Plans

Use this folder for implementation plans derived from an approved specification.

Recommended filename pattern:

- `YYYY-MM-DD-<topic>-plan.md`

Each plan should:

- link back to its governing spec
- support GitHub Copilot or Superpowers execution
- link forward to a sprint document when one exists
```

- [ ] **Step 4: Create the sprints folder index**

Add `docs/sprints/README.md` with:

```md
# Sprints

Use this folder for sprint-level delegation documents tied to a GitHub Issue and linked to the governing spec and plan.

Recommended filename pattern:

- `YYYY-MM-DD-sprint-<nn>-<topic>.md`

Each sprint document should:

- link to the GitHub Issue
- link to the relevant spec
- link to the relevant plan
- describe expected delivery evidence
```

- [ ] **Step 5: Create the reviews folder index**

Add `docs/reviews/README.md` with:

```md
# Reviews

Use this folder for detailed stakeholder review summaries after demos, design reviews, sprint reviews, or working sessions.

Recommended filename pattern:

- `YYYY-MM-DD-<topic>-review.md`

Each review should capture:

- decisions
- concerns
- approvals
- open follow-ups
- links to the related sprint, spec, or plan
```

- [ ] **Step 6: Verify the new documentation files exist**

Run:

```powershell
Get-ChildItem docs -Directory | Select-Object Name
```

Expected: includes `ideas`, `plans`, `reviews`, `specs`, and `sprints`

## Task 2: Update repository documentation

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Update the repository layout section**

Extend the `docs/` block in `README.md` so it includes the new workflow folders. Add these entries beneath the existing baseline document list:

```text
       ideas · specs · plans · sprints · reviews
```

- [ ] **Step 2: Add the workflow folders to the key artefacts section**

Add a new row to the key artefacts table in `README.md`:

```md
| **Superpowers workflow folders** | Idea intake, specifications, plans, sprint delegation, and review evidence | [docs/ideas/](./docs/ideas/) · [docs/specs/](./docs/specs/) · [docs/plans/](./docs/plans/) · [docs/sprints/](./docs/sprints/) · [docs/reviews/](./docs/reviews/) |
```

- [ ] **Step 3: Update the usage guidance**

Add one sentence to the "How to use this repository" section in `README.md` after the current step 3:

```md
4. **Use the workflow folders** under `docs/ideas`, `docs/specs`, `docs/plans`, `docs/sprints`, and `docs/reviews` to track ideation through sprint delivery and stakeholder review.
```

- [ ] **Step 4: Verify the README references resolve**

Run:

```powershell
git grep -n "docs/ideas\|docs/specs\|docs/plans\|docs/sprints\|docs/reviews" README.md
```

Expected: all five workflow folder paths appear in `README.md`

## Task 3: Final verification and commit

**Files:**

- Verify: `docs/ideas/README.md`
- Verify: `docs/plans/README.md`
- Verify: `docs/reviews/README.md`
- Verify: `docs/sprints/README.md`
- Verify: `docs/specs/2026-07-14-superpowers-docs-workflow-spec.md`
- Verify: `README.md`

- [ ] **Step 1: Check git diff for only the intended workflow changes**

Run:

```powershell
git diff -- docs/ideas docs/specs docs/plans docs/sprints docs/reviews README.md
```

Expected: only the approved folder-structure and README workflow changes appear

- [ ] **Step 2: Check git status**

Run:

```powershell
git status --short
```

Expected: shows the newly added or modified workflow files only

- [ ] **Step 3: Commit the change**

Run:

```powershell
git add docs/ideas docs/specs docs/plans docs/sprints docs/reviews README.md
git commit -m "docs: establish superpowers workflow folders"
```

- [ ] **Step 4: Push the commit**

Run:

```powershell
git push origin main
```

Expected: push completes successfully
