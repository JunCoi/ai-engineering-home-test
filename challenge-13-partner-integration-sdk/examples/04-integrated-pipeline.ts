/**
 * Example 4 — Integrated pipeline (Ch11 + Ch12 + Ch13)
 *
 * Demonstrates a claim flowing through:
 *   - Ch13 Partner SDK  → claim submission & document upload
 *   - Ch11 Assessment Agent → AI-driven coverage & medical necessity check
 *   - Ch12 Regulatory Engine → country-specific compliance validation
 *
 * Run:  npm run example:4
 * Requires the mock server: npm run server
 *
 * Use one of the seeded policies for the assessment to resolve:
 *   POL-1001 (memberId: MBR-001) — OUTPATIENT/INPATIENT/SPECIALIST, covers up to 2000/20000/3000
 *   POL-2001 (memberId: MBR-002) — OUTPATIENT/INPATIENT
 *   POL-3001 (memberId: MBR-003) — OUTPATIENT/SPECIALIST
 */
import { InsuranceSDK, type Claim } from '../src/sdk/index.js';

const sdk = new InsuranceSDK({
  apiKey: 'pk_test_demo',
  environment: 'sandbox',
  maxRetries: 3,
});

function printSection(title: string) {
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(55));
}

function printAssessment(claim: Claim) {
  const a = claim.assessment;
  if (!a) { console.log('  (no assessment — extended fields not provided)'); return; }
  console.log(`  Recommendation:      ${a.recommendation}`);
  console.log(`  Covered amount:      ${a.coveredAmount} (copay: ${a.copay})`);
  console.log(`  Member pays:         ${a.memberResponsibility}`);
  console.log('  Reasoning:');
  for (const line of a.reasoning) console.log(`    • ${line}`);
  if (a.policyCitations.length) console.log(`  Citations:           ${a.policyCitations.join(', ')}`);
}

function printCompliance(claim: Claim) {
  const c = claim.compliance;
  if (!c) { console.log('  (no compliance — countryCode not provided)'); return; }
  console.log(`  Overall:   ${c.overallStatus}  (${c.country})`);
  for (const r of c.results) {
    const icon = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '–';
    console.log(`  ${icon} [${r.ruleId}] ${r.message}`);
    if (r.remediation) console.log(`      → ${r.remediation}`);
  }
}

async function scenario1() {
  printSection('Scenario 1 — Approved OUTPATIENT claim (POL-1001, Thailand)');

  const claim = await sdk.claims.create({
    policyId: 'POL-1001',
    claimType: 'OUTPATIENT',
    diagnosisCode: 'J06.9',
    treatmentDate: '2026-03-15',
    amount: 500,
    currency: 'USD',
    notes: 'Acute upper respiratory infection',

    // Ch11 fields
    memberId: 'MBR-001',
    diagnosis: 'acute upper respiratory infection',
    procedures: ['DOCTOR_CONSULTATION', 'STANDARD_MEDICATION'],
    submittedDocumentIds: ['DOC-1001-RECEIPT', 'DOC-1001-DIAGNOSIS'],
    requiredDocumentTypes: ['MEDICAL_RECEIPT', 'DIAGNOSIS_NOTE'],

    // Ch12 fields
    countryCode: 'thailand',
    conditionType: 'GENERAL',
    treatmentType: 'NORMAL',
    networkStatus: 'IN_NETWORK',
    policyStartDate: '2025-01-01',
    patient: { fullName: 'An Nguyen', nationalId: 'TH123456' },
  });

  console.log(`\n  Claim ${claim.id}  →  status: ${claim.status}`);
  console.log('\n  [ AI Assessment — Ch11 ]');
  printAssessment(claim);
  console.log('\n  [ Regulatory Compliance — Ch12 ]');
  printCompliance(claim);
}

async function scenario2() {
  printSection('Scenario 2 — Rejected claim (wrong member for policy)');

  const claim = await sdk.claims.create({
    policyId: 'POL-1001',
    claimType: 'OUTPATIENT',
    diagnosisCode: 'K35.80',
    treatmentDate: '2026-04-01',
    amount: 1200,
    currency: 'USD',

    // Wrong memberId — should trigger rejection
    memberId: 'MBR-999',
    diagnosis: 'appendicitis',
    procedures: ['APPENDECTOMY'],
    submittedDocumentIds: ['DOC-1001-RECEIPT'],
    requiredDocumentTypes: ['MEDICAL_RECEIPT', 'DISCHARGE_SUMMARY'],

    countryCode: 'thailand',
    conditionType: 'GENERAL',
    treatmentType: 'EMERGENCY',
    networkStatus: 'IN_NETWORK',
    policyStartDate: '2025-01-01',
    patient: { fullName: 'Unknown Member' },
  });

  console.log(`\n  Claim ${claim.id}  →  status: ${claim.status}`);
  console.log('\n  [ AI Assessment — Ch11 ]');
  printAssessment(claim);
  console.log('\n  [ Regulatory Compliance — Ch12 ]');
  printCompliance(claim);
}

async function scenario3() {
  printSection('Scenario 3 — Basic claim (no pipeline fields)');

  const claim = await sdk.claims.create({
    policyId: 'POL-EXTERNAL-001',
    claimType: 'DENTAL',
    diagnosisCode: 'K02.9',
    treatmentDate: '2026-05-10',
    amount: 3_500,
    currency: 'THB',
    notes: 'Routine dental check — no extended fields, pipeline skipped',
  });

  console.log(`\n  Claim ${claim.id}  →  status: ${claim.status}`);
  console.log('\n  [ AI Assessment — Ch11 ]');
  printAssessment(claim);
  console.log('\n  [ Regulatory Compliance — Ch12 ]');
  printCompliance(claim);
}

async function main() {
  console.log('\nPartner Integration SDK — Integrated Pipeline Demo');
  console.log('Connects: Ch13 (SDK) → Ch11 (Assessment) + Ch12 (Compliance)\n');

  await scenario1();
  await scenario2();
  await scenario3();

  console.log('\n' + '═'.repeat(55));
  console.log('  Done. All scenarios complete.');
  console.log('═'.repeat(55) + '\n');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
