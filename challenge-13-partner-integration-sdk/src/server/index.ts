import express, { type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { ClaimType, DocumentType } from '../../../shared/src/types/index.js';
import type { AssessmentResult, ComplianceResult, CreateClaimInput } from '../sdk/types.js';
import type { TransitionContext } from '../../../challenge-14-workflow-orchestrator/src/types/workflow.js';
import {
  hasPipelineFields,
  runAssessment,
  runCompliance,
  initializeClaimWorkflow,
  workflowEngine,
  type ClaimWorkflowState,
} from './pipeline.js';

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
  assessment?: AssessmentResult;
  compliance?: ComplianceResult;
  workflowState?: ClaimWorkflowState;
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

// Simulate transient 503 failures (skip auth so clients can always refresh)
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
  const body = req.body as Partial<CreateClaimInput>;
  const errors: Record<string, string> = {};

  if (!body.policyId?.trim()) errors.policyId = 'required';
  if (!body.claimType) errors.claimType = 'required';
  if (!body.diagnosisCode?.trim()) errors.diagnosisCode = 'required';
  if (!body.treatmentDate?.trim()) errors.treatmentDate = 'required';
  if (body.amount == null || body.amount <= 0) errors.amount = 'must be a positive number';
  if (!body.currency?.trim()) errors.currency = 'required';

  if (Object.keys(errors).length > 0) {
    res.status(400).json({ message: 'Validation failed', fields: errors });
    return;
  }

  const input = body as CreateClaimInput;
  const now = new Date().toISOString();
  const claimId = `CLM-${randomUUID().slice(0, 8).toUpperCase()}`;

  const claim: StoredClaim = {
    id: claimId,
    policyId: input.policyId,
    claimType: input.claimType,
    diagnosisCode: input.diagnosisCode,
    treatmentDate: input.treatmentDate,
    amount: input.amount,
    currency: input.currency,
    notes: input.notes,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  };

  // Run AI assessment (Ch11) + regulatory compliance (Ch12) when extended fields present
  if (hasPipelineFields(input)) {
    claim.assessment = runAssessment(claimId, input);
    claim.compliance = runCompliance(claimId, input);

    // Advance REST status based on pipeline results
    const rec = claim.assessment?.recommendation;
    if (rec === 'APPROVE' || rec === 'REJECT') {
      claim.status = 'UNDER_REVIEW';
    }
  }

  // Register claim in Ch14 workflow engine and auto-advance based on assessment
  claim.workflowState = initializeClaimWorkflow(claimId, claim.assessment);

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
app.post('/api/v1/claims/:id/documents', requireAuth, upload.single('file'), (req, res) => {
  const claimId = req.params.id;
  if (!claims.has(claimId)) {
    res.status(404).json({ message: `Claim ${claimId} not found` });
    return;
  }

  const fieldErrors: Record<string, string> = {};
  if (!req.file) fieldErrors.file = 'required';
  if (!(req.body as { type?: string }).type) fieldErrors.type = 'required';

  if (Object.keys(fieldErrors).length > 0) {
    res.status(400).json({ message: 'Validation failed', fields: fieldErrors });
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
});

// GET /api/v1/claims/:id/workflow — current workflow state + audit trail (Ch14)
app.get('/api/v1/claims/:id/workflow', requireAuth, (req, res) => {
  const claimId = req.params.id;
  if (!claims.has(claimId)) {
    res.status(404).json({ message: `Claim ${claimId} not found` });
    return;
  }
  try {
    const state = workflowEngine.getCurrentState(claimId);
    const auditTrail = workflowEngine.getAuditTrail(claimId);
    const validTransitions = workflowEngine.getValidTransitions(claimId);
    res.json({ state, auditTrail, validTransitions });
  } catch {
    res.status(404).json({ message: `No workflow state found for claim ${claimId}` });
  }
});

// POST /api/v1/claims/:id/transition — manually advance workflow (Ch14)
app.post('/api/v1/claims/:id/transition', requireAuth, (req, res) => {
  const claimId = req.params.id;
  if (!claims.has(claimId)) {
    res.status(404).json({ message: `Claim ${claimId} not found` });
    return;
  }
  const { toState, context } = req.body as {
    toState?: ClaimWorkflowState;
    context?: TransitionContext;
  };
  if (!toState || !context?.userId || !context?.role) {
    res.status(400).json({ message: 'toState, context.userId, and context.role are required' });
    return;
  }
  try {
    const result = workflowEngine.transition(claimId, toState, context);
    // Keep StoredClaim workflowState in sync
    const claim = claims.get(claimId)!;
    claim.workflowState = result.toState;
    res.json(result);
  } catch (err) {
    const isWorkflowErr = err instanceof Error && 'code' in err;
    res.status(422).json({
      message: err instanceof Error ? err.message : 'Transition failed',
      code: isWorkflowErr ? (err as { code: string }).code : undefined,
    });
  }
});

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
  console.log('  POST  /api/v1/claims          (+ AI assessment & compliance when extended fields provided)');
  console.log('  GET   /api/v1/claims');
  console.log('  GET   /api/v1/claims/:id');
  console.log('  GET   /api/v1/claims/:id/workflow   (Ch14 workflow state + audit trail)');
  console.log('  POST  /api/v1/claims/:id/transition (Ch14 manual workflow advance)');
  console.log('  POST  /api/v1/claims/:id/documents');
  console.log('  GET   /api/v1/claims/:id/documents');
  console.log('─'.repeat(50));
  console.log('  Pipeline: Ch11 ClaimAssessmentAgent + Ch12 RuleEngine + Ch14 WorkflowEngine');
  console.log(`  Simulated 503 failure rate: ${(FAILURE_RATE * 100).toFixed(0)}%\n`);
});

export { app };
