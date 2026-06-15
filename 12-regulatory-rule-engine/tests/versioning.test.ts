import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RuleEngine } from '../src/engine/RuleEngine.js';
import type { Claim } from '../src/types/claim.js';

describe('rule versioning', () => {
  it('does not apply Hong Kong mental health mandate before effective date', () => {
    const claims = JSON.parse(fs.readFileSync('data/test-claims.json', 'utf8')) as Claim[];
    const engine = new RuleEngine();
    const result = engine.validateClaim(claims.find((claim) => claim.claim_id === 'HK-004')!);
    expect(result.results.some((rule) => rule.rule_id === 'HK-COV-001')).toBe(false);
  });
});
