import type {
  TenantConfig,
  ProcessClaimInput,
  ProcessingResult,
  NotificationEvent,
  NotificationConfig,
  DiffItem,
} from '../types/tenant.js';

export function processClaim(tenant: TenantConfig, input: ProcessClaimInput): ProcessingResult {
  const claimTypeConfig = tenant.claimTypes[input.claimType];
  if (!claimTypeConfig?.enabled) {
    throw Object.assign(
      new Error(`Claim type ${input.claimType} is not enabled for ${tenant.branding.companyName}`),
      { status: 400 }
    );
  }

  // Approval routing
  const { autoApprovalThreshold, tiers } = tenant.approvalRules;
  const isAutoApproved = input.amount <= autoApprovalThreshold;
  let approvalRouting: ProcessingResult['approvalRouting'];
  if (isAutoApproved) {
    approvalRouting = { isAutoApproved: true };
  } else {
    const tier = tiers.find(
      t => input.amount >= t.minAmount && (t.maxAmount === null || input.amount < t.maxAmount)
    );
    approvalRouting = {
      isAutoApproved: false,
      tier: tier?.name ?? 'Unmatched tier',
      requiredRole: tier?.requiredRole,
    };
  }

  // Notifications for every configured event
  const notifications = (
    Object.entries(tenant.notifications) as [NotificationEvent, NotificationConfig][]
  )
    .filter(([, cfg]) => cfg.channels.length > 0)
    .map(([event, cfg]) => ({ event, channels: cfg.channels }));

  // SLA deadline
  const slaConfig = tenant.sla[input.claimType];
  const targetDays = slaConfig?.targetDays ?? 7;
  const deadline = new Date(input.submissionDate);
  deadline.setDate(deadline.getDate() + targetDays);

  // Custom field validation
  const customFieldErrors: string[] = [];
  for (const field of tenant.customFields) {
    if (field.required && !input.customFieldValues?.[field.id]?.trim()) {
      customFieldErrors.push(`${field.label} is required`);
    }
  }

  return {
    tenantId: tenant.id,
    tenantName: tenant.branding.companyName,
    claimType: input.claimType,
    amount: input.amount,
    requiredDocuments: claimTypeConfig.requiredDocuments,
    optionalDocuments: claimTypeConfig.optionalDocuments,
    approvalRouting,
    notifications,
    slaDeadline: deadline.toISOString().slice(0, 10),
    slaTargetDays: targetDays,
    customFieldsRequired: tenant.customFields,
    customFieldErrors,
  };
}

export function diffConfigs(a: TenantConfig, b: TenantConfig): DiffItem[] {
  const results: DiffItem[] = [];

  function recurse(objA: unknown, objB: unknown, path: string) {
    if (JSON.stringify(objA) === JSON.stringify(objB)) return;

    const isObj = (v: unknown) =>
      typeof v === 'object' && v !== null && !Array.isArray(v);

    if (isObj(objA) && isObj(objB)) {
      const keys = new Set([
        ...Object.keys(objA as Record<string, unknown>),
        ...Object.keys(objB as Record<string, unknown>),
      ]);
      for (const key of keys) {
        recurse(
          (objA as Record<string, unknown>)[key],
          (objB as Record<string, unknown>)[key],
          path ? `${path}.${key}` : key
        );
      }
    } else {
      const type = objA === undefined ? 'added' : objB === undefined ? 'removed' : 'changed';
      results.push({ path, valueA: objA, valueB: objB, type });
    }
  }

  // Exclude meta fields
  const { id: _ia, version: _va, createdAt: _ca, updatedAt: _ua, ...configA } = a;
  const { id: _ib, version: _vb, createdAt: _cb, updatedAt: _ub, ...configB } = b;
  recurse(configA, configB, '');
  return results;
}
