import type { Claim } from '../../types/claim.js';
import type { Rule, RuleResult } from '../../types/rule.js';
import { calendarDaysBetween } from '../../utils/businessDays.js';
import { ruleApplies } from '../helpers.js';

export function validateWaitingPeriod(rule: Rule, claim: Claim): RuleResult {
  if (!ruleApplies(rule.parameters, claim)) {
    return { rule_id: rule.rule_id, rule_type: rule.rule_type, status: 'NOT_APPLICABLE', message: 'Rule does not apply to this claim.' };
  }

  const requiredDays = Number(rule.parameters.minimum_policy_age_days);
  const actualDays = calendarDaysBetween(claim.policy_start_date, claim.treatment_date);

  if (actualDays >= requiredDays) {
    return { rule_id: rule.rule_id, rule_type: rule.rule_type, status: 'PASS', message: `Waiting period satisfied: ${actualDays}/${requiredDays} days.` };
  }

  return {
    rule_id: rule.rule_id,
    rule_type: rule.rule_type,
    status: 'FAIL',
    message: `Waiting period not satisfied: policy age is ${actualDays} days; required minimum is ${requiredDays} days.`,
    remediation: `Reject or hold the claim until the ${requiredDays}-day waiting period is satisfied.`,
  };
}
