import express, { type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { ClaimType, DocumentType } from '../../../shared/src/types/index.js';

const JWT_SECRET = 'mock-server-secret-do-not-use-in-production';
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const FAILURE_RATE = process.env.FAILURE_RATE ? parseFloat(process.env.FAILURE_RATE) : 0.1;

type ClaimStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';

interface StoredClaim {
  id: string;
  policyId: string;
  claimType: ClaimType;
  diagnosisCode: string;
  treatmentDate: string;
  amount: number;
  currency: string;
  status: ClaimStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredDocument {
  id: string;
  claimId: string;
  type: DocumentType;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

const claims = new Map<string, StoredClaim>();
const documents = new Map<string, StoredDocument[]>();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

// Simulate realistic response latency
app.use((_req, _res, next) => {
  setTimeout(next, 200 + Math.random() * 300);
});

// Simulate transient 503 failures (skip auth endpoint so clients can always refresh)
app.use((req, res, next) => {
  if (req.path !== '/api/v1/auth/token' && Math.random() < FAILURE_RATE) {
    res.status(503).json({
      error: 'SERVICE_UNAVAILABLE',
      message: 'Service temporarily unavailable, please retry',
    });
    return;
  }
  next();
});

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing authorization token' });
    return;
  }
  try {
    jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch (err) {
    const message = err instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token';
    res.status(401).json({ message });
  }
}

// POST /api/v1/auth/token
app.post('/api/v1/auth/token', (req, res) => {
  const { apiKey } = req.body as { apiKey?: string };
  if (!apiKey || !/^pk_(test|live)_/.test(apiKey)) {
    res.status(401).json({ message: 'Invalid API key' });
    return;
  }
  const expiresAt = new Date(Date.now() + 60 * 60 * 1_000);
  const token = jwt.sign({ sub: 'partner', apiKey }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, expiresAt: expiresAt.toISOString() });
});

// POST /api/v1/claims
app.post('/api/v1/claims', requireAuth, (req, res) => {
  const body = req.body as Partial<StoredClaim>;
  const fields: Record<string, string> = {};

  if (!body.policyId?.trim()) fields.policyId = 'required';
  if (!body.claimType) fields.claimType = 'required';
  if (!body.diagnosisCode?.trim()) fields.diagnosisCode = 'required';
  if (!body.treatmentDate?.trim()) fields.treatmentDate = 'required';
  if (body.amount == null || body.amount <= 0) fields.amount = 'must be a positive number';
  if (!body.currency?.trim()) fields.currency = 'required';

  if (Object.keys(fields).length > 0) {
    res.status(400).json({ message: 'Validation failed', fields });
    return;
  }

  const now = new Date().toISOString();
  const claim: StoredClaim = {
    id: `CLM-${randomUUID().slice(0, 8).toUpperCase()}`,
    policyId: body.policyId!,
    claimType: body.claimType!,
    diagnosisCode: body.diagnosisCode!,
    treatmentDate: body.treatmentDate!,
    amount: body.amount!,
    currency: body.currency!,
    notes: body.notes,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  };
  claims.set(claim.id, claim);
  res.status(201).json(claim);
});

// GET /api/v1/claims
app.get('/api/v1/claims', requireAuth, (req, res) => {
  const { status, page = '1', pageSize = '20' } = req.query as Record<string, string>;

  let items = Array.from(claims.values());
  if (status) items = items.filter((c) => c.status === status);

  const pageNum = Math.max(1, parseInt(page));
  const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize)));
  const total = items.length;
  const totalPages = Math.ceil(total / pageSizeNum) || 1;
  const start = (pageNum - 1) * pageSizeNum;

  res.json({
    items: items.slice(start, start + pageSizeNum),
    total,
    page: pageNum,
    pageSize: pageSizeNum,
    totalPages,
  });
});

// GET /api/v1/claims/:id
app.get('/api/v1/claims/:id', requireAuth, (req, res) => {
  const claim = claims.get(req.params.id);
  if (!claim) {
    res.status(404).json({ message: `Claim ${req.params.id} not found` });
    return;
  }
  res.json(claim);
});

// POST /api/v1/claims/:id/documents
app.post(
  '/api/v1/claims/:id/documents',
  requireAuth,
  upload.single('file'),
  (req, res) => {
    const claimId = req.params.id;
    if (!claims.has(claimId)) {
      res.status(404).json({ message: `Claim ${claimId} not found` });
      return;
    }

    const fields: Record<string, string> = {};
    if (!req.file) fields.file = 'required';
    if (!(req.body as { type?: string }).type) fields.type = 'required';

    if (Object.keys(fields).length > 0) {
      res.status(400).json({ message: 'Validation failed', fields });
      return;
    }

    const doc: StoredDocument = {
      id: `DOC-${randomUUID().slice(0, 8).toUpperCase()}`,
      claimId,
      type: (req.body as { type: string }).type as DocumentType,
      filename: req.file!.originalname,
      size: req.file!.size,
      mimeType: req.file!.mimetype,
      uploadedAt: new Date().toISOString(),
    };

    if (!documents.has(claimId)) documents.set(claimId, []);
    documents.get(claimId)!.push(doc);
    res.status(201).json(doc);
  }
);

// GET /api/v1/claims/:id/documents
app.get('/api/v1/claims/:id/documents', requireAuth, (req, res) => {
  const claimId = req.params.id;
  if (!claims.has(claimId)) {
    res.status(404).json({ message: `Claim ${claimId} not found` });
    return;
  }
  res.json(documents.get(claimId) ?? []);
});

app.listen(PORT, () => {
  console.log(`\nMock Insurance API — http://localhost:${PORT}`);
  console.log('─'.repeat(50));
  console.log('  POST  /api/v1/auth/token');
  console.log('  POST  /api/v1/claims');
  console.log('  GET   /api/v1/claims');
  console.log('  GET   /api/v1/claims/:id');
  console.log('  POST  /api/v1/claims/:id/documents');
  console.log('  GET   /api/v1/claims/:id/documents');
  console.log('─'.repeat(50));
  console.log(`  Simulated 503 failure rate: ${(FAILURE_RATE * 100).toFixed(0)}%`);
  console.log('  SDK retries handle failures automatically\n');
});

export { app };
