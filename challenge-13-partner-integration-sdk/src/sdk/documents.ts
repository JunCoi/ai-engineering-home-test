import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { HttpClient } from './http-client.js';
import type { ClaimDocument, UploadFile, UploadDocumentOptions } from './types.js';
import { ValidationError } from './errors.js';

const VALID_DOCUMENT_TYPES = [
  'MEDICAL_RECEIPT',
  'DIAGNOSIS_NOTE',
  'HOSPITAL_CERTIFICATE',
  'DISCHARGE_SUMMARY',
  'PRESCRIPTION',
  'ID_CARD_COPY',
  'REFERRAL_LETTER',
  'APPOINTMENT_SLIP',
  'UNKNOWN',
] as const;

export class DocumentsClient {
  constructor(private readonly http: HttpClient) {}

  async upload(
    claimId: string,
    file: UploadFile | string,
    options: UploadDocumentOptions
  ): Promise<ClaimDocument> {
    if (!claimId?.trim()) {
      throw new ValidationError('Claim ID is required', { claimId: 'required' });
    }
    if (!options.type) {
      throw new ValidationError('Document type is required', { type: 'required' });
    }
    if (!VALID_DOCUMENT_TYPES.includes(options.type as (typeof VALID_DOCUMENT_TYPES)[number])) {
      throw new ValidationError('Invalid document type', {
        type: `must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}`,
      });
    }

    let resolved: UploadFile;
    if (typeof file === 'string') {
      const content = await readFile(file);
      resolved = { name: basename(file), content };
    } else {
      resolved = file;
    }

    // new Uint8Array() copies the data into a proper ArrayBuffer-backed view,
    // which is required by the Blob constructor's BlobPart type.
    const blob = new Blob([new Uint8Array(resolved.content)], {
      type: resolved.mimeType ?? 'application/octet-stream',
    });
    const formData = new FormData();
    formData.append('type', options.type);
    formData.append('file', blob, resolved.name);

    return this.http.uploadFormData<ClaimDocument>(
      `/api/v1/claims/${encodeURIComponent(claimId)}/documents`,
      formData,
      options.onProgress
    );
  }

  async list(claimId: string): Promise<ClaimDocument[]> {
    if (!claimId?.trim()) {
      throw new ValidationError('Claim ID is required', { claimId: 'required' });
    }
    return this.http.request<ClaimDocument[]>({
      method: 'GET',
      path: `/api/v1/claims/${encodeURIComponent(claimId)}/documents`,
    });
  }
}
