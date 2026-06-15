import type { HttpClient } from './http-client.js';
import type {
  CreateClaimInput,
  Claim,
  ListClaimsInput,
  PaginatedClaims,
  ClaimStatus,
} from './types.js';
import { ValidationError } from './errors.js';

const VALID_CLAIM_TYPES = ['OUTPATIENT', 'INPATIENT', 'DENTAL', 'SPECIALIST'] as const;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ICD10_RE = /^[A-Z]\d{2}(\.\d+)?$/;

export class ClaimsClient {
  private readonly statusListeners = new Map<
    string,
    Array<(status: ClaimStatus, claim: Claim) => void>
  >();
  private readonly pollingIntervals = new Map<string, ReturnType<typeof setInterval>>();

  constructor(private readonly http: HttpClient) {}

  async create(input: CreateClaimInput): Promise<Claim> {
    this.validateCreateInput(input);
    return this.http.request<Claim>({
      method: 'POST',
      path: '/api/v1/claims',
      body: input,
    });
  }

  async get(claimId: string): Promise<Claim> {
    if (!claimId?.trim()) {
      throw new ValidationError('Claim ID is required', { claimId: 'required' });
    }
    return this.http.request<Claim>({
      method: 'GET',
      path: `/api/v1/claims/${encodeURIComponent(claimId)}`,
    });
  }

  async list(params: ListClaimsInput = {}): Promise<PaginatedClaims> {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.page != null) qs.set('page', String(params.page));
    if (params.pageSize != null) qs.set('pageSize', String(params.pageSize));
    const query = qs.toString();

    return this.http.request<PaginatedClaims>({
      method: 'GET',
      path: `/api/v1/claims${query ? `?${query}` : ''}`,
    });
  }

  onStatusChange(
    claimId: string,
    callback: (status: ClaimStatus, claim: Claim) => void,
    pollIntervalMs = 5_000
  ): () => void {
    if (!this.statusListeners.has(claimId)) {
      this.statusListeners.set(claimId, []);
    }
    this.statusListeners.get(claimId)!.push(callback);

    let lastStatus: ClaimStatus | undefined;

    if (!this.pollingIntervals.has(claimId)) {
      const interval = setInterval(async () => {
        try {
          const claim = await this.get(claimId);
          if (claim.status !== lastStatus) {
            lastStatus = claim.status;
            for (const fn of this.statusListeners.get(claimId) ?? []) {
              fn(claim.status, claim);
            }
          }
        } catch {
          // Silently ignore polling errors so we keep trying
        }
      }, pollIntervalMs);
      this.pollingIntervals.set(claimId, interval);
    }

    return () => this.removeListener(claimId, callback);
  }

  private removeListener(
    claimId: string,
    callback: (status: ClaimStatus, claim: Claim) => void
  ): void {
    const listeners = this.statusListeners.get(claimId);
    if (!listeners) return;

    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);

    if (listeners.length === 0) {
      this.statusListeners.delete(claimId);
      const interval = this.pollingIntervals.get(claimId);
      if (interval) {
        clearInterval(interval);
        this.pollingIntervals.delete(claimId);
      }
    }
  }

  private validateCreateInput(input: CreateClaimInput): void {
    const fields: Record<string, string> = {};

    if (!input.policyId?.trim()) {
      fields.policyId = 'required';
    }

    if (!input.claimType) {
      fields.claimType = 'required';
    } else if (!VALID_CLAIM_TYPES.includes(input.claimType as (typeof VALID_CLAIM_TYPES)[number])) {
      fields.claimType = `must be one of: ${VALID_CLAIM_TYPES.join(', ')}`;
    }

    if (!input.diagnosisCode?.trim()) {
      fields.diagnosisCode = 'required';
    } else if (!ICD10_RE.test(input.diagnosisCode)) {
      fields.diagnosisCode = 'must be a valid ICD-10 code (e.g. J06.9)';
    }

    if (!input.treatmentDate?.trim()) {
      fields.treatmentDate = 'required';
    } else if (!ISO_DATE_RE.test(input.treatmentDate) || isNaN(Date.parse(input.treatmentDate))) {
      fields.treatmentDate = 'must be a valid date in YYYY-MM-DD format';
    }

    if (input.amount == null) {
      fields.amount = 'required';
    } else if (typeof input.amount !== 'number' || input.amount <= 0) {
      fields.amount = 'must be a positive number';
    }

    if (!input.currency?.trim()) {
      fields.currency = 'required';
    } else if (!/^[A-Z]{3}$/.test(input.currency)) {
      fields.currency = 'must be a 3-letter ISO currency code (e.g. THB)';
    }

    if (Object.keys(fields).length > 0) {
      throw new ValidationError('Validation failed', fields);
    }
  }
}
