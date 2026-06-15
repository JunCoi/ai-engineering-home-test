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
npm run dev -- validate --claims data/test-claims.json --claim-id VN-001
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
country_code: thailand
rules:
  - rule_id: TH-DOC-001
    description: Medical receipt is required for all claims
    rule_type: document_requirement
    effective_date: "2024-01-01"
    expiry_date:
    parameters:
      required_documents: [medical_receipt]
```

### Required rule fields

| Field | Meaning |
|---|---|
| `rule_id` | Unique rule identifier |
| `description` | Human-readable rule description |
| `rule_type` | One of the supported rule types |
| `effective_date` | Date when the rule starts applying |
| `expiry_date` | Optional date when the rule stops applying |
| `parameters` | Rule-specific values |

## Supported Rule Types

### `document_requirement`

Checks that required documents are present.

Example:

```yaml
parameters:
  required_documents: [medical_receipt, discharge_summary]
  applies_to:
    claim_types: [inpatient]
```

### `sla_check`

Checks whether processing finished within allowed business days.

```yaml
parameters:
  max_business_days: 15
```

### `waiting_period`

Checks policy age against a required waiting period.

```yaml
parameters:
  minimum_policy_age_days: 120
  applies_to:
    condition_types: [pre_existing]
```

### `data_masking`

Checks whether sensitive data is masked correctly in reports.

```yaml
parameters:
  field: national_id
  report_context: external
```

### `coverage_mandate`

Checks whether mandatory coverage was respected.

```yaml
parameters:
  required_coverage_level: same_as_physical
  applies_to:
    treatment_types: [mental_health]
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

The engine filters rules by the claim `submission_date`.

A rule applies only when:

```txt
effective_date <= submission_date <= expiry_date
```

If `expiry_date` is empty, the rule remains active after `effective_date`.

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
