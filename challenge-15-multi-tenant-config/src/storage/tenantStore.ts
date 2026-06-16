import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import type { TenantConfig, TenantRecord, TenantsFile } from '../types/tenant.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = resolve(__dirname, '../../data/tenants.json');

function readFile(): TenantsFile {
  if (!existsSync(DATA_FILE)) {
    const dir = dirname(DATA_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify({ tenants: [] }, null, 2));
    return { tenants: [] };
  }
  return JSON.parse(readFileSync(DATA_FILE, 'utf-8')) as TenantsFile;
}

function writeFile(data: TenantsFile): void {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function currentConfig(record: TenantRecord): TenantConfig {
  return record.history[record.history.length - 1];
}

export function listTenants(): Array<TenantConfig & { historyCount: number }> {
  return readFile().tenants.map(r => ({ ...currentConfig(r), historyCount: r.history.length }));
}

export function getTenant(id: string): TenantRecord | undefined {
  return readFile().tenants.find(t => t.id === id);
}

export function createTenant(
  input: Omit<TenantConfig, 'id' | 'version' | 'createdAt' | 'updatedAt'>
): TenantConfig {
  const data = readFile();
  const now = new Date().toISOString();
  const id = randomUUID();
  const config: TenantConfig = { id, version: 1, createdAt: now, updatedAt: now, ...input };
  data.tenants.push({ id, currentVersion: 1, history: [config] });
  writeFile(data);
  return config;
}

export function updateTenant(
  id: string,
  input: Omit<TenantConfig, 'id' | 'version' | 'createdAt' | 'updatedAt'>
): TenantConfig {
  const data = readFile();
  const record = data.tenants.find(t => t.id === id);
  if (!record) throw Object.assign(new Error(`Tenant ${id} not found`), { status: 404 });
  const now = new Date().toISOString();
  const newVersion = record.currentVersion + 1;
  const config: TenantConfig = {
    id,
    version: newVersion,
    createdAt: record.history[0].createdAt,
    updatedAt: now,
    ...input,
  };
  record.currentVersion = newVersion;
  record.history.push(config);
  writeFile(data);
  return config;
}

export function deleteTenant(id: string): void {
  const data = readFile();
  const idx = data.tenants.findIndex(t => t.id === id);
  if (idx === -1) throw Object.assign(new Error(`Tenant ${id} not found`), { status: 404 });
  data.tenants.splice(idx, 1);
  writeFile(data);
}

export function getTenantHistory(id: string): TenantConfig[] {
  const record = getTenant(id);
  if (!record) throw Object.assign(new Error(`Tenant ${id} not found`), { status: 404 });
  return record.history;
}

export function rollbackTenant(id: string, version: number): TenantConfig {
  const data = readFile();
  const record = data.tenants.find(t => t.id === id);
  if (!record) throw Object.assign(new Error(`Tenant ${id} not found`), { status: 404 });
  const target = record.history.find(h => h.version === version);
  if (!target) throw new Error(`Version ${version} not found for tenant ${id}`);
  const now = new Date().toISOString();
  const newVersion = record.currentVersion + 1;
  const config: TenantConfig = { ...target, version: newVersion, updatedAt: now };
  record.currentVersion = newVersion;
  record.history.push(config);
  writeFile(data);
  return config;
}

export function tenantExists(id: string): boolean {
  return readFile().tenants.some(t => t.id === id);
}
