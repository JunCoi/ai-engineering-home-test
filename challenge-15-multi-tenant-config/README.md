# Challenge 15 — Multi-Tenant Configuration Platform

A full-stack admin platform for per-tenant claim processing configuration. Each insurance company (tenant) defines its own claim types, approval tiers, notification channels, SLA targets, and custom fields — all via a UI, with zero code changes required to onboard a new tenant.

**Live demo:** _add your Railway URL here_

## Architecture

```
src/
├── constants.ts          # Shared API base path (API_BASE = '/api/v1')
├── server/index.ts       # Express API server (port 3015)
├── storage/tenantStore.ts  # Append-only JSON store with version history
├── runtime/processClaim.ts # Pure processClaim() + diffConfigs() functions
└── types/tenant.ts       # Shared TypeScript types
client/src/
├── pages/
│   ├── TenantList.tsx    # Dashboard — list all tenants
│   ├── TenantForm.tsx    # Create / edit tenant config
│   ├── Preview.tsx       # Preview claim processing for a tenant
│   ├── Diff.tsx          # Side-by-side config comparison table
│   └── History.tsx       # Version history + rollback
├── api/index.ts          # Typed API client (uses shared API_BASE)
└── types.ts              # Client-side type re-exports
seed/seed.ts              # Idempotent seed script (3 default tenants)
data/tenants.json         # Runtime data store (gitignored)
tests/                    # Vitest test suite
```

## Features

### Admin UI
- **CRUD** — create, edit, delete tenant configurations with full form validation
- **Preview mode** — enter a sample claim and see exactly how it would be processed (approval tier, required documents, notifications, SLA deadline, custom field validation)
- **Config diff** — compare any two tenants in a 3-column table (Field / Tenant A / Tenant B) with human-readable field labels
- **Version history** — every save creates a new version; rollback to any previous version in one click

### Runtime
- `processClaim(tenant, input)` — pure function that returns required documents, approval routing, notifications to send, SLA deadline, and custom field validation
- Same claim submitted to different tenants produces different results

### API (versioned at `/api/v1`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/tenants` | List all tenants |
| POST | `/api/v1/tenants` | Create tenant |
| GET | `/api/v1/tenants/:id` | Get current config |
| PUT | `/api/v1/tenants/:id` | Update config (creates new version) |
| DELETE | `/api/v1/tenants/:id` | Delete tenant |
| GET | `/api/v1/tenants/:id/history` | Version history |
| POST | `/api/v1/tenants/:id/rollback/:version` | Rollback to version |
| POST | `/api/v1/tenants/:id/preview` | Preview claim processing |
| GET | `/api/v1/diff?a=:id&b=:id` | Compare two tenant configs |
| POST | `/api/v1/process` | Process a claim for a tenant |

## Getting Started

```bash
npm install
npm run dev        # starts API server (port 3015) + Vite client (port 5173)
npm test           # run test suite (12 tests)
```

## Seeded Tenants

Three tenants are created automatically on first start:

| Tenant | Type | Auto-approve | Claim Types | SLA |
|--------|------|-------------|-------------|-----|
| SafeGuard Insurance | Corporate | 20,000 | OUTPATIENT, INPATIENT, DENTAL | 5–10 days |
| HealthFirst | Retail | 5,000 | All 5 types | 7 days |
| GovHealth | Government | 0 (all manual) | OUTPATIENT, INPATIENT | 15 days |

## Adding a 4th Tenant (Zero Code Changes)

1. Open the admin UI
2. Click **New Tenant**
3. Fill out the configuration form
4. Save — the new tenant is immediately available via the API and UI

No code changes, no redeploys required.

## Deployment

Deployed on Railway. The Express server serves the built React client from `dist/` in production.

```bash
npm run build   # builds client to dist/
npm start       # seeds + starts server
```

Railway config: `railway.json` forces Nixpacks builder; `nixpacks.toml` defines the build pipeline.
