import { z } from 'zod';

export const ruleSchema = z.object({
  rule_id: z.string(),
  description: z.string(),
  rule_type: z.enum([
    'document_requirement',
    'sla_check',
    'waiting_period',
    'data_masking',
    'coverage_mandate',
  ]),
  effective_date: z.string(),
  expiry_date: z.string().optional(),
  parameters: z.record(z.unknown()),
});

export const countryConfigSchema = z.object({
  country: z.string(),
  country_code: z.string(),
  rules: z.array(ruleSchema),
});
