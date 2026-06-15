import type { ClaimType, ConditionType, CoverageLevel, DocumentType, NetworkStatus, TreatmentType } from '../../../shared/src/types/index.js';
export type { ClaimType, ConditionType, CoverageLevel, DocumentType, NetworkStatus, TreatmentType };

export type Claim = {
  claimId: string;
  countryCode: string;
  claimType: Exclude<ClaimType, 'DENTAL'>;
  conditionType: ConditionType;
  treatmentType: TreatmentType;
  networkStatus: NetworkStatus;
  submissionDate: string;
  treatmentDate: string;
  policyStartDate: string;
  documents: DocumentType[];
  processingCompletedDate?: string;
  denialReason?: string;
  coverageLevel?: CoverageLevel;
  patient: {
    fullName: string;
    nationalId?: string;
    hkid?: string;
  };
  reports?: {
    external?: Record<string, string>;
    internal?: Record<string, string>;
  };
};
