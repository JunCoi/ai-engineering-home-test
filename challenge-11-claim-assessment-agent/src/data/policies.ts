import type { Policy } from "../types/domain.js";

export const policies: Policy[] = [
  {
    policyId: "POL-1001",
    memberId: "MBR-001",
    memberName: "An Nguyen",
    activeFrom: "2026-01-01",
    activeTo: "2026-12-31",
    coveredClaimTypes: ["outpatient", "inpatient", "specialist"],
    exclusions: ["cosmetic_treatment", "experimental_treatment"],
    waitingPeriods: { general: 30 },
    benefits: {
      outpatient: { annualLimit: 2000, remainingLimit: 1500, copayPercent: 10, requiresMedicalNecessity: true },
      inpatient: { annualLimit: 20000, remainingLimit: 18000, copayPercent: 5, requiresMedicalNecessity: true },
      specialist: { annualLimit: 3000, remainingLimit: 2200, copayPercent: 20, requiresMedicalNecessity: true },
      dental: { annualLimit: 0, remainingLimit: 0, copayPercent: 100, requiresMedicalNecessity: false }
    },
    clauses: [
      { clauseId: "POL-1001-C1", title: "Coverage Period", text: "Coverage is valid from 2026-01-01 to 2026-12-31 for member MBR-001." },
      { clauseId: "POL-1001-C2", title: "Outpatient Benefit", text: "Outpatient claims are covered up to 2,000 USD per policy year with 10% member copay." },
      { clauseId: "POL-1001-C3", title: "Medical Necessity", text: "Covered treatments must be clinically appropriate for the diagnosis." },
      { clauseId: "POL-1001-C4", title: "Required Documents", text: "Outpatient claims require medical receipt and diagnosis note." }
    ]
  },
  {
    policyId: "POL-2001",
    memberId: "MBR-002",
    memberName: "Binh Tran",
    activeFrom: "2026-01-01",
    activeTo: "2026-12-31",
    coveredClaimTypes: ["outpatient", "inpatient"],
    exclusions: ["cosmetic_treatment", "experimental_treatment"],
    waitingPeriods: { general: 30 },
    benefits: {
      outpatient: { annualLimit: 1000, remainingLimit: 700, copayPercent: 15, requiresMedicalNecessity: true },
      inpatient: { annualLimit: 10000, remainingLimit: 8000, copayPercent: 10, requiresMedicalNecessity: true },
      specialist: { annualLimit: 0, remainingLimit: 0, copayPercent: 100, requiresMedicalNecessity: false },
      dental: { annualLimit: 0, remainingLimit: 0, copayPercent: 100, requiresMedicalNecessity: false }
    },
    clauses: [
      { clauseId: "POL-2001-C1", title: "Coverage Period", text: "Coverage is valid from 2026-01-01 to 2026-12-31 for member MBR-002." },
      { clauseId: "POL-2001-C2", title: "Covered Claim Types", text: "This policy covers outpatient and inpatient claims only." },
      { clauseId: "POL-2001-C3", title: "Exclusions", text: "Cosmetic treatment and experimental treatment are excluded from coverage." },
      { clauseId: "POL-2001-C4", title: "Benefit Limit", text: "Outpatient claims are limited to remaining benefit balance and may not be approved above the remaining limit." }
    ]
  },
  {
    policyId: "POL-3001",
    memberId: "MBR-003",
    memberName: "Chi Le",
    activeFrom: "2026-01-01",
    activeTo: "2026-12-31",
    coveredClaimTypes: ["outpatient", "specialist"],
    exclusions: ["cosmetic_treatment"],
    waitingPeriods: { general: 30 },
    benefits: {
      outpatient: { annualLimit: 1800, remainingLimit: 1600, copayPercent: 10, requiresMedicalNecessity: true },
      specialist: { annualLimit: 2500, remainingLimit: 2000, copayPercent: 20, requiresMedicalNecessity: true },
      inpatient: { annualLimit: 0, remainingLimit: 0, copayPercent: 100, requiresMedicalNecessity: false },
      dental: { annualLimit: 0, remainingLimit: 0, copayPercent: 100, requiresMedicalNecessity: false }
    },
    clauses: [
      { clauseId: "POL-3001-C1", title: "Coverage Period", text: "Coverage is valid from 2026-01-01 to 2026-12-31 for member MBR-003." },
      { clauseId: "POL-3001-C2", title: "Specialist Benefit", text: "Specialist claims require referral letter and medical receipt before assessment can be completed." },
      { clauseId: "POL-3001-C3", title: "Information Request", text: "If required documents are missing or incomplete, the claim must request more information rather than be rejected." },
      { clauseId: "POL-3001-C4", title: "Medical Necessity", text: "Specialist treatment must be clinically appropriate for the submitted diagnosis." }
    ]
  }
];
