import { describe, expect, it } from 'vitest';
import { diffCountries } from '../src/diff/ruleDiff.js';

describe('rule diff', () => {
  it('detects differences between Thailand and Vietnam', () => {
    const diff = diffCountries('thailand', 'vietnam');
    expect(diff.some((item) => item.differs)).toBe(true);
  });
});
