import type { ToolContext } from "../types/domain.js";

export function logToolCall(context: ToolContext, toolName: string, input: unknown, output: unknown): void {
  context.logs.push({
    toolName,
    input,
    output,
    calledAt: new Date().toISOString()
  });
}
