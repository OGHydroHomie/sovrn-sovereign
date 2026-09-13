/**
 * A PostgREST-shaped database, in memory.
 *
 * Enough of the wire protocol for the real @supabase/supabase-js client to talk
 * to it without knowing the difference: the handler under test is the bundled
 * api/trial.ts, the client is the real one, and the queries it builds are the
 * queries that arrive here. Only the storage is a fixture.
 *
 * This exists because SUPABASE_SECRET_KEY is not on this machine and should not
 * be, and because a state machine wants to be exercised across a dozen shaped
 * histories rather than the one a live account happens to have.
 */
import { createServer } from 'node:http';

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/**
 * @param tables  seed rows per table
 * @param columns declared columns per table, so an insert reads back with the
 *                nulls a real row would have rather than absent keys
 * @param unique  partial unique indexes: { table: [{ on: [...cols], where: fn }] }
 *
 * The indexes matter more than they look. The product leans on
 * `trials_one_active` to guarantee one active trial per person — two tabs race,
 * one wins, the loser reads the winner's row — and a fixture without it let two
 * active trials exist, which then made `.maybeSingle()` return null and silently
 * disabled the entire freeing path. The fixture was weaker than the database it
 * was standing in for, and the test that relied on it passed anyway.
 */
export function fakeDb(tables, columns = {}, unique = {}) {
  let seq = 1000;
  const db = JSON.parse(JSON.stringify(tables));
  const log = [];

  const value = (raw) => {
    if (raw === 'null') return null;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return raw;
  };

  /** `col=eq.x`, `col=is.null`, `col=not.is.null` — the shapes this code uses. */
  const matches = (row, params) => {
    for (const [col, raw] of params) {
      if (['select', 'order', 'limit', 'offset'].includes(col)) continue;
      const [op, ...rest] = raw.split('.');
      const arg = rest.join('.');
      if (op === 'eq' && row[col] !== value(arg)) return false;
      if (op === 'is' && (row[col] ?? null) !== value(arg)) return false;
      if (op === 'not' && arg === 'is.null' && (row[col] ?? null) === null) return false;
      if (op === 'gte' && !(row[col] >= arg)) return false;
      if (op === 'lt' && !(row[col] < arg)) return false;
    }
    return true;
  };

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const params = [...url.searchParams.entries()];
    const send = (code, body) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    if (url.pathname === '/auth/v1/user') {
      const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
      if (!token || token === 'bad') return send(401, { message: 'invalid' });
      return send(200, { id: token, aud: 'authenticated', role: 'authenticated' });
    }

    const table = url.pathname.replace('/rest/v1/', '');
    if (!(table in db)) return send(404, { message: `no table ${table}` });

    let body = '';
    for await (const chunk of req) body += chunk;
    const payload = body ? JSON.parse(body) : null;
    const single = (req.headers.accept ?? '').includes('pgrst.object');

    let rows;
    if (req.method === 'GET') {
      rows = db[table].filter((r) => matches(r, params));
      const order = url.searchParams.get('order');
      if (order) {
        const [col, dir] = order.split('.');
        rows = [...rows].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (dir === 'desc' ? -1 : 1));
      }
      const limit = url.searchParams.get('limit');
      if (limit) rows = rows.slice(0, Number(limit));
      log.push(`GET    ${table} → ${rows.length}`);
    } else if (req.method === 'POST') {
      /* Real columns exist whether or not a row sets them, and they read back
         as null rather than absent. A fixture that omits them hides exactly the
         undefined-vs-null bugs worth catching. */
      const blank = Object.fromEntries((columns[table] ?? []).map((c) => [c, null]));
      const made = { ...blank, id: uuid(seq++), created_at: new Date().toISOString(), state: 'active', encounter: 1, ...payload };

      for (const idx of unique[table] ?? []) {
        if (idx.where && !idx.where(made)) continue;
        const clash = db[table].some((r) =>
          (!idx.where || idx.where(r)) && idx.on.every((c) => (r[c] ?? null) === (made[c] ?? null)));
        if (clash) {
          log.push(`INSERT ${table} REJECTED by unique(${idx.on.join(',')})`);
          /* What Postgres says, through PostgREST, when a unique index refuses
             a row. supabase-js surfaces it as an error and the callers here are
             written to read the winning row instead. */
          return send(409, { code: '23505', message: `duplicate key value violates unique constraint` });
        }
      }

      db[table].push(made);
      rows = [made];
      log.push(`INSERT ${table} ${JSON.stringify(payload).slice(0, 90)}`);
    } else if (req.method === 'PATCH') {
      rows = db[table].filter((r) => matches(r, params));
      for (const r of rows) Object.assign(r, payload);
      log.push(`UPDATE ${table} ×${rows.length} ${JSON.stringify(payload).slice(0, 90)}`);
    } else {
      return send(405, { message: 'no' });
    }

    if (single) {
      if (rows.length === 1) return send(200, rows[0]);
      /* What PostgREST does when an object was asked for and the set is not one
         row. supabase-js turns this into null for maybeSingle and an error for
         single, so getting it right matters. */
      return send(406, { code: 'PGRST116', message: `${rows.length} rows` });
    }
    return send(200, rows);
  });

  return {
    db, log,
    listen: () => new Promise((r) => server.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${server.address().port}`))),
    close: () => new Promise((r) => server.close(r)),
  };
}
