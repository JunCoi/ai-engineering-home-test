import type { Claim } from "../types/domain.js";

export const claims: Claim[] = [
  {
    claimId: "CLM-1001",
    policyId: "POL-1001",
    memberId: "MBR-001",
    claimType: "OUTPATIENT",
    amount: 500,
    currency: "USD",
    diagnosis: "acute bronchitis",
    procedures: ["DOCTOR_CONSULTATION", "STANDARD_MEDICATION"],
    treatmentDate: "2026-05-10",
    submittedDocumentIds: ["DOC-1001-RECEIPT", "DOC-1001-DIAGNOSIS"],
    requiredDocumentTypes: ["MEDICAL_RECEIPT", "DIAGNOSIS_NOTE"],
    expectedOutcome: "APPROVE"
  },
  {
    claimId: "CLM-2001",
    policyId: "POL-2001",
    memberId: "MBR-002",
    claimType: "OUTPATIENT",
    amount: 1500,
    currency: "USD",
    diagnosis: "cosmetic skin resurfacing",
    procedures: ["COSMETIC_TREATMENT"],
    treatmentDate: "2026-04-15",
    submittedDocumentIds: ["DOC-2001-RECEIPT", "DOC-2001-DIAGNOSIS"],
    requiredDocumentTypes: ["MEDICAL_RECEIPT", "DIAGNOSIS_NOTE"],
    expectedOutcome: "REJECT"
  },
  {
    claimId: "CLM-3001",
    policyId: "POL-3001",
    memberId: "MBR-003",
    claimType: "SPECIALIST",
    amount: 900,
    currency: "USD",
    diagnosis: "persistent knee pain",
    procedures: ["SPECIALIST_CONSULTATION", "X_RAY"],
    treatmentDate: "2026-06-01",
    submittedDocumentIds: ["DOC-3001-RECEIPT", "DOC-3001-REFERRAL-WRONG"],
    requiredDocumentTypes: ["MEDICAL_RECEIPT", "REFERRAL_LETTER"],
    expectedOutcome: "REQUEST_MORE_INFO"
  }
];
