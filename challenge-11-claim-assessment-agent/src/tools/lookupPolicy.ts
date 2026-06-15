import { policies } from "../data/policies.js";
import type { Policy, ToolContext } from "../types/domain.js";
import { logToolCall } from "./toolLogger.js";

export function lookupPolicy(policyId: string, context: ToolContext): Policy {
  const policy = policies.find((item) => item.policyId === policyId);
  if (!policy) {
    throw new Error(`Policy not found: ${policyId}`);
  }

  logToolCall(context, "lookupPolicy", { policyId }, policy);
  return policy;
}
