import { describe, expect, it } from "vitest";
import { ClaimAssessmentAgent } from "../src/agent/claimAssessmentAgent.js";
import { claims } from "../src/data/claims.js";

const agent = new ClaimAssessmentAgent();

describe("ClaimAssessmentAgent", () => {
  it("approves the straightforward valid claim", () => {
    const report = agent.assess(claims[0]);
    expect(report.recommendation).toBe("APPROVE");
    expect(report.toolCallLogs.map((log) => log.toolName)).toEqual([
      "verifyDocument",
      "verifyDocument",
      "lookupPolicy",
      "checkMedicalNecessity",
      "calculateBenefit"
    ]);
  });

  it("rejects an excluded or over-limit claim", () => {
    const report = agent.assess(claims[1]);
    expect(report.recommendation).toBe("REJECT");
    expect(report.reasoning.join(" ")).toContain("excluded");
    expect(report.reasoning.join(" ")).toContain("exceeds");
  });

  it("requests more info for missing or wrong required documents", () => {
    const report = agent.assess(claims[2]);
    expect(report.recommendation).toBe("REQUEST_MORE_INFO");
    expect(report.documentReview.some((doc) => doc.status === "wrong_type")).toBe(true);
  });

  it("checks every submitted document", () => {
    const claim = claims[2];
    const report = agent.assess(claim);
    const verifyDocumentCalls = report.toolCallLogs.filter((log) => log.toolName === "verifyDocument");
    expect(verifyDocumentCalls).toHaveLength(claim.submittedDocumentIds.length);
  });

  it("includes specific policy citations", () => {
    const report = agent.assess(claims[0]);
    expect(report.policyCitations.length).toBeGreaterThan(0);
    expect(report.policyCitations.every((citation) => citation.startsWith("POL-"))).toBe(true);
  });
});
