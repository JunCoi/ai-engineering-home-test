import { randomUUID } from 'node:crypto';
import type {
  WorkflowConfig,
  TransitionConfig,
  TransitionContext,
  TransitionResult,
  WorkflowClaimState,
  AuditEntry,
  ClaimWorkflowState,
} from '../types/workflow.js';
import { WorkflowError } from '../types/workflow.js';
import { AuditTrail } from './AuditTrail.js';
import { checkPreconditions } from './preconditions.js';
import { executeSideEffects } from './sideEffects.js';

const MAX_PENDING_INFO_CYCLES = 3;

interface MutableClaimState {
  currentState: ClaimWorkflowState;
  pendingInfoCycles: number;
  createdAt: string;
  updatedAt: string;
}

export class WorkflowEngine {
  private readonly claims = new Map<string, MutableClaimState>();
  private readonly audit = new AuditTrail();

  constructor(private readonly config: WorkflowConfig) {}

  createClaim(claimId: string): WorkflowClaimState {
    if (this.claims.has(claimId)) {
      throw new WorkflowError(
        `Claim ${claimId} already exists in the workflow`,
        'CLAIM_EXISTS',
        claimId
      );
    }
    const now = new Date().toISOString();
    const state: MutableClaimState = {
      currentState: 'SUBMITTED',
      pendingInfoCycles: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.claims.set(claimId, state);
    return this.toReadonly(claimId, state);
  }

  transition(
    claimId: string,
    toState: ClaimWorkflowState,
    context: TransitionContext
  ): TransitionResult {
    const claim = this.claims.get(claimId);
    if (!claim) {
      throw new WorkflowError(
        `Claim ${claimId} not found in the workflow`,
        'CLAIM_NOT_FOUND',
        claimId
      );
    }

    const fromState = claim.currentState;

    // Find transition definition
    const transitionConfig = this.config.transitions.find(
      (t) => t.from === fromState && t.to === toState
    );
    if (!transitionConfig) {
      const valid = this.validTargets(fromState);
      const hint = valid.length
        ? `Valid transitions from ${fromState}: ${valid.join(', ')}`
        : `No transitions are available from ${fromState}`;
      throw new WorkflowError(
        `Invalid transition from ${fromState} to ${toState}. ${hint}`,
        'INVALID_TRANSITION',
        claimId,
        fromState
      );
    }

    // Role authorisation
    if (!transitionConfig.authorizedRoles.includes(context.role)) {
      throw new WorkflowError(
        `Role '${context.role}' is not authorised for ${fromState} → ${toState}. ` +
          `Authorised roles: ${transitionConfig.authorizedRoles.join(', ')}`,
        'UNAUTHORIZED_ROLE',
        claimId,
        fromState
      );
    }

    // Cycle detection — cap UNDER_ASSESSMENT → PENDING_INFO loops
    if (fromState === 'UNDER_ASSESSMENT' && toState === 'PENDING_INFO') {
      if (claim.pendingInfoCycles >= MAX_PENDING_INFO_CYCLES) {
        throw new WorkflowError(
          `Maximum information requests exceeded (${MAX_PENDING_INFO_CYCLES}) — escalate to team lead`,
          'MAX_CYCLES_EXCEEDED',
          claimId,
          fromState
        );
      }
    }

    // Preconditions
    checkPreconditions(transitionConfig.preconditions, context, claimId, fromState, toState);

    // Side effects
    const sideEffectsExecuted = executeSideEffects(
      transitionConfig.sideEffects,
      claimId,
      fromState,
      toState,
      context
    );

    // Commit state change
    const now = new Date().toISOString();
    claim.currentState = toState;
    claim.updatedAt = now;
    if (fromState === 'UNDER_ASSESSMENT' && toState === 'PENDING_INFO') {
      claim.pendingInfoCycles += 1;
    }

    // Immutable audit entry
    const auditEntry: AuditEntry = Object.freeze({
      id: randomUUID(),
      claimId,
      timestamp: now,
      fromState,
      toState,
      triggeredBy: Object.freeze({ userId: context.userId, role: context.role }),
      notes: context.notes,
      sideEffectsExecuted: Object.freeze([...sideEffectsExecuted]) as readonly string[],
    });
    this.audit.log(auditEntry);

    return Object.freeze({ fromState, toState, auditEntry, sideEffectsExecuted });
  }

  getCurrentState(claimId: string): WorkflowClaimState {
    const claim = this.claims.get(claimId);
    if (!claim) {
      throw new WorkflowError(
        `Claim ${claimId} not found in the workflow`,
        'CLAIM_NOT_FOUND',
        claimId
      );
    }
    return this.toReadonly(claimId, claim);
  }

  getValidTransitions(claimId: string): TransitionConfig[] {
    const claim = this.claims.get(claimId);
    if (!claim) {
      throw new WorkflowError(
        `Claim ${claimId} not found in the workflow`,
        'CLAIM_NOT_FOUND',
        claimId
      );
    }
    return this.config.transitions.filter((t) => t.from === claim.currentState);
  }

  getAuditTrail(claimId: string): AuditEntry[] {
    return this.audit.getHistory(claimId);
  }

  private validTargets(fromState: ClaimWorkflowState): string[] {
    return this.config.transitions.filter((t) => t.from === fromState).map((t) => t.to);
  }

  private toReadonly(claimId: string, s: MutableClaimState): WorkflowClaimState {
    return Object.freeze({
      claimId,
      currentState: s.currentState,
      pendingInfoCycles: s.pendingInfoCycles,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    });
  }
}
