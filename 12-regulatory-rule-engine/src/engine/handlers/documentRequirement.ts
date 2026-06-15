import type { Claim } from '../../types/claim.js';
import type { Rule, RuleResult } from '../../types/rule.js';
import { ruleApplies } from '../helpers.js';

export function validateDocumentRequirement(rule: Rule, claim: Claim, countryName: string): RuleResult {
  if (!ruleApplies(rule.parameters, claim)) {
    return { rule_id: rule.rule_id, rule_type: rule.rule_type, status: 'NOT_APPLICABLE', message: 'Rule does not apply to this claim.' };
  }

  const requiredDocuments = rule.parameters.required_documents as string[];
  const missing = requiredDocuments.filter((doc) => !claim.documents.includes(doc));

  if (missing.length === 0) {
    return { rule_id: rule.rule_id, rule_type: rule.rule_type, status: 'PASS', message: 'All required documents are present.' };
  }

  return {
    rule_id: rule.rule_id,
    rule_type: rule.rule_type,
    status: 'FAIL',
    message: `Missing required document: ${missing.join(', ')} for ${claim.claim_type} claim in ${countryName}`,
    remediation: `Upload ${missing.join(', ')} before resubmitting the claim.`,
  };
}
