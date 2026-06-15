export type { ClaimType, DocumentType } from '../../../shared/src/types/index.js';
import type { ClaimType, DocumentType } from '../../../shared/src/types/index.js';

export type ClaimStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface CreateClaimInput {
  policyId: string;
  claimType: ClaimType;
  diagnosisCode: string;
  treatmentDate: string;
  amount: number;
  currency: string;
  notes?: string;
}

export interface Claim {
  id: string;
  policyId: string;
  claimType: ClaimType;
  diagnosisCode: string;
  treatmentDate: string;
  amount: number;
  currency: string;
  status: ClaimStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListClaimsInput {
  status?: ClaimStatus;
  page?: number;
  pageSize?: number;
}

export interface PaginatedClaims {
  items: Claim[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ClaimDocument {
  id: string;
  claimId: string;
  type: DocumentType;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface UploadFile {
  name: string;
  content: Buffer | Uint8Array;
  mimeType?: string;
}

export interface UploadDocumentOptions {
  type: DocumentType;
  onProgress?: (percent: number) => void;
}

export interface SDKConfig {
  apiKey: string;
  environment?: 'sandbox' | 'production';
  timeout?: number;
  baseUrl?: string;
  maxRetries?: number;
}

export interface TokenResponse {
  token: string;
  expiresAt: string;
}
