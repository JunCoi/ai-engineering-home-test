import type { Claim } from '../../types/claim.js';
import type { Rule, RuleResult } from '../../types/rule.js';
import { businessDaysBetween } from '../../utils/businessDays.js';
import { ruleApplies } from '../helpers.js';

export function validateSlaCheck(rule: Rule, claim: Claim): RuleResult {
  if (!ruleApplies(rule.parameters, claim)) {
    return { ruleId: rule.ruleId, ruleType: rule.ruleType, status: 'NOT_APPLICABLE', message: 'Rule does not apply to this claim.' };
  }
  if (!claim.processingCompletedDate) {
    return { ruleId: rule.ruleId, ruleType: rule.ruleType, status: 'FAIL', message: 'Processing completion date is missing.', remediation: 'Add processingCompletedDate to evaluate SLA compliance.' };
  }

  const maxBusinessDays = Number(rule.parameters.maxBusinessDays);
  const actualBusinessDays = businessDaysBetween(claim.submissionDate, claim.processingCompletedDate);

  if (actualBusinessDays <= maxBusinessDays) {
    return { ruleId: rule.ruleId, ruleType: rule.ruleType, status: 'PASS', message: `Processed within SLA: ${actualBusinessDays}/${maxBusinessDays} business days.` };
  }

  return {
    ruleId: rule.ruleId,
    ruleType: rule.ruleType,
    status: 'FAIL',
    message: `SLA breached: processed in ${actualBusinessDays} business days; maximum allowed is ${maxBusinessDays}.`,
    remediation: 'Escalate claim review and notify operations team about SLA breach.',
  };
}
