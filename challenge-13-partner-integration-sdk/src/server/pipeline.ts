import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ClaimAssessmentAgent } from '../../../challenge-11-claim-assessment-agent/src/agent/claimAssessmentAgent.js';
import { RuleEngine } from '../../../challenge-12-regulatory-rule-engine/src/engine/RuleEngine.js';
import { WorkflowEngine } from '../../../challenge-14-workflow-orchestrator/src/engine/WorkflowEngine.js';
import { loadWorkflowConfig } from '../../../challenge-14-workflow-orchestrator/src/config/workflowLoader.js';
import type { ClaimWorkflowState } from '../../../challenge-14-workflow-orchestrator/src/types/workflow.js';
import type { AssessmentResult, ComplianceResult, CreateClaimInput } from '../sdk/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULE_CONFIG_DIR = resolve(__dirname, '../../../challenge-12-regulatory-rule-engine/configs');
const WORKFLOW_CONFIG_DIR = resolve(__dirname, '../../../challenge-14-workflow-orchestrator/configs');

const assessmentAgent = new ClaimAssessmentAgent();
const ruleEngine = new RuleEngine(RULE_CONFIG_DIR);
export const workflowEngine = new WorkflowEngine(loadWorkflowConfig(WORKFLOW_CONFIG_DIR));

// Fields that activate the pipeline
export function hasPipelineFields(input: CreateClaimInput): boolean {
  return !!(input.memberId || input.countryCode);
}

export function runAssessment(
  claimId: string,
  input: CreateClaimInput
): AssessmentResult | undefined {
  if (!input.memberId) return undefined;

  try {
    const report = assessmentAgent.assess({
      claimId,
      policyId: input.policyId,
      memberId: input.memberId,
      claimType: input.claimType,
      amount: input.amount,
      currency: input.currency,
      diagnosis: input.diagnosis ?? input.diagnosisCode,
      procedures: input.procedures ?? [],
      treatmentDate: input.treatmentDate,
      submittedDocumentIds: input.submittedDocumentIds ?? [],
      requiredDocumentTypes: input.requiredDocumentTypes ?? [],
      expectedOutcome: 'APPROVE',
    });

    return {
      recommendation: report.recommendation,
      coveredAmount: report.benefitCalculation.coveredAmount,
      copay: report.benefitCalculation.copay,
      memberResponsibility: report.benefitCalculation.memberResponsibility,
      reasoning: report.reasoning,
      policyCitations: report.policyCitations,
    };
  } catch (err) {
    // Graceful fallback — policy not found, data mismatch, etc.
    const message = err instanceof Error ? err.message : 'Assessment unavailable';
    return {
      recommendation: 'REQUEST_MORE_INFO',
      coveredAmount: 0,
      copay: 0,
      memberResponsibility: input.amount,
      reasoning: [`Assessment could not be completed: ${message}`],
      policyCitations: [],
    };
  }
}

export type { ClaimWorkflowState };

export function initializeClaimWorkflow(
  claimId: string,
  assessment?: AssessmentResult
): ClaimWorkflowState {
  workflowEngine.createClaim(claimId);

  try {
    // System pipeline acts as document_clerk: auto-verify documents
    workflowEngine.transition(claimId, 'DOCUMENTS_VERIFIED', {
      userId: 'system', role: 'document_clerk', documentsComplete: true,
    });

    if (!assessment) return 'DOCUMENTS_VERIFIED';

    // System pipeline acts as team_lead: auto-assign AI assessor
    workflowEngine.transition(claimId, 'UNDER_ASSESSMENT', {
      userId: 'system', role: 'team_lead', assessorId: 'system-ai',
    });

    if (assessment.recommendation === 'APPROVE') {
      workflowEngine.transition(claimId, 'APPROVED', {
        userId: 'system-ai', role: 'assessor',
        assessmentReportComplete: true, amountWithinLimit: true,
      });
      return 'APPROVED';
    } else if (assessment.recommendation === 'REJECT') {
      workflowEngine.transition(claimId, 'REJECTED', {
        userId: 'system-ai', role: 'assessor',
        assessmentReportComplete: true,
        rejectionReason: assessment.reasoning.join('; '),
      });
      return 'REJECTED';
    } else {
      workflowEngine.transition(claimId, 'PENDING_INFO', {
        userId: 'system-ai', role: 'assessor',
        missingInfoDescription: assessment.reasoning.join('; '),
      });
      return 'PENDING_INFO';
    }
  } catch {
    return workflowEngine.getCurrentState(claimId).currentState;
  }
}

export function runCompliance(
  claimId: string,
  input: CreateClaimInput
): ComplianceResult | undefined {
  if (!input.countryCode) return undefined;

  try {
    const output = ruleEngine.validateClaim({
      claimId,
      countryCode: input.countryCode,
      claimType: input.claimType as Exclude<typeof input.claimType, 'DENTAL'>,
      conditionType: input.conditionType ?? 'GENERAL',
      treatmentType: input.treatmentType ?? 'NORMAL',
      networkStatus: input.networkStatus ?? 'IN_NETWORK',
      submissionDate: new Date().toISOString().slice(0, 10),
      treatmentDate: input.treatmentDate,
      policyStartDate: input.policyStartDate ?? new Date().toISOString().slice(0, 10),
      documents: input.requiredDocumentTypes ?? [],
      patient: input.patient ?? { fullName: 'Unknown' },
    });

    return {
      overallStatus: output.overallStatus,
      country: output.country,
      results: output.results.map((r) => ({
        ruleId: r.ruleId,
        status: r.status,
        message: r.message,
        remediation: r.remediation,
      })),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Compliance check unavailable';
    return {
      overallStatus: 'NON_COMPLIANT',
      country: input.countryCode,
      results: [
        {
          ruleId: 'SYSTEM',
          status: 'FAIL',
          message: `Compliance check could not be completed: ${message}`,
        },
      ],
    };
  }
}
