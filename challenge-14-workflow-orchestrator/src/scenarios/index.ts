/**
 * Five required test scenarios for the Claims Workflow Orchestrator.
 * Run:  npm run scenarios
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WorkflowEngine } from '../engine/WorkflowEngine.js';
import { loadWorkflowConfig } from '../config/workflowLoader.js';
import { WorkflowError } from '../types/workflow.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = resolve(__dirname, '../../configs');

const config = loadWorkflowConfig(CONFIG_DIR);

function makeEngine() {
  return new WorkflowEngine(config);
}

function header(n: number, title: string) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Scenario ${n}: ${title}`);
  console.log('═'.repeat(60));
}

function printAudit(engine: WorkflowEngine, claimId: string) {
  const trail = engine.getAuditTrail(claimId);
  console.log(`\n  Audit trail (${trail.length} entries):`);
  for (const e of trail) {
    console.log(`    [${e.timestamp}] ${e.fromState} → ${e.toState}  (${e.triggeredBy.role}/${e.triggeredBy.userId})`);
    if (e.notes) console.log(`      notes: ${e.notes}`);
  }
}

// ── Scenario 1: Happy path ──────────────────────────────────────────────────
function scenario1() {
  header(1, 'Happy path — full approval to payment');
  const engine = makeEngine();
  const id = 'CLM-HAPPY-001';

  engine.createClaim(id);
  console.log(`  Created: ${engine.getCurrentState(id).currentState}`);

  engine.transition(id, 'DOCUMENTS_VERIFIED', {
    userId: 'clerk-1', role: 'document_clerk', documentsComplete: true,
  });
  engine.transition(id, 'UNDER_ASSESSMENT', {
    userId: 'lead-1', role: 'team_lead', assessorId: 'assessor-1',
  });
  engine.transition(id, 'APPROVED', {
    userId: 'assessor-1', role: 'assessor',
    assessmentReportComplete: true, amountWithinLimit: true,
    notes: 'All checks passed',
  });
  engine.transition(id, 'PAYMENT_INITIATED', {
    userId: 'finance-1', role: 'finance', paymentRequestId: 'PAY-001',
  });
  engine.transition(id, 'CLOSED', {
    userId: 'finance-1', role: 'finance', paymentConfirmed: true,
    notes: 'Payment reference: TXN-999',
  });

  const final = engine.getCurrentState(id);
  console.log(`\n  Final state: ${final.currentState} ✓`);
  printAudit(engine, id);
}

// ── Scenario 2: Rejection path ──────────────────────────────────────────────
function scenario2() {
  header(2, 'Rejection path — denied and archived');
  const engine = makeEngine();
  const id = 'CLM-REJECT-001';

  engine.createClaim(id);
  engine.transition(id, 'DOCUMENTS_VERIFIED', {
    userId: 'clerk-1', role: 'document_clerk', documentsComplete: true,
  });
  engine.transition(id, 'UNDER_ASSESSMENT', {
    userId: 'lead-1', role: 'team_lead', assessorId: 'assessor-2',
  });
  engine.transition(id, 'REJECTED', {
    userId: 'assessor-2', role: 'assessor',
    assessmentReportComplete: true,
    rejectionReason: 'Procedure COSMETIC_TREATMENT is excluded by the policy',
  });
  engine.transition(id, 'CLOSED', {
    userId: 'system', role: 'system', appealResolved: true,
    notes: 'Appeal period expired after 30 days',
  });

  console.log(`\n  Final state: ${engine.getCurrentState(id).currentState} ✓`);
  printAudit(engine, id);
}

// ── Scenario 3: Request more info loop ─────────────────────────────────────
function scenario3() {
  header(3, 'Request more info loop — one cycle then approval');
  const engine = makeEngine();
  const id = 'CLM-LOOP-001';

  engine.createClaim(id);
  engine.transition(id, 'DOCUMENTS_VERIFIED', {
    userId: 'clerk-1', role: 'document_clerk', documentsComplete: true,
  });
  engine.transition(id, 'UNDER_ASSESSMENT', {
    userId: 'lead-1', role: 'team_lead', assessorId: 'assessor-1',
  });
  // Cycle 1: request more info
  engine.transition(id, 'PENDING_INFO', {
    userId: 'assessor-1', role: 'assessor',
    missingInfoDescription: 'Discharge summary is missing',
  });
  const afterPending = engine.getCurrentState(id);
  console.log(`  After PENDING_INFO: cycles = ${afterPending.pendingInfoCycles}`);

  engine.transition(id, 'DOCUMENTS_VERIFIED', {
    userId: 'clerk-1', role: 'document_clerk', newDocumentsReceived: true,
  });
  engine.transition(id, 'UNDER_ASSESSMENT', {
    userId: 'lead-1', role: 'team_lead', assessorId: 'assessor-1',
  });
  engine.transition(id, 'APPROVED', {
    userId: 'assessor-1', role: 'assessor',
    assessmentReportComplete: true, amountWithinLimit: true,
  });
  engine.transition(id, 'PAYMENT_INITIATED', {
    userId: 'finance-1', role: 'finance', paymentRequestId: 'PAY-002',
  });
  engine.transition(id, 'CLOSED', {
    userId: 'finance-1', role: 'finance', paymentConfirmed: true,
  });

  console.log(`  Final state: ${engine.getCurrentState(id).currentState} ✓`);
  printAudit(engine, id);
}

// ── Scenario 4: Invalid transition ─────────────────────────────────────────
function scenario4() {
  header(4, 'Invalid transition — SUBMITTED → APPROVED must fail');
  const engine = makeEngine();
  const id = 'CLM-INVALID-001';
  engine.createClaim(id);

  try {
    engine.transition(id, 'APPROVED', {
      userId: 'attacker', role: 'assessor',
      assessmentReportComplete: true, amountWithinLimit: true,
    });
    console.log('  ✗ ERROR: transition should have been rejected');
  } catch (err) {
    if (err instanceof WorkflowError) {
      console.log(`  ✓ Rejected with code: ${err.code}`);
      console.log(`    Message: ${err.message}`);
    } else {
      throw err;
    }
  }
}

// ── Scenario 5: Unauthorised role ──────────────────────────────────────────
function scenario5() {
  header(5, 'Unauthorised role — assessor cannot verify documents');
  const engine = makeEngine();
  const id = 'CLM-UNAUTH-001';
  engine.createClaim(id);

  try {
    engine.transition(id, 'DOCUMENTS_VERIFIED', {
      userId: 'rogue-assessor', role: 'assessor', documentsComplete: true,
    });
    console.log('  ✗ ERROR: transition should have been rejected');
  } catch (err) {
    if (err instanceof WorkflowError) {
      console.log(`  ✓ Rejected with code: ${err.code}`);
      console.log(`    Message: ${err.message}`);
    } else {
      throw err;
    }
  }
}

// ── Run all ─────────────────────────────────────────────────────────────────
scenario1();
scenario2();
scenario3();
scenario4();
scenario5();
console.log('\n✓ All 5 scenarios complete.\n');
