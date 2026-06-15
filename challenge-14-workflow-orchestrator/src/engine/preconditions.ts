import type {
  PreconditionConfig,
  TransitionContext,
  ClaimWorkflowState,
} from '../types/workflow.js';
import { WorkflowError } from '../types/workflow.js';

type PreconditionChecker = (ctx: TransitionContext) => string | null;

const checkers: Record<string, PreconditionChecker> = {
  DOCUMENTS_COMPLETE: (ctx) =>
    ctx.documentsComplete ? null : 'All required documents must be present and valid',

  ASSESSOR_ASSIGNED: (ctx) =>
    ctx.assessorId ? null : 'An assessor must be assigned before assessment can begin',

  ASSESSMENT_REPORT_COMPLETE: (ctx) =>
    ctx.assessmentReportComplete ? null : 'Assessment report must be completed',

  AMOUNT_WITHIN_LIMIT: (ctx) =>
    ctx.amountWithinLimit !== false ? null : 'Claim amount exceeds the policy benefit limit',

  REJECTION_REASON_PROVIDED: (ctx) =>
    ctx.rejectionReason?.trim() ? null : 'A rejection reason must be provided',

  MISSING_INFO_DESCRIBED: (ctx) =>
    ctx.missingInfoDescription?.trim()
      ? null
      : 'A description of the missing information must be provided',

  NEW_DOCUMENTS_RECEIVED: (ctx) =>
    ctx.newDocumentsReceived ? null : 'New documents or information must have been received',

  PAYMENT_REQUEST_CREATED: (ctx) =>
    ctx.paymentRequestId?.trim() ? null : 'A payment request must exist before payment can be initiated',

  PAYMENT_CONFIRMED: (ctx) =>
    ctx.paymentConfirmed ? null : 'Payment must be confirmed by the payment system',

  APPEAL_RESOLVED: (ctx) =>
    ctx.appealResolved ? null : 'Appeal period must have expired or member must have acknowledged',
};

export function checkPreconditions(
  preconditions: PreconditionConfig[],
  ctx: TransitionContext,
  claimId: string,
  fromState: ClaimWorkflowState,
  toState: ClaimWorkflowState
): void {
  for (const precondition of preconditions) {
    const checker = checkers[precondition.type];
    if (!checker) {
      throw new WorkflowError(
        `Unknown precondition type: ${precondition.type}`,
        'UNKNOWN_PRECONDITION',
        claimId,
        fromState
      );
    }

    const failure = checker(ctx);
    if (failure !== null) {
      throw new WorkflowError(
        `Precondition failed for ${fromState} → ${toState}: ${failure}`,
        'PRECONDITION_FAILED',
        claimId,
        fromState
      );
    }
  }
}
