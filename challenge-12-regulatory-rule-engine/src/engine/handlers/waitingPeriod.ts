import type { Claim } from '../../types/claim.js';
import type { Rule, RuleResult } from '../../types/rule.js';
import { calendarDaysBetween } from '../../utils/businessDays.js';
import { ruleApplies } from '../helpers.js';

export function validateWaitingPeriod(rule: Rule, claim: Claim): RuleResult {
  if (!ruleApplies(rule.parameters, claim)) {
    return { ruleId: rule.ruleId, ruleType: rule.ruleType, status: 'NOT_APPLICABLE', message: 'Rule does not apply to this claim.' };
  }

  const requiredDays = Number(rule.parameters.minimumPolicyAgeDays);
  const actualDays = calendarDaysBetween(claim.policyStartDate, claim.treatmentDate);

  if (actualDays >= requiredDays) {
    return { ruleId: rule.ruleId, ruleType: rule.ruleType, status: 'PASS', message: `Waiting period satisfied: ${actualDays}/${requiredDays} days.` };
  }

  return {
    ruleId: rule.ruleId,
    ruleType: rule.ruleType,
    status: 'FAIL',
    message: `Waiting period not satisfied: policy age is ${actualDays} days; required minimum is ${requiredDays} days.`,
    remediation: `Reject or hold the claim until the ${requiredDays}-day waiting period is satisfied.`,
  };
}
