import { useEffect, useState } from 'react';
import { api } from '../api';
import type { TenantConfig, DiffItem } from '../types';

function formatValue(v: unknown): string {
  if (v === undefined || v === null) return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
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
        <h1 className="page-title">Config Diff</h1>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div className="form-field" style={{ flex: 1 }}>
            <label>Tenant A</label>
            <select value={selectedA} onChange={e => setSelectedA(e.target.value)}>
              <option value="">Select tenant…</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.branding.companyName}</option>)}
            </select>
          </div>
          <div className="form-field" style={{ flex: 1 }}>
            <label>Tenant B</label>
            <select value={selectedB} onChange={e => setSelectedB(e.target.value)}>
              <option value="">Select tenant…</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.branding.companyName}</option>)}
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
              <div className="diff-header">
                <div className="diff-col-title">
                  <span className="color-dot" style={{ background: tenantA?.branding.primaryColor, marginRight: 8 }} />
                  {tenantA?.branding.companyName} (v{tenantA?.version})
                </div>
                <div className="diff-col-title">
                  <span className="color-dot" style={{ background: tenantB?.branding.primaryColor, marginRight: 8 }} />
                  {tenantB?.branding.companyName} (v{tenantB?.version})
                </div>
              </div>
              <div className="diff-rows">
                {diffs.map((d, i) => (
                  <div key={i} className="diff-row">
                    <div className={`diff-cell ${d.type === 'removed' ? 'diff-cell changed-a' : d.type === 'changed' ? 'diff-cell changed-a' : 'diff-cell same'}`}>
                      <div className="diff-path">{d.path}</div>
                      <div className="diff-val">{formatValue(d.valueA)}</div>
                    </div>
                    <div className={`diff-cell ${d.type === 'added' ? 'diff-cell changed-b' : d.type === 'changed' ? 'diff-cell changed-b' : 'diff-cell same'}`}>
                      <div className="diff-path">{d.path}</div>
                      <div className="diff-val">{formatValue(d.valueB)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
