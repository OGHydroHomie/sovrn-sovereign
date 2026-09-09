#!/usr/bin/env node
/**
 * Write the commit being built into dist/, so the deploy check can see it.
 *
 * verify-deploy compares dist/ against what is served. That covers everything
 * static and nothing else — a commit touching only api/ produces a byte-
 * identical dist/, so the comparison matched the PREVIOUS deployment instantly
 * and reported green. It did that three times before it cost anything: the last
 * time it sent me to diagnose a grounding check that was working fine and simply
 * had not shipped yet.
 *
 * A file containing the commit sha makes every change visible to the existing
 * comparison, including changes to code that never reaches the browser.
 */
import { writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';

const commit = process.env.VERCEL_GIT_COMMIT_SHA
  ?? execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

await writeFile('dist/build-info.json', JSON.stringify({ commit }) + '\n');
console.log(`stamped dist/build-info.json  ${commit.slice(0, 12)}`);
