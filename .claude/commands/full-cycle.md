---
description: Run the full product and engineering workflow from discovery to release for a feature
argument-hint: <feature-or-scope>
---

Use the **master-orchestrator** to execute the FULL workflow for: **$ARGUMENTS**.

You must go through ALL phases in order:

DISCOVERY → ARCHITECTURE → PLANNING → BUILD → VALIDATION → RELEASE

---

# Execution Rules

1. Do NOT skip phases
2. Do NOT merge phases
3. Validate each phase before continuing
4. If something is missing, STOP and explain
5. Only proceed when the phase is complete and consistent

---

# Phase Execution

## Phase 1 — Discovery

- Run discovery using:
  - product-analyst
  - product-owner-orchestrator
  - financial-domain-expert (if needed)
- Produce full discovery output

If discovery is incomplete:
→ STOP and ask for clarification

---

## Phase 2 — Architecture

- Validate discovery exists
- Run architecture using:
  - tech-lead
  - data-architect
  - backend-nestjs-lead
  - frontend-nextjs-lead
  - design-lead (if UI)
- Produce architecture decisions

If architecture is weak or incomplete:
→ STOP and fix before continuing

---

## Phase 3 — Planning

- Run planning using:
  - scrum-master
  - product-owner-orchestrator
  - tech-lead
- Generate task breakdown and execution order

If tasks are unclear:
→ STOP and refine

---

## Phase 4 — Build

- Run build using:
  - backend-nestjs-lead
  - frontend-nextjs-lead
  - data-architect
  - design-lead
- Respect correct order:
  - backend → frontend

Do NOT implement everything blindly:
→ build in controlled scope

---

## Phase 5 — Validation

- Run validation using:
  - test-engineer
  - qa-release-reviewer
  - security-red-team

If critical issues exist:
→ STOP and fix before release

---

## Phase 6 — Release

- Run release using:
  - scrum-master
  - product-owner-orchestrator
  - qa-release-reviewer

---

# Output Format

At each phase, provide:

### Phase
Current phase name

### Summary
What was produced

### Issues
Problems found

### Decision
Continue / Stop

---

# Final Output

At the end:

### Final Status
Completed / Blocked

### Delivered Scope
What was built

### Risks
Remaining risks

### Next Actions
Follow-ups after release