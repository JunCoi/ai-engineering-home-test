import { AuthManager } from './auth-manager.js';
import { HttpClient } from './http-client.js';
import { ClaimsClient } from './claims.js';
import { DocumentsClient } from './documents.js';
import type { SDKConfig } from './types.js';

export class InsuranceSDK {
  readonly claims: ClaimsClient;
  readonly documents: DocumentsClient;

  constructor(config: SDKConfig) {
    if (!config.apiKey?.trim()) {
      throw new Error('apiKey is required');
    }

    const baseUrl =
      config.baseUrl ??
      (config.environment === 'production'
        ? 'https://api.insurance.example.com'
        : 'http://localhost:3000');

    const resolved: SDKConfig = { ...config, baseUrl };
    const authManager = new AuthManager(resolved, baseUrl);
    const httpClient = new HttpClient(resolved, authManager);

    this.claims = new ClaimsClient(httpClient);
    this.documents = new DocumentsClient(httpClient);
  }
}

export * from './types.js';
export * from './errors.js';
