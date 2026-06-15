import { describe, it, expect, vi, afterEach } from 'vitest';
import { AuthError } from '../src/sdk/index.js';
import { createSDK, makeClaim, makeToken, stubFetch, stubWithAuth } from './test-utils.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Authentication', () => {
  it('exchanges API key for JWT before first API call', async () => {
    const mockFetch = stubWithAuth({ status: 200, body: makeClaim() });
    vi.stubGlobal('fetch', mockFetch);

    const sdk = createSDK();
    await sdk.claims.get('CLM-001');

    // First call must be the token exchange
    const firstUrl = mockFetch.mock.calls[0][0] as string;
    expect(firstUrl).toContain('/api/v1/auth/token');
    const firstBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(firstBody.apiKey).toBe('pk_test_unit');
  });

  it('reuses a cached token for subsequent calls', async () => {
    const claim = makeClaim();
    const mockFetch = stubFetch(
      { status: 200, body: makeToken() },   // auth
      { status: 200, body: claim },          // first API call
      { status: 200, body: claim },          // second API call — should NOT trigger another auth
    );
    vi.stubGlobal('fetch', mockFetch);

    const sdk = createSDK();
    await sdk.claims.get('CLM-001');
    await sdk.claims.get('CLM-001');

    const tokenCalls = mockFetch.mock.calls.filter((c) =>
      (c[0] as string).includes('/auth/token')
    );
    expect(tokenCalls).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('throws AuthError when API key is invalid', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch({ status: 401, body: { message: 'Invalid API key' } })
    );

    const sdk = createSDK();
    const err = await sdk.claims.get('CLM-001').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AuthError);
    expect((err as AuthError).statusCode).toBe(401);
  });

  it('refreshes token and retries when API returns 401', async () => {
    const claim = makeClaim();
    const freshToken = makeToken(7_200_000); // 2-hour token

    const mockFetch = stubFetch(
      { status: 200, body: makeToken(7_200_000) }, // initial auth
      { status: 401, body: { message: 'Token expired' } }, // API rejects token
      { status: 200, body: freshToken },             // refresh
      { status: 200, body: claim },                  // retry succeeds
    );
    vi.stubGlobal('fetch', mockFetch);

    const sdk = createSDK();
    const result = await sdk.claims.get('CLM-001');

    expect(result.id).toBe(claim.id);
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('throws AuthError when refresh also fails after 401', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(
        { status: 200, body: makeToken(7_200_000) }, // initial auth
        { status: 401, body: { message: 'Token expired' } }, // API rejects
        { status: 401, body: { message: 'Auth failed' } },   // refresh fails
      )
    );

    const sdk = createSDK();
    const err = await sdk.claims.get('CLM-001').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AuthError);
  });
});
