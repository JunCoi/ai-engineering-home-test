import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowEngine } from '../src/engine/WorkflowEngine.js';
import { loadWorkflowConfig } from '../src/config/workflowLoader.js';
import { WorkflowError } from '../src/types/workflow.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = loadWorkflowConfig(resolve(__dirname, '../configs'));

function makeEngine() {
  return new WorkflowEngine(config);
}

const happyCtx = {
  documentsComplete: true as const,
  assessorId: 'assessor-1',
  assessmentReportComplete: true as const,
  amountWithinLimit: true as const,
  paymentRequestId: 'PAY-001',
  paymentConfirmed: true as const,
};

describe('WorkflowEngine — claim creation', () => {
  it('creates a claim in SUBMITTED state', () => {
    const engine = makeEngine();
    const state = engine.createClaim('CLM-001');
    expect(state.currentState).toBe('SUBMITTED');
    expect(state.pendingInfoCycles).toBe(0);
  });

  it('throws CLAIM_EXISTS when creating duplicate claim', () => {
    const engine = makeEngine();
    engine.createClaim('CLM-DUP');
    expect(() => engine.createClaim('CLM-DUP')).toThrow(
      expect.objectContaining({ code: 'CLAIM_EXISTS' })
    );
  });

  it('throws CLAIM_NOT_FOUND when accessing unknown claim', () => {
    const engine = makeEngine();
    expect(() => engine.getCurrentState('CLM-GHOST')).toThrow(
      expect.objectContaining({ code: 'CLAIM_NOT_FOUND' })
    );
  });
});

describe('WorkflowEngine — valid transitions', () => {
  it('advances SUBMITTED → DOCUMENTS_VERIFIED with document_clerk role', () => {
    const engine = makeEngine();
    engine.createClaim('CLM-002');
    const result = engine.transition('CLM-002', 'DOCUMENTS_VERIFIED', {
      userId: 'clerk-1', role: 'document_clerk', documentsComplete: true,
    });
    expect(result.fromState).toBe('SUBMITTED');
    expect(result.toState).toBe('DOCUMENTS_VERIFIED');
    expect(engine.getCurrentState('CLM-002').currentState).toBe('DOCUMENTS_VERIFIED');
  });

  it('advances DOCUMENTS_VERIFIED → UNDER_ASSESSMENT with team_lead role', () => {
    const engine = makeEngine();
    engine.createClaim('CLM-003');
    engine.transition('CLM-003', 'DOCUMENTS_VERIFIED', {
      userId: 'clerk-1', role: 'document_clerk', documentsComplete: true,
    });
    const result = engine.transition('CLM-003', 'UNDER_ASSESSMENT', {
      userId: 'lead-1', role: 'team_lead', assessorId: 'assessor-1',
    });
    expect(result.toState).toBe('UNDER_ASSESSMENT');
  });

  it('advances UNDER_ASSESSMENT → APPROVED with assessor role', () => {
    const engine = makeEngine();
    const id = 'CLM-004';
    engine.createClaim(id);
    engine.transition(id, 'DOCUMENTS_VERIFIED', { userId: 'u', role: 'document_clerk', documentsComplete: true });
    engine.transition(id, 'UNDER_ASSESSMENT', { userId: 'u', role: 'team_lead', assessorId: 'a1' });
    const result = engine.transition(id, 'APPROVED', {
      userId: 'a1', role: 'assessor',
      assessmentReportComplete: true, amountWithinLimit: true,
    });
    expect(result.toState).toBe('APPROVED');
  });

  it('completes full happy path to CLOSED', () => {
    const engine = makeEngine();
    const id = 'CLM-HAPPY';
    engine.createClaim(id);
    engine.transition(id, 'DOCUMENTS_VERIFIED', { userId: 'c', role: 'document_clerk', documentsComplete: true });
    engine.transition(id, 'UNDER_ASSESSMENT', { userId: 'l', role: 'team_lead', assessorId: 'a1' });
    engine.transition(id, 'APPROVED', { userId: 'a1', role: 'assessor', assessmentReportComplete: true, amountWithinLimit: true });
    engine.transition(id, 'PAYMENT_INITIATED', { userId: 'f1', role: 'finance', paymentRequestId: 'P1' });
    engine.transition(id, 'CLOSED', { userId: 'f1', role: 'finance', paymentConfirmed: true });
    expect(engine.getCurrentState(id).currentState).toBe('CLOSED');
  });

  it('completes rejection path REJECTED → CLOSED', () => {
    const engine = makeEngine();
    const id = 'CLM-REJ';
    engine.createClaim(id);
    engine.transition(id, 'DOCUMENTS_VERIFIED', { userId: 'c', role: 'document_clerk', documentsComplete: true });
    engine.transition(id, 'UNDER_ASSESSMENT', { userId: 'l', role: 'team_lead', assessorId: 'a1' });
    engine.transition(id, 'REJECTED', { userId: 'a1', role: 'assessor', assessmentReportComplete: true, rejectionReason: 'Excluded procedure' });
    engine.transition(id, 'CLOSED', { userId: 'system', role: 'system', appealResolved: true });
    expect(engine.getCurrentState(id).currentState).toBe('CLOSED');
  });
});

describe('WorkflowEngine — invalid transitions', () => {
  it('rejects SUBMITTED → APPROVED with INVALID_TRANSITION and lists valid options', () => {
    const engine = makeEngine();
    engine.createClaim('CLM-INV');
    const err = (() => {
      try { engine.transition('CLM-INV', 'APPROVED', { userId: 'u', role: 'assessor', ...happyCtx }); }
      catch (e) { return e as WorkflowError; }
    })();
    expect(err).toBeInstanceOf(WorkflowError);
    expect(err.code).toBe('INVALID_TRANSITION');
    expect(err.message).toContain('SUBMITTED');
    expect(err.message).toContain('APPROVED');
    expect(err.message).toContain('DOCUMENTS_VERIFIED');
  });

  it('rejects transition with wrong role (UNAUTHORIZED_ROLE)', () => {
    const engine = makeEngine();
    engine.createClaim('CLM-ROLE');
    const err = (() => {
      try {
        engine.transition('CLM-ROLE', 'DOCUMENTS_VERIFIED', {
          userId: 'bad', role: 'assessor', documentsComplete: true,
        });
      } catch (e) { return e as WorkflowError; }
    })();
    expect(err).toBeInstanceOf(WorkflowError);
    expect(err.code).toBe('UNAUTHORIZED_ROLE');
    expect(err.message).toContain('assessor');
    expect(err.message).toContain('document_clerk');
  });
});

describe('WorkflowEngine — precondition failures', () => {
  it('rejects SUBMITTED → DOCUMENTS_VERIFIED when documentsComplete is false', () => {
    const engine = makeEngine();
    engine.createClaim('CLM-PRE1');
    const err = (() => {
      try {
        engine.transition('CLM-PRE1', 'DOCUMENTS_VERIFIED', {
          userId: 'c', role: 'document_clerk', documentsComplete: false,
        });
      } catch (e) { return e as WorkflowError; }
    })();
    expect(err).toBeInstanceOf(WorkflowError);
    expect(err.code).toBe('PRECONDITION_FAILED');
  });

  it('rejects UNDER_ASSESSMENT → APPROVED when amountWithinLimit is false', () => {
    const engine = makeEngine();
    const id = 'CLM-PRE2';
    engine.createClaim(id);
    engine.transition(id, 'DOCUMENTS_VERIFIED', { userId: 'c', role: 'document_clerk', documentsComplete: true });
    engine.transition(id, 'UNDER_ASSESSMENT', { userId: 'l', role: 'team_lead', assessorId: 'a1' });
    const err = (() => {
      try {
        engine.transition(id, 'APPROVED', {
          userId: 'a1', role: 'assessor',
          assessmentReportComplete: true, amountWithinLimit: false,
        });
      } catch (e) { return e as WorkflowError; }
    })();
    expect(err).toBeInstanceOf(WorkflowError);
    expect(err.code).toBe('PRECONDITION_FAILED');
    expect(err.message).toContain('policy benefit limit');
  });

  it('rejects UNDER_ASSESSMENT → REJECTED when rejectionReason is missing', () => {
    const engine = makeEngine();
    const id = 'CLM-PRE3';
    engine.createClaim(id);
    engine.transition(id, 'DOCUMENTS_VERIFIED', { userId: 'c', role: 'document_clerk', documentsComplete: true });
    engine.transition(id, 'UNDER_ASSESSMENT', { userId: 'l', role: 'team_lead', assessorId: 'a1' });
    const err = (() => {
      try {
        engine.transition(id, 'REJECTED', {
          userId: 'a1', role: 'assessor', assessmentReportComplete: true,
          // rejectionReason intentionally omitted
        });
      } catch (e) { return e as WorkflowError; }
    })();
    expect(err).toBeInstanceOf(WorkflowError);
    expect(err.code).toBe('PRECONDITION_FAILED');
  });
});

describe('WorkflowEngine — cycle detection', () => {
  function advanceToUnderAssessment(engine: WorkflowEngine, id: string, first = true) {
    if (first) {
      engine.createClaim(id);
      engine.transition(id, 'DOCUMENTS_VERIFIED', { userId: 'c', role: 'document_clerk', documentsComplete: true });
    }
    engine.transition(id, 'UNDER_ASSESSMENT', { userId: 'l', role: 'team_lead', assessorId: 'a1' });
  }

  it('allows up to 3 PENDING_INFO cycles', () => {
    const engine = makeEngine();
    const id = 'CLM-CYCLE';
    advanceToUnderAssessment(engine, id);

    for (let i = 1; i <= 3; i++) {
      engine.transition(id, 'PENDING_INFO', {
        userId: 'a1', role: 'assessor',
        missingInfoDescription: `Missing doc batch ${i}`,
      });
      expect(engine.getCurrentState(id).pendingInfoCycles).toBe(i);

      if (i < 3) {
        engine.transition(id, 'DOCUMENTS_VERIFIED', {
          userId: 'c', role: 'document_clerk', newDocumentsReceived: true,
        });
        advanceToUnderAssessment(engine, id, false);
      }
    }

    // 3rd cycle reached — state should be PENDING_INFO
    expect(engine.getCurrentState(id).currentState).toBe('PENDING_INFO');
    expect(engine.getCurrentState(id).pendingInfoCycles).toBe(3);
  });

  it('rejects the 4th PENDING_INFO with MAX_CYCLES_EXCEEDED and specific message', () => {
    const engine = makeEngine();
    const id = 'CLM-MAX-CYCLE';
    advanceToUnderAssessment(engine, id);

    for (let i = 0; i < 3; i++) {
      engine.transition(id, 'PENDING_INFO', {
        userId: 'a1', role: 'assessor', missingInfoDescription: `batch ${i}`,
      });
      engine.transition(id, 'DOCUMENTS_VERIFIED', {
        userId: 'c', role: 'document_clerk', newDocumentsReceived: true,
      });
      advanceToUnderAssessment(engine, id, false);
    }

    const err = (() => {
      try {
        engine.transition(id, 'PENDING_INFO', {
          userId: 'a1', role: 'assessor', missingInfoDescription: 'one more',
        });
      } catch (e) { return e as WorkflowError; }
    })();

    expect(err).toBeInstanceOf(WorkflowError);
    expect(err.code).toBe('MAX_CYCLES_EXCEEDED');
    expect(err.message).toContain('Maximum information requests exceeded');
    expect(err.message).toContain('escalate to team lead');
  });
});

describe('WorkflowEngine — audit trail', () => {
  it('records every transition in the audit trail', () => {
    const engine = makeEngine();
    const id = 'CLM-AUDIT';
    engine.createClaim(id);
    engine.transition(id, 'DOCUMENTS_VERIFIED', { userId: 'c', role: 'document_clerk', documentsComplete: true });
    engine.transition(id, 'UNDER_ASSESSMENT', { userId: 'l', role: 'team_lead', assessorId: 'a1' });

    const trail = engine.getAuditTrail(id);
    expect(trail).toHaveLength(2);
    expect(trail[0].fromState).toBe('SUBMITTED');
    expect(trail[0].toState).toBe('DOCUMENTS_VERIFIED');
    expect(trail[1].fromState).toBe('DOCUMENTS_VERIFIED');
    expect(trail[1].toState).toBe('UNDER_ASSESSMENT');
    expect(trail[1].triggeredBy.userId).toBe('l');
    expect(trail[1].triggeredBy.role).toBe('team_lead');
  });

  it('audit entries are immutable — modifying them throws in strict mode', () => {
    const engine = makeEngine();
    const id = 'CLM-IMMUT';
    engine.createClaim(id);
    engine.transition(id, 'DOCUMENTS_VERIFIED', { userId: 'c', role: 'document_clerk', documentsComplete: true });

    const [entry] = engine.getAuditTrail(id);
    expect(() => {
      (entry as Record<string, unknown>).fromState = 'APPROVED';
    }).toThrow();
  });

  it('getValidTransitions returns correct options from current state', () => {
    const engine = makeEngine();
    const id = 'CLM-VALID';
    engine.createClaim(id);
    const transitions = engine.getValidTransitions(id);
    expect(transitions).toHaveLength(1);
    expect(transitions[0].to).toBe('DOCUMENTS_VERIFIED');
    expect(transitions[0].authorizedRoles).toContain('document_clerk');
  });

  it('side effects are recorded in audit entry', () => {
    const engine = makeEngine();
    const id = 'CLM-SE';
    engine.createClaim(id);
    const result = engine.transition(id, 'DOCUMENTS_VERIFIED', {
      userId: 'c', role: 'document_clerk', documentsComplete: true,
    });
    expect(result.sideEffectsExecuted.length).toBeGreaterThan(0);
    expect(result.auditEntry.sideEffectsExecuted.length).toBeGreaterThan(0);
  });
});
