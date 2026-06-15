# AI Challenge 11 — Claim Assessment AI Agent

This project implements a claim assessment agent for insurance claims using TypeScript.

The challenge asks for a conversational AI agent that can assess claims by calling tools for document verification, policy lookup, medical necessity checking, and benefit calculation. The report must be structured, traceable, and cite policy clauses.

## Why this design

For an insurance workflow, I chose a deterministic agent orchestration instead of a fully autonomous LLM loop. This keeps the assessment auditable and predictable:

```txt
Claim
  ↓
verifyDocument() for every submitted document
  ↓
lookupPolicy()
  ↓
checkMedicalNecessity()
  ↓
calculateBenefit()
  ↓
Structured assessment report + tool call logs
```

An LLM can be added later to turn the structured JSON into a conversational explanation, but the claim decision itself should stay traceable and policy-grounded.

## Tech Stack

- Node.js
- TypeScript
- Commander CLI
- Vitest
- date-fns

## Setup

```bash
npm install
```

## Run all assessments

```bash
npm run assess
```

This writes reports and tool logs into:

```txt
outputs/
```

## Run one claim

```bash
npm run assess:one -- --claim-id CLM-1001
```

## Run tests

```bash
npm test
```

## Test Cases

| Claim | Scenario | Expected Outcome |
|---|---|---|
| CLM-1001 | Straightforward outpatient claim with complete documents | APPROVE |
| CLM-2001 | Excluded cosmetic treatment and amount exceeds remaining limit | REJECT |
| CLM-3001 | Specialist claim with wrong document type instead of referral letter | REQUEST_MORE_INFO |

## Tool Design

### `lookupPolicy(policyId)`
Returns policy terms including benefits, limits, exclusions, copay, waiting periods, and policy clauses.

### `calculateBenefit(policyId, claimType, amount)`
Calculates covered amount, copay, member responsibility, remaining limit, and whether the claim exceeds the benefit limit.

### `verifyDocument(documentId)`
Checks submitted document type, completeness, and issues. The agent calls this for every submitted document.

### `checkMedicalNecessity(diagnosis, procedures)`
Checks whether the submitted procedures are clinically appropriate for the diagnosis.

## Agent Behavior

The agent follows the required tool sequence:

```txt
verify documents → lookup policy → check medical necessity → calculate benefits
```

It also enforces these rules:

- It checks all submitted documents.
- It verifies policy coverage period.
- It verifies member and claim type coverage.
- It does not approve over benefit limit.
- It requests more information when required documents are missing, incomplete, or wrong type.
- It cites specific policy clauses in the recommendation.
- It logs every tool call with input and output.

## System Prompt Summary

The system prompt is stored in:

```txt
src/agent/systemPrompt.ts
```

Main instructions:

- Do not invent policy terms.
- Always rely on `lookupPolicy`.
- Use the required tool order.
- Check every submitted document.
- Request more information for missing or incomplete documents.
- Cite specific policy clause IDs for recommendation reasoning.

## Output Shape

Each report contains:

```txt
Document Review
Policy Verification
Medical Necessity
Benefit Calculation
Recommendation
Policy Citations
Tool Call Logs
```

Example recommendation:

```json
{
  "claimId": "CLM-1001",
  "recommendation": "APPROVE",
  "policyCitations": ["POL-1001-C1", "POL-1001-C3", "POL-1001-C2"]
}
```

## Estimated Timeline

Estimated time: 6–8 hours

| Task | Estimate |
|---|---:|
| Requirement breakdown and agent flow design | 1 hour |
| Test claims, policy data, and document data | 1.5 hours |
| Tool implementation | 2 hours |
| Agent orchestration and report generation | 1.5 hours |
| Tests, output logs, and README | 1–2 hours |

## AI Assistance Notes

AI coding tools were used to help decompose the requirement, design the project structure, generate draft code, and prepare documentation. Final design decisions, review, and validation were performed by the author.
