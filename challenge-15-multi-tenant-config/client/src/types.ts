export const TENANT_CLAIM_TYPES = ['OUTPATIENT', 'INPATIENT', 'DENTAL', 'MATERNITY', 'OPTICAL'] as const;
export type TenantClaimType = (typeof TENANT_CLAIM_TYPES)[number];

export const NOTIFICATION_EVENTS = ['claim_submitted', 'approved', 'rejected', 'payment_sent'] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export const NOTIFICATION_CHANNELS = ['email', 'sms', 'webhook'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const DOCUMENT_TYPES = [
  'MEDICAL_RECEIPT',
  'DIAGNOSIS_NOTE',
  'HOSPITAL_CERTIFICATE',
  'DISCHARGE_SUMMARY',
  'PRESCRIPTION',
  'ID_CARD_COPY',
  'REFERRAL_LETTER',
  'APPOINTMENT_SLIP',
  'BIRTH_CERTIFICATE',
  'OPTICAL_PRESCRIPTION',
] as const;

export interface ApprovalTier {
  id: string;
  name: string;
  minAmount: number;
  maxAmount: number | null;
  requiredRole: string;
}

export interface ClaimTypeConfig {
  enabled: boolean;
  requiredDocuments: string[];
  optionalDocuments: string[];
}

export interface SLAConfig {
  targetDays: number;
  escalateTo?: string;
}

export interface CustomField {
  id: string;
  name: string;
  label: string;
  required: boolean;
}

export interface NotificationConfig {
  channels: NotificationChannel[];
  emailTemplate?: string;
}

export interface TenantConfig {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  historyCount?: number;
  branding: {
    companyName: string;
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
  };
  claimTypes: Partial<Record<TenantClaimType, ClaimTypeConfig>>;
  approvalRules: {
    autoApprovalThreshold: number;
    tiers: ApprovalTier[];
  };
  notifications: Partial<Record<NotificationEvent, NotificationConfig>>;
  sla: Partial<Record<TenantClaimType, SLAConfig>>;
  customFields: CustomField[];
}

export interface ProcessClaimInput {
  claimType: TenantClaimType;
  amount: number;
  submissionDate: string;
  customFieldValues?: Record<string, string>;
}

export interface ProcessingResult {
  tenantId: string;
  tenantName: string;
  claimType: TenantClaimType;
  amount: number;
  requiredDocuments: string[];
  optionalDocuments: string[];
  approvalRouting: {
    isAutoApproved: boolean;
    tier?: string;
    requiredRole?: string;
  };
  notifications: Array<{ event: NotificationEvent; channels: NotificationChannel[] }>;
  slaDeadline: string;
  slaTargetDays: number;
  customFieldsRequired: CustomField[];
  customFieldErrors: string[];
}

export interface DiffItem {
  path: string;
  valueA: unknown;
  valueB: unknown;
  type: 'added' | 'removed' | 'changed';
}

export interface DiffResponse {
  tenantA: TenantConfig;
  tenantB: TenantConfig;
  diffs: DiffItem[];
}
