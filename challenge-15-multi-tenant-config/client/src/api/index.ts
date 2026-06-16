import type { TenantConfig, ProcessClaimInput, ProcessingResult, DiffResponse } from '../types';

const BASE = '/api';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? `Request failed: ${res.status}`);
  return data as T;
}

export const api = {
  tenants: {
    list: () => request<TenantConfig[]>('GET', '/tenants'),
    get: (id: string) => request<TenantConfig>('GET', `/tenants/${id}`),
    create: (data: unknown) => request<TenantConfig>('POST', '/tenants', data),
    update: (id: string, data: unknown) => request<TenantConfig>('PUT', `/tenants/${id}`, data),
    delete: (id: string) => request<void>('DELETE', `/tenants/${id}`),
    history: (id: string) => request<TenantConfig[]>('GET', `/tenants/${id}/history`),
    rollback: (id: string, version: number) =>
      request<TenantConfig>('POST', `/tenants/${id}/rollback/${version}`),
    preview: (id: string, input: ProcessClaimInput) =>
      request<ProcessingResult>('POST', `/tenants/${id}/preview`, input),
  },
  diff: (a: string, b: string) => request<DiffResponse>('GET', `/diff?a=${a}&b=${b}`),
  process: (tenantId: string, input: ProcessClaimInput) =>
    request<ProcessingResult>('POST', '/process', { tenantId, ...input }),
};
