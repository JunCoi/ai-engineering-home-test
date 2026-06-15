import type { SideEffectConfig, ClaimWorkflowState, TransitionContext } from '../types/workflow.js';

export function executeSideEffects(
  effects: SideEffectConfig[],
  claimId: string,
  fromState: ClaimWorkflowState,
  toState: ClaimWorkflowState,
  ctx: TransitionContext
): string[] {
  const executed: string[] = [];

  for (const effect of effects) {
    const description = runEffect(effect, claimId, fromState, toState, ctx);
    executed.push(description);
  }

  return executed;
}

function runEffect(
  effect: SideEffectConfig,
  claimId: string,
  _fromState: ClaimWorkflowState,
  toState: ClaimWorkflowState,
  ctx: TransitionContext
): string {
  const p = effect.params ?? {};

  switch (effect.type) {
    case 'NOTIFY': {
      const target = String(p.target ?? 'unknown');
      const event = String(p.event ?? '');
      const msg = event
        ? `[NOTIFY] → ${target}: claim ${claimId} ${event}`
        : `[NOTIFY] → ${target}: ${String(p.message ?? '')} (claim ${claimId})`;
      console.log(msg);
      if (p.includeAppealInstructions) {
        console.log(`[NOTIFY] → ${target}: appeal instructions sent for claim ${claimId}`);
      }
      return msg;
    }

    case 'LOG_TIMESTAMP': {
      const msg = `[LOG_TIMESTAMP] claim ${claimId} ${String(p.event ?? 'event')} at ${new Date().toISOString()}`;
      console.log(msg);
      return msg;
    }

    case 'CREATE_PAYMENT_REQUEST': {
      const msg = `[CREATE_PAYMENT_REQUEST] payment request created for claim ${claimId} (approved by ${ctx.userId})`;
      console.log(msg);
      return msg;
    }

    case 'RESET_TIMER': {
      const msg = `[RESET_TIMER] ${String(p.event ?? 'assessment_timer')} reset for claim ${claimId}`;
      console.log(msg);
      return msg;
    }

    case 'TRIGGER_PAYMENT_SYSTEM': {
      const msg = `[TRIGGER_PAYMENT_SYSTEM] payment initiated for claim ${claimId}`;
      console.log(msg);
      return msg;
    }

    case 'ARCHIVE_CLAIM': {
      const msg = `[ARCHIVE_CLAIM] claim ${claimId} archived (state: ${toState})`;
      console.log(msg);
      return msg;
    }

    default:
      throw new Error(`Unknown side effect type: ${(effect as SideEffectConfig).type}`);
  }
}
