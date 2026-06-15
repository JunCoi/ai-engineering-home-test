# Partner Integration SDK

TypeScript SDK for insurance partners to submit claims, upload documents, and track claim status.
Includes a mock API server for local development and testing.

---

## Quickstart

### 1. Install dependencies

```bash
cd challenge-13-partner-integration-sdk
npm install
```

### 2. Start the mock server

```bash
npm run server
# Mock Insurance API — http://localhost:3000
```

### 3. Create your first claim

```typescript
import { InsuranceSDK } from './src/sdk/index.js';

const sdk = new InsuranceSDK({
  apiKey: 'pk_test_your_key',
  environment: 'sandbox', // default; uses http://localhost:3000
});

const claim = await sdk.claims.create({
  policyId: 'POL-123',
  claimType: 'OUTPATIENT',
  diagnosisCode: 'J06.9',
  treatmentDate: '2024-03-15',
  amount: 15_000,
  currency: 'THB',
});

console.log(claim.id, claim.status); // CLM-XXXXXXXX  PENDING
```

---

## Configuration

```typescript
const sdk = new InsuranceSDK({
  apiKey: 'pk_test_xxx',          // required — must start with pk_test_ or pk_live_
  environment: 'sandbox',         // 'sandbox' (default) | 'production'
  timeout: 30_000,                // ms, default 30 s
  baseUrl: 'http://localhost:3000', // override (useful for tests)
  maxRetries: 3,                  // 503 / network retries with exponential backoff
});
```

---

## API Reference

### Claims

#### `sdk.claims.create(input)` → `Promise<Claim>`

Creates a new claim. Validates input client-side before calling the API.

| Field | Type | Required | Notes |
|---|---|---|---|
| `policyId` | `string` | ✓ | |
| `claimType` | `ClaimType` | ✓ | `OUTPATIENT` \| `INPATIENT` \| `DENTAL` \| `SPECIALIST` |
| `diagnosisCode` | `string` | ✓ | ICD-10 code, e.g. `J06.9` |
| `treatmentDate` | `string` | ✓ | ISO date `YYYY-MM-DD` |
| `amount` | `number` | ✓ | Must be positive |
| `currency` | `string` | ✓ | 3-letter ISO code, e.g. `THB` |
| `notes` | `string` | | Optional free text |

#### `sdk.claims.get(claimId)` → `Promise<Claim>`

Fetches a single claim by ID.

#### `sdk.claims.list(params?)` → `Promise<PaginatedClaims>`

Lists claims with optional filtering and pagination.

| Param | Type | Default |
|---|---|---|
| `status` | `ClaimStatus` | — |
| `page` | `number` | 1 |
| `pageSize` | `number` | 20 |

#### `sdk.claims.onStatusChange(claimId, callback, pollIntervalMs?)` → `() => void`

Polls the claim at the given interval and calls `callback` whenever the status changes.
Returns an `unsubscribe` function — call it to stop polling.

```typescript
const stop = sdk.claims.onStatusChange('CLM-001', (status, claim) => {
  console.log(`Claim is now ${status}`);
  if (status === 'APPROVED') stop();
}, 5_000);
```

---

### Documents

#### `sdk.documents.upload(claimId, file, options)` → `Promise<ClaimDocument>`

Uploads a document for a claim.

```typescript
// From a file path
await sdk.documents.upload(claimId, '/path/to/receipt.pdf', {
  type: 'MEDICAL_RECEIPT',
  onProgress: (pct) => console.log(`${pct}%`),
});

// From a Buffer
await sdk.documents.upload(claimId, {
  name: 'receipt.pdf',
  content: buffer,
  mimeType: 'application/pdf',
}, { type: 'MEDICAL_RECEIPT' });
```

**Document types:** `MEDICAL_RECEIPT` | `DIAGNOSIS_NOTE` | `HOSPITAL_CERTIFICATE` |
`DISCHARGE_SUMMARY` | `PRESCRIPTION` | `ID_CARD_COPY` | `REFERRAL_LETTER` |
`APPOINTMENT_SLIP` | `UNKNOWN`

#### `sdk.documents.list(claimId)` → `Promise<ClaimDocument[]>`

Lists all documents attached to a claim.

---

### Error Handling

```typescript
import { ValidationError, AuthError, NetworkError, ApiError } from './src/sdk/index.js';

try {
  await sdk.claims.create({ /* ... */ });
} catch (err) {
  if (err instanceof ValidationError) {
    console.log(err.fields);   // { policyId: 'required', amount: 'must be a positive number' }
  } else if (err instanceof AuthError) {
    console.log(err.statusCode); // 401 | 403
  } else if (err instanceof NetworkError) {
    console.log('Check connectivity');
  } else if (err instanceof ApiError) {
    console.log(err.statusCode, err.code);
  }
}
```

---

## Running Examples

All examples require the mock server to be running (`npm run server`).

```bash
# Example 1 — Simple claim creation and listing
npm run example:1

# Example 2 — Claim with document uploads
npm run example:2

# Example 3 — Status polling (event-driven + manual loop)
npm run example:3
```

---

## Running Tests

```bash
npm test              # run all tests
npm run test:watch    # watch mode
npm run test:coverage # with coverage
```

The test suite covers:
- Successful flows (create, get, list, upload)
- Client-side validation (all required fields and formats)
- Authentication (token exchange, caching, refresh on 401)
- Retry logic (503 retries, exponential backoff, max retries, no retry on 4xx)
- Error types (ValidationError, AuthError, NetworkError, ApiError)

---

## Mock Server

The server at `src/server/index.ts` simulates a real insurance API:

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/auth/token` | Exchange API key for JWT (1 h expiry) |
| `POST` | `/api/v1/claims` | Create a claim |
| `GET` | `/api/v1/claims` | List claims (paginated, filterable by `status`) |
| `GET` | `/api/v1/claims/:id` | Get claim by ID |
| `POST` | `/api/v1/claims/:id/documents` | Upload a document |
| `GET` | `/api/v1/claims/:id/documents` | List documents |

**Behaviour:**
- 200–500 ms simulated latency on every request
- ~10% of non-auth requests return `503` (controlled by `FAILURE_RATE` env var)
- Data stored in memory (lost on restart)
- API keys must match `pk_test_*` or `pk_live_*`

```bash
FAILURE_RATE=0.3 npm run server   # 30% failure rate
FAILURE_RATE=0   npm run server   # no failures
```
