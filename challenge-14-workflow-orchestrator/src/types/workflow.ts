export type ClaimWorkflowState =
  | 'SUBMITTED'
  | 'DOCUMENTS_VERIFIED'
  | 'UNDER_ASSESSMENT'
  | 'PENDING_INFO'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAYMENT_INITIATED'
  | 'CLOSED';

export type WorkflowRole =
  | 'document_clerk'
  | 'team_lead'
  | 'assessor'
  | 'finance'
  | 'system';

export type PreconditionType =
  | 'DOCUMENTS_COMPLETE'
  | 'ASSESSOR_ASSIGNED'
  | 'ASSESSMENT_REPORT_COMPLETE'
  | 'AMOUNT_WITHIN_LIMIT'
  | 'REJECTION_REASON_PROVIDED'
  | 'MISSING_INFO_DESCRIBED'
  | 'NEW_DOCUMENTS_RECEIVED'
  | 'PAYMENT_REQUEST_CREATED'
  | 'PAYMENT_CONFIRMED'
  | 'APPEAL_RESOLVED';

export type SideEffectType =
  | 'NOTIFY'
  | 'LOG_TIMESTAMP'
  | 'CREATE_PAYMENT_REQUEST'
  | 'RESET_TIMER'
  | 'TRIGGER_PAYMENT_SYSTEM'
  | 'ARCHIVE_CLAIM';

export interface PreconditionConfig {
  type: PreconditionType;
  description: string;
}

export interface SideEffectConfig {
  type: SideEffectType;
  params?: Record<string, unknown>;
}

export interface TransitionConfig {
  id: string;
  from: ClaimWorkflowState;
  to: ClaimWorkflowState;
  description: string;
  authorizedRoles: WorkflowRole[];
  preconditions: PreconditionConfig[];
  sideEffects: SideEffectConfig[];
}

export interface StateConfig {
  id: ClaimWorkflowState;
  description: string;
}

export interface WorkflowConfig {
  states: StateConfig[];
  transitions: TransitionConfig[];
}

export interface TransitionContext {
  userId: string;
  role: WorkflowRole;
  notes?: string;
  // Precondition data — provide the relevant flags for the transition being attempted
  documentsComplete?: boolean;
  assessorId?: string;
  assessmentReportComplete?: boolean;
  amountWithinLimit?: boolean;
  rejectionReason?: string;
  missingInfoDescription?: string;
  newDocumentsReceived?: boolean;
  paymentRequestId?: string;
  paymentConfirmed?: boolean;
  appealResolved?: boolean;
}

export interface AuditEntry {
  readonly id: string;
  readonly claimId: string;
  readonly timestamp: string;
  readonly fromState: ClaimWorkflowState;
  readonly toState: ClaimWorkflowState;
  readonly triggeredBy: {
    readonly userId: string;
    readonly role: WorkflowRole;
  };
  readonly notes?: string;
  readonly sideEffectsExecuted: readonly string[];
}

export interface WorkflowClaimState {
  readonly claimId: string;
  readonly currentState: ClaimWorkflowState;
  readonly pendingInfoCycles: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TransitionResult {
  readonly fromState: ClaimWorkflowState;
  readonly toState: ClaimWorkflowState;
  readonly auditEntry: AuditEntry;
  readonly sideEffectsExecuted: readonly string[];
}

export class WorkflowError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly claimId: string,
    public readonly currentState?: ClaimWorkflowState
  ) {
    super(message);
    this.name = 'WorkflowError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
