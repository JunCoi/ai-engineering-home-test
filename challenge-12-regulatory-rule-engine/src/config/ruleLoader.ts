import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { countryConfigSchema } from './schema.js';
import type { CountryConfig, Rule } from '../types/rule.js';

const CONFIG_DIR = path.resolve(process.cwd(), 'configs');

export function loadCountryConfig(countryCode: string): CountryConfig {
  const filePath = path.join(CONFIG_DIR, `${countryCode}.yaml`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`No config file found for country: ${countryCode}`);
  }

  const parsed = YAML.parse(fs.readFileSync(filePath, 'utf8'));
  return countryConfigSchema.parse(parsed);
}

export function loadAllCountryConfigs(): CountryConfig[] {
  return fs
    .readdirSync(CONFIG_DIR)
    .filter((file: string) => file.endsWith('.yaml') && !file.includes('skeleton'))
    .map((file: string) => loadCountryConfig(file.replace('.yaml', '')));
}

export function getActiveRules(config: CountryConfig, submissionDate: string): Rule[] {
  const submittedAt = new Date(submissionDate);

  return config.rules.filter((rule) => {
    const effectiveDate = new Date(rule.effectiveDate);
    const expiryDate = rule.expiryDate ? new Date(rule.expiryDate) : undefined;
    return submittedAt >= effectiveDate && (!expiryDate || submittedAt <= expiryDate);
  });
}
