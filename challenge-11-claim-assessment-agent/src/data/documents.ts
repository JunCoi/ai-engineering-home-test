import type { DocumentRecord } from "../types/domain.js";

export const documents: DocumentRecord[] = [
  {
    documentId: "DOC-1001-RECEIPT",
    claimId: "CLM-1001",
    expectedType: "medical_receipt",
    actualType: "medical_receipt",
    isComplete: true,
    issues: []
  },
  {
    documentId: "DOC-1001-DIAGNOSIS",
    claimId: "CLM-1001",
    expectedType: "diagnosis_note",
    actualType: "diagnosis_note",
    isComplete: true,
    issues: []
  },
  {
    documentId: "DOC-2001-RECEIPT",
    claimId: "CLM-2001",
    expectedType: "medical_receipt",
    actualType: "medical_receipt",
    isComplete: true,
    issues: []
  },
  {
    documentId: "DOC-2001-DIAGNOSIS",
    claimId: "CLM-2001",
    expectedType: "diagnosis_note",
    actualType: "diagnosis_note",
    isComplete: true,
    issues: []
  },
  {
    documentId: "DOC-3001-RECEIPT",
    claimId: "CLM-3001",
    expectedType: "medical_receipt",
    actualType: "medical_receipt",
    isComplete: true,
    issues: []
  },
  {
    documentId: "DOC-3001-REFERRAL-WRONG",
    claimId: "CLM-3001",
    expectedType: "referral_letter",
    actualType: "appointment_slip",
    isComplete: true,
    issues: ["Submitted document is an appointment slip, not a referral letter"]
  }
];
