import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { z } from 'zod';
import type { WorkflowConfig } from '../types/workflow.js';

const preconditionSchema = z.object({
  type: z.string(),
  description: z.string(),
});

const sideEffectSchema = z.object({
  type: z.string(),
  params: z.record(z.unknown()).optional(),
});

const transitionSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  description: z.string(),
  authorizedRoles: z.array(z.string()),
  preconditions: z.array(preconditionSchema),
  sideEffects: z.array(sideEffectSchema),
});

const stateSchema = z.object({
  id: z.string(),
  description: z.string(),
});

const workflowConfigSchema = z.object({
  states: z.array(stateSchema),
  transitions: z.array(transitionSchema),
});

export function loadWorkflowConfig(configDir?: string): WorkflowConfig {
  const dir = configDir ?? path.resolve(process.cwd(), 'configs');
  const filePath = path.join(dir, 'workflow.yaml');

  if (!fs.existsSync(filePath)) {
    throw new Error(`Workflow config not found: ${filePath}`);
  }

  const parsed = YAML.parse(fs.readFileSync(filePath, 'utf8'));
  return workflowConfigSchema.parse(parsed) as WorkflowConfig;
}
