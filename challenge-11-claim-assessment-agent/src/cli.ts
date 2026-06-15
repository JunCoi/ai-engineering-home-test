import { Command } from "commander";
import { claims } from "./data/claims.js";
import { ClaimAssessmentAgent } from "./agent/claimAssessmentAgent.js";
import { writeReport } from "./reports/reportWriter.js";

const program = new Command();
const agent = new ClaimAssessmentAgent();

program
  .name("claim-assessment-agent")
  .description("AI Challenge 11 - Claim Assessment AI Agent")
  .version("1.0.0");

program
  .command("assess-all")
  .description("Assess all sample claims and write reports/tool logs to outputs/")
  .action(() => {
    const reports = claims.map((claim) => agent.assess(claim));
    reports.forEach((report) => writeReport(report));
    console.log(JSON.stringify(reports, null, 2));
  });

program
  .command("assess")
  .description("Assess one sample claim by ID")
  .requiredOption("--claim-id <claimId>", "Claim ID")
  .action((options: { claimId: string }) => {
    const claim = claims.find((item) => item.claimId === options.claimId);
    if (!claim) {
      throw new Error(`Claim not found: ${options.claimId}`);
    }

    const report = agent.assess(claim);
    writeReport(report);
    console.log(JSON.stringify(report, null, 2));
  });

program.parse();
