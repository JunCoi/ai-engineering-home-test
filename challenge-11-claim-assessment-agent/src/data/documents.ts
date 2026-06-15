import type { DocumentRecord } from "../types/domain.js";

export const documents: DocumentRecord[] = [
  {
    documentId: "DOC-1001-RECEIPT",
    claimId: "CLM-1001",
    expectedType: "MEDICAL_RECEIPT",
    actualType: "MEDICAL_RECEIPT",
    isComplete: true,
    issues: []
  },
  {
    documentId: "DOC-1001-DIAGNOSIS",
    claimId: "CLM-1001",
    expectedType: "DIAGNOSIS_NOTE",
    actualType: "DIAGNOSIS_NOTE",
    isComplete: true,
    issues: []
  },
  {
    documentId: "DOC-2001-RECEIPT",
    claimId: "CLM-2001",
    expectedType: "MEDICAL_RECEIPT",
    actualType: "MEDICAL_RECEIPT",
    isComplete: true,
    issues: []
  },
  {
    documentId: "DOC-2001-DIAGNOSIS",
    claimId: "CLM-2001",
    expectedType: "DIAGNOSIS_NOTE",
    actualType: "DIAGNOSIS_NOTE",
    isComplete: true,
    issues: []
  },
  {
    documentId: "DOC-3001-RECEIPT",
    claimId: "CLM-3001",
    expectedType: "MEDICAL_RECEIPT",
    actualType: "MEDICAL_RECEIPT",
    isComplete: true,
    issues: []
  },
  {
    documentId: "DOC-3001-REFERRAL-WRONG",
    claimId: "CLM-3001",
    expectedType: "REFERRAL_LETTER",
    actualType: "APPOINTMENT_SLIP",
    isComplete: true,
    issues: ["Submitted document is an appointment slip, not a referral letter"]
  }
];
