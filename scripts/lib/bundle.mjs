/**
 * Import a serverless module the way the deployment builds it.
 *
 * The rule this exists to keep: a harness imports the real module. It bundles
 * api/<name>.ts with esbuild and imports the result, so the thing under test is
 * the file that ships — not a paraphrase of it in the test, and not a copy that
 * was edited until the test ran.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const run = promisify(execFile);

export async function bundled(entry, { external = [] } = {}) {
  await mkdir(join(process.cwd(), 'node_modules'), { recursive: true });
  /* Inside the project, not /tmp. The externals stay external, so the bundle
     has to sit somewhere node's resolver can still find node_modules from — a
     bundle in the system temp dir throws ERR_MODULE_NOT_FOUND on its first
     import. node_modules/.sovrn is already ignored by everything. */
  const dir = await mkdtemp(join(process.cwd(), 'node_modules', '.sovrn-'));
  const out = join(dir, 'module.mjs');
  await run('npx', [
    'esbuild', entry, '--bundle', '--platform=node', '--format=esm',
    ...external.map((e) => `--external:${e}`),
    `--outfile=${out}`, '--log-level=warning',
  ], { cwd: process.cwd() });
  return import(pathToFileURL(out).href);
}

/** Serverless handlers keep their dependencies in node_modules. */
export const SERVERLESS = ['@supabase/supabase-js', '@anthropic-ai/sdk', '@vercel/node'];
