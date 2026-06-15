import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { ApiError, NetworkError, ValidationError } from '../src/sdk/index.js';
import { createSDK, makeClaim, makeToken, stubFetch, stubWithAuth } from './test-utils.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Retry logic', () => {
  it('retries on 503 and returns successful response', async () => {
    const claim = makeClaim();
    vi.stubGlobal(
      'fetch',
      stubFetch(
        { status: 200, body: makeToken() },                    // auth
        { status: 503, body: { message: 'unavailable' } },    // first try
        { status: 200, body: claim },                          // retry succeeds
      )
    );

    const sdk = createSDK({ maxRetries: 3 });
    const promise = sdk.claims.get('CLM-001');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.id).toBe(claim.id);
  });

  it('throws ApiError after exhausting max retries on persistent 503', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(
        { status: 200, body: makeToken() },
        { status: 503, body: { message: 'down' } },
        { status: 503, body: { message: 'down' } },
        { status: 503, body: { message: 'down' } },
      )
    );

    const sdk = createSDK({ maxRetries: 2 });
    const promise = sdk.claims.get('CLM-001').catch((e: unknown) => e);
    await vi.runAllTimersAsync();
    const err = await promise;

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).statusCode).toBe(503);
  });

  it('retries on network error (fetch throws)', async () => {
    const claim = makeClaim();
    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(makeToken()) });
        if (callCount === 2) return Promise.reject(new TypeError('fetch failed'));
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(claim) });
      })
    );

    const sdk = createSDK({ maxRetries: 3 });
    const promise = sdk.claims.get('CLM-001');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.id).toBe(claim.id);
  });

  it('does NOT retry on 400 validation errors', async () => {
    const mockFetch = stubFetch(
      { status: 200, body: makeToken() },
      { status: 400, body: { message: 'Validation failed', fields: { amount: 'required' } } },
    );
    vi.stubGlobal('fetch', mockFetch);

    const sdk = createSDK({ maxRetries: 3 });
    const promise = sdk.claims.get('CLM-001').catch((e: unknown) => e);
    await vi.runAllTimersAsync();
    const err = await promise;

    expect(err).toBeInstanceOf(ValidationError);
    // Should only have called fetch twice (auth + one API call), no retries
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on 404 not found', async () => {
    const mockFetch = stubFetch(
      { status: 200, body: makeToken() },
      { status: 404, body: { message: 'Not found' } },
    );
    vi.stubGlobal('fetch', mockFetch);

    const sdk = createSDK({ maxRetries: 3 });
    const promise = sdk.claims.get('CLM-MISSING').catch((e: unknown) => e);
    await vi.runAllTimersAsync();
    const err = await promise;

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).statusCode).toBe(404);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('uses exponential backoff between retries', async () => {
    const claim = makeClaim();
    vi.stubGlobal(
      'fetch',
      stubFetch(
        { status: 200, body: makeToken() },
        { status: 503, body: { message: 'down' } },
        { status: 503, body: { message: 'down' } },
        { status: 200, body: claim },
      )
    );

    const sdk = createSDK({ maxRetries: 3 });
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const promise = sdk.claims.get('CLM-001');
    await vi.runAllTimersAsync();
    await promise;

    // Check that setTimeout was called for backoff delays
    const delayCalls = setTimeoutSpy.mock.calls.filter(([, ms]) => typeof ms === 'number' && ms > 0);
    expect(delayCalls.length).toBeGreaterThanOrEqual(2);
    // Second delay should be longer than first (exponential)
    const delays = delayCalls.map(([, ms]) => ms as number);
    expect(delays[1]).toBeGreaterThan(delays[0]);
  });
});
