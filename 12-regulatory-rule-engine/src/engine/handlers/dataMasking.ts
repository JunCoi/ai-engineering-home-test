import type { Claim } from '../../types/claim.js';
import type { Rule, RuleResult } from '../../types/rule.js';

function firstLastInitial(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return `${parts[0][0]}***`;
  return `${parts[0][0]}*** ${parts[parts.length - 1][0]}***`;
}

function lastFourOnly(value: string): string {
  return `***-***-${value.slice(-4)}`;
}

function hkidMasked(value: string): string {
  const first = value[0];
  const lastDigit = value.match(/\d(?=\)?$)/)?.[0] ?? value[value.length - 1];
  return `${first}******${lastDigit}`;
}

export function validateDataMasking(rule: Rule, claim: Claim): RuleResult {
  const field = String(rule.parameters.field);
  const context = String(rule.parameters.report_context ?? 'external');
  const report = claim.reports?.[context as 'external' | 'internal'];

  if (!report) {
    return { rule_id: rule.rule_id, rule_type: rule.rule_type, status: 'FAIL', message: `Missing ${context} report for data masking validation.`, remediation: `Generate a ${context} report with masked personal data.` };
  }

  let expected: string;
  if (field === 'national_id') expected = lastFourOnly(claim.patient.national_id ?? '');
  else if (field === 'full_name') expected = firstLastInitial(claim.patient.full_name);
  else if (field === 'hkid') expected = hkidMasked(claim.patient.hkid ?? '');
  else throw new Error(`Unsupported masking field: ${field}`);

  if (report[field] === expected) {
    return { rule_id: rule.rule_id, rule_type: rule.rule_type, status: 'PASS', message: `${field} is correctly masked in ${context} report.` };
  }

  return {
    rule_id: rule.rule_id,
    rule_type: rule.rule_type,
    status: 'FAIL',
    message: `${field} is not correctly masked in ${context} report. Expected '${expected}'.`,
    remediation: `Mask ${field} according to the country rule before sharing the ${context} report.`,
  };
}
