import fs from 'node:fs';
import { Command } from 'commander';
import { loadCountryConfig } from './config/ruleLoader.js';
import { diffCountries } from './diff/ruleDiff.js';
import { RuleEngine } from './engine/RuleEngine.js';
import type { Claim } from './types/claim.js';

const program = new Command();
program.name('regulatory-rule-engine').description('Configurable regulatory rule engine CLI');

program
  .command('validate')
  .requiredOption('--claims <path>', 'Path to claims JSON file')
  .option('--claim-id <claimId>', 'Validate only one claim')
  .action((options) => {
    const claims = JSON.parse(fs.readFileSync(options.claims, 'utf8')) as Claim[];
    const selectedClaims = options.claimId ? claims.filter((claim) => claim.claim_id === options.claimId) : claims;
    const engine = new RuleEngine();
    console.log(JSON.stringify(selectedClaims.map((claim) => engine.validateClaim(claim)), null, 2));
  });

program
  .command('rules')
  .requiredOption('--country <countryCode>', 'Country config code, e.g. thailand')
  .action((options) => {
    console.log(JSON.stringify(loadCountryConfig(options.country), null, 2));
  });

program
  .command('diff')
  .requiredOption('--country-a <countryCode>')
  .requiredOption('--country-b <countryCode>')
  .action((options) => {
    console.log(JSON.stringify(diffCountries(options.countryA, options.countryB), null, 2));
  });

program.parse();
