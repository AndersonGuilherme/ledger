---
description: Run the full workflow with maximum discipline, validation, and safety gates
argument-hint: <feature-or-scope>
---

Use the **master-orchestrator** to execute the FULL workflow in **SAFE mode** for: **$ARGUMENTS**.

This mode is mandatory for:
- financial features
- authentication and authorization
- permissions / roles
- data model changes
- multi-tenant features
- external integrations
- anything that can break trust, money, security, or system integrity

You must follow ALL phases strictly:

DISCOVERY → ARCHITECTURE → PLANNING → BUILD → VALIDATION → RELEASE

---

# Safe Mode Rules

1. Never skip any phase
2. Never merge phases
3. Stop immediately if prerequisites are missing
4. Require specialist validation where relevant
5. Do not allow release if critical issues remain
6. Prefer correctness and consistency over speed

---

# Phase 1 — Discovery

Coordinate:
- product-analyst
- product-owner-orchestrator
- financial-domain-expert if money or balances are involved
- analytics-engineer if events, metrics, funnels, or reporting are relevant

Required outputs:
- problem
- objective
- scope
- out of scope
- user flows
- business rules
- edge cases
- acceptance criteria
- open decisions

If discovery is incomplete:
→ STOP

---

# Phase 2 — Architecture

Coordinate:
- tech-lead
- data-architect
- backend-nestjs-lead
- frontend-nextjs-lead
- design-lead if UI matters
- integration-engineer if external services exist
- financial-domain-expert if financial logic exists
- dx-developer-experience if structure/tooling matters

Required outputs:
- architecture decisions
- data model decisions
- API/contract strategy
- backend/frontend responsibilities
- technical risks
- sequencing constraints

If architecture is incomplete or inconsistent:
→ STOP

---

# Phase 3 — Planning

Coordinate:
- scrum-master
- product-owner-orchestrator
- tech-lead

Required outputs:
- task breakdown
- dependencies
- blockers
- execution order
- validation checkpoints
- release prerequisites

If tasks are too large, vague, or unordered:
→ STOP

---

# Phase 4 — Build

Coordinate as needed:
- backend-nestjs-lead
- frontend-nextjs-lead
- data-architect
- design-lead
- integration-engineer
- automation-agent
- dx-developer-experience
- analytics-engineer
- financial-domain-expert

Rules:
- backend/data before frontend where contracts are needed
- design before UI-heavy implementation
- integration review before external-system logic
- build in controlled increments, not blindly all at once

Required outputs:
- implementation summary
- files/modules/components/services created or changed
- remaining implementation gaps
- risks introduced by implementation

If build is partial or inconsistent:
→ STOP before validation

---

# Phase 5 — Validation

Coordinate:
- test-engineer
- qa-release-reviewer
- security-red-team
- financial-domain-expert if financial
- data-architect if integrity matters
- integration-engineer if integrations exist

Required outputs:
- test validation
- QA validation
- security findings
- integrity checks
- release readiness summary

If critical issues exist:
→ STOP and block release

---

# Phase 6 — Release

Coordinate:
- scrum-master
- product-owner-orchestrator
- qa-release-reviewer
- tech-lead if needed for final approval

Required outputs:
- release checklist
- release decision
- known risks
- follow-up items

If release is not safe:
→ BLOCK

---

# Output Format

For each phase, provide:

### Phase
Current phase

### Agents Involved
Which agents were used and why

### Outputs
What was produced

### Issues / Risks
What is wrong, missing, or risky

### Decision
Continue / Stop / Block

---

# Final Output

### Final Status
Completed / Blocked

### Delivered Scope
What is ready

### Blocking Issues
What prevented completion, if any

### Remaining Risks
Any non-blocking risks

### Recommended Next Action
What should happen next