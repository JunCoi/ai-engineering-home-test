import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  listTenants,
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
  getTenantHistory,
  rollbackTenant,
} from '../storage/tenantStore.js';
import { processClaim, diffConfigs } from '../runtime/processClaim.js';
import type { ProcessClaimInput, TenantConfig } from '../types/tenant.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = resolve(__dirname, '../../dist');
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3015;

const app = express();
app.use(express.json());
app.use(cors());

function errStatus(err: unknown): number {
  return (err as { status?: number }).status ?? 500;
}
function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Unexpected error';
}
function currentConfig(id: string): TenantConfig {
  const record = getTenant(id);
  if (!record) throw Object.assign(new Error(`Tenant ${id} not found`), { status: 404 });
  return record.history[record.history.length - 1];
}

// ── Tenant CRUD ───────────────────────────────────────────────────────────────

app.get('/api/tenants', (_req, res) => {
  res.json(listTenants());
});

app.post('/api/tenants', (req, res) => {
  try {
    res.status(201).json(createTenant(req.body as Omit<TenantConfig, 'id' | 'version' | 'createdAt' | 'updatedAt'>));
  } catch (err) {
    res.status(errStatus(err)).json({ message: errMsg(err) });
  }
});

app.get('/api/tenants/:id', (req, res) => {
  try {
    res.json(currentConfig(req.params.id));
  } catch (err) {
    res.status(errStatus(err)).json({ message: errMsg(err) });
  }
});

app.put('/api/tenants/:id', (req, res) => {
  try {
    res.json(updateTenant(req.params.id, req.body as Omit<TenantConfig, 'id' | 'version' | 'createdAt' | 'updatedAt'>));
  } catch (err) {
    res.status(errStatus(err)).json({ message: errMsg(err) });
  }
});

app.delete('/api/tenants/:id', (req, res) => {
  try {
    deleteTenant(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(errStatus(err)).json({ message: errMsg(err) });
  }
});

// ── History + rollback ────────────────────────────────────────────────────────

app.get('/api/tenants/:id/history', (req, res) => {
  try {
    res.json(getTenantHistory(req.params.id));
  } catch (err) {
    res.status(errStatus(err)).json({ message: errMsg(err) });
  }
});

app.post('/api/tenants/:id/rollback/:version', (req, res) => {
  try {
    res.json(rollbackTenant(req.params.id, parseInt(req.params.version)));
  } catch (err) {
    res.status(errStatus(err)).json({ message: errMsg(err) });
  }
});

// ── Preview ───────────────────────────────────────────────────────────────────

app.post('/api/tenants/:id/preview', (req, res) => {
  try {
    const config = currentConfig(req.params.id);
    res.json(processClaim(config, req.body as ProcessClaimInput));
  } catch (err) {
    res.status(errStatus(err)).json({ message: errMsg(err) });
  }
});

// ── Config diff ───────────────────────────────────────────────────────────────

app.get('/api/diff', (req, res) => {
  const { a, b } = req.query as { a?: string; b?: string };
  if (!a || !b) { res.status(400).json({ message: 'a and b query params required' }); return; }
  try {
    const configA = currentConfig(a);
    const configB = currentConfig(b);
    res.json({ tenantA: configA, tenantB: configB, diffs: diffConfigs(configA, configB) });
  } catch (err) {
    res.status(errStatus(err)).json({ message: errMsg(err) });
  }
});

// ── Runtime processClaim ──────────────────────────────────────────────────────

app.post('/api/process', (req, res) => {
  const { tenantId, ...input } = req.body as { tenantId: string } & ProcessClaimInput;
  try {
    const config = currentConfig(tenantId);
    res.json(processClaim(config, input));
  } catch (err) {
    res.status(errStatus(err)).json({ message: errMsg(err) });
  }
});

// ── Static (client build) ─────────────────────────────────────────────────────

if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (_req, res) => res.sendFile(join(DIST_DIR, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`\nMulti-Tenant Config Platform — http://localhost:${PORT}`);
  console.log('─'.repeat(50));
  console.log('  GET    /api/tenants');
  console.log('  POST   /api/tenants');
  console.log('  GET    /api/tenants/:id');
  console.log('  PUT    /api/tenants/:id');
  console.log('  DELETE /api/tenants/:id');
  console.log('  GET    /api/tenants/:id/history');
  console.log('  POST   /api/tenants/:id/rollback/:version');
  console.log('  POST   /api/tenants/:id/preview');
  console.log('  GET    /api/diff?a=:id&b=:id');
  console.log('  POST   /api/process');
  console.log('─'.repeat(50));
  console.log(`  Client: ${existsSync(DIST_DIR) ? 'served from dist/' : 'not built yet (run npm run build:client)'}\n`);
});

export { app };
