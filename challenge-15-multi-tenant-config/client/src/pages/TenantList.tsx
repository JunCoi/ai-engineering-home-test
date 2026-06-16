import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { TenantConfig, TenantClaimType } from '../types';
import { TENANT_CLAIM_TYPES } from '../types';

export default function TenantList() {
  const [tenants, setTenants] = useState<TenantConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function load() {
    try {
      setTenants(await api.tenants.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.tenants.delete(id);
      setTenants(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  function enabledTypes(t: TenantConfig): TenantClaimType[] {
    return TENANT_CLAIM_TYPES.filter(ct => t.claimTypes[ct]?.enabled);
  }

  if (loading) return <div className="loading">Loading tenants…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Tenants</h1>
        <Link to="/tenants/new" className="btn btn-primary">+ New Tenant</Link>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {tenants.length === 0 ? (
        <div className="empty">No tenants yet. <Link to="/tenants/new">Create the first one.</Link></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Claim Types</th>
                <th>Auto-approve ≤</th>
                <th>SLA</th>
                <th>Version</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id}>
                  <td>
                    <div className="flex gap-2" style={{ alignItems: 'center' }}>
                      <span
                        className="color-dot"
                        style={{ background: t.branding.primaryColor }}
                      />
                      <strong>{t.branding.companyName}</strong>
                    </div>
                  </td>
                  <td>
                    <div className="tag-list">
                      {enabledTypes(t).map(ct => (
                        <span key={ct} className="badge badge-blue">{ct}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {t.approvalRules.autoApprovalThreshold === 0
                      ? <span className="badge badge-red">All manual</span>
                      : t.approvalRules.autoApprovalThreshold.toLocaleString()}
                  </td>
                  <td className="text-sm text-muted">
                    {Object.entries(t.sla)
                      .map(([k, v]) => `${k}: ${v?.targetDays}d`)
                      .join(', ') || '—'}
                  </td>
                  <td>
                    <span className="badge badge-gray">v{t.version}</span>
                  </td>
                  <td>
                    <div className="btn-group">
                      <Link to={`/tenants/${t.id}/edit`} className="btn btn-secondary btn-sm">Edit</Link>
                      <Link to={`/tenants/${t.id}/preview`} className="btn btn-secondary btn-sm">Preview</Link>
                      <Link to={`/tenants/${t.id}/history`} className="btn btn-ghost btn-sm">History</Link>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(t.id, t.branding.companyName)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tenants.length >= 2 && (
        <div className="mt-4">
          <button className="btn btn-secondary" onClick={() => navigate('/diff')}>
            Compare tenants →
          </button>
        </div>
      )}
    </div>
  );
}
