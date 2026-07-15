# Superpowers Docs Workflow Specification

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | Superpowers Docs Workflow — Specification |
| Type | Spec |
| Version | 1.0 |
| Date | 2026-07-14 |
| Author | Product Owner, Enterprise Architect, SecDevOps |
| Status | Approved |
| Classification | Confidential — anonymized |
| Scope | Documentation structure only |

**Related documents:** [implementation plan](../plans/2026-07-14-superpowers-docs-workflow-plan.md)

## Goal

Establish a consistent, pluralized documentation structure directly under [docs](c:\Users\urruegg\source\urruegg\ATCSimulator\docs) for Superpowers-driven ideation, specification, planning, sprint delegation, and stakeholder review artefacts.

## Context

ATCSimulator already has baseline architecture, product, compliance, and operations documentation under [docs](c:\Users\urruegg\source\urruegg\ATCSimulator\docs). What it lacks is a dedicated workflow structure for the Superpowers execution lifecycle.

The intent is to align with the plural folder naming convention already used in the SwissHospitalCapacityPlatform repository, while keeping the folders top-level under [docs](c:\Users\urruegg\source\urruegg\ATCSimulator\docs) rather than nesting them under a separate `superpowers` path.

## Proposed Structure

Create these top-level folders directly under [docs](c:\Users\urruegg\source\urruegg\ATCSimulator\docs):

- `docs/ideas`
- `docs/specs`
- `docs/plans`
- `docs/sprints`
- `docs/reviews`

## Folder Responsibilities

### `docs/ideas`

Purpose: capture raw stakeholder input before scope, ownership, or implementation approach is finalized.

Examples:

- workshop notes
- stakeholder suggestions
- backlog seed concepts
- investigation prompts for future brainstorming sessions

### `docs/specs`

Purpose: hold approved design/specification baselines that define the scope and intent of a work item.

Rules:

- every implementation-oriented plan should trace back to one governing spec
- specs should be stable enough to support planning and delegation
- specs should capture scope, constraints, architecture intent, and acceptance framing

### `docs/plans`

Purpose: store implementation plans derived from an approved spec.

Rules:

- plans are execution-oriented rather than exploratory
- plans should support GitHub Copilot and Superpowers task execution
- plans should link back to the governing spec and forward to the sprint record when one exists

### `docs/sprints`

Purpose: store sprint-level delegation documents that package a work slice for GitHub Issue-based execution.

Rules:

- each sprint document should link to the relevant GitHub Issue
- each sprint document should reference its governing spec and its active plan
- sprint documents should describe delegation context, scope slice, and expected evidence

### `docs/reviews`

Purpose: capture stakeholder review outputs after a design review, sprint review, or demo review.

Rules:

- reviews should summarize decisions, concerns, approvals, and follow-ups
- reviews should link to the sprint, plan, or spec they evaluate
- reviews should preserve enough detail to support later traceability and auditability

## Naming Convention

Recommended filename patterns:

- `docs/ideas/YYYY-MM-DD-<topic>.md`
- `docs/specs/YYYY-MM-DD-<topic>-spec.md`
- `docs/plans/YYYY-MM-DD-<topic>-plan.md`
- `docs/sprints/YYYY-MM-DD-sprint-<nn>-<topic>.md`
- `docs/reviews/YYYY-MM-DD-<topic>-review.md`

This keeps filenames sortable by date, readable in GitHub, and predictable for linking across artefacts.

## Traceability Model

Recommended lifecycle:

1. idea
2. spec
3. plan
4. sprint
5. review

Traceability expectations:

- every downstream document links to its upstream source where applicable
- sprint documents link to the GitHub Issue and to both spec and plan
- review documents link to the artefact set they evaluate
- documentation flow complements, but does not replace, existing requirement and story traceability in [docs/BACKLOG.md](c:\Users\urruegg\source\urruegg\ATCSimulator\docs\BACKLOG.md), [docs/PRD.md](c:\Users\urruegg\source\urruegg\ATCSimulator\docs\PRD.md), and [SUPERPOWERS_CONTRACT.md](c:\Users\urruegg\source\urruegg\ATCSimulator\SUPERPOWERS_CONTRACT.md)

## Alternatives Considered

### Nested under `docs/superpowers`

Rejected for this repo because the user explicitly wants the workflow folders directly under [docs](c:\Users\urruegg\source\urruegg\ATCSimulator\docs), and top-level placement makes the workflow artefacts first-class alongside the existing baseline documents.

### Singular folder names

Rejected because the established convention in the related repository is plural, and plural names better represent collections of artefacts rather than single canonical documents.

## Recommendation

Create the five folders directly under [docs](c:\Users\urruegg\source\urruegg\ATCSimulator\docs) using plural names and use the naming and traceability conventions above as the baseline for Superpowers-driven delivery.

## Out of Scope

- changing the existing baseline document set under [docs](c:\Users\urruegg\source\urruegg\ATCSimulator\docs)
- defining sprint content templates in this step
- changing GitHub workflow automation in this step
- restructuring existing ADR or product documentation

## Review Notes

This spec is intentionally narrow: it defines folder structure, document roles, naming conventions, and traceability expectations only.
