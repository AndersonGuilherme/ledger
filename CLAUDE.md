# Modelo Operacional do Time de IA — Ledger

## Ponto de Entrada

O agente principal é o `product-owner-orchestrator`.

Nenhuma feature deve ser implementada sem:
- escopo claramente definido
- critérios de aceite explícitos
- validação de design (se houver UI)

---

## Regras de Delegação

| Domínio | Agentes obrigatórios |
|---|---|
| UI/UX | `design-lead` antes de `frontend-nextjs-lead` |
| Banco de dados / schema | `data-architect` |
| Integrações externas | `integration-engineer` |
| Refatoração | `dx-developer-experience` |
| Lógica financeira | `financial-domain-expert` + `data-architect` + `backend-nestjs-lead` |
| Autenticação / autorização | `security-red-team` |
| Exposição de dados sensíveis | `security-red-team` |

---

## Fluxo Obrigatório

```
DISCOVERY → ARQUITETURA → PLANEJAMENTO → BUILD → VALIDAÇÃO → RELEASE
```

Nenhuma fase pode ser pulada.

---

## Definição de Pronto

Uma feature só está completa quando:

- [ ] Atende a todos os critérios de aceite definidos
- [ ] Não possui problemas críticos de segurança
- [ ] É consistente com as regras de domínio do Ledger
- [ ] Foi validada pelo QA
- [ ] Passou por revisão de segurança (quando aplicável)
- [ ] Passou por validação financeira (quando aplicável)
