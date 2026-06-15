export class InsuranceSDKError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsuranceSDKError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends InsuranceSDKError {
  readonly fields: Record<string, string>;

  constructor(message: string, fields: Record<string, string>) {
    super(message);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

export class AuthError extends InsuranceSDKError {
  readonly statusCode: number;

  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

export class NetworkError extends InsuranceSDKError {
  readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

export class ApiError extends InsuranceSDKError {
  readonly statusCode: number;
  readonly code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
