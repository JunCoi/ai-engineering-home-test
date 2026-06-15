# AI Engineering Home Test

This repository contains my submissions for the AI Engineering home test — a series of advanced TypeScript/Node.js challenges focused on insurance technology.

## Repository Structure

```
.
├── shared/                               # Shared domain types used across challenges
├── challenge-11-claim-assessment-agent/  # AI Challenge 11
├── challenge-12-regulatory-rule-engine/  # AI Challenge 12
├── challenge-13-partner-integration-sdk/ # AI Challenge 13 (+ mock server orchestrating Ch11/12/14)
├── challenge-14-workflow-orchestrator/   # AI Challenge 14
└── logical-questions/                    # Written answers
```

## Challenges

### Challenge 11 — Claim Assessment AI Agent

Located in `/challenge-11-claim-assessment-agent`.

A TypeScript AI agent that assesses insurance claims using four traceable tools: document verification, policy lookup, medical necessity check, and benefit calculation.

```bash
cd challenge-11-claim-assessment-agent
npm install
npm run assess     # run assessment on all seeded claims
npm run assess:one # assess a single claim interactively
npm test
```

### Challenge 12 — Regulatory Rule Engine

Located in `/challenge-12-regulatory-rule-engine`.

A configurable multi-country regulatory rule engine where country-specific insurance claim rules (document requirements, SLA checks, waiting periods, coverage mandates) are defined in YAML files rather than hardcoded logic. Supports rule diffing across countries and versioned configurations.

```bash
cd challenge-12-regulatory-rule-engine
npm install
npm run validate   # validate test claims
npm run rules      # list rules for a country
npm run diff       # diff rules between countries
npm test
```

### Challenge 13 — Partner Integration SDK

Located in `/challenge-13-partner-integration-sdk`.

A TypeScript SDK that insurance partners (hospitals, brokers, corporates) use to submit claims, upload documents, and track claim status — plus a mock API server to develop against locally.

Key features: client-side validation, automatic token refresh, exponential backoff retry for transient failures, typed errors, and progress tracking for document uploads.

```bash
cd challenge-13-partner-integration-sdk
npm install
npm run server      # start mock API on http://localhost:3000
npm run example:1   # simple claim submission
npm run example:2   # claim + document upload
npm run example:3   # status polling
npm test
```

### Challenge 14 — Workflow Orchestrator

Located in `/challenge-14-workflow-orchestrator`.

A YAML-driven state machine that models the full insurance claim lifecycle across 8 states and 9 transitions. Each transition enforces role-based authorisation, preconditions, and side effects (notifications, payment triggers, archiving). An immutable audit trail tracks every state change.

The Ch13 mock server integrates Ch14 automatically: every new claim is registered in the workflow engine and auto-advanced to `APPROVED`, `REJECTED`, or `PENDING_INFO` based on the Ch11 AI assessment result. Two new endpoints expose the workflow:

- `GET  /api/v1/claims/:id/workflow` — current state, audit trail, valid transitions
- `POST /api/v1/claims/:id/transition` — manually advance a claim (for human roles: finance, team lead, etc.)

```bash
cd challenge-14-workflow-orchestrator
npm install
npm run scenarios  # run 5 built-in workflow scenarios
npm run cli -- --help
npm test
```

### Logical Questions

Located in `/logical-questions/README.md`.

Written answers to the logical/reasoning questions provided as part of the home test.

## Shared Types

Common insurance domain types live in `/shared/src/types` and are imported by all challenge projects.

| Type | Values |
|---|---|
| `ClaimType` | `OUTPATIENT` \| `INPATIENT` \| `DENTAL` \| `SPECIALIST` |
| `DocumentType` | `MEDICAL_RECEIPT` \| `DIAGNOSIS_NOTE` \| `HOSPITAL_CERTIFICATE` \| … |
| `RuleType` | `DOCUMENT_REQUIREMENT` \| `SLA_CHECK` \| `WAITING_PERIOD` \| … |

Conventions: object properties use `camelCase`; enum-like string values use `SCREAMING_SNAKE_CASE`.

## Tech Stack

All challenges use **TypeScript + Node.js (ESM)** with `vitest` for testing and `tsx` for running TypeScript directly. Dependencies are minimal and chosen per-challenge based on what the task requires.