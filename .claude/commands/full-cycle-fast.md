---
description: Run the full workflow in fast mode with lighter gates and pragmatic execution
argument-hint: <feature-or-scope>
---

Use the **master-orchestrator** to execute the FULL workflow in **FAST mode** for: **$ARGUMENTS**.

This mode is appropriate for:
- low-risk features
- clear UI improvements
- non-critical CRUD work
- internal tools
- small enhancements
- implementation tasks with already-known patterns

You still follow the full workflow conceptually:

DISCOVERY → ARCHITECTURE → PLANNING → BUILD → VALIDATION → RELEASE

But phases may be lighter and more compact when risk is low.

---

# Fast Mode Rules

1. Do not skip essential reasoning
2. Keep outputs compact when risk is low
3. Combine light phases only when safe
4. Stop if hidden complexity appears
5. Escalate to SAFE mode if:
   - money is involved
   - permissions/auth are involved
   - data model changes are involved
   - integrations/webhooks are involved
   - security risk is non-trivial

---

# Phase Strategy

## Phase 1 — Lightweight Discovery

Coordinate:
- product-analyst
- product-owner-orchestrator

Required outputs:
- problem
- objective
- scope
- acceptance criteria

Keep this concise.
If the problem is still unclear:
→ STOP and recommend /full-cycle-safe

---

## Phase 2 — Lightweight Architecture

Coordinate:
- tech-lead
- backend-nestjs-lead and/or frontend-nextjs-lead as needed
- design-lead if UI is important

Required outputs:
- implementation direction
- module/component/service boundaries
- main risks

If data model, money, or integration complexity appears:
→ STOP and recommend /full-cycle-safe

---

## Phase 3 — Compact Planning

Coordinate:
- scrum-master
- tech-lead

Required outputs:
- short task list
- execution order
- known blockers

Keep tasks practical and small.

---

## Phase 4 — Build

Coordinate as needed:
- backend-nestjs-lead
- frontend-nextjs-lead
- design-lead
- dx-developer-experience
- automation-agent

Focus on:
- fast execution
- clear implementation
- no unnecessary ceremony

If complexity grows during implementation:
→ STOP and recommend /full-cycle-safe

---

## Phase 5 — Lightweight Validation

Coordinate:
- test-engineer
- qa-release-reviewer

Also involve:
- security-red-team if risk appears
- data-architect if data behavior became important

Required outputs:
- acceptance criteria validation
- major regression checks
- known issues

Critical issues still block release.

---

## Phase 6 — Release

Coordinate:
- scrum-master
- qa-release-reviewer
- product-owner-orchestrator when needed

Required outputs:
- release recommendation
- known risks
- follow-ups

---

# Escalation Rule

If any of the following appears at any point, stop FAST mode and recommend SAFE mode:

- authentication
- authorization
- financial logic
- money movement
- data model changes
- complex persistence
- multi-tenant risk
- external integrations
- webhook/retry/idempotency concerns
- unclear requirements

---

# Output Format

For each phase, provide:

### Phase
Current phase

### Summary
Short summary of what was produced

### Risks
Any meaningful risks

### Decision
Continue / Escalate to SAFE / Block

---

# Final Output

### Final Status
Completed / Escalated / Blocked

### Delivered Scope
What is ready

### Known Risks
What remains

### Recommended Next Action
What should happen next