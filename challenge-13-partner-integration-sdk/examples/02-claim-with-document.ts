/**
 * Example 2 — Claim submission with document upload
 *
 * Run:  npm run example:2
 * Requires the mock server: npm run server
 */
import { InsuranceSDK, ValidationError } from '../src/sdk/index.js';

const sdk = new InsuranceSDK({
  apiKey: 'pk_test_demo',
  environment: 'sandbox',
  maxRetries: 3,
});

async function main() {
  console.log('=== Example 2: Claim Submission + Document Upload ===\n');

  // 1. Create the claim
  console.log('Step 1: Creating claim...');
  const claim = await sdk.claims.create({
    policyId: 'POL-789012',
    claimType: 'INPATIENT',
    diagnosisCode: 'K35.80',
    treatmentDate: '2024-04-01',
    amount: 85_000,
    currency: 'THB',
    notes: 'Appendectomy',
  });
  console.log(`  Claim ${claim.id} created — status: ${claim.status}\n`);

  // 2. Upload a medical receipt (in-memory buffer simulating a file)
  console.log('Step 2: Uploading medical receipt...');
  const fakeReceipt = Buffer.from(
    'RECEIPT\nHospital: Bangkok General\nDate: 2024-04-01\nAmount: 85000 THB'
  );

  try {
    const receipt = await sdk.documents.upload(
      claim.id,
      { name: 'receipt.txt', content: fakeReceipt, mimeType: 'text/plain' },
      {
        type: 'MEDICAL_RECEIPT',
        onProgress: (percent) => process.stdout.write(`\r  Uploading... ${percent}%`),
      }
    );
    console.log('\n  Receipt uploaded:');
    console.log(`    ID:       ${receipt.id}`);
    console.log(`    Filename: ${receipt.filename}`);
    console.log(`    Size:     ${receipt.size} bytes`);
    console.log();
  } catch (err) {
    if (err instanceof ValidationError) {
      console.error('Upload validation error:', err.fields);
      process.exit(1);
    }
    throw err;
  }

  // 3. Upload a discharge summary
  console.log('Step 3: Uploading discharge summary...');
  const fakeSummary = Buffer.from('DISCHARGE SUMMARY\nPatient discharged in good health.');
  const summary = await sdk.documents.upload(
    claim.id,
    { name: 'discharge_summary.txt', content: fakeSummary, mimeType: 'text/plain' },
    { type: 'DISCHARGE_SUMMARY' }
  );
  console.log(`  Summary uploaded: ${summary.id}\n`);

  // 4. List all uploaded documents
  console.log('Step 4: Listing claim documents...');
  const docs = await sdk.documents.list(claim.id);
  console.log(`  Total documents for ${claim.id}: ${docs.length}`);
  for (const doc of docs) {
    console.log(`    - ${doc.type}: ${doc.filename} (${doc.size} bytes)`);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
