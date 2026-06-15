import type { Claim, DocumentType } from '../../types/claim.js';
import type { Rule, RuleResult } from '../../types/rule.js';
import { ruleApplies } from '../helpers.js';

export function validateDocumentRequirement(rule: Rule, claim: Claim, countryName: string): RuleResult {
  if (!ruleApplies(rule.parameters, claim)) {
    return { ruleId: rule.ruleId, ruleType: rule.ruleType, status: 'NOT_APPLICABLE', message: 'Rule does not apply to this claim.' };
  }

  const requiredDocuments = rule.parameters.requiredDocuments as DocumentType[];
  const missing = requiredDocuments.filter((doc) => !claim.documents.includes(doc));

  if (missing.length === 0) {
    return { ruleId: rule.ruleId, ruleType: rule.ruleType, status: 'PASS', message: 'All required documents are present.' };
  }

  return {
    ruleId: rule.ruleId,
    ruleType: rule.ruleType,
    status: 'FAIL',
    message: `Missing required document: ${missing.join(', ')} for ${claim.claimType} claim in ${countryName}`,
    remediation: `Upload ${missing.join(', ')} before resubmitting the claim.`,
  };
}
