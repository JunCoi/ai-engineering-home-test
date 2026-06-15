import type { Claim } from '../../types/claim.js';
import type { Rule, RuleResult } from '../../types/rule.js';
import { businessDaysBetween } from '../../utils/businessDays.js';
import { ruleApplies } from '../helpers.js';

export function validateSlaCheck(rule: Rule, claim: Claim): RuleResult {
  if (!ruleApplies(rule.parameters, claim)) {
    return { rule_id: rule.rule_id, rule_type: rule.rule_type, status: 'NOT_APPLICABLE', message: 'Rule does not apply to this claim.' };
  }
  if (!claim.processing_completed_date) {
    return { rule_id: rule.rule_id, rule_type: rule.rule_type, status: 'FAIL', message: 'Processing completion date is missing.', remediation: 'Add processing_completed_date to evaluate SLA compliance.' };
  }

  const maxBusinessDays = Number(rule.parameters.max_business_days);
  const actualBusinessDays = businessDaysBetween(claim.submission_date, claim.processing_completed_date);

  if (actualBusinessDays <= maxBusinessDays) {
    return { rule_id: rule.rule_id, rule_type: rule.rule_type, status: 'PASS', message: `Processed within SLA: ${actualBusinessDays}/${maxBusinessDays} business days.` };
  }

  return {
    rule_id: rule.rule_id,
    rule_type: rule.rule_type,
    status: 'FAIL',
    message: `SLA breached: processed in ${actualBusinessDays} business days; maximum allowed is ${maxBusinessDays}.`,
    remediation: 'Escalate claim review and notify operations team about SLA breach.',
  };
}
