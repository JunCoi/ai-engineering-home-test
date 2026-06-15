import { loadCountryConfig, getActiveRules } from '../config/ruleLoader.js';
import type { Claim } from '../types/claim.js';
import type { OverallStatus, Rule, RuleResult } from '../types/rule.js';
import { validateCoverageMandate } from './handlers/coverageMandate.js';
import { validateDataMasking } from './handlers/dataMasking.js';
import { validateDocumentRequirement } from './handlers/documentRequirement.js';
import { validateSlaCheck } from './handlers/slaCheck.js';
import { validateWaitingPeriod } from './handlers/waitingPeriod.js';

export type ValidationOutput = {
  claimId: string;
  country: string;
  overallStatus: OverallStatus;
  results: RuleResult[];
};

export class RuleEngine {
  constructor(private readonly configDir?: string) {}

  validateClaim(claim: Claim): ValidationOutput {
    const config = loadCountryConfig(claim.countryCode, this.configDir);
    const activeRules = getActiveRules(config, claim.submissionDate);
    const results = activeRules.map((rule) => this.validateRule(rule, claim, config.country));
    const failed = results.filter((r) => r.status === 'FAIL').length;
    const passed = results.filter((r) => r.status === 'PASS').length;

    let overallStatus: OverallStatus = 'COMPLIANT';
    if (failed > 0 && passed > 0) overallStatus = 'PARTIALLY_COMPLIANT';
    if (failed > 0 && passed === 0) overallStatus = 'NON_COMPLIANT';

    return { claimId: claim.claimId, country: config.country, overallStatus, results };
  }

  private validateRule(rule: Rule, claim: Claim, countryName: string): RuleResult {
    switch (rule.ruleType) {
      case 'DOCUMENT_REQUIREMENT': return validateDocumentRequirement(rule, claim, countryName);
      case 'SLA_CHECK': return validateSlaCheck(rule, claim);
      case 'WAITING_PERIOD': return validateWaitingPeriod(rule, claim);
      case 'DATA_MASKING': return validateDataMasking(rule, claim);
      case 'COVERAGE_MANDATE': return validateCoverageMandate(rule, claim, countryName);
      default: throw new Error(`Unsupported rule type: ${(rule as Rule).ruleType}`);
    }
  }
}
