import type { AuditEntry } from '../types/workflow.js';

export class AuditTrail {
  private readonly entries: AuditEntry[] = [];

  log(entry: AuditEntry): void {
    // Deep-freeze to enforce immutability
    this.entries.push(Object.freeze(entry));
  }

  getHistory(claimId: string): AuditEntry[] {
    return this.entries.filter((e) => e.claimId === claimId);
  }

  getAll(): AuditEntry[] {
    return [...this.entries];
  }
}
