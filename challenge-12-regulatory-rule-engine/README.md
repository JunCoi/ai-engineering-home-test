# Multi-Country Regulatory Rule Engine

A configurable regulatory rule engine for insurance claims. Country rules are stored in YAML config files, so adding a country does not require changing the engine code.

## Tech Stack

- Node.js
- TypeScript
- YAML config files
- Commander CLI
- Zod schema validation
- Vitest tests

## Install

```bash
npm install
```

## Run

Validate all test claims:

```bash
npm run validate
```

Validate one claim:

```bash
npm run dev -- validate --claims data/test-claims.json --claim-id TH-001
```

View rules:

```bash
npm run dev -- rules --country thailand
```

Compare country rules:

```bash
npm run dev -- diff --country-a thailand --country-b vietnam
```

Run tests:

```bash
npm test
```

## Rule Schema

Each country has one YAML file in `configs/`.

```yaml
country: Thailand
countryCode: thailand
rules:
  - ruleId: TH-DOC-001
    description: Medical receipt is required for all claims
    ruleType: DOCUMENT_REQUIREMENT
    effectiveDate: "2024-01-01"
    expiryDate:
    parameters:
      requiredDocuments: [MEDICAL_RECEIPT]
```

### Required rule fields

| Field | Meaning |
|---|---|
| `ruleId` | Unique rule identifier |
| `description` | Human-readable rule description |
| `ruleType` | One of the supported rule types |
| `effectiveDate` | Date when the rule starts applying |
| `expiryDate` | Optional date when the rule stops applying |
| `parameters` | Rule-specific values |

## Supported Rule Types

### `DOCUMENT_REQUIREMENT`

Checks that required documents are present.

Example:

```yaml
parameters:
  requiredDocuments: [MEDICAL_RECEIPT, DISCHARGE_SUMMARY]
  appliesTo:
    claimTypes: [INPATIENT]
```

### `SLA_CHECK`

Checks whether processing finished within allowed business days.

```yaml
parameters:
  maxBusinessDays: 15
```

### `WAITING_PERIOD`

Checks policy age against a required waiting period.

```yaml
parameters:
  minimumPolicyAgeDays: 120
  appliesTo:
    conditionTypes: [PRE_EXISTING]
```

### `DATA_MASKING`

Checks whether sensitive data is masked correctly in reports.

```yaml
parameters:
  field: nationalId
  reportContext: external
```

### `COVERAGE_MANDATE`

Checks whether mandatory coverage was respected.

```yaml
parameters:
  requiredCoverageLevel: SAME_AS_PHYSICAL
  appliesTo:
    treatmentTypes: [MENTAL_HEALTH]
```

## Adding a New Country

Create a new YAML file under `configs/`, for example:

```txt
configs/singapore.yaml
```

No TypeScript code change is required as long as the new file follows the schema and uses supported rule types.

A skeleton example is included at:

```txt
configs/singapore.skeleton.yaml
```

## Rule Versioning

The engine filters rules by the claim `submissionDate`.

A rule applies only when:

```txt
effectiveDate <= submissionDate <= expiryDate
```

If `expiryDate` is empty, the rule remains active after `effectiveDate`.

## Output Status

Each rule returns:

- `PASS`
- `FAIL`
- `NOT_APPLICABLE`

Overall claim status is:

- `COMPLIANT`
- `PARTIALLY_COMPLIANT`
- `NON_COMPLIANT`

## AI Tool Usage

I used AI coding tools to decompose the problem into rule schema, handlers, config loading, CLI commands, tests, and documentation. The country-specific regulatory logic is intentionally kept in YAML configuration, while the TypeScript code only implements generic rule behavior.


## Shared type conventions

This challenge imports common domain types from `../shared/src/types`. TypeScript properties use camelCase and enum-like values use uppercase strings, for example `claimType: "OUTPATIENT"` and `expectedType: "MEDICAL_RECEIPT"`.
