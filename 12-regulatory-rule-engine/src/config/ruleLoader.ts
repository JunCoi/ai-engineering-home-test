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
    .filter((file) => file.endsWith('.yaml') && !file.includes('skeleton'))
    .map((file) => loadCountryConfig(file.replace('.yaml', '')));
}

export function getActiveRules(config: CountryConfig, submissionDate: string): Rule[] {
  const submittedAt = new Date(submissionDate);

  return config.rules.filter((rule) => {
    const effectiveDate = new Date(rule.effective_date);
    const expiryDate = rule.expiry_date ? new Date(rule.expiry_date) : undefined;
    return submittedAt >= effectiveDate && (!expiryDate || submittedAt <= expiryDate);
  });
}
