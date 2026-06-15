/**
 * Example 3 — Polling for claim status updates
 *
 * Demonstrates two patterns:
 *   a) onStatusChange — event-driven, polling under the hood
 *   b) Manual polling loop with sdk.claims.get()
 *
 * Run:  npm run example:3
 * Requires the mock server: npm run server
 */
import { InsuranceSDK } from '../src/sdk/index.js';

const sdk = new InsuranceSDK({
  apiKey: 'pk_test_demo',
  environment: 'sandbox',
  maxRetries: 3,
});

// Simulate the server advancing a claim through statuses
async function simulateStatusProgression(claimId: string) {
  const statuses = ['UNDER_REVIEW', 'APPROVED', 'PAID'] as const;
  for (const status of statuses) {
    await new Promise((r) => setTimeout(r, 3_000));
    // In a real system the server advances status; here we just log the expected transition
    console.log(`  [server] Claim ${claimId} status would advance to ${status}`);
  }
}

async function patternA() {
  console.log('=== Pattern A: onStatusChange (event-driven) ===\n');

  const claim = await sdk.claims.create({
    policyId: 'POL-POLL-A',
    claimType: 'DENTAL',
    diagnosisCode: 'K02.9',
    treatmentDate: '2024-05-10',
    amount: 5_000,
    currency: 'THB',
  });
  console.log(`Created claim: ${claim.id}\n`);

  return new Promise<void>((resolve) => {
    let changeCount = 0;

    const unsubscribe = sdk.claims.onStatusChange(
      claim.id,
      (newStatus, updatedClaim) => {
        console.log(`  Status changed → ${newStatus} (updated: ${updatedClaim.updatedAt})`);
        changeCount++;
        if (changeCount >= 1) {
          unsubscribe();
          resolve();
        }
      },
      2_000 // Poll every 2 seconds
    );

    console.log('Listening for status changes (poll every 2s)...');
    console.log('The mock server keeps claims in PENDING — first poll fires immediately if status changed.');
    console.log('Press Ctrl+C to stop.\n');

    // Auto-resolve after 8s so the example doesn't hang indefinitely
    setTimeout(() => {
      unsubscribe();
      console.log('\n  (No status change detected — mock server keeps claims PENDING)');
      resolve();
    }, 8_000);
  });
}

async function patternB() {
  console.log('\n=== Pattern B: Manual polling loop ===\n');

  const claim = await sdk.claims.create({
    policyId: 'POL-POLL-B',
    claimType: 'SPECIALIST',
    diagnosisCode: 'H52.1',
    treatmentDate: '2024-05-11',
    amount: 2_500,
    currency: 'THB',
  });
  console.log(`Created claim: ${claim.id}`);
  console.log('Polling every 2s until terminal status or 10s timeout...\n');

  const terminalStatuses = new Set(['APPROVED', 'REJECTED', 'PAID']);
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    const current = await sdk.claims.get(claim.id);
    console.log(`  [${new Date().toISOString()}] Status: ${current.status}`);

    if (terminalStatuses.has(current.status)) {
      console.log(`\n  Claim reached terminal status: ${current.status}`);
      return;
    }

    await new Promise((r) => setTimeout(r, 2_000));
  }

  console.log('\n  Timeout reached — claim still in progress');
}

async function main() {
  await patternA();
  await patternB();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
