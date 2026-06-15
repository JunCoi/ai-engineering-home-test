import type { ClaimType, DocumentType, Recommendation } from "../../../shared/src/types/index.js";
export type { ClaimType, DocumentType, Recommendation } from "../../../shared/src/types/index.js";

export type DocumentStatus = "COMPLETE" | "INCOMPLETE" | "WRONG_TYPE" | "MISSING";

export interface Claim {
  claimId: string;
  policyId: string;
  memberId: string;
  claimType: ClaimType;
  amount: number;
  currency: string;
  diagnosis: string;
  procedures: string[];
  treatmentDate: string;
  submittedDocumentIds: string[];
  requiredDocumentTypes: DocumentType[];
  expectedOutcome: Recommendation;
}

export interface DocumentRecord {
  documentId: string;
  claimId: string;
  expectedType: DocumentType;
  actualType: DocumentType;
  isComplete: boolean;
  issues: string[];
}

export interface PolicyClause {
  clauseId: string;
  title: string;
  text: string;
}

export interface BenefitConfig {
  annualLimit: number;
  remainingLimit: number;
  copayPercent: number;
  requiresMedicalNecessity: boolean;
}

export type BenefitByClaimType = Partial<Record<ClaimType, BenefitConfig>>;

export interface Policy {
  policyId: string;
  memberId: string;
  memberName: string;
  activeFrom: string;
  activeTo: string;
  coveredClaimTypes: ClaimType[];
  benefits: BenefitByClaimType;
  exclusions: string[];
  waitingPeriods: Record<string, number>;
  clauses: PolicyClause[];
}

export interface ToolCallLog {
  toolName: string;
  input: unknown;
  output: unknown;
  calledAt: string;
}

export interface ToolContext {
  logs: ToolCallLog[];
}

export interface DocumentReviewItem {
  documentId: string;
  expectedType: DocumentType;
  actualType?: DocumentType;
  status: DocumentStatus;
  issues: string[];
}

export interface AssessmentReport {
  claimId: string;
  recommendation: Recommendation;
  documentReview: DocumentReviewItem[];
  policyVerification: {
    policyActive: boolean;
    memberCovered: boolean;
    claimTypeCovered: boolean;
    issues: string[];
    citations: string[];
  };
  medicalNecessity: {
    isMedicallyNecessary: boolean;
    explanation: string;
    citations: string[];
  };
  benefitCalculation: {
    submittedAmount: number;
    coveredAmount: number;
    copay: number;
    memberResponsibility: number;
    remainingLimitAfterClaim: number;
    citations: string[];
  };
  reasoning: string[];
  policyCitations: string[];
  toolCallLogs: ToolCallLog[];
}
