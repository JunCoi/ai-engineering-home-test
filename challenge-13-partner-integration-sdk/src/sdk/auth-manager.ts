import type { SDKConfig, TokenResponse } from './types.js';
import { AuthError, NetworkError } from './errors.js';

export class AuthManager {
  private token: string | null = null;
  private expiresAt: Date | null = null;
  private inflightRefresh: Promise<string> | null = null;

  constructor(
    private readonly config: SDKConfig,
    private readonly baseUrl: string
  ) {}

  async getToken(): Promise<string> {
    if (this.token && this.expiresAt) {
      const bufferMs = 60_000;
      if (Date.now() + bufferMs < this.expiresAt.getTime()) {
        return this.token;
      }
    }

    if (this.inflightRefresh) {
      return this.inflightRefresh;
    }

    this.inflightRefresh = this.fetchToken().finally(() => {
      this.inflightRefresh = null;
    });

    return this.inflightRefresh;
  }

  invalidate(): void {
    this.token = null;
    this.expiresAt = null;
  }

  private async fetchToken(): Promise<string> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/v1/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: this.config.apiKey }),
        signal: AbortSignal.timeout(this.config.timeout ?? 30_000),
      });
    } catch (err) {
      throw new NetworkError(
        'Failed to authenticate',
        err instanceof Error ? err : undefined
      );
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      throw new AuthError(body.message ?? 'Authentication failed', response.status);
    }

    const data = (await response.json()) as TokenResponse;
    this.token = data.token;
    this.expiresAt = new Date(data.expiresAt);
    return data.token;
  }
}
