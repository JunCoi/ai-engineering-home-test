#!/usr/bin/env node
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { program } from 'commander';
import { WorkflowEngine } from './engine/WorkflowEngine.js';
import { loadWorkflowConfig } from './config/workflowLoader.js';
import { WorkflowError } from './types/workflow.js';
import type { ClaimWorkflowState, WorkflowRole, TransitionContext } from './types/workflow.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = resolve(__dirname, '../configs');

const config = loadWorkflowConfig(CONFIG_DIR);
const engine = new WorkflowEngine(config);

program
  .name('workflow')
  .description('Claims Workflow Orchestrator CLI')
  .version('1.0.0');

program
  .command('create <claimId>')
  .description('Register a new claim in the workflow (starts in SUBMITTED)')
  .action((claimId: string) => {
    try {
      const state = engine.createClaim(claimId);
      console.log(`✓ Claim ${claimId} created — state: ${state.currentState}`);
    } catch (err) {
      console.error(err instanceof WorkflowError ? `✗ ${err.message}` : err);
      process.exit(1);
    }
  });

program
  .command('status <claimId>')
  .description('Show current state and valid transitions for a claim')
  .action((claimId: string) => {
    try {
      const state = engine.getCurrentState(claimId);
      const transitions = engine.getValidTransitions(claimId);
      console.log(`\nClaim: ${claimId}`);
      console.log(`State: ${state.currentState}`);
      console.log(`Info-request cycles: ${state.pendingInfoCycles}`);
      if (transitions.length === 0) {
        console.log('\nNo further transitions available (terminal state)');
      } else {
        console.log('\nValid transitions:');
        for (const t of transitions) {
          console.log(`  → ${t.to}  (roles: ${t.authorizedRoles.join(', ')})`);
          console.log(`     ${t.description}`);
          if (t.preconditions.length) {
            console.log(`     Preconditions: ${t.preconditions.map((p) => p.type).join(', ')}`);
          }
        }
      }
    } catch (err) {
      console.error(err instanceof WorkflowError ? `✗ ${err.message}` : err);
      process.exit(1);
    }
  });

program
  .command('advance <claimId> <toState>')
  .description('Advance a claim to a new state')
  .requiredOption('--role <role>', 'Authorised role performing this transition')
  .requiredOption('--user <userId>', 'User ID performing this transition')
  .option('--notes <notes>', 'Optional notes')
  .option('--context <json>', 'Precondition context as JSON', '{}')
  .action((claimId: string, toState: string, opts: {
    role: string; user: string; notes?: string; context: string;
  }) => {
    try {
      const ctx: TransitionContext = {
        userId: opts.user,
        role: opts.role as WorkflowRole,
        notes: opts.notes,
        ...JSON.parse(opts.context),
      };
      const result = engine.transition(claimId, toState as ClaimWorkflowState, ctx);
      console.log(`✓ ${result.fromState} → ${result.toState}`);
      if (result.sideEffectsExecuted.length) {
        console.log('  Side effects:');
        for (const se of result.sideEffectsExecuted) console.log(`    ${se}`);
      }
    } catch (err) {
      console.error(err instanceof WorkflowError ? `✗ [${err.code}] ${err.message}` : err);
      process.exit(1);
    }
  });

program
  .command('audit <claimId>')
  .description('View the immutable audit trail for a claim')
  .action((claimId: string) => {
    try {
      const trail = engine.getAuditTrail(claimId);
      if (trail.length === 0) {
        console.log(`No audit entries for ${claimId}`);
        return;
      }
      console.log(`\nAudit trail for ${claimId} (${trail.length} entries):\n`);
      for (const e of trail) {
        console.log(`  ${e.timestamp}`);
        console.log(`    ${e.fromState} → ${e.toState}`);
        console.log(`    by: ${e.triggeredBy.role}/${e.triggeredBy.userId}`);
        if (e.notes) console.log(`    notes: ${e.notes}`);
        if (e.sideEffectsExecuted.length) {
          console.log(`    side effects: ${e.sideEffectsExecuted.join(' | ')}`);
        }
        console.log();
      }
    } catch (err) {
      console.error(err instanceof WorkflowError ? `✗ ${err.message}` : err);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Print the loaded state machine configuration')
  .action(() => {
    console.log('\nStates:');
    for (const s of config.states) console.log(`  ${s.id}: ${s.description}`);
    console.log('\nTransitions:');
    for (const t of config.transitions) {
      console.log(`  ${t.from} → ${t.to}  [${t.authorizedRoles.join(', ')}]`);
    }
  });

program.parse();
