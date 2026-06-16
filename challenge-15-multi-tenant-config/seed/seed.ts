import { listTenants, createTenant } from '../src/storage/tenantStore.js';
import type { TenantConfig } from '../src/types/tenant.js';

type TenantInput = Omit<TenantConfig, 'id' | 'version' | 'createdAt' | 'updatedAt'>;

const TENANTS: TenantInput[] = [
  // ── SafeGuard Insurance (Corporate) ───────────────────────────────────────
  {
    branding: {
      companyName: 'SafeGuard Insurance',
      primaryColor: '#1e40af',
      secondaryColor: '#3b82f6',
    },
    claimTypes: {
      OUTPATIENT: {
        enabled: true,
        requiredDocuments: ['MEDICAL_RECEIPT', 'DIAGNOSIS_NOTE'],
        optionalDocuments: ['REFERRAL_LETTER'],
      },
      INPATIENT: {
        enabled: true,
        requiredDocuments: ['HOSPITAL_CERTIFICATE', 'DISCHARGE_SUMMARY', 'MEDICAL_RECEIPT'],
        optionalDocuments: ['DIAGNOSIS_NOTE'],
      },
      DENTAL: {
        enabled: true,
        requiredDocuments: ['MEDICAL_RECEIPT', 'DIAGNOSIS_NOTE'],
        optionalDocuments: [],
      },
      MATERNITY: { enabled: false, requiredDocuments: [], optionalDocuments: [] },
      OPTICAL: { enabled: false, requiredDocuments: [], optionalDocuments: [] },
    },
    approvalRules: {
      autoApprovalThreshold: 20000,
      tiers: [
        { id: 'sg-1', name: 'Standard Review', minAmount: 20001, maxAmount: 100000, requiredRole: 'assessor' },
        { id: 'sg-2', name: 'Senior Review', minAmount: 100001, maxAmount: 500000, requiredRole: 'team_lead' },
        { id: 'sg-3', name: 'Executive Review', minAmount: 500001, maxAmount: null, requiredRole: 'director' },
      ],
    },
    notifications: {
      claim_submitted: { channels: ['email'] },
      approved: { channels: ['email'] },
      rejected: { channels: ['email'] },
      payment_sent: { channels: ['email'] },
    },
    sla: {
      OUTPATIENT: { targetDays: 5, escalateTo: 'team_lead' },
      INPATIENT: { targetDays: 10, escalateTo: 'director' },
      DENTAL: { targetDays: 7 },
    },
    customFields: [
      { id: 'employee_id', name: 'employee_id', label: 'Employee ID', required: true },
    ],
  },

  // ── HealthFirst (Retail) ──────────────────────────────────────────────────
  {
    branding: {
      companyName: 'HealthFirst',
      primaryColor: '#16a34a',
      secondaryColor: '#22c55e',
    },
    claimTypes: {
      OUTPATIENT: {
        enabled: true,
        requiredDocuments: ['MEDICAL_RECEIPT', 'DIAGNOSIS_NOTE'],
        optionalDocuments: ['PRESCRIPTION'],
      },
      INPATIENT: {
        enabled: true,
        requiredDocuments: ['HOSPITAL_CERTIFICATE', 'DISCHARGE_SUMMARY'],
        optionalDocuments: ['MEDICAL_RECEIPT'],
      },
      DENTAL: {
        enabled: true,
        requiredDocuments: ['MEDICAL_RECEIPT'],
        optionalDocuments: ['DIAGNOSIS_NOTE'],
      },
      MATERNITY: {
        enabled: true,
        requiredDocuments: ['HOSPITAL_CERTIFICATE', 'BIRTH_CERTIFICATE'],
        optionalDocuments: ['DISCHARGE_SUMMARY'],
      },
      OPTICAL: {
        enabled: true,
        requiredDocuments: ['OPTICAL_PRESCRIPTION', 'MEDICAL_RECEIPT'],
        optionalDocuments: [],
      },
    },
    approvalRules: {
      autoApprovalThreshold: 5000,
      tiers: [
        { id: 'hf-1', name: 'Standard Review', minAmount: 5001, maxAmount: 50000, requiredRole: 'assessor' },
        { id: 'hf-2', name: 'Manager Review', minAmount: 50001, maxAmount: null, requiredRole: 'manager' },
      ],
    },
    notifications: {
      claim_submitted: { channels: ['email', 'sms'] },
      approved: { channels: ['email', 'sms'] },
      rejected: { channels: ['email', 'sms'] },
      payment_sent: { channels: ['email', 'sms'] },
    },
    sla: {
      OUTPATIENT: { targetDays: 7 },
      INPATIENT: { targetDays: 7 },
      DENTAL: { targetDays: 7 },
      MATERNITY: { targetDays: 7 },
      OPTICAL: { targetDays: 7 },
    },
    customFields: [],
  },

  // ── GovHealth (Government) ────────────────────────────────────────────────
  {
    branding: {
      companyName: 'GovHealth',
      primaryColor: '#7c3aed',
      secondaryColor: '#8b5cf6',
    },
    claimTypes: {
      OUTPATIENT: {
        enabled: true,
        requiredDocuments: ['MEDICAL_RECEIPT', 'DIAGNOSIS_NOTE', 'ID_CARD_COPY'],
        optionalDocuments: ['REFERRAL_LETTER'],
      },
      INPATIENT: {
        enabled: true,
        requiredDocuments: ['HOSPITAL_CERTIFICATE', 'DISCHARGE_SUMMARY', 'MEDICAL_RECEIPT', 'ID_CARD_COPY'],
        optionalDocuments: ['DIAGNOSIS_NOTE'],
      },
      DENTAL: { enabled: false, requiredDocuments: [], optionalDocuments: [] },
      MATERNITY: { enabled: false, requiredDocuments: [], optionalDocuments: [] },
      OPTICAL: { enabled: false, requiredDocuments: [], optionalDocuments: [] },
    },
    approvalRules: {
      autoApprovalThreshold: 0,
      tiers: [
        { id: 'gh-1', name: 'Committee Review', minAmount: 0, maxAmount: null, requiredRole: 'committee' },
      ],
    },
    notifications: {
      claim_submitted: { channels: ['email', 'webhook'] },
      approved: { channels: ['email', 'webhook'] },
      rejected: { channels: ['email', 'webhook'] },
      payment_sent: { channels: ['email', 'webhook'] },
    },
    sla: {
      OUTPATIENT: { targetDays: 15, escalateTo: 'committee' },
      INPATIENT: { targetDays: 15, escalateTo: 'committee' },
    },
    customFields: [
      { id: 'department', name: 'department', label: 'Department', required: true },
      { id: 'budget_code', name: 'budget_code', label: 'Budget Code', required: true },
    ],
  },
];

function seed() {
  const existing = listTenants().map(t => t.branding.companyName);
  let created = 0;
  for (const tenant of TENANTS) {
    if (existing.includes(tenant.branding.companyName)) continue;
    createTenant(tenant);
    created++;
    console.log(`  ✓ Created tenant: ${tenant.branding.companyName}`);
  }
  if (created === 0) {
    console.log('  Tenants already seeded — skipping.');
  } else {
    console.log(`\n  Seeded ${created} tenant(s).`);
  }
}

console.log('\nSeeding tenants...');
seed();
