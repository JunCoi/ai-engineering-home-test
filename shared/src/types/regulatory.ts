export type RuleType =
  | "DOCUMENT_REQUIREMENT"
  | "SLA_CHECK"
  | "WAITING_PERIOD"
  | "DATA_MASKING"
  | "COVERAGE_MANDATE";

export type RuleResultStatus = "PASS" | "FAIL" | "NOT_APPLICABLE";
export type OverallComplianceStatus = "COMPLIANT" | "NON_COMPLIANT" | "PARTIALLY_COMPLIANT";
