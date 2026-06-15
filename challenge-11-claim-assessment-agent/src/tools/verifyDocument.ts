import { documents } from "../data/documents.js";
import type { DocumentReviewItem, ToolContext } from "../types/domain.js";
import { logToolCall } from "./toolLogger.js";

export function verifyDocument(documentId: string, context: ToolContext): DocumentReviewItem {
  const document = documents.find((item) => item.documentId === documentId);

  if (!document) {
    const output: DocumentReviewItem = {
      documentId,
      expectedType: "UNKNOWN",
      status: "MISSING",
      issues: [`Document not found: ${documentId}`]
    };
    logToolCall(context, "verifyDocument", { documentId }, output);
    return output;
  }

  const status = !document.isComplete
    ? "INCOMPLETE"
    : document.actualType !== document.expectedType
      ? "WRONG_TYPE"
      : "COMPLETE";

  const output: DocumentReviewItem = {
    documentId: document.documentId,
    expectedType: document.expectedType,
    actualType: document.actualType,
    status,
    issues: document.issues
  };

  logToolCall(context, "verifyDocument", { documentId }, output);
  return output;
}
