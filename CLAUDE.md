# CLAUDE.md — AI Engineering Home Test

Project context for AI coding assistants. Read this before touching any code.

## What this repo is

A series of TypeScript/Node.js challenges for an insurance platform home test. Challenges 11–14 are implemented and form a connected pipeline. Challenge 15 is next.

---

## Monorepo layout

```
.
├── shared/                               # Shared domain types (ClaimType, DocumentType, …)
├── challenge-11-claim-assessment-agent/  # AI assessment agent (Ch11)
├── challenge-12-regulatory-rule-engine/  # Regulatory rule engine (Ch12)
├── challenge-13-partner-integration-sdk/ # Partner SDK + mock API server (Ch13)
├── challenge-14-workflow-orchestrator/   # Claim workflow state machine (Ch14)
├── challenges/                           # Original challenge spec files (read-only)
└── logical-questions/                    # Written answers
```

Each challenge is an independent npm package with its own `package.json`, `tsconfig.json`, and `tests/`. There is no root-level `package.json` or workspace config.

---

## Tech conventions (apply everywhere)

- **TypeScript ESM** — all packages use `"type": "module"`, `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`
- **Import extensions** — `.js` extensions are required on all imports (e.g. `import { Foo } from './foo.js'`) even though the source files are `.ts`
- **Cross-project imports** — `rootDir: ".."` in each `tsconfig.json` allows importing sibling projects. The `include` array lists every sibling `src` folder that is needed.
- **Config paths** — computed at runtime using `import.meta.url → fileURLToPath → dirname → resolve(...)`. Never use `process.cwd()` for config paths — it breaks cross-project imports.
- **Testing** — `vitest` everywhere. Run `npm test` inside any challenge directory.
- **No root scripts** — always `cd` into the specific challenge before running commands.

---

## Implemented challenges

### Challenge 11 — Claim Assessment Agent (`/challenge-11-claim-assessment-agent`)

Four-tool AI agent: document verification → policy lookup → medical necessity check → benefit calculation.

- Entry point: `src/agent/claimAssessmentAgent.ts` — `ClaimAssessmentAgent.assess(input)`
- CLI: `npm run assess` (all seeded claims) / `npm run assess:one`
- Seeded policies: `POL-1001`, `POL-2001`, `POL-3001`

**Gotcha:** `lookupPolicy` throws for unknown policy IDs — callers must catch.

### Challenge 12 — Regulatory Rule Engine (`/challenge-12-regulatory-rule-engine`)

YAML-driven per-country rule engine (document requirements, SLA, waiting periods, coverage mandates).

- Entry point: `src/engine/RuleEngine.ts` — `new RuleEngine(configDir?)`
- Config YAML lives in `configs/` (one file per country code)
- `configDir` is optional; defaults to `path.resolve(process.cwd(), 'configs')` but **must** be passed explicitly when the engine is instantiated from another project
- CLI: `npm run validate` / `npm run rules` / `npm run diff`

**Gotcha (fixed):** `src/types/claim.ts` needs both `import type { X }` AND `export type { X }` — a re-export alone does not bind names in scope.

**Gotcha (fixed):** `Array.includes` strict typing — use `(arr as string[]).includes(val)` for YAML-sourced string values compared against a TS union.

### Challenge 13 — Partner Integration SDK (`/challenge-13-partner-integration-sdk`)

TypeScript SDK for insurance partners + a mock Express API server that orchestrates the full pipeline.

**SDK** (`src/sdk/`):
- `InsuranceSDK` — constructor validates `apiKey` (`pk_test_*` / `pk_live_*`), resolves `baseUrl`
- `AuthManager` — JWT token with 60 s expiry buffer, deduplicates concurrent refresh via single in-flight promise
- `HttpClient` — exponential backoff (`500 ms × 2^(attempt−1) + jitter`), auto token-refresh on 401 (once), no retry on 4xx except 503
- `claims.create()` — client-side validation before any network call
- `documents.upload()` — accepts file path (string) or `UploadFile` object; uses `new Blob([new Uint8Array(buf)])` to fix Buffer → BlobPart typing

**Mock server** (`src/server/`):
- `index.ts` — Express app on port 3000; simulates 10 % 503 failures and 200–500 ms latency
- `pipeline.ts` — integration hub: imports Ch11, Ch12, Ch14; exports `workflowEngine`
- Start: `npm run server`

**Pipeline fields** — if `memberId` or `countryCode` are present on a claim, `POST /api/v1/claims` runs the full Ch11 + Ch12 + Ch14 pipeline automatically.

**Workflow endpoints** (added when Ch14 was integrated):
- `GET  /api/v1/claims/:id/workflow` — current state, audit trail, valid transitions
- `POST /api/v1/claims/:id/transition` — manually advance (for human roles)

**Gotcha:** `Buffer` is not a valid `BlobPart` in strict TS — always wrap with `new Uint8Array(buf)` before passing to `new Blob([...])`.

### Challenge 14 — Workflow Orchestrator (`/challenge-14-workflow-orchestrator`)

YAML-driven state machine for the full claim lifecycle.

- **8 states:** `SUBMITTED → DOCUMENTS_VERIFIED → UNDER_ASSESSMENT → (APPROVED | REJECTED | PENDING_INFO) → PAYMENT_INITIATED / CLOSED`
- **9 transitions** — each with `authorizedRoles`, `preconditions`, and `sideEffects` defined in `configs/workflow.yaml`
- Entry point: `src/engine/WorkflowEngine.ts`
  - `createClaim(id)` — registers claim at `SUBMITTED`
  - `transition(id, toState, context)` — validates role, preconditions, cycle limit; records frozen audit entry
  - `getAuditTrail(id)` — returns immutable entries
  - `getValidTransitions(id)` — returns available transitions from current state
- Cycle detection: `UNDER_ASSESSMENT → PENDING_INFO` is capped at **3 loops**; the 4th throws `MAX_CYCLES_EXCEEDED`
- All `AuditEntry` objects are `Object.freeze()`-d — mutation throws in strict mode
- CLI: `npm run cli -- --help`
- Scenarios: `npm run scenarios`

**Integration with Ch13:** `pipeline.ts` creates one shared `WorkflowEngine` instance. On every `POST /api/v1/claims`, `initializeClaimWorkflow(claimId, assessment)` auto-advances the workflow:
- Always advances to `DOCUMENTS_VERIFIED` (system as `document_clerk`)
- If assessment present: advances to `UNDER_ASSESSMENT` (system as `team_lead`)
- Then to `APPROVED` / `REJECTED` / `PENDING_INFO` based on Ch11 recommendation (system as `assessor`)

---

## Challenge 15 — Multi-Tenant Configuration Platform (NOT YET STARTED)

See `challenges/AI_Challenge_15.md`.

Admin UI + runtime for per-tenant claim processing config. Tenants define: enabled claim types, approval tiers, notification channels, SLA targets, custom fields. Same claim submitted to different tenants produces different behavior. Requires a live deployment URL.

Key deliverables:
- CRUD admin UI with config diff, preview mode, and version history/rollback
- `processClaim(tenantId, claimData)` runtime function
- 3 seeded tenants (SafeGuard, HealthFirst, GovHealth) + 4th added via UI (zero code changes)

---

## Standing instructions

- After implementing any new challenge: **update root `README.md`** AND **add a test job to `.github/workflows/test.yml`**
- Always `cd` into the challenge directory before running `npm` commands
- Pass `configDir` explicitly whenever instantiating `RuleEngine` or `loadWorkflowConfig` from outside their own package
- Use `.js` extensions on all imports, even for `.ts` source files
