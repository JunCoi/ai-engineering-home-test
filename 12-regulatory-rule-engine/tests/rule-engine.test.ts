import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RuleEngine } from '../src/engine/RuleEngine.js';
import type { Claim } from '../src/types/claim.js';

describe('RuleEngine', () => {
  const claims = JSON.parse(fs.readFileSync('data/test-claims.json', 'utf8')) as Claim[];
  const engine = new RuleEngine();

  it('validates all 15 test claims', () => {
    const results = claims.map((claim) => engine.validateClaim(claim));
    expect(results).toHaveLength(15);
  });

  it('passes a fully compliant Thailand claim', () => {
    const result = engine.validateClaim(claims.find((claim) => claim.claim_id === 'TH-001')!);
    expect(result.overall_status).toBe('COMPLIANT');
  });

  it('detects missing inpatient document in Thailand', () => {
    const result = engine.validateClaim(claims.find((claim) => claim.claim_id === 'TH-002')!);
    expect(result.results.some((rule) => rule.status === 'FAIL' && rule.message.includes('discharge_summary'))).toBe(true);
  });
});
