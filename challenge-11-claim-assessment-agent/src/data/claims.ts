import type { Claim } from "../types/domain.js";

export const claims: Claim[] = [
  {
    claimId: "CLM-1001",
    policyId: "POL-1001",
    memberId: "MBR-001",
    claimType: "outpatient",
    amount: 500,
    currency: "USD",
    diagnosis: "acute bronchitis",
    procedures: ["doctor_consultation", "standard_medication"],
    treatmentDate: "2026-05-10",
    submittedDocumentIds: ["DOC-1001-RECEIPT", "DOC-1001-DIAGNOSIS"],
    requiredDocumentTypes: ["medical_receipt", "diagnosis_note"],
    expectedOutcome: "APPROVE"
  },
  {
    claimId: "CLM-2001",
    policyId: "POL-2001",
    memberId: "MBR-002",
    claimType: "outpatient",
    amount: 1500,
    currency: "USD",
    diagnosis: "cosmetic skin resurfacing",
    procedures: ["cosmetic_treatment"],
    treatmentDate: "2026-04-15",
    submittedDocumentIds: ["DOC-2001-RECEIPT", "DOC-2001-DIAGNOSIS"],
    requiredDocumentTypes: ["medical_receipt", "diagnosis_note"],
    expectedOutcome: "REJECT"
  },
  {
    claimId: "CLM-3001",
    policyId: "POL-3001",
    memberId: "MBR-003",
    claimType: "specialist",
    amount: 900,
    currency: "USD",
    diagnosis: "persistent knee pain",
    procedures: ["specialist_consultation", "x_ray"],
    treatmentDate: "2026-06-01",
    submittedDocumentIds: ["DOC-3001-RECEIPT", "DOC-3001-REFERRAL-WRONG"],
    requiredDocumentTypes: ["medical_receipt", "referral_letter"],
    expectedOutcome: "REQUEST_MORE_INFO"
  }
];
