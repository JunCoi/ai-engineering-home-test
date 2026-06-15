import type { SDKConfig } from './types.js';
import type { AuthManager } from './auth-manager.js';
import { AuthError, NetworkError, ApiError, ValidationError } from './errors.js';

const DEFAULT_MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

export interface JsonRequestOptions {
  method: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt: number): number {
  return BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 100;
}

function isRetriable(err: unknown): boolean {
  if (err instanceof ApiError && err.statusCode === 503) return true;
  if (err instanceof NetworkError) return true;
  return false;
}

export class HttpClient {
  readonly baseUrl: string;
  private readonly maxRetries: number;

  constructor(
    private readonly config: SDKConfig,
    private readonly authManager: AuthManager
  ) {
    this.baseUrl =
      config.baseUrl ??
      (config.environment === 'production'
        ? 'https://api.insurance.example.com'
        : 'http://localhost:3000');
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  async request<T>(options: JsonRequestOptions): Promise<T> {
    let lastError: Error | undefined;
    let tokenRefreshed = false;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        await sleep(backoffDelay(attempt));
      }

      try {
        const token = await this.authManager.getToken();
        return await this.executeJson<T>(options, token);
      } catch (err) {
        if (err instanceof AuthError && err.statusCode === 401 && !tokenRefreshed) {
          tokenRefreshed = true;
          this.authManager.invalidate();
          const freshToken = await this.authManager.getToken();
          return this.executeJson<T>(options, freshToken);
        }

        if (isRetriable(err)) {
          lastError = err as Error;
          continue;
        }

        throw err;
      }
    }

    throw lastError ?? new NetworkError('Max retries exceeded');
  }

  async uploadFormData<T>(
    path: string,
    formData: FormData,
    onProgress?: (percent: number) => void
  ): Promise<T> {
    let lastError: Error | undefined;
    let tokenRefreshed = false;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        await sleep(backoffDelay(attempt));
      }

      try {
        const token = await this.authManager.getToken();
        onProgress?.(0);
        const result = await this.executeFormData<T>(path, formData, token);
        onProgress?.(100);
        return result;
      } catch (err) {
        if (err instanceof AuthError && err.statusCode === 401 && !tokenRefreshed) {
          tokenRefreshed = true;
          this.authManager.invalidate();
          const freshToken = await this.authManager.getToken();
          onProgress?.(0);
          const result = await this.executeFormData<T>(path, formData, freshToken);
          onProgress?.(100);
          return result;
        }

        if (isRetriable(err)) {
          lastError = err as Error;
          continue;
        }

        throw err;
      }
    }

    throw lastError ?? new NetworkError('Max retries exceeded');
  }

  private async executeJson<T>(options: JsonRequestOptions, token: string): Promise<T> {
    const url = `${this.baseUrl}${options.path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    };
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(this.config.timeout ?? 30_000),
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        throw new NetworkError('Request timed out');
      }
      throw new NetworkError('Network request failed', err instanceof Error ? err : undefined);
    }

    return this.parseResponse<T>(response);
  }

  private async executeFormData<T>(path: string, formData: FormData, token: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        signal: AbortSignal.timeout(this.config.timeout ?? 30_000),
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        throw new NetworkError('Request timed out');
      }
      throw new NetworkError('Network request failed', err instanceof Error ? err : undefined);
    }

    return this.parseResponse<T>(response);
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    if (response.status === 401 || response.status === 403) {
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      throw new AuthError(body.message ?? 'Unauthorized', response.status);
    }

    if (response.status === 400 || response.status === 422) {
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        fields?: Record<string, string>;
      };
      throw new ValidationError(body.message ?? 'Validation failed', body.fields ?? {});
    }

    if (response.status === 503) {
      throw new ApiError('Service temporarily unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        code?: string;
      };
      throw new ApiError(body.message ?? `HTTP ${response.status}`, response.status, body.code);
    }

    return response.json() as Promise<T>;
  }
}
