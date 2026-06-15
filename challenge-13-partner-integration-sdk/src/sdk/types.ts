export type { ClaimType, DocumentType } from '../../../shared/src/types/index.js';
import type { ClaimType, DocumentType } from '../../../shared/src/types/index.js';
export type { ConditionType, TreatmentType, NetworkStatus } from '../../../shared/src/types/index.js';
import type { ConditionType, TreatmentType, NetworkStatus } from '../../../shared/src/types/index.js';

export type ClaimStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface CreateClaimInput {
  // Core claim fields
  policyId: string;
  claimType: ClaimType;
  diagnosisCode: string;
  treatmentDate: string;
  amount: number;
  currency: string;
  notes?: string;

  // Extended fields — when provided, the server runs the full AI assessment + regulatory pipeline.
  // policyId must be one of the seeded policies: POL-1001, POL-2001, POL-3001.
  memberId?: string;
  diagnosis?: string;
  procedures?: string[];
  submittedDocumentIds?: string[];
  requiredDocumentTypes?: DocumentType[];

  // Fields for regulatory compliance (Challenge 12)
  countryCode?: string;
  conditionType?: ConditionType;
  treatmentType?: TreatmentType;
  networkStatus?: NetworkStatus;
  policyStartDate?: string;
  patient?: {
    fullName: string;
    nationalId?: string;
  };
}

export interface AssessmentResult {
  recommendation: 'APPROVE' | 'REJECT' | 'REQUEST_MORE_INFO';
  coveredAmount: number;
  copay: number;
  memberResponsibility: number;
  reasoning: string[];
  policyCitations: string[];
}

export interface ComplianceResult {
  overallStatus: 'COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NON_COMPLIANT';
  country: string;
  results: Array<{
    ruleId: string;
    status: 'PASS' | 'FAIL' | 'NOT_APPLICABLE';
    message: string;
    remediation?: string;
  }>;
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
  // Present when the claim was created with extended pipeline fields
  assessment?: AssessmentResult;
  compliance?: ComplianceResult;
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
