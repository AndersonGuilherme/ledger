---
description: Execute the build phase for a feature that already has discovery, architecture, and plan
argument-hint: <feature-or-scope>
---

Use the **master-orchestrator** to run the **Build phase** for: **$ARGUMENTS**.

Rules:

1. Confirm that discovery, architecture, and planning already exist.
2. If any prerequisite is missing, stop and say exactly what is missing.
3. Coordinate the correct implementation agents based on the scope:
   - backend-nestjs-lead
   - frontend-nextjs-lead
   - data-architect
   - design-lead
   - integration-engineer
   - automation-agent
   - dx-developer-experience
   - analytics-engineer if instrumentation is needed
   - financial-domain-expert if financial logic is involved
4. Enforce the correct order:
   - data/backend before frontend where contracts are required
   - design before UI-heavy implementation
   - integration review before external-system logic
5. Implement in controlled increments instead of a chaotic all-at-once approach.
6. Explicitly state what was built, what remains, and what must be validated next.

Output format:

### Current Phase
Build

### Agents Involved
List which agents were consulted and why.

### Build Scope
State what is being implemented now.

### Implementation Order
Show the build order.

### Progress / Deliverables
State what was created or changed.

### Remaining Work
List what still needs to be done.

### Next Step
Recommend the correct next command.