import { loadCountryConfig } from '../config/ruleLoader.js';

export function diffCountries(countryA: string, countryB: string) {
  const a = loadCountryConfig(countryA);
  const b = loadCountryConfig(countryB);

  const groupedA = groupByType(a.rules);
  const groupedB = groupByType(b.rules);
  const ruleTypes = Array.from(new Set([...Object.keys(groupedA), ...Object.keys(groupedB)])).sort();

  return ruleTypes.map((ruleType) => ({
    rule_type: ruleType,
    country_a: a.country,
    country_b: b.country,
    differs: JSON.stringify(groupedA[ruleType] ?? []) !== JSON.stringify(groupedB[ruleType] ?? []),
    rules_a: groupedA[ruleType] ?? [],
    rules_b: groupedB[ruleType] ?? [],
  }));
}

function groupByType(rules: { rule_type: string; description: string; parameters: unknown }[]) {
  return rules.reduce<Record<string, unknown[]>>((acc, rule) => {
    acc[rule.rule_type] ??= [];
    acc[rule.rule_type].push({ description: rule.description, parameters: rule.parameters });
    return acc;
  }, {});
}
