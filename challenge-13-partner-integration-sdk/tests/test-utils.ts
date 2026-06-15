import { vi } from 'vitest';
import { InsuranceSDK } from '../src/sdk/index.js';
import type { Claim, ClaimDocument, PaginatedClaims, TokenResponse } from '../src/sdk/index.js';

export const TEST_BASE_URL = 'http://test.local';
export const TEST_API_KEY = 'pk_test_unit';

export function createSDK(overrides: { maxRetries?: number } = {}) {
  return new InsuranceSDK({
    apiKey: TEST_API_KEY,
    baseUrl: TEST_BASE_URL,
    timeout: 5_000,
    maxRetries: overrides.maxRetries ?? 0,
  });
}

export function makeToken(expiresInMs = 3_600_000): TokenResponse {
  return {
    token: 'test-jwt-token',
    expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
  };
}

export function makeClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: 'CLM-ABCD1234',
    policyId: 'POL-123',
    claimType: 'OUTPATIENT',
    diagnosisCode: 'J06.9',
    treatmentDate: '2024-03-15',
    amount: 15_000,
    currency: 'THB',
    status: 'PENDING',
    createdAt: '2024-03-15T10:00:00.000Z',
    updatedAt: '2024-03-15T10:00:00.000Z',
    ...overrides,
  };
}

export function makeDocument(overrides: Partial<ClaimDocument> = {}): ClaimDocument {
  return {
    id: 'DOC-ABCD1234',
    claimId: 'CLM-ABCD1234',
    type: 'MEDICAL_RECEIPT',
    filename: 'receipt.pdf',
    size: 1024,
    mimeType: 'application/pdf',
    uploadedAt: '2024-03-15T11:00:00.000Z',
    ...overrides,
  };
}

export function makePage(items: Claim[] = []): PaginatedClaims {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  };
}

// Creates a fetch mock that sequences through the provided responses.
// Each call to fetch returns the next response in order; extras return the last one.
export function stubFetch(
  ...responses: Array<{ status: number; body: unknown }>
): ReturnType<typeof vi.fn> {
  const queue = [...responses];
  return vi.fn().mockImplementation(() => {
    const next = queue.length > 1 ? queue.shift()! : queue[0]!;
    return Promise.resolve({
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      json: () => Promise.resolve(next.body),
    } as Response);
  });
}

// Shorthand: first response is always the auth token, rest are API responses
export function stubWithAuth(
  ...apiResponses: Array<{ status: number; body: unknown }>
): ReturnType<typeof vi.fn> {
  return stubFetch({ status: 200, body: makeToken() }, ...apiResponses);
}
