---
description: Run validation for a feature before release
argument-hint: <feature-or-scope>
---

Use the **master-orchestrator** to run the **Validation phase** for: **$ARGUMENTS**.

Follow this workflow:

1. Confirm that implementation exists.
2. Coordinate the correct validation agents:
   - test-engineer
   - qa-release-reviewer
   - security-red-team
   - financial-domain-expert if financial logic exists
   - data-architect if data integrity matters
   - integration-engineer if integrations exist
3. Validate:
   - acceptance criteria
   - critical flows
   - edge cases
   - regression risks
   - permission/security risks
   - data consistency risks
   - integration failure handling
4. Do not approve release if critical gaps remain.

Output format:

### Current Phase
Validation

### Agents Involved
List which agents were consulted and why.

### Validation Summary
Summarize what was checked.

### Issues Found
List issues, grouped by severity.

### Release Readiness
State whether the feature is ready, blocked, or conditionally ready.

### Required Fixes
List what must be fixed before release.

### Next Step
Recommend the correct next command.