import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { AssessmentReport } from "../types/domain.js";

export function writeReport(report: AssessmentReport, outputDir = "outputs"): void {
  mkdirSync(outputDir, { recursive: true });
  const reportPath = path.join(outputDir, `${report.claimId}-report.json`);
  const logPath = path.join(outputDir, `${report.claimId}-tool-call-logs.json`);

  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  writeFileSync(logPath, JSON.stringify(report.toolCallLogs, null, 2));
}
