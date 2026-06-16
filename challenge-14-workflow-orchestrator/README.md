# Challenge 14 — Claims Workflow Orchestrator

A YAML-driven state machine engine that orchestrates the full claim lifecycle with role-based authorization, precondition enforcement, side effects, cycle detection, and an immutable audit trail.

## Architecture

```
src/
├── cli.ts                  # CLI entry point (commander)
├── config/                 # YAML config loader + Zod validation
├── engine/
│   ├── WorkflowEngine.ts   # Core state machine — createClaim, transition, getAuditTrail
│   ├── AuditTrail.ts       # Immutable audit log (Object.freeze)
│   ├── preconditions.ts    # Precondition evaluators per transition
│   └── sideEffects.ts      # Side effect handlers (console-mocked)
├── scenarios/              # 5 runnable test scenarios
└── types/                  # Shared TypeScript types
configs/
└── workflow.yaml           # Full state machine definition (states + transitions)
tests/                      # Vitest test suite (≥ 15 tests)
```

## State Machine

8 states, 9 transitions — all defined in `configs/workflow.yaml`, not in application code.

```
SUBMITTED
  └─► DOCUMENTS_VERIFIED       (document_clerk)
        └─► UNDER_ASSESSMENT   (team_lead)
              ├─► APPROVED     (assessor) ──► PAYMENT_INITIATED ──► CLOSED
              ├─► REJECTED     (assessor) ──► CLOSED
              └─► PENDING_INFO (assessor) ──► DOCUMENTS_VERIFIED  (loops ≤ 3×)
```

Each transition enforces:
- **Authorized roles** — wrong role throws `UNAUTHORIZED`
- **Preconditions** — missing context throws `PRECONDITION_FAILED`
- **Cycle limit** — `UNDER_ASSESSMENT → PENDING_INFO` capped at 3 loops; 4th throws `MAX_CYCLES_EXCEEDED`

## Getting Started

```bash
npm install
npm test          # run full test suite
npm run scenarios # run all 5 demo scenarios
npm run dev -- --help  # CLI
```

## CLI Usage

```bash
# View current state and valid transitions
npm run dev -- status --claim CLM-001

# Advance a claim
npm run dev -- transition --claim CLM-001 --to DOCUMENTS_VERIFIED --role document_clerk --user u1

# View audit trail
npm run dev -- audit --claim CLM-001
```

## Scenarios

Run `npm run scenarios` to execute all 5:

| # | Scenario | Result |
|---|----------|--------|
| 1 | Happy path: full lifecycle to CLOSED | ✓ passes |
| 2 | Rejection path | ✓ passes |
| 3 | Info request loop (PENDING_INFO × 2) | ✓ passes |
| 4 | Invalid transition (SUBMITTED → APPROVED) | ✓ rejected with clear error |
| 5 | Unauthorized role attempt | ✓ rejected |

## Extending the State Machine

Adding a new state or transition requires **only a `configs/workflow.yaml` change** — no application code changes:

```yaml
transitions:
  - from: APPROVED
    to: ON_HOLD
    authorizedRoles: [director]
    preconditions: [fraud_flag_present]
    sideEffects: [notify_fraud_team]
```

## Integration with Challenge 13

The workflow engine is imported by the Challenge 13 mock server (`pipeline.ts`). On every `POST /api/v1/claims`, the pipeline auto-advances the workflow:

1. `SUBMITTED → DOCUMENTS_VERIFIED` (system as `document_clerk`)
2. `DOCUMENTS_VERIFIED → UNDER_ASSESSMENT` (system as `team_lead`)
3. `UNDER_ASSESSMENT → APPROVED / REJECTED / PENDING_INFO` (system as `assessor`, based on Ch11 AI assessment)

Manual transitions are available via:
- `GET  /api/v1/claims/:id/workflow`
- `POST /api/v1/claims/:id/transition`
