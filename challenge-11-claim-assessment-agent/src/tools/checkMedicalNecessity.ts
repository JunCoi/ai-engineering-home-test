import type { ToolContext } from "../types/domain.js";
import { logToolCall } from "./toolLogger.js";

const medicallySupportedProcedures: Record<string, string[]> = {
  "acute bronchitis": ["doctor_consultation", "standard_medication"],
  "persistent knee pain": ["specialist_consultation", "x_ray", "physiotherapy"],
  "cosmetic skin resurfacing": []
};

export interface MedicalNecessityResult {
  isMedicallyNecessary: boolean;
  explanation: string;
}

export function checkMedicalNecessity(
  diagnosis: string,
  procedures: string[],
  context: ToolContext
): MedicalNecessityResult {
  const supported = medicallySupportedProcedures[diagnosis.toLowerCase()] ?? [];
  const unsupported = procedures.filter((procedure) => !supported.includes(procedure));

  const output: MedicalNecessityResult = unsupported.length === 0 && supported.length > 0
    ? {
        isMedicallyNecessary: true,
        explanation: `Procedures are clinically appropriate for diagnosis: ${diagnosis}`
      }
    : {
        isMedicallyNecessary: false,
        explanation: `Procedures are not clinically supported for diagnosis: ${diagnosis}. Unsupported procedures: ${unsupported.join(", ") || procedures.join(", ")}`
      };

  logToolCall(context, "checkMedicalNecessity", { diagnosis, procedures }, output);
  return output;
}
