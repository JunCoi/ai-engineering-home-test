import type { OverallComplianceStatus, RuleResultStatus, RuleType } from '../../../shared/src/types/index.js';

export type { RuleType, RuleResultStatus, OverallComplianceStatus } from '../../../shared/src/types/index.js';

export type Rule = {
  ruleId: string;
  description: string;
  ruleType: RuleType;
  effectiveDate: string;
  expiryDate?: string;
  parameters: Record<string, unknown>;
};

export type CountryConfig = {
  country: string;
  countryCode: string;
  rules: Rule[];
};

export type RuleResult = {
  ruleId: string;
  ruleType: RuleType;
  status: RuleResultStatus;
  message: string;
  remediation?: string;
};

export type OverallStatus = OverallComplianceStatus;
