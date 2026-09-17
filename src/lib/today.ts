/* What the wall says today.
 *
 * Asked of the wall itself rather than computed a second time: the front page
 * and the public page must never be able to disagree, and two queries against
 * the same idea eventually differ on a day boundary and stay wrong until
 * somebody happens to look at both at once.
 *
 * Deliberately not on the critical path — the page renders its own copy and the
 * numbers arrive when they arrive. A stranger's first byte does not wait on a
 * count.
 */
export interface Today {
  people: string;
  did: string;
}

export async function getToday(): Promise<Today | null> {
  try {
    /* The function's own path, not the /wall rewrite. The rewrite exists for
       people typing a URL; asking for it here returns the SPA's index.html on
       any environment that does not apply vercel.json, and the counter silently
       falls back on a page that is otherwise working. */
    const res = await fetch('/api/wall?format=json', { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const body = (await res.json()) as { people?: string; did_line?: string };
    if (!body.people || !body.did_line) return null;
    return { people: body.people, did: body.did_line };
  } catch {
    return null;
  }
}
