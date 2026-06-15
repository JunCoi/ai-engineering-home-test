export type RuleType =
  | 'document_requirement'
  | 'sla_check'
  | 'waiting_period'
  | 'data_masking'
  | 'coverage_mandate';

export type Rule = {
  rule_id: string;
  description: string;
  rule_type: RuleType;
  effective_date: string;
  expiry_date?: string;
  parameters: Record<string, unknown>;
};

export type CountryConfig = {
  country: string;
  country_code: string;
  rules: Rule[];
};

export type RuleResult = {
  rule_id: string;
  rule_type: RuleType;
  status: 'PASS' | 'FAIL' | 'NOT_APPLICABLE';
  message: string;
  remediation?: string;
};

export type OverallStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIALLY_COMPLIANT';
