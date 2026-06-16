import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { TENANT_CLAIM_TYPES, type TenantConfig, type TenantClaimType, type ProcessingResult, type CustomField } from '../types';

export default function Preview() {
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [claimType, setClaimType] = useState<TenantClaimType>('OUTPATIENT');
  const [amount, setAmount] = useState('10000');
  const [submissionDate, setSubmissionDate] = useState(new Date().toISOString().slice(0, 10));
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) api.tenants.get(id).then(setTenant);
  }, [id]);

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const r = await api.tenants.preview(id!, {
        claimType,
        amount: parseFloat(amount),
        submissionDate,
        customFieldValues: customValues,
      });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview failed');
    } finally {
      setLoading(false);
    }
  }

  const enabledTypes = TENANT_CLAIM_TYPES.filter(t => tenant?.claimTypes[t]?.enabled);

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <div className="page-header">
        <div>
          <Link to="/" className="back-link">← Back to tenants</Link>
          <h1 className="page-title" style={{ marginTop: 4 }}>
            Preview — {tenant?.branding.companyName ?? '…'}
          </h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>
        <div className="card">
          <div className="card-title">Sample Claim</div>
          <form onSubmit={handlePreview}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-field">
                <label>Claim Type</label>
                <select value={claimType} onChange={e => setClaimType(e.target.value as TenantClaimType)}>
                  {TENANT_CLAIM_TYPES.map(t => (
                    <option key={t} value={t} disabled={!enabledTypes.includes(t)}>
                      {t}{!enabledTypes.includes(t) ? ' (disabled)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Amount</label>
                <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div className="form-field">
                <label>Submission Date</label>
                <input type="date" value={submissionDate} onChange={e => setSubmissionDate(e.target.value)} />
              </div>
              {tenant?.customFields.map((field: CustomField) => (
                <div key={field.id} className="form-field">
                  <label>{field.label}{field.required ? ' *' : ''}</label>
                  <input
                    value={customValues[field.id] ?? ''}
                    onChange={e => setCustomValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    placeholder={field.required ? 'Required' : 'Optional'}
                  />
                </div>
              ))}
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Processing…' : 'Preview Processing'}
              </button>
            </div>
          </form>
        </div>

        <div>
          {error && <div className="error-msg">{error}</div>}
          {result && (
            <>
              <div className="card">
                <div className="card-title">Processing Result</div>
                <div className="result-grid">
                  <div>
                    <div className="result-label">Tenant</div>
                    <div className="result-value">{result.tenantName}</div>
                  </div>
                  <div>
                    <div className="result-label">Claim Type</div>
                    <div className="result-value"><span className="badge badge-blue">{result.claimType}</span></div>
                  </div>
                  <div>
                    <div className="result-label">Amount</div>
                    <div className="result-value">{result.amount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="result-label">SLA Deadline</div>
                    <div className="result-value">{result.slaDeadline} <span className="text-muted">({result.slaTargetDays} days)</span></div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="result-label">Approval Routing</div>
                  <div className={`approval-box ${result.approvalRouting.isAutoApproved ? 'auto' : 'manual'}`}>
                    {result.approvalRouting.isAutoApproved ? (
                      <>
                        <div className="label">✓ Auto-Approved</div>
                        <div className="sub">Amount is within auto-approval threshold</div>
                      </>
                    ) : (
                      <>
                        <div className="label">Manual Review Required</div>
                        <div className="sub">
                          Tier: {result.approvalRouting.tier} · Role: <strong>{result.approvalRouting.requiredRole}</strong>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="card mt-3">
                <div className="card-title">Required Documents</div>
                {result.requiredDocuments.length === 0
                  ? <div className="text-muted text-sm">None</div>
                  : (
                    <div className="tag-list">
                      {result.requiredDocuments.map(d => <span key={d} className="badge badge-red">{d.replace(/_/g, ' ')}</span>)}
                    </div>
                  )}
                {result.optionalDocuments.length > 0 && (
                  <div className="mt-3">
                    <div className="result-label">Optional Documents</div>
                    <div className="tag-list mt-3">
                      {result.optionalDocuments.map(d => <span key={d} className="badge badge-gray">{d.replace(/_/g, ' ')}</span>)}
                    </div>
                  </div>
                )}
              </div>

              <div className="card mt-3">
                <div className="card-title">Notifications</div>
                {result.notifications.map(n => (
                  <div key={n.event} className="flex gap-2 mb-3" style={{ alignItems: 'center' }}>
                    <span className="result-value" style={{ minWidth: 160 }}>{n.event.replace(/_/g, ' ')}</span>
                    <div className="tag-list">
                      {n.channels.map(ch => <span key={ch} className="badge badge-green">{ch}</span>)}
                    </div>
                  </div>
                ))}
              </div>

              {result.customFieldsRequired.length > 0 && (
                <div className="card mt-3">
                  <div className="card-title">Custom Fields</div>
                  {result.customFieldErrors.length > 0 && (
                    <div className="error-msg mb-3">
                      {result.customFieldErrors.map(e => <div key={e}>⚠ {e}</div>)}
                    </div>
                  )}
                  {result.customFieldsRequired.map(f => (
                    <div key={f.id} className="flex gap-2 mb-3" style={{ alignItems: 'center' }}>
                      <span style={{ minWidth: 160 }}>{f.label}</span>
                      {f.required ? <span className="badge badge-red">Required</span> : <span className="badge badge-gray">Optional</span>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {!result && !error && (
            <div className="card empty">Fill in the claim details and click Preview Processing</div>
          )}
        </div>
      </div>
    </div>
  );
}
