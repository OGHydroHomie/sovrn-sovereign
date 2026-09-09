#!/usr/bin/env node
/**
 * The browser's copy of the thirteen must equal the engine's.
 *
 * api/_becomings.ts is the authority: it is what the reading is generated from.
 * src/lib/archetypes.ts exists because a serverless function should not import
 * client modules, and the /about grid needs the names. Two lists that must agree
 * are two lists that will drift, so this fails the build when they do.
 */
import { readFileSync } from 'node:fs';

const names = (block) => [...block.matchAll(/^(THE [A-Z ]+|The [A-Za-z-]+(?: [A-Za-z-]+)*) —/gm)].map((m) => m[1].trim());
const api = readFileSync('api/_becomings.ts', 'utf8');
const apiBecomings = names(api.split('export const LOOPS')[0]);
const apiLoops = names(api.split('export const LOOPS')[1] ?? '');

const client = readFileSync('src/lib/archetypes.ts', 'utf8');
const list = (name) => [...(client.split(`export const ${name}`)[1] ?? '').split('] as const')[0]
  .matchAll(/'([^']+)'/g)].map((m) => m[1]);
const clientBecomings = list('BECOMINGS');
const clientLoops = list('LOOPS');

const problems = [];
const compare = (label, a, b) => {
  if (a.length !== 13) problems.push(`${label}: expected 13 in the engine, found ${a.length}`);
  if (b.length !== 13) problems.push(`${label}: expected 13 in the browser, found ${b.length}`);
  a.forEach((n, i) => { if (b[i] !== n) problems.push(`${label}[${i}]: engine "${n}" vs browser "${b[i]}"`); });
};
compare('BECOMINGS', apiBecomings, clientBecomings);
compare('LOOPS', apiLoops, clientLoops);

if (problems.length) {
  console.error('check-archetypes: the two lists have drifted\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`check-archetypes: ${apiBecomings.length} becomings and ${apiLoops.length} loops match`);
