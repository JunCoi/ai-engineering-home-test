import { useEffect, useState } from 'react';
import { api } from '../api';
import type { TenantConfig, DiffItem } from '../types';

function formatSegment(segment: string): string {
  // ALL_CAPS or ALL_CAPS_WITH_UNDERSCORES (e.g. OUTPATIENT, CLAIM_SUBMITTED)
  if (/^[A-Z][A-Z0-9_]*$/.test(segment)) {
    return segment
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
  // camelCase (e.g. claimTypes, autoApprovalThreshold)
  return segment
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase())
    .trim();
}

function formatPath(path: string): string {
  return path.split('.').map(formatSegment).join(' › ');
}

function formatValue(v: unknown): string {
  if (v === undefined || v === null) return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) {
    if (v.length === 0) return '—';
    if (v.every(x => typeof x === 'string')) {
      return v.map(x => formatSegment(String(x))).join(', ');
    }
    return JSON.stringify(v, null, 2);
  }
  if (typeof v === 'object') return JSON.stringify(v, null, 2);
  return String(v);
}

export default function Diff() {
  const [tenants, setTenants] = useState<TenantConfig[]>([]);
  const [selectedA, setSelectedA] = useState('');
  const [selectedB, setSelectedB] = useState('');
  const [diffs, setDiffs] = useState<DiffItem[] | null>(null);
  const [tenantA, setTenantA] = useState<TenantConfig | null>(null);
  const [tenantB, setTenantB] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.tenants.list().then(setTenants); }, []);

  async function compare() {
    if (!selectedA || !selectedB || selectedA === selectedB) {
      setError('Select two different tenants'); return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.diff(selectedA, selectedB);
      setDiffs(res.diffs);
      setTenantA(res.tenantA);
      setTenantB(res.tenantB);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Comparison failed');
    } finally {
      setLoading(false);
    }
  }

  const changedCount = diffs?.length ?? 0;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Config Comparison</h1>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div className="form-field" style={{ flex: 1 }}>
            <label>Tenant A</label>
            <select value={selectedA} onChange={e => setSelectedA(e.target.value)}>
              <option value="">Select tenant…</option>
              {tenants.filter(t => t.id !== selectedB).map(t => <option key={t.id} value={t.id}>{t.branding.companyName}</option>)}
            </select>
          </div>
          <div className="form-field" style={{ flex: 1 }}>
            <label>Tenant B</label>
            <select value={selectedB} onChange={e => setSelectedB(e.target.value)}>
              <option value="">Select tenant…</option>
              {tenants.filter(t => t.id !== selectedA).map(t => <option key={t.id} value={t.id}>{t.branding.companyName}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={compare} disabled={loading}>
            {loading ? 'Comparing…' : 'Compare'}
          </button>
        </div>
        {error && <div className="error-msg mt-3">{error}</div>}
      </div>

      {diffs !== null && (
        <div className="mt-3">
          {changedCount === 0 ? (
            <div className="card diff-empty">✓ Configurations are identical</div>
          ) : (
            <>
              <div className="diff-summary">
                <strong>{changedCount}</strong> difference{changedCount !== 1 ? 's' : ''} found
              </div>
              <div className="table-wrap">
                <table className="diff-table">
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Field</th>
                      <th style={{ width: '35%' }}>
                        <span className="color-dot" style={{ background: tenantA?.branding.primaryColor, marginRight: 8 }} />
                        {tenantA?.branding.companyName} <span className="text-muted" style={{ fontWeight: 400 }}>(v{tenantA?.version})</span>
                      </th>
                      <th style={{ width: '35%' }}>
                        <span className="color-dot" style={{ background: tenantB?.branding.primaryColor, marginRight: 8 }} />
                        {tenantB?.branding.companyName} <span className="text-muted" style={{ fontWeight: 400 }}>(v{tenantB?.version})</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffs.map((d, i) => (
                      <tr key={i}>
                        <td className="diff-field-name">{formatPath(d.path)}</td>
                        <td className={d.type === 'added' ? '' : 'diff-cell-a'}>
                          <span className="diff-val">{formatValue(d.valueA)}</span>
                        </td>
                        <td className={d.type === 'removed' ? '' : 'diff-cell-b'}>
                          <span className="diff-val">{formatValue(d.valueB)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
