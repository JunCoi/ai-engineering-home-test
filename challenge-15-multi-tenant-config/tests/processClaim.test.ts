import { describe, it, expect, beforeAll } from 'vitest';
import { processClaim, diffConfigs } from '../src/runtime/processClaim.js';
import { listTenants } from '../src/storage/tenantStore.js';
import type { TenantConfig, ProcessClaimInput } from '../src/types/tenant.js';
import { execSync } from 'node:child_process';

let safeguard: TenantConfig;
let healthfirst: TenantConfig;
let govhealth: TenantConfig;

beforeAll(() => {
  execSync('tsx seed/seed.ts', { cwd: new URL('..', import.meta.url).pathname, stdio: 'ignore' });
  const tenants = listTenants();
  safeguard = tenants.find(t => t.branding.companyName === 'SafeGuard Insurance')!;
  healthfirst = tenants.find(t => t.branding.companyName === 'HealthFirst')!;
  govhealth = tenants.find(t => t.branding.companyName === 'GovHealth')!;
});

describe('processClaim — SafeGuard Insurance (Corporate)', () => {
  it('auto-approves OUTPATIENT claim under threshold (10 000 ≤ 20 000)', () => {
    const result = processClaim(safeguard, { claimType: 'OUTPATIENT', amount: 10_000, submissionDate: '2026-01-01' });
    expect(result.approvalRouting.isAutoApproved).toBe(true);
    expect(result.requiredDocuments).toContain('MEDICAL_RECEIPT');
    expect(result.slaTargetDays).toBe(5);
    expect(result.notifications.every(n => n.channels.every(ch => ch === 'email'))).toBe(true);
  });

  it('routes to assessor tier for amount 50 000', () => {
    const result = processClaim(safeguard, { claimType: 'INPATIENT', amount: 50_000, submissionDate: '2026-01-01' });
    expect(result.approvalRouting.isAutoApproved).toBe(false);
    expect(result.approvalRouting.requiredRole).toBe('assessor');
    expect(result.slaTargetDays).toBe(10);
  });

  it('routes to director tier for amount 600 000', () => {
    const result = processClaim(safeguard, { claimType: 'INPATIENT', amount: 600_000, submissionDate: '2026-01-01' });
    expect(result.approvalRouting.requiredRole).toBe('director');
  });

  it('validates required Employee ID custom field', () => {
    const result = processClaim(safeguard, { claimType: 'OUTPATIENT', amount: 5_000, submissionDate: '2026-01-01' });
    expect(result.customFieldErrors).toContain('Employee ID is required');
  });

  it('passes custom field validation when Employee ID is provided', () => {
    const result = processClaim(safeguard, {
      claimType: 'OUTPATIENT', amount: 5_000, submissionDate: '2026-01-01',
      customFieldValues: { employee_id: 'EMP-001' },
    });
    expect(result.customFieldErrors).toHaveLength(0);
  });
});

describe('processClaim — HealthFirst (Retail)', () => {
  it('auto-approves at 5 000 threshold (email + SMS notifications)', () => {
    const result = processClaim(healthfirst, { claimType: 'OUTPATIENT', amount: 3_000, submissionDate: '2026-01-01' });
    expect(result.approvalRouting.isAutoApproved).toBe(true);
    const allChannels = result.notifications.flatMap(n => n.channels);
    expect(allChannels).toContain('email');
    expect(allChannels).toContain('sms');
  });

  it('supports MATERNITY claim type not available in SafeGuard', () => {
    const result = processClaim(healthfirst, { claimType: 'MATERNITY', amount: 20_000, submissionDate: '2026-01-01' });
    expect(result.requiredDocuments).toContain('BIRTH_CERTIFICATE');
    expect(result.slaTargetDays).toBe(7);
  });
});

describe('processClaim — GovHealth (Government)', () => {
  it('routes ALL claims to committee (autoApprovalThreshold = 0)', () => {
    const result = processClaim(govhealth, { claimType: 'OUTPATIENT', amount: 1, submissionDate: '2026-01-01' });
    expect(result.approvalRouting.isAutoApproved).toBe(false);
    expect(result.approvalRouting.requiredRole).toBe('committee');
    expect(result.slaTargetDays).toBe(15);
  });

  it('requires both Department and Budget Code custom fields', () => {
    const result = processClaim(govhealth, { claimType: 'OUTPATIENT', amount: 5_000, submissionDate: '2026-01-01' });
    expect(result.customFieldErrors).toContain('Department is required');
    expect(result.customFieldErrors).toContain('Budget Code is required');
  });

  it('throws when claim type is disabled for tenant', () => {
    expect(() => processClaim(govhealth, { claimType: 'DENTAL', amount: 1_000, submissionDate: '2026-01-01' }))
      .toThrow('DENTAL');
  });
});

describe('diffConfigs', () => {
  it('finds differences between SafeGuard and HealthFirst', () => {
    const diffs = diffConfigs(safeguard, healthfirst);
    expect(diffs.length).toBeGreaterThan(0);
    const paths = diffs.map(d => d.path);
    expect(paths.some(p => p.includes('autoApprovalThreshold'))).toBe(true);
  });

  it('returns empty diff for identical configs', () => {
    const diffs = diffConfigs(safeguard, safeguard);
    expect(diffs).toHaveLength(0);
  });
});
