import { loadCountryConfig, getActiveRules } from '../config/ruleLoader.js';
import type { Claim } from '../types/claim.js';
import type { OverallStatus, Rule, RuleResult } from '../types/rule.js';
import { validateCoverageMandate } from './handlers/coverageMandate.js';
import { validateDataMasking } from './handlers/dataMasking.js';
import { validateDocumentRequirement } from './handlers/documentRequirement.js';
import { validateSlaCheck } from './handlers/slaCheck.js';
import { validateWaitingPeriod } from './handlers/waitingPeriod.js';

export type ValidationOutput = {
  claim_id: string;
  country: string;
  overall_status: OverallStatus;
  results: RuleResult[];
};

export class RuleEngine {
  validateClaim(claim: Claim): ValidationOutput {
    const config = loadCountryConfig(claim.country_code);
    const activeRules = getActiveRules(config, claim.submission_date);
    const results = activeRules.map((rule) => this.validateRule(rule, claim, config.country));
    const failed = results.filter((r) => r.status === 'FAIL').length;
    const passed = results.filter((r) => r.status === 'PASS').length;

    let overall_status: OverallStatus = 'COMPLIANT';
    if (failed > 0 && passed > 0) overall_status = 'PARTIALLY_COMPLIANT';
    if (failed > 0 && passed === 0) overall_status = 'NON_COMPLIANT';

    return { claim_id: claim.claim_id, country: config.country, overall_status, results };
  }

  private validateRule(rule: Rule, claim: Claim, countryName: string): RuleResult {
    switch (rule.rule_type) {
      case 'document_requirement': return validateDocumentRequirement(rule, claim, countryName);
      case 'sla_check': return validateSlaCheck(rule, claim);
      case 'waiting_period': return validateWaitingPeriod(rule, claim);
      case 'data_masking': return validateDataMasking(rule, claim);
      case 'coverage_mandate': return validateCoverageMandate(rule, claim, countryName);
      default: throw new Error(`Unsupported rule type: ${(rule as Rule).rule_type}`);
    }
  }
}
