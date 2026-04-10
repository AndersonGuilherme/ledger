---
description: Run the architecture phase for a feature, module, or initiative
argument-hint: <feature-or-scope>
---

Use the **master-orchestrator** to run the **Architecture phase** for: **$ARGUMENTS**.

Follow this workflow:

1. Confirm that discovery already exists. If it does not, stop and explain that discovery is missing.
2. Coordinate the correct architecture agents:
   - tech-lead
   - data-architect when data model, schema, integrity, indexing, or query shape matter
   - backend-nestjs-lead for backend architecture and API boundaries
   - frontend-nextjs-lead for frontend architecture, rendering strategy, and state flow
   - design-lead when UI structure or design system implications matter
   - financial-domain-expert if the feature touches money or financial state
   - integration-engineer if external services or webhooks are involved
   - dx-developer-experience if repo/tooling/workspace decisions are relevant
3. Produce an architecture outcome with:
   - technical decisions
   - module boundaries
   - frontend/backend responsibilities
   - data model implications
   - API and contract strategy
   - risks and trade-offs
   - implementation sequencing constraints
4. Do **not** implement code yet.

Output format:

### Current Phase
Architecture

### Agents Involved
List which agents were consulted and why.

### Architecture Decisions
Provide the consolidated architecture.

### Risks / Trade-offs
List risks and important trade-offs.

### Missing Pieces
List anything still undefined.

### Next Step
Recommend the correct next command.