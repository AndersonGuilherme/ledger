## AI Team Operating Model

- The primary entry point is `product-owner-orchestrator`
- No feature should be implemented without:
  - clear scope
  - defined acceptance criteria
  - design validation (if UI involved)
- Financial logic must always involve:
  - backend-nestjs-lead
  - data-architect
- Security review is mandatory for:
  - authentication
  - financial operations
  - data exposure
- QA must validate before considering any feature complete

## Delegation Rules

- UI → must involve `design-lead` before `frontend-nextjs-lead`
- Database/schema → must involve `data-architect`
- External integrations → must involve `integration-engineer`
- Refactoring → must involve `dx-developer-experience`

## Definition of Done

A feature is only complete when:

- matches acceptance criteria
- has no critical security issues
- is consistent with domain rules
- is validated by QA
