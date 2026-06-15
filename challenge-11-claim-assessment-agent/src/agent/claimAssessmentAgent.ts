import { isWithinInterval, parseISO } from "date-fns";
import type {
  AssessmentReport,
  Claim,
  DocumentReviewItem,
  Policy,
  Recommendation,
  ToolContext
} from "../types/domain.js";
import { calculateBenefit } from "../tools/calculateBenefit.js";
import { checkMedicalNecessity } from "../tools/checkMedicalNecessity.js";
import { lookupPolicy } from "../tools/lookupPolicy.js";
import { verifyDocument } from "../tools/verifyDocument.js";

function clause(policy: Policy, title: string): string {
  const found = policy.clauses.find((item) => item.title === title);
  return found?.clauseId ?? "UNKNOWN_CLAUSE";
}

function findMissingRequiredDocuments(claim: Claim, reviews: DocumentReviewItem[]): DocumentReviewItem[] {
  return claim.requiredDocumentTypes.flatMap((requiredType) => {
    const matching = reviews.find(
      (review) => review.expectedType === requiredType && review.actualType === requiredType && review.status === "COMPLETE"
    );

    if (matching) return [];

    const wrongOrIncomplete = reviews.find((review) => review.expectedType === requiredType);
    if (wrongOrIncomplete) return [wrongOrIncomplete];

    return [{
      documentId: `missing-${requiredType}`,
      expectedType: requiredType,
      status: "MISSING" as const,
      issues: [`Missing required document: ${requiredType}`]
    }];
  });
}

export class ClaimAssessmentAgent {
  assess(claim: Claim): AssessmentReport {
    const context: ToolContext = { logs: [] };

    // Required order step 1: verify all submitted documents.
    const documentReviews = claim.submittedDocumentIds.map((documentId) => verifyDocument(documentId, context));
    const missingOrInvalidRequiredDocuments = findMissingRequiredDocuments(claim, documentReviews);

    // Required order step 2: lookup policy. The agent must not hallucinate terms.
    const policy = lookupPolicy(claim.policyId, context);

    const treatmentDate = parseISO(claim.treatmentDate);
    const policyActive = isWithinInterval(treatmentDate, {
      start: parseISO(policy.activeFrom),
      end: parseISO(policy.activeTo)
    });
    const memberCovered = policy.memberId === claim.memberId;
    const claimTypeCovered = policy.coveredClaimTypes.includes(claim.claimType);

    // Required order step 3: check medical necessity.
    const medicalResult = checkMedicalNecessity(claim.diagnosis, claim.procedures, context);

    // Required order step 4: calculate benefits.
    const benefitResult = calculateBenefit(claim.policyId, claim.claimType, claim.amount, context);
    const currentBenefit = policy.benefits[claim.claimType];
    if (!currentBenefit) {
      throw new Error(`Benefit config not found for ${claim.claimType} in policy ${policy.policyId}`);
    }

    const coveragePeriodClause = clause(policy, "Coverage Period");
    const medicalNecessityClause = clause(policy, "Medical Necessity");
    const requiredDocumentsClause = clause(policy, "Required Documents") !== "UNKNOWN_CLAUSE"
      ? clause(policy, "Required Documents")
      : clause(policy, "Specialist Benefit");
    const limitClause = clause(policy, "Benefit Limit") !== "UNKNOWN_CLAUSE"
      ? clause(policy, "Benefit Limit")
      : clause(policy, claim.claimType === "SPECIALIST" ? "Specialist Benefit" : "Outpatient Benefit");
    const exclusionClause = clause(policy, "Exclusions");

    const reasoning: string[] = [];
    const policyCitations = new Set<string>();

    let recommendation: Recommendation = "APPROVE";

    if (missingOrInvalidRequiredDocuments.length > 0) {
      recommendation = "REQUEST_MORE_INFO";
      reasoning.push(
        `Required document issue: ${missingOrInvalidRequiredDocuments.flatMap((item) => item.issues).join("; ")}`
      );
      policyCitations.add(requiredDocumentsClause);
    }

    if (!policyActive || !memberCovered || !claimTypeCovered) {
      recommendation = "REJECT";
      if (!policyActive) reasoning.push("Treatment date is outside the policy coverage period.");
      if (!memberCovered) reasoning.push("Claim member does not match the policy member.");
      if (!claimTypeCovered) reasoning.push(`Claim type ${claim.claimType} is not covered by this policy.`);
      policyCitations.add(coveragePeriodClause);
    }

    const excludedProcedure = claim.procedures.find((procedure) => policy.exclusions.includes(procedure));
    if (excludedProcedure) {
      recommendation = "REJECT";
      reasoning.push(`Procedure ${excludedProcedure} is excluded by the policy.`);
      policyCitations.add(exclusionClause);
    }

    if (!medicalResult.isMedicallyNecessary && recommendation !== "REQUEST_MORE_INFO") {
      recommendation = "REJECT";
      reasoning.push(medicalResult.explanation);
      policyCitations.add(medicalNecessityClause);
    }

    if (benefitResult.limitExceeded && recommendation !== "REQUEST_MORE_INFO") {
      recommendation = "REJECT";
      reasoning.push("Submitted amount exceeds the remaining benefit limit.");
      policyCitations.add(limitClause);
    }

    if (recommendation === "APPROVE") {
      reasoning.push("All required documents are complete, policy is active, treatment is medically necessary, and benefit amount is within limit.");
      policyCitations.add(coveragePeriodClause);
      policyCitations.add(medicalNecessityClause);
      policyCitations.add(limitClause);
    }

    return {
      claimId: claim.claimId,
      recommendation,
      documentReview: [...documentReviews, ...missingOrInvalidRequiredDocuments.filter((item) => item.status === "MISSING")],
      policyVerification: {
        policyActive,
        memberCovered,
        claimTypeCovered,
        issues: [
          ...(!policyActive ? ["Treatment date is outside the policy coverage period"] : []),
          ...(!memberCovered ? ["Claim member does not match policy member"] : []),
          ...(!claimTypeCovered ? [`Claim type ${claim.claimType} is not covered`] : [])
        ],
        citations: [coveragePeriodClause]
      },
      medicalNecessity: {
        isMedicallyNecessary: medicalResult.isMedicallyNecessary,
        explanation: medicalResult.explanation,
        citations: [medicalNecessityClause]
      },
      benefitCalculation: {
        submittedAmount: benefitResult.submittedAmount,
        coveredAmount: recommendation === "APPROVE" ? benefitResult.coveredAmount : 0,
        copay: recommendation === "APPROVE" ? benefitResult.copay : 0,
        memberResponsibility: recommendation === "APPROVE" ? benefitResult.memberResponsibility : claim.amount,
        remainingLimitAfterClaim: recommendation === "APPROVE" ? benefitResult.remainingLimitAfterClaim : currentBenefit.remainingLimit,
        citations: [limitClause]
      },
      reasoning,
      policyCitations: [...policyCitations].filter((item) => item !== "UNKNOWN_CLAUSE"),
      toolCallLogs: context.logs
    };
  }
}
