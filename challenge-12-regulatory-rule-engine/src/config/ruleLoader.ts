import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { countryConfigSchema } from './schema.js';
import type { CountryConfig, Rule } from '../types/rule.js';

export function loadCountryConfig(countryCode: string, configDir?: string): CountryConfig {
  const dir = configDir ?? path.resolve(process.cwd(), 'configs');
  const filePath = path.join(dir, `${countryCode}.yaml`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`No config file found for country: ${countryCode}`);
  }

  const parsed = YAML.parse(fs.readFileSync(filePath, 'utf8'));
  return countryConfigSchema.parse(parsed);
}

export function loadAllCountryConfigs(configDir?: string): CountryConfig[] {
  const dir = configDir ?? path.resolve(process.cwd(), 'configs');
  return fs
    .readdirSync(dir)
    .filter((file: string) => file.endsWith('.yaml') && !file.includes('skeleton'))
    .map((file: string) => loadCountryConfig(file.replace('.yaml', ''), dir));
}

export function getActiveRules(config: CountryConfig, submissionDate: string): Rule[] {
  const submittedAt = new Date(submissionDate);

  return config.rules.filter((rule) => {
    const effectiveDate = new Date(rule.effectiveDate);
    const expiryDate = rule.expiryDate ? new Date(rule.expiryDate) : undefined;
    return submittedAt >= effectiveDate && (!expiryDate || submittedAt <= expiryDate);
  });
}
