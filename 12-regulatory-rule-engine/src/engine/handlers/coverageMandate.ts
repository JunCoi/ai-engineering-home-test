import type { Claim } from '../../types/claim.js';
import type { Rule, RuleResult } from '../../types/rule.js';
import { calendarDaysBetween } from '../../utils/businessDays.js';
import { ruleApplies } from '../helpers.js';

export function validateCoverageMandate(rule: Rule, claim: Claim, countryName: string): RuleResult {
  if (!ruleApplies(rule.parameters, claim)) {
    return { rule_id: rule.rule_id, rule_type: rule.rule_type, status: 'NOT_APPLICABLE', message: 'Rule does not apply to this claim.' };
  }

  const minPolicyAgeDays = rule.parameters.minimum_policy_age_days ? Number(rule.parameters.minimum_policy_age_days) : 0;
  const requiredCoverageLevel = String(rule.parameters.required_coverage_level ?? 'partial');
  const policyAge = calendarDaysBetween(claim.policy_start_date, claim.treatment_date);

  if (policyAge < minPolicyAgeDays) {
    return { rule_id: rule.rule_id, rule_type: rule.rule_type, status: 'NOT_APPLICABLE', message: `Coverage mandate does not apply until policy age reaches ${minPolicyAgeDays} days.` };
  }

  if (claim.coverage_level === 'none' || claim.denial_reason) {
    return {
      rule_id: rule.rule_id,
      rule_type: rule.rule_type,
      status: 'FAIL',
      message: `Coverage mandate violated for ${claim.treatment_type} claim in ${countryName}. Claim cannot be denied when this mandate applies.`,
      remediation: `Reassess claim and provide at least ${requiredCoverageLevel} coverage according to mandate.`,
    };
  }

  if (requiredCoverageLevel === 'same_as_physical' && claim.coverage_level !== 'same_as_physical') {
    return {
      rule_id: rule.rule_id,
      rule_type: rule.rule_type,
      status: 'FAIL',
      message: `Mental health coverage must be at the same level as physical health coverage.`,
      remediation: 'Adjust coverage level to same_as_physical.',
    };
  }

  return { rule_id: rule.rule_id, rule_type: rule.rule_type, status: 'PASS', message: 'Coverage mandate satisfied.' };
}
