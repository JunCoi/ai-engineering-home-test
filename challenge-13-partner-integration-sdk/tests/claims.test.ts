import { describe, it, expect, vi, afterEach } from 'vitest';
import { ApiError } from '../src/sdk/index.js';
import {
  createSDK,
  makeClaim,
  makePage,
  stubWithAuth,
} from './test-utils.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sdk.claims.create()', () => {
  it('returns the created claim on success', async () => {
    const claim = makeClaim();
    vi.stubGlobal('fetch', stubWithAuth({ status: 201, body: claim }));

    const sdk = createSDK();
    const result = await sdk.claims.create({
      policyId: 'POL-123',
      claimType: 'OUTPATIENT',
      diagnosisCode: 'J06.9',
      treatmentDate: '2024-03-15',
      amount: 15_000,
      currency: 'THB',
    });

    expect(result.id).toBe(claim.id);
    expect(result.status).toBe('PENDING');
  });

  it('sends a POST to /api/v1/claims', async () => {
    const claim = makeClaim();
    const mockFetch = stubWithAuth({ status: 201, body: claim });
    vi.stubGlobal('fetch', mockFetch);

    const sdk = createSDK();
    await sdk.claims.create({
      policyId: 'POL-123',
      claimType: 'OUTPATIENT',
      diagnosisCode: 'J06.9',
      treatmentDate: '2024-03-15',
      amount: 15_000,
      currency: 'THB',
    });

    const [claimsCall] = mockFetch.mock.calls.slice(-1);
    expect(claimsCall[0]).toContain('/api/v1/claims');
    expect((claimsCall[1] as RequestInit).method).toBe('POST');
  });
});

describe('sdk.claims.get()', () => {
  it('returns claim details by ID', async () => {
    const claim = makeClaim({ id: 'CLM-GET001', status: 'UNDER_REVIEW' });
    vi.stubGlobal('fetch', stubWithAuth({ status: 200, body: claim }));

    const sdk = createSDK();
    const result = await sdk.claims.get('CLM-GET001');

    expect(result.id).toBe('CLM-GET001');
    expect(result.status).toBe('UNDER_REVIEW');
  });

  it('throws ApiError when claim is not found', async () => {
    vi.stubGlobal(
      'fetch',
      stubWithAuth({ status: 404, body: { message: 'Claim CLM-MISSING not found' } })
    );

    const sdk = createSDK();
    await expect(sdk.claims.get('CLM-MISSING')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('sdk.claims.list()', () => {
  it('returns paginated claims', async () => {
    const page = makePage([makeClaim(), makeClaim({ id: 'CLM-2' })]);
    vi.stubGlobal('fetch', stubWithAuth({ status: 200, body: page }));

    const sdk = createSDK();
    const result = await sdk.claims.list();

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('passes status filter as a query param', async () => {
    const page = makePage([makeClaim({ status: 'APPROVED' })]);
    const mockFetch = stubWithAuth({ status: 200, body: page });
    vi.stubGlobal('fetch', mockFetch);

    const sdk = createSDK();
    await sdk.claims.list({ status: 'APPROVED', page: 2, pageSize: 5 });

    const [claimsCall] = mockFetch.mock.calls.slice(-1);
    const url = claimsCall[0] as string;
    expect(url).toContain('status=APPROVED');
    expect(url).toContain('page=2');
    expect(url).toContain('pageSize=5');
  });

  it('returns empty page when no claims exist', async () => {
    vi.stubGlobal('fetch', stubWithAuth({ status: 200, body: makePage([]) }));

    const sdk = createSDK();
    const result = await sdk.claims.list({ status: 'PAID' });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
