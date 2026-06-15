# AI Engineering Home Test

This repository contains my submission for the AI Engineering home test.

## Structure

```txt
.
├── challenge-12-regulatory-rule-engine/   # AI Challenge 12 implementation
└── logical-questions/        # Written answers for logical questions
```

## Why TypeScript / Node.js

I chose Node.js with TypeScript because the role focuses on full-stack TypeScript development and insurance technology. The challenge also benefits from strongly typed configuration schemas, CLI tooling, and testable business-rule handlers.

## Folders

### `logical-questions`

Located in `/logical-questions/README.md`.

Written answers to the logical questions provided as part of the home test.

### `regulatory-rule-engine`

Located in `/challenge-12-regulatory-rule-engine`.

A configurable multi-country regulatory rule engine where country-specific insurance claim rules are defined in YAML configuration files, not hardcoded in application logic.

## Challenge 11 - Claim Assessment AI Agent

Located in `/challenge-11-claim-assessment-agent`.

This challenge implements a TypeScript claim assessment agent with four traceable tools: document verification, policy lookup, medical necessity check, and benefit calculation.

## Shared Types

Common insurance/domain types live in `/shared/src/types`. Challenge projects import from this folder so values stay consistent across the repo.

Conventions:

- Object properties use camelCase, for example `claimId`, `claimType`, `ruleType`.
- Enum-like values use uppercase strings, for example `OUTPATIENT`, `MEDICAL_RECEIPT`, `DOCUMENT_REQUIREMENT`.