---
description: Evaluate whether a feature is ready for release
argument-hint: <feature-or-scope>
---

Use the **master-orchestrator** to run the **Release phase** for: **$ARGUMENTS**.

Follow this workflow:

1. Confirm that validation has already happened.
2. Coordinate:
   - scrum-master
   - product-owner-orchestrator
   - qa-release-reviewer
   - tech-lead if final technical approval is needed
3. Check:
   - acceptance criteria completion
   - unresolved bugs
   - unresolved security issues
   - unresolved financial/data risks
   - testing/QA status
   - scope completion
4. If the feature is not truly ready, do not force release.
5. Produce a clear release decision.

Output format:

### Current Phase
Release

### Agents Involved
List which agents were consulted and why.

### Release Checklist
Show what was verified.

### Known Risks
List remaining non-blocking risks.

### Release Decision
Approve / Block / Conditional

### Follow-up Work
List anything that should happen after release.