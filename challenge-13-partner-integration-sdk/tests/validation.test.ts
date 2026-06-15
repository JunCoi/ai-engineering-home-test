import { describe, it, expect, vi, afterEach } from 'vitest';
import { ValidationError, type CreateClaimInput } from '../src/sdk/index.js';
import { createSDK, makeClaim, stubWithAuth } from './test-utils.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

const VALID_INPUT = {
  policyId: 'POL-123',
  claimType: 'OUTPATIENT',
  diagnosisCode: 'J06.9',
  treatmentDate: '2024-03-15',
  amount: 15_000,
  currency: 'THB',
} as const;

describe('Client-side validation — sdk.claims.create()', () => {
  it('throws ValidationError when policyId is missing', async () => {
    const sdk = createSDK();
    const err = await sdk.claims
      .create({ ...VALID_INPUT, policyId: '' })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).fields.policyId).toBe('required');
  });

  it('throws ValidationError when claimType is invalid', async () => {
    const sdk = createSDK();
    const input = { ...VALID_INPUT, claimType: 'UNKNOWN_TYPE' } as unknown as CreateClaimInput;
    const err = await sdk.claims.create(input).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).fields.claimType).toMatch(/must be one of/);
  });

  it('throws ValidationError when diagnosisCode format is wrong', async () => {
    const sdk = createSDK();
    const err = await sdk.claims
      .create({ ...VALID_INPUT, diagnosisCode: 'not-valid' })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).fields.diagnosisCode).toMatch(/ICD-10/);
  });

  it('throws ValidationError when treatmentDate is malformed', async () => {
    const sdk = createSDK();
    const err = await sdk.claims
      .create({ ...VALID_INPUT, treatmentDate: '15/03/2024' })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).fields.treatmentDate).toMatch(/YYYY-MM-DD/);
  });

  it('throws ValidationError when amount is zero or negative', async () => {
    const sdk = createSDK();
    const err = await sdk.claims
      .create({ ...VALID_INPUT, amount: -100 })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).fields.amount).toMatch(/positive/);
  });

  it('throws ValidationError when currency is not 3-letter ISO code', async () => {
    const sdk = createSDK();
    const err = await sdk.claims
      .create({ ...VALID_INPUT, currency: 'BAHT' })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).fields.currency).toBeDefined();
  });

  it('accumulates multiple field errors in a single throw', async () => {
    const sdk = createSDK();
    const err = await sdk.claims
      .create({ ...VALID_INPUT, policyId: '', amount: 0, currency: '' })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ValidationError);
    const fields = (err as ValidationError).fields;
    expect(fields.policyId).toBeDefined();
    expect(fields.amount).toBeDefined();
    expect(fields.currency).toBeDefined();
  });

  it('does NOT call fetch when client-side validation fails', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const sdk = createSDK();
    await sdk.claims.create({ ...VALID_INPUT, policyId: '' }).catch(() => {});

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('passes validation and calls API for valid input', async () => {
    vi.stubGlobal('fetch', stubWithAuth({ status: 201, body: makeClaim() }));

    const sdk = createSDK();
    const result = await sdk.claims.create(VALID_INPUT);
    expect(result.id).toBeDefined();
  });
});
