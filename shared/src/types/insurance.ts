export type ClaimType = "OUTPATIENT" | "INPATIENT" | "DENTAL" | "SPECIALIST";

export type DocumentType =
  | "MEDICAL_RECEIPT"
  | "DIAGNOSIS_NOTE"
  | "HOSPITAL_CERTIFICATE"
  | "DISCHARGE_SUMMARY"
  | "PRESCRIPTION"
  | "ID_CARD_COPY"
  | "REFERRAL_LETTER"
  | "APPOINTMENT_SLIP"
  | "UNKNOWN";

export type ConditionType = "GENERAL" | "PRE_EXISTING";

export type TreatmentType =
  | "NORMAL"
  | "EMERGENCY"
  | "MATERNITY"
  | "MENTAL_HEALTH"
  | "PHYSICAL_HEALTH";

export type NetworkStatus = "IN_NETWORK" | "OUT_OF_NETWORK";

export type CoverageLevel = "NONE" | "PARTIAL" | "SAME_AS_PHYSICAL" | "FULL";

export type Recommendation = "APPROVE" | "REJECT" | "REQUEST_MORE_INFO";
