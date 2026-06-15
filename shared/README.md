# Shared Types

This folder contains shared domain types used by multiple AI engineering challenges.

Conventions:

- TypeScript property names use `camelCase`.
- Enum-like string values use `UPPER_SNAKE_CASE`.
- Challenge folders should import these types instead of redefining common insurance concepts.

Examples:

```ts
claim.claimType === "OUTPATIENT"
document.expectedType === "MEDICAL_RECEIPT"
rule.ruleType === "DOCUMENT_REQUIREMENT"
```
