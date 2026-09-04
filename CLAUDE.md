# CLAUDE.md

Rules that exist because something broke. Each one names the failure it prevents.

## Type-check `api/` on every build

`npm run build` runs `tsc -b`, and `tsconfig.json` references `tsconfig.api.json`.
Do not remove that reference, and do not add serverless functions outside `api/`
where nothing will check them.

**Why:** for the first weeks of this project `api/` was type-checked by nothing at
all. Vite does not compile it and the app's tsconfig does not include it. Adding
the reference immediately surfaced two errors in new code and three `unknown`
holes in `generate.ts` and `morning.ts` that had already shipped. Every serverless
handler in this repo is one import away from a runtime 500 that no local command
would have caught.

## Verify against a real deployment, never a local copy

A thing is verified when the deployed artifact has been observed doing it. Not
when it built, not when the source looks right.

- Compare the deployed bundle hash to a fresh local build before claiming a
  change is live, and run the build from the repo root.
- For a serverless change, find the log line or the response from the deployed
  function. "It compiles" is not evidence about production.
- If a check cannot be run, say so and name what is unverified. An honest gap is
  worth more than a claim that dissolves later.

**Why:** a production 500 was caused by an extensionless ESM import that resolved
fine locally and not at all on Vercel. Separately, a bundle comparison was run
from `/tmp`, produced an empty hash, and passed trivially against everything.

## Never edit a copy to make a harness pass

Test harnesses import the real module. Bundle `api/day7.ts` with esbuild and call
its exported handler; do not paste the logic into the test file, and do not adjust
the thing under test so the test runs.

If a function needs to be reachable, export it from the real module and say why in
the commit. `isDue`, `emailHtml`, `selectBecoming` and `validateRead` are all
exported for exactly this reason.

**Why:** while diagnosing the ESM import bug, the file being tested was edited to
fix the specifier, and the edited copy was then used as proof the original worked.
The bug being investigated was erased by the investigation. A harness that runs
against a paraphrase of the code tells you the paraphrase is fine.

## Standing conventions

- **Design** is governed by `DESIGN_FROZEN.md`. A visual change to a shipped
  surface needs a written reason before the commit; put it in the code.
- **Progress** goes in `PROGRESS.md`, one paragraph per task: what shipped, what
  broke, what is open. "What broke" includes your own mistakes and any
  completeness you claimed without checking.
- **Secrets** are referenced by name, never printed and never hardcoded.
- **Generated copy** that reaches a person passes `api/_safety.ts`. No exceptions,
  including descriptive prose.
- **Times** shown to a person are rendered in that person's stored timezone. Never
  hand a model a raw UTC timestamp; it will render exactly what it is given.
