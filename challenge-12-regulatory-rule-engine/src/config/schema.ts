import { z } from 'zod';

export const ruleSchema = z.object({
  ruleId: z.string(),
  description: z.string(),
  ruleType: z.enum([
    'DOCUMENT_REQUIREMENT',
    'SLA_CHECK',
    'WAITING_PERIOD',
    'DATA_MASKING',
    'COVERAGE_MANDATE',
  ]),
  effectiveDate: z.string(),
  expiryDate: z.string().optional(),
  parameters: z.record(z.unknown()),
});

export const countryConfigSchema = z.object({
  country: z.string(),
  countryCode: z.string(),
  rules: z.array(ruleSchema),
});
