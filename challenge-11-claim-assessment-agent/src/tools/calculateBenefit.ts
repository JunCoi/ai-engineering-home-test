import { policies } from "../data/policies.js";
import type { ClaimType, ToolContext } from "../types/domain.js";
import { logToolCall } from "./toolLogger.js";

export interface BenefitCalculationResult {
  submittedAmount: number;
  coveredAmount: number;
  copay: number;
  memberResponsibility: number;
  remainingLimitAfterClaim: number;
  limitExceeded: boolean;
}

export function calculateBenefit(
  policyId: string,
  claimType: ClaimType,
  amount: number,
  context: ToolContext
): BenefitCalculationResult {
  const policy = policies.find((item) => item.policyId === policyId);
  if (!policy) {
    throw new Error(`Policy not found: ${policyId}`);
  }

  const benefit = policy.benefits[claimType];
  const payableBeforeCopay = Math.min(amount, benefit.remainingLimit);
  const copay = Number((payableBeforeCopay * (benefit.copayPercent / 100)).toFixed(2));
  const coveredAmount = Number((payableBeforeCopay - copay).toFixed(2));
  const memberResponsibility = Number((amount - coveredAmount).toFixed(2));

  const output: BenefitCalculationResult = {
    submittedAmount: amount,
    coveredAmount,
    copay,
    memberResponsibility,
    remainingLimitAfterClaim: Number((benefit.remainingLimit - payableBeforeCopay).toFixed(2)),
    limitExceeded: amount > benefit.remainingLimit
  };

  logToolCall(context, "calculateBenefit", { policyId, claimType, amount }, output);
  return output;
}
