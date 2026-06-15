import type { Claim } from '../../types/claim.js';
import type { Rule, RuleResult } from '../../types/rule.js';
import { calendarDaysBetween } from '../../utils/businessDays.js';
import { ruleApplies } from '../helpers.js';

export function validateCoverageMandate(rule: Rule, claim: Claim, countryName: string): RuleResult {
  if (!ruleApplies(rule.parameters, claim)) {
    return { ruleId: rule.ruleId, ruleType: rule.ruleType, status: 'NOT_APPLICABLE', message: 'Rule does not apply to this claim.' };
  }

  const minPolicyAgeDays = rule.parameters.minimumPolicyAgeDays ? Number(rule.parameters.minimumPolicyAgeDays) : 0;
  const requiredCoverageLevel = String(rule.parameters.requiredCoverageLevel ?? 'PARTIAL');
  const policyAge = calendarDaysBetween(claim.policyStartDate, claim.treatmentDate);

  if (policyAge < minPolicyAgeDays) {
    return { ruleId: rule.ruleId, ruleType: rule.ruleType, status: 'NOT_APPLICABLE', message: `Coverage mandate does not apply until policy age reaches ${minPolicyAgeDays} days.` };
  }

  if (claim.coverageLevel === 'NONE' || claim.denialReason) {
    return {
      ruleId: rule.ruleId,
      ruleType: rule.ruleType,
      status: 'FAIL',
      message: `Coverage mandate violated for ${claim.treatmentType} claim in ${countryName}. Claim cannot be denied when this mandate applies.`,
      remediation: `Reassess claim and provide at least ${requiredCoverageLevel} coverage according to mandate.`,
    };
  }

  if (requiredCoverageLevel === 'SAME_AS_PHYSICAL' && claim.coverageLevel !== 'SAME_AS_PHYSICAL') {
    return {
      ruleId: rule.ruleId,
      ruleType: rule.ruleType,
      status: 'FAIL',
      message: `Mental health coverage must be at the same level as physical health coverage.`,
      remediation: 'Adjust coverage level to SAME_AS_PHYSICAL.',
    };
  }

  return { ruleId: rule.ruleId, ruleType: rule.ruleType, status: 'PASS', message: 'Coverage mandate satisfied.' };
}
