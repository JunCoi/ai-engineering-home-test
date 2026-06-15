import { describe, it, expect, vi, afterEach } from 'vitest';
import { ValidationError, type UploadDocumentOptions } from '../src/sdk/index.js';
import { createSDK, makeDocument, stubWithAuth, stubFetch, makeToken } from './test-utils.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

const CLAIM_ID = 'CLM-ABCD1234';
const SAMPLE_FILE = {
  name: 'receipt.pdf',
  content: Buffer.from('fake pdf content'),
  mimeType: 'application/pdf',
};

describe('sdk.documents.upload()', () => {
  it('returns the uploaded document on success', async () => {
    const doc = makeDocument();
    vi.stubGlobal('fetch', stubWithAuth({ status: 201, body: doc }));

    const sdk = createSDK();
    const result = await sdk.documents.upload(CLAIM_ID, SAMPLE_FILE, {
      type: 'MEDICAL_RECEIPT',
    });

    expect(result.id).toBe(doc.id);
    expect(result.type).toBe('MEDICAL_RECEIPT');
  });

  it('sends a POST to /api/v1/claims/:id/documents', async () => {
    const doc = makeDocument();
    const mockFetch = stubWithAuth({ status: 201, body: doc });
    vi.stubGlobal('fetch', mockFetch);

    const sdk = createSDK();
    await sdk.documents.upload(CLAIM_ID, SAMPLE_FILE, { type: 'MEDICAL_RECEIPT' });

    const [uploadCall] = mockFetch.mock.calls.slice(-1);
    expect(uploadCall[0]).toContain(`/api/v1/claims/${CLAIM_ID}/documents`);
    expect((uploadCall[1] as RequestInit).method).toBe('POST');
  });

  it('calls onProgress at 0% and 100%', async () => {
    vi.stubGlobal('fetch', stubWithAuth({ status: 201, body: makeDocument() }));

    const sdk = createSDK();
    const progressValues: number[] = [];

    await sdk.documents.upload(CLAIM_ID, SAMPLE_FILE, {
      type: 'MEDICAL_RECEIPT',
      onProgress: (pct) => progressValues.push(pct),
    });

    expect(progressValues).toContain(0);
    expect(progressValues).toContain(100);
  });

  it('throws ValidationError when document type is missing', async () => {
    const sdk = createSDK();
    const opts = {} as unknown as UploadDocumentOptions;
    const err = await sdk.documents.upload(CLAIM_ID, SAMPLE_FILE, opts).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).fields.type).toBe('required');
  });

  it('throws ValidationError for invalid document type', async () => {
    const sdk = createSDK();
    const opts = { type: 'INVALID_TYPE' } as unknown as UploadDocumentOptions;
    const err = await sdk.documents.upload(CLAIM_ID, SAMPLE_FILE, opts).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).fields.type).toMatch(/must be one of/);
  });

  it('throws ValidationError when claimId is empty', async () => {
    const sdk = createSDK();
    const err = await sdk.documents
      .upload('', SAMPLE_FILE, { type: 'MEDICAL_RECEIPT' })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).fields.claimId).toBe('required');
  });
});

describe('sdk.documents.list()', () => {
  it('returns documents for a claim', async () => {
    const docs = [makeDocument(), makeDocument({ id: 'DOC-2', type: 'DIAGNOSIS_NOTE' })];
    vi.stubGlobal('fetch', stubWithAuth({ status: 200, body: docs }));

    const sdk = createSDK();
    const result = await sdk.documents.list(CLAIM_ID);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('DOC-ABCD1234');
  });

  it('returns empty array when claim has no documents', async () => {
    vi.stubGlobal('fetch', stubWithAuth({ status: 200, body: [] }));

    const sdk = createSDK();
    const result = await sdk.documents.list(CLAIM_ID);
    expect(result).toHaveLength(0);
  });

  it('throws ValidationError when claimId is empty', async () => {
    const sdk = createSDK();
    const err = await sdk.documents.list('').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).fields.claimId).toBe('required');
  });
});
