import { supabase } from './supabase';
import { ensureUser } from './session';

export interface ParsedBlueprint {
  /** The becoming name, e.g. "THE HEADLINER". Empty if the reading is malformed. */
  becoming: string;
  /** The loop name only, e.g. "Opening Act". */
  loop: string;
  whoYouAre: string;
  thePattern: string;
  /** Everything in ONE ACT that is not one of the two options. */
  oneActTail: string;
  /** The quoted line closing WHO YOU ARE — the sentence meant to stop them. */
  recognitionLine: string;
  /** The quoted first-person line closing ONE ACT. */
  declarationLine: string;
  hardOne: string;
  nextOne: string;
}

const SECTIONS = ['WHO YOU ARE', 'THE PATTERN', 'ONE ACT'] as const;

/** First sentence of a block, for the collapsed card teaser. */
export function teaser(body: string, max = 96): string {
  const flat = body.replace(/\s+/g, ' ').replace(/^["“]/, '').trim();
  const end = flat.search(/[.!?](\s|$)/);
  const first = end === -1 ? flat : flat.slice(0, end + 1);
  return first.length > max ? first.slice(0, max - 1).trimEnd() + '…' : first;
}

/**
 * The last line of a block that is wrapped in quotation marks.
 *
 * Both recurring lines are specified as the closing line of their section, so
 * the last quoted line is the one — scanning from the end also means a quotation
 * used mid-paragraph cannot win. The quotation marks are kept: the line is a
 * quotation everywhere it appears, and stripping them here would only mean every
 * surface had to put them back. Straight and typographic quotes both match,
 * because the model produces either.
 */
export function lastQuotedLine(body: string): string {
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^["\u201C].*["\u201D][.]?$/.test(lines[i])) return lines[i];
  }
  return '';
}

/**
 * Parse a v2 blueprint.
 *
 * Shape: the becoming alone on the first line, "Right now you're the [loop]." on
 * the second, then WHO YOU ARE / THE PATTERN / ONE ACT, with THE HARD ONE and
 * THE NEXT ONE inside the last one.
 *
 * Every field degrades to empty rather than throwing. A reading that arrives in
 * an unexpected shape should render as much as it can, not blank the page.
 */
export function parseBlueprint(text: string): ParsedBlueprint {
  const lines = text.split('\n');

  let becoming = '';
  let loop = '';
  let cursor = 0;

  for (; cursor < lines.length; cursor++) {
    const t = lines[cursor].trim();
    if (!t) continue;
    if (!becoming) {
      // Guard against a reading that opens straight into a section header.
      if ((SECTIONS as readonly string[]).includes(t)) break;
      becoming = t.replace(/[.:]$/, '');
      continue;
    }
    const m = t.match(/right now you'?re the\s+(.+?)\.?$/i);
    if (m) {
      loop = m[1].trim();
      cursor++;
    }
    break;
  }

  const bodies: Record<string, string[]> = {};
  let current: string | null = null;
  for (; cursor < lines.length; cursor++) {
    const t = lines[cursor].trim();
    if ((SECTIONS as readonly string[]).includes(t)) {
      current = t;
      bodies[current] = [];
      continue;
    }
    if (current) bodies[current].push(lines[cursor]);
  }

  const join = (k: string) => (bodies[k] ?? []).join('\n').trim();

  const oneActRaw = join('ONE ACT');
  const grab = (label: string) => {
    const m = oneActRaw.match(new RegExp(`${label}\\s*[—–-]\\s*([^\\n]+)`, 'i'));
    return m ? m[1].trim() : '';
  };
  const hardOne = grab('THE HARD ONE');
  const nextOne = grab('THE NEXT ONE');

  const oneActTail = oneActRaw
    .split('\n')
    .filter((l) => !/^\s*THE (HARD|NEXT) ONE/i.test(l))
    .join('\n')
    .trim();

  const whoYouAre = join('WHO YOU ARE');

  return {
    becoming,
    loop,
    whoYouAre,
    thePattern: join('THE PATTERN'),
    oneActTail,
    recognitionLine: lastQuotedLine(whoYouAre),
    declarationLine: lastQuotedLine(oneActTail),
    hardOne,
    nextOne,
  };
}

export interface Profile {
  becoming: string | null;
  recognitionLine: string | null;
  /** Set on day 7. Null while the becoming still reads "in progress". */
  becomingResolvedAt: string | null;
  /** IANA zone captured at intake. The Ledger renders times in it, not the device's. */
  timezone: string | null;
  /** The full reading. Null for anything generated before it was stored. */
  blueprintText: string | null;
  loop: string | null;
  acts: { hard?: string; next?: string };
  chosen: 'hard' | 'next' | null;
}

/**
 * What is already on this person's record.
 *
 * Read back rather than re-derived: the blueprint text lives in localStorage on
 * one device, and /ledger is the surface someone reaches from a link in their
 * email, frequently on another one. `users_select_own` scopes the read to
 * id = auth.uid().
 */
export async function getProfile(): Promise<Profile | null> {
  const uid = await ensureUser();
  if (!uid) return null;

  const { data, error } = await supabase
    .from('users')
    .select('archetype, recognition_line, becoming_resolved_at, timezone, blueprint_text, blueprint_json')
    .eq('id', uid)
    .maybeSingle();

  if (error) {
    console.warn('Profile read failed:', error.message);
    return null;
  }
  const row = data as {
    archetype: string | null;
    recognition_line: string | null;
    becoming_resolved_at: string | null;
    timezone: string | null;
    blueprint_text: string | null;
    blueprint_json: {
      loop?: string; acts?: { hard?: string; next?: string }; chosen?: 'hard' | 'next' | null;
    } | null;
  } | null;
  if (!row) return null;

  const bp = row.blueprint_json ?? {};
  return {
    becoming: row.archetype,
    recognitionLine: row.recognition_line,
    becomingResolvedAt: row.becoming_resolved_at,
    timezone: row.timezone,
    blueprintText: row.blueprint_text,
    loop: bp.loop ?? null,
    acts: bp.acts ?? {},
    chosen: bp.chosen ?? null,
  };
}

/**
 * Keep the parsed reading — including the act the person did not take — on their
 * users row.
 *
 * ledger_entries has no column for a road not taken, and the schema is not ours
 * to change, so the unselected act lives here in blueprint_json alongside the
 * rest of the reading. Best effort: a failed write must not block the reveal.
 */
export interface BlueprintRecord {
  parsed: ParsedBlueprint;
  chosen: 'hard' | 'next' | null;
  /** Their own words for what they want. Day 7 quotes this back verbatim. */
  desiredReality?: string;
  /** The reading as generated, in full. */
  blueprintText?: string;
}

/** A reading has all three section headers. An intake answer never does. */
export function looksLikeReading(text: string): boolean {
  return ['WHO YOU ARE', 'THE PATTERN', 'ONE ACT'].every((h) => text.includes(h));
}

/**
 * Keep the parsed reading on the person's row.
 *
 * Named fields rather than positional arguments, because desiredReality and
 * blueprintText are both `string | undefined` and sat next to each other: the
 * reading went into desired_reality and the intake answer into blueprint_text
 * for two live accounts, and there was nothing for the compiler to catch. An
 * object cannot be passed in the wrong order.
 *
 * The shapes are checked as well as named. A belt on top of braces is worth it
 * here because the failure is silent, survives a deploy, and is only visible by
 * reading the database.
 */
export async function saveBlueprintRecord(record: BlueprintRecord): Promise<void> {
  const { parsed, chosen, desiredReality, blueprintText } = record;
  const uid = await ensureUser();
  if (!uid) return;

  const reading = blueprintText?.trim();
  const desire = desiredReality?.trim();

  // Refuse rather than write a value into the wrong column. Both directions,
  // because either one alone would have missed the bug that produced this.
  if (reading && !looksLikeReading(reading)) {
    console.error('saveBlueprintRecord: blueprintText is not a reading — refusing to store it');
    return;
  }
  if (desire && looksLikeReading(desire)) {
    console.error('saveBlueprintRecord: desiredReality looks like a reading — arguments are swapped');
    return;
  }

  const { error } = await supabase
    .from('users')
    .update({
      archetype: parsed.becoming || null,
      recognition_line: parsed.recognitionLine || null,
      declaration_line: parsed.declarationLine || null,
      ...(desire ? { desired_reality: desire } : {}),
      ...(reading ? { blueprint_text: reading } : {}),
      blueprint_json: {
        becoming: parsed.becoming,
        loop: parsed.loop,
        acts: { hard: parsed.hardOne, next: parsed.nextOne },
        chosen,
        saved_at: new Date().toISOString(),
      },
    })
    .eq('id', uid);

  if (error) console.warn('Blueprint record save failed:', error.message);
}
