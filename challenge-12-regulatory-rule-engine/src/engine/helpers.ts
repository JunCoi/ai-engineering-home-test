import type { Claim } from '../types/claim.js';

type AppliesTo = {
  claim_types?: string[];
  condition_types?: string[];
  treatment_types?: string[];
  network_statuses?: string[];
  report_contexts?: string[];
};

export function ruleApplies(parameters: Record<string, unknown>, claim: Claim): boolean {
  const appliesTo = parameters.applies_to as AppliesTo | undefined;
  if (!appliesTo) return true;

  if (appliesTo.claim_types && !appliesTo.claim_types.includes(claim.claim_type)) return false;
  if (appliesTo.condition_types && !appliesTo.condition_types.includes(claim.condition_type)) return false;
  if (appliesTo.treatment_types && !appliesTo.treatment_types.includes(claim.treatment_type)) return false;
  if (appliesTo.network_statuses && !appliesTo.network_statuses.includes(claim.network_status)) return false;

  return true;
}
