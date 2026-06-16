import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import type { TenantConfig } from '../types';

export default function History() {
  const { id } = useParams<{ id: string }>();
  const [history, setHistory] = useState<TenantConfig[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (id) api.tenants.history(id).then(h => { setHistory(h); setLoading(false); });
  }, [id]);

  async function handleRollback(version: number) {
    if (!confirm(`Roll back to version ${version}? This creates a new version.`)) return;
    try {
      const updated = await api.tenants.rollback(id!, version);
      setHistory(prev => [...prev, updated]);
      setMsg(`Rolled back to v${version} — new version v${updated.version} created.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rollback failed');
    }
  }

  const current = history[history.length - 1];

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <div className="page-header">
        <div>
          <Link to="/" className="back-link">← Back to tenants</Link>
          <h1 className="page-title" style={{ marginTop: 4 }}>
            Version History — {current?.branding.companyName ?? '…'}
          </h1>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {msg && <div className="success-msg">{msg}</div>}

      <div className="table-wrap">
        {[...history].reverse().map(ver => {
          const isCurrent = ver.version === current?.version;
          const isExpanded = expanded === ver.version;
          return (
            <div key={ver.version}>
              <div className="history-row">
                <div className="history-version">
                  v{ver.version}
                  {isCurrent && <span className="current-badge" style={{ marginLeft: 8 }}>current</span>}
                </div>
                <div className="history-time">{new Date(ver.updatedAt).toLocaleString()}</div>
                <div className="btn-group">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setExpanded(isExpanded ? null : ver.version)}
                  >
                    {isExpanded ? 'Hide' : 'View'}
                  </button>
                  {!isCurrent && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleRollback(ver.version)}>
                      Rollback
                    </button>
                  )}
                </div>
              </div>
              {isExpanded && (
                <div style={{ padding: '0 16px 16px', background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                  <pre style={{ fontSize: '0.75rem', overflowX: 'auto', maxHeight: 400, whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(ver, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
