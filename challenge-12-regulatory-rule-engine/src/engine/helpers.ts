import type { Claim } from '../types/claim.js';

type AppliesTo = {
  claimTypes?: string[];
  conditionTypes?: string[];
  treatmentTypes?: string[];
  networkStatuses?: string[];
  reportContexts?: string[];
};

export function ruleApplies(parameters: Record<string, unknown>, claim: Claim): boolean {
  const appliesTo = parameters.appliesTo as AppliesTo | undefined;
  if (!appliesTo) return true;

  if (appliesTo.claimTypes && !appliesTo.claimTypes.includes(claim.claimType)) return false;
  if (appliesTo.conditionTypes && !appliesTo.conditionTypes.includes(claim.conditionType)) return false;
  if (appliesTo.treatmentTypes && !appliesTo.treatmentTypes.includes(claim.treatmentType)) return false;
  if (appliesTo.networkStatuses && !appliesTo.networkStatuses.includes(claim.networkStatus)) return false;

  return true;
}
