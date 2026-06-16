import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import {
  TENANT_CLAIM_TYPES,
  NOTIFICATION_EVENTS,
  NOTIFICATION_CHANNELS,
  DOCUMENT_TYPES,
  type TenantConfig,
  type TenantClaimType,
  type NotificationEvent,
  type NotificationChannel,
  type ApprovalTier,
  type CustomField,
} from '../types';
import { randomUUID } from '../utils';

interface TierForm {
  id: string; name: string; minAmount: string; maxAmount: string; requiredRole: string;
}
interface ClaimTypeForm {
  enabled: boolean;
  requiredDocuments: string[];
  optionalDocuments: string[];
}
type ClaimTypesForm = Record<TenantClaimType, ClaimTypeForm>;

function defaultClaimTypes(): ClaimTypesForm {
  return Object.fromEntries(
    TENANT_CLAIM_TYPES.map(t => [t, { enabled: false, requiredDocuments: [], optionalDocuments: [] }])
  ) as unknown as ClaimTypesForm;
}

function configToForm(c: TenantConfig) {
  return {
    companyName: c.branding.companyName,
    logoUrl: c.branding.logoUrl ?? '',
    primaryColor: c.branding.primaryColor,
    secondaryColor: c.branding.secondaryColor,
    claimTypes: Object.fromEntries(
      TENANT_CLAIM_TYPES.map(t => [t, c.claimTypes[t] ?? { enabled: false, requiredDocuments: [], optionalDocuments: [] }])
    ) as ClaimTypesForm,
    autoApprovalThreshold: String(c.approvalRules.autoApprovalThreshold),
    tiers: c.approvalRules.tiers.map(t => ({
      id: t.id, name: t.name,
      minAmount: String(t.minAmount),
      maxAmount: t.maxAmount !== null ? String(t.maxAmount) : '',
      requiredRole: t.requiredRole,
    })),
    notifChannels: Object.fromEntries(
      NOTIFICATION_EVENTS.map(ev => [
        ev,
        Object.fromEntries(NOTIFICATION_CHANNELS.map(ch => [ch, c.notifications[ev]?.channels.includes(ch) ?? false])),
      ])
    ) as Record<NotificationEvent, Record<NotificationChannel, boolean>>,
    sla: Object.fromEntries(TENANT_CLAIM_TYPES.map(t => [t, String(c.sla[t]?.targetDays ?? 7)])) as Record<TenantClaimType, string>,
    customFields: c.customFields,
  };
}

function defaultForm() {
  return {
    companyName: '',
    logoUrl: '',
    primaryColor: '#2563eb',
    secondaryColor: '#1d4ed8',
    claimTypes: defaultClaimTypes(),
    autoApprovalThreshold: '0',
    tiers: [] as TierForm[],
    notifChannels: Object.fromEntries(
      NOTIFICATION_EVENTS.map(ev => [ev, Object.fromEntries(NOTIFICATION_CHANNELS.map(ch => [ch, false]))])
    ) as Record<NotificationEvent, Record<NotificationChannel, boolean>>,
    sla: Object.fromEntries(TENANT_CLAIM_TYPES.map(t => [t, '7'])) as Record<TenantClaimType, string>,
    customFields: [] as CustomField[],
  };
}

function formToPayload(f: ReturnType<typeof defaultForm>) {
  const enabledCount = TENANT_CLAIM_TYPES.filter(t => f.claimTypes[t].enabled).length;
  if (!f.companyName.trim()) return { error: 'Company name is required' };
  if (enabledCount === 0) return { error: 'At least one claim type must be enabled' };
  const threshold = parseFloat(f.autoApprovalThreshold);
  if (isNaN(threshold) || threshold < 0) return { error: 'Auto-approval threshold must be ≥ 0' };
  for (const t of TENANT_CLAIM_TYPES) {
    if (!f.claimTypes[t].enabled) continue;
    const days = parseInt(f.sla[t]);
    if (isNaN(days) || days < 1) return { error: `SLA for ${t} must be a positive number` };
  }

  return {
    payload: {
      branding: { companyName: f.companyName.trim(), logoUrl: f.logoUrl.trim() || undefined, primaryColor: f.primaryColor, secondaryColor: f.secondaryColor },
      claimTypes: Object.fromEntries(TENANT_CLAIM_TYPES.map(t => [t, f.claimTypes[t]])),
      approvalRules: {
        autoApprovalThreshold: threshold,
        tiers: f.tiers.map(t => ({
          id: t.id, name: t.name,
          minAmount: parseFloat(t.minAmount) || 0,
          maxAmount: t.maxAmount ? parseFloat(t.maxAmount) : null,
          requiredRole: t.requiredRole,
        })),
      },
      notifications: Object.fromEntries(
        NOTIFICATION_EVENTS.map(ev => [
          ev,
          { channels: NOTIFICATION_CHANNELS.filter(ch => f.notifChannels[ev][ch]) },
        ])
      ),
      sla: Object.fromEntries(
        TENANT_CLAIM_TYPES.filter(t => f.claimTypes[t].enabled).map(t => [t, { targetDays: parseInt(f.sla[t]) }])
      ),
      customFields: f.customFields,
    },
  };
}

export default function TenantForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState(defaultForm());
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.tenants.get(id).then(c => { setForm(configToForm(c)); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  function set<K extends keyof ReturnType<typeof defaultForm>>(key: K, val: ReturnType<typeof defaultForm>[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function toggleDoc(type: TenantClaimType, doc: string, bucket: 'requiredDocuments' | 'optionalDocuments') {
    setForm(prev => {
      const ct = { ...prev.claimTypes[type] };
      const other = bucket === 'requiredDocuments' ? 'optionalDocuments' : 'requiredDocuments';
      ct[other] = ct[other].filter(d => d !== doc);
      ct[bucket] = ct[bucket].includes(doc) ? ct[bucket].filter(d => d !== doc) : [...ct[bucket], doc];
      return { ...prev, claimTypes: { ...prev.claimTypes, [type]: ct } };
    });
  }

  function addTier() {
    set('tiers', [...form.tiers, { id: randomUUID(), name: '', minAmount: '', maxAmount: '', requiredRole: '' }]);
  }
  function removeTier(idx: number) { set('tiers', form.tiers.filter((_, i) => i !== idx)); }
  function updateTier(idx: number, patch: Partial<TierForm>) {
    set('tiers', form.tiers.map((t, i) => i === idx ? { ...t, ...patch } : t));
  }

  function addCustomField() {
    set('customFields', [...form.customFields, { id: randomUUID(), name: '', label: '', required: true }]);
  }
  function removeCustomField(idx: number) { set('customFields', form.customFields.filter((_, i) => i !== idx)); }
  function updateCustomField(idx: number, patch: Partial<CustomField>) {
    set('customFields', form.customFields.map((f, i) => i === idx ? { ...f, ...patch } : f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const result = formToPayload(form);
    if ('error' in result) { setError(result.error ?? ''); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await api.tenants.update(id!, result.payload);
      } else {
        await api.tenants.create(result.payload);
      }
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <div className="page-header">
        <div>
          <Link to="/" className="back-link">← Back to tenants</Link>
          <h1 className="page-title" style={{ marginTop: 4 }}>{isEdit ? 'Edit Tenant' : 'New Tenant'}</h1>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* ── Branding ── */}
        <div className="card">
          <div className="card-title">Branding</div>
          <div className="form-grid">
            <div className="form-field full">
              <label>Company Name *</label>
              <input value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="e.g. SafeGuard Insurance" />
            </div>
            <div className="form-field">
              <label>Logo URL</label>
              <input value={form.logoUrl} onChange={e => set('logoUrl', e.target.value)} placeholder="https://…" />
            </div>
            <div className="form-field">
              <label>Primary Color</label>
              <div className="flex gap-2" style={{ alignItems: 'center' }}>
                <input type="color" value={form.primaryColor} onChange={e => set('primaryColor', e.target.value)} style={{ width: 48 }} />
                <input value={form.primaryColor} onChange={e => set('primaryColor', e.target.value)} style={{ flex: 1 }} />
              </div>
            </div>
            <div className="form-field">
              <label>Secondary Color</label>
              <div className="flex gap-2" style={{ alignItems: 'center' }}>
                <input type="color" value={form.secondaryColor} onChange={e => set('secondaryColor', e.target.value)} style={{ width: 48 }} />
                <input value={form.secondaryColor} onChange={e => set('secondaryColor', e.target.value)} style={{ flex: 1 }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Claim Types ── */}
        <div className="card mt-3">
          <div className="card-title">Claim Types & Documents</div>
          <div className="claim-type-grid">
            {TENANT_CLAIM_TYPES.map(type => {
              const ct = form.claimTypes[type];
              return (
                <div key={type} className={`claim-type-card ${ct.enabled ? '' : 'disabled'}`}>
                  <div className="claim-type-header">
                    <input
                      type="checkbox"
                      id={`ct-${type}`}
                      checked={ct.enabled}
                      onChange={e => setForm(prev => ({
                        ...prev,
                        claimTypes: { ...prev.claimTypes, [type]: { ...prev.claimTypes[type], enabled: e.target.checked } }
                      }))}
                    />
                    <label htmlFor={`ct-${type}`}>{type}</label>
                  </div>
                  {ct.enabled && (
                    <div className="claim-type-body">
                      <div className="doc-section-label">Required Documents</div>
                      <div className="doc-checkboxes">
                        {DOCUMENT_TYPES.map(doc => (
                          <label key={doc} className="doc-checkbox">
                            <input
                              type="checkbox"
                              checked={ct.requiredDocuments.includes(doc)}
                              onChange={() => toggleDoc(type, doc, 'requiredDocuments')}
                            />
                            {doc.replace(/_/g, ' ')}
                          </label>
                        ))}
                      </div>
                      <div className="doc-section-label" style={{ marginTop: 6 }}>Optional Documents</div>
                      <div className="doc-checkboxes">
                        {DOCUMENT_TYPES.map(doc => (
                          <label key={doc} className="doc-checkbox">
                            <input
                              type="checkbox"
                              checked={ct.optionalDocuments.includes(doc)}
                              onChange={() => toggleDoc(type, doc, 'optionalDocuments')}
                            />
                            {doc.replace(/_/g, ' ')}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Approval Rules ── */}
        <div className="card mt-3">
          <div className="card-title">Approval Rules</div>
          <div className="form-grid">
            <div className="form-field">
              <label>Auto-approval threshold (claims ≤ this amount are auto-approved)</label>
              <input
                type="number" min="0" value={form.autoApprovalThreshold}
                onChange={e => set('autoApprovalThreshold', e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3">
            <div className="doc-section-label mb-3">Approval Tiers (for amounts above threshold)</div>
            {form.tiers.map((tier, i) => (
              <div key={tier.id} className="tier-row">
                <input placeholder="Tier name" value={tier.name} onChange={e => updateTier(i, { name: e.target.value })} />
                <input placeholder="Min amount" type="number" value={tier.minAmount} onChange={e => updateTier(i, { minAmount: e.target.value })} />
                <input placeholder="Max (blank=∞)" type="number" value={tier.maxAmount} onChange={e => updateTier(i, { maxAmount: e.target.value })} />
                <input placeholder="Required role" value={tier.requiredRole} onChange={e => updateTier(i, { requiredRole: e.target.value })} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeTier(i)}>✕</button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={addTier}>+ Add Tier</button>
          </div>
        </div>

        {/* ── Notifications ── */}
        <div className="card mt-3">
          <div className="card-title">Notifications</div>
          <table className="notif-table">
            <thead>
              <tr>
                <th>Event</th>
                {NOTIFICATION_CHANNELS.map(ch => <th key={ch}>{ch.toUpperCase()}</th>)}
              </tr>
            </thead>
            <tbody>
              {NOTIFICATION_EVENTS.map(ev => (
                <tr key={ev}>
                  <td>{ev.replace(/_/g, ' ')}</td>
                  {NOTIFICATION_CHANNELS.map(ch => (
                    <td key={ch}>
                      <input
                        type="checkbox"
                        checked={form.notifChannels[ev][ch]}
                        onChange={e => set('notifChannels', {
                          ...form.notifChannels,
                          [ev]: { ...form.notifChannels[ev], [ch]: e.target.checked }
                        })}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── SLA ── */}
        <div className="card mt-3">
          <div className="card-title">SLA (business days per claim type)</div>
          <div className="form-grid">
            {TENANT_CLAIM_TYPES.map(type => (
              <div key={type} className={`form-field ${!form.claimTypes[type].enabled ? '' : ''}`}>
                <label>{type} {!form.claimTypes[type].enabled && <span className="text-muted">(disabled)</span>}</label>
                <input
                  type="number" min="1" value={form.sla[type]}
                  disabled={!form.claimTypes[type].enabled}
                  onChange={e => set('sla', { ...form.sla, [type]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Custom Fields ── */}
        <div className="card mt-3">
          <div className="card-title">Custom Fields</div>
          {form.customFields.map((field, i) => (
            <div key={field.id} className="custom-field-row">
              <input placeholder="Field name (id)" value={field.name} onChange={e => updateCustomField(i, { name: e.target.value, id: e.target.value.toLowerCase().replace(/\s+/g, '_') })} />
              <input placeholder="Display label" value={field.label} onChange={e => updateCustomField(i, { label: e.target.value })} />
              <label className="doc-checkbox">
                <input type="checkbox" checked={field.required} onChange={e => updateCustomField(i, { required: e.target.checked })} />
                Required
              </label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeCustomField(i)}>✕</button>
            </div>
          ))}
          <button type="button" className="btn btn-secondary btn-sm" onClick={addCustomField}>+ Add Field</button>
        </div>

        <div className="form-actions">
          <Link to="/" className="btn btn-secondary">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Tenant'}
          </button>
        </div>
      </form>
    </div>
  );
}
