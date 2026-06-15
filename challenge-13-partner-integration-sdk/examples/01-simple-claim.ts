/**
 * Example 1 — Simple claim submission
 *
 * Run:  npm run example:1
 * Requires the mock server: npm run server
 */
import { InsuranceSDK, ValidationError, AuthError, NetworkError } from '../src/sdk/index.js';

const sdk = new InsuranceSDK({
  apiKey: 'pk_test_demo',
  environment: 'sandbox',
  maxRetries: 3,
});

async function main() {
  console.log('=== Example 1: Simple Claim Submission ===\n');

  try {
    console.log('Creating claim...');
    const claim = await sdk.claims.create({
      policyId: 'POL-123456',
      claimType: 'OUTPATIENT',
      diagnosisCode: 'J06.9',
      treatmentDate: '2024-03-15',
      amount: 15_000,
      currency: 'THB',
      notes: 'Upper respiratory infection treatment',
    });

    console.log('Claim created successfully:');
    console.log(`  ID:     ${claim.id}`);
    console.log(`  Status: ${claim.status}`);
    console.log(`  Amount: ${claim.amount} ${claim.currency}`);
    console.log();

    console.log('Fetching claim by ID...');
    const fetched = await sdk.claims.get(claim.id);
    console.log(`  Fetched: ${fetched.id} — status: ${fetched.status}`);
    console.log();

    console.log('Listing all claims (page 1)...');
    const page = await sdk.claims.list({ page: 1, pageSize: 10 });
    console.log(`  Total claims: ${page.total}`);
    console.log(`  This page:    ${page.items.length}`);
    console.log();

    console.log('Listing PENDING claims...');
    const pending = await sdk.claims.list({ status: 'PENDING' });
    console.log(`  Pending claims: ${pending.total}`);
  } catch (err) {
    if (err instanceof ValidationError) {
      console.error('Validation error:', err.fields);
    } else if (err instanceof AuthError) {
      console.error('Auth error:', err.message);
    } else if (err instanceof NetworkError) {
      console.error('Network error:', err.message);
    } else {
      throw err;
    }
    process.exit(1);
  }
}

main();
