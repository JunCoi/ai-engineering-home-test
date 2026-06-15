import { loadCountryConfig } from '../config/ruleLoader.js';

export function diffCountries(countryA: string, countryB: string) {
  const a = loadCountryConfig(countryA);
  const b = loadCountryConfig(countryB);

  const groupedA = groupByType(a.rules);
  const groupedB = groupByType(b.rules);
  const ruleTypes = Array.from(new Set([...Object.keys(groupedA), ...Object.keys(groupedB)])).sort();

  return ruleTypes.map((ruleType) => ({
    ruleType: ruleType,
    countryA: a.country,
    countryB: b.country,
    differs: JSON.stringify(groupedA[ruleType] ?? []) !== JSON.stringify(groupedB[ruleType] ?? []),
    rulesA: groupedA[ruleType] ?? [],
    rulesB: groupedB[ruleType] ?? [],
  }));
}

function groupByType(rules: { ruleType: string; description: string; parameters: unknown }[]) {
  return rules.reduce<Record<string, unknown[]>>((acc, rule) => {
    acc[rule.ruleType] ??= [];
    acc[rule.ruleType].push({ description: rule.description, parameters: rule.parameters });
    return acc;
  }, {});
}
