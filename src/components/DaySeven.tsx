import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import SquareReveal from './SquareReveal';
import SaveCard from './SaveCard';
import { submitRecalibration, type Recalibration } from '../lib/recalibrate';
import type { LedgerEntry } from '../lib/ledger';

interface Props {
  /** The day 7 entry: mission_text is the question, read_line is the week read. */
  entry: LedgerEntry;
  /** Everything on the record. Days one to six are drawn from it, gaps included. */
  entries: LedgerEntry[];
  becoming: string;
  timezone: string | null;
}

/* Slower than anything else in the product, on purpose. This is the only moment
   that is purely a reward, and a reward that arrives at the same speed as a
   page transition is not one. */
const HOLD_BEFORE_MS = 1400;
const DISSOLVE_MS = 1800;
const NAME_FADE_MS = 1400;
const BODY_AFTER_MS = HOLD_BEFORE_MS + DISSOLVE_MS + 900;

const WEEK_LENGTH = 6;

function useClock(timezone: string | null) {
  return useCallback(
    (iso: string, opts: Intl.DateTimeFormatOptions) => {
      try {
        return new Intl.DateTimeFormat(undefined, {
          ...opts,
          ...(timezone ? { timeZone: timezone } : {}),
        }).format(new Date(iso));
      } catch {
        return new Intl.DateTimeFormat(undefined, opts).format(new Date(iso));
      }
    },
    [timezone]
  );
}

export default function DaySeven({ entry, entries, becoming, timezone }: Props) {
  const reduceMotion = useReducedMotion();
  const fmt = useClock(timezone);

  const [named, setNamed] = useState<string | null>(null);
  const [bodyIn, setBodyIn] = useState(false);
  const [answer, setAnswer] = useState('');
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<Recalibration | null>(null);
  const [resolvedName, setResolvedName] = useState<string | null>(null);

  const fieldRef = useRef<HTMLTextAreaElement | null>(null);

  /* The becoming has read "in progress" for six days. It resolves here. */
  useEffect(() => {
    if (reduceMotion) {
      setNamed(becoming);
      setBodyIn(true);
      return;
    }
    const a = setTimeout(() => setNamed(becoming), HOLD_BEFORE_MS);
    const b = setTimeout(() => setBodyIn(true), BODY_AFTER_MS);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [becoming, reduceMotion]);

  /* The field is open rather than behind a button, and takes focus when it is
     actually on screen. Focusing it on mount would scroll a phone straight past
     the week read and the record to put a keyboard over both — which are the two
     things this screen exists to show. */
  useEffect(() => {
    const el = fieldRef.current;
    if (!el || !bodyIn || result) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && e.intersectionRatio > 0.6) {
          el.focus({ preventScroll: true });
          io.disconnect();
        }
      },
      { threshold: [0.6] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [bodyIn, result]);

  const week = Array.from({ length: WEEK_LENGTH }, (_, i) => {
    const day = i + 1;
    return { day, entry: entries.find((e) => e.day_number === day) ?? null };
  });

  const send = async () => {
    if (!answer.trim() || sending) return;
    setSending(true);
    setFailed(false);
    const out = await submitRecalibration(answer);
    setSending(false);
    if (!out) { setFailed(true); return; }
    setResult(out);
    // A changed becoming resolves with the same motion the first one did.
    if (out.changed) {
      setResolvedName(null);
      setTimeout(() => setResolvedName(out.becoming), reduceMotion ? 0 : 900);
    }
  };

  const [questionOpen, questionClose] = (entry.mission_text ?? '').split('\n');

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      {/* ── The becoming, un-redacted ── */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10vh 0 12vh' }}>
        <SquareReveal
          name={named}
          fill={1}
          dissolveMs={DISSOLVE_MS}
          nameDelayMs={reduceMotion ? 0 : 700}
          nameFadeMs={NAME_FADE_MS}
          size="clamp(120px, 38vw, 164px)"
        />
      </div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: bodyIn ? 1 : 0 }}
        transition={{ duration: reduceMotion ? 0 : 1.1, ease: 'easeOut' }}
        style={{ pointerEvents: bodyIn ? 'auto' : 'none' }}
      >
        {/* ── The week read ── */}
        {entry.read_line && (
          <p
            style={{
              margin: '0 0 40px',
              fontFamily: 'var(--sv-font)', fontWeight: 300,
              fontSize: 'clamp(17px, 4.6vw, 20px)', lineHeight: 1.6,
              letterSpacing: '-0.005em', color: '#1A1A1A',
            }}
          >
            {entry.read_line}
          </p>
        )}

        {/* ── The record, whole, unscored ── */}
        <p className="sv-label" style={{ fontSize: 11, color: '#1A1A1A', letterSpacing: '0.18em' }}>
          SEVEN DAYS
        </p>

        {week.map(({ day, entry: row }) => (
          <div key={day} style={{ borderTop: '1px solid #E4E0D6', padding: '18px 0' }}>
            <p
              className="sv-label"
              style={{ fontSize: 11, letterSpacing: '0.1em', color: row ? '#1A1A1A' : '#C9C6C0' }}
            >
              DAY {day}
              {row && ` · ${fmt(row.committed_at, { month: 'short', day: 'numeric' })}`}
              {row && ` · Committed ${fmt(row.committed_at, { hour: 'numeric', minute: '2-digit' })}`}
              {row && (row.completed_at
                ? ` · Completed ${fmt(row.completed_at, { hour: 'numeric', minute: '2-digit' })}`
                : ' · Open')}
            </p>

            {row ? (
              <>
                <p style={{ marginTop: 8, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, lineHeight: 1.6, color: '#6E6A66' }}>
                  {row.mission_text}
                </p>
                {row.what_happened && (
                  <p style={{ marginTop: 8, fontFamily: 'var(--sv-font)', fontWeight: 400, fontSize: 15, lineHeight: 1.6, color: '#1A1A1A' }}>
                    {row.what_happened}
                  </p>
                )}
              </>
            ) : (
              <p style={{ marginTop: 6, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, lineHeight: 1.6, color: '#C9C6C0' }}>
                No entry.
              </p>
            )}
          </div>
        ))}
        <div style={{ borderTop: '1px solid #E4E0D6' }} />

        {/* ── The recalibration ── */}
        {!result ? (
          <div style={{ marginTop: 44 }}>
            <p style={{ fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 'clamp(17px, 4.6vw, 20px)', lineHeight: 1.55, color: '#000000' }}>
              {questionOpen}
            </p>
            {questionClose && (
              <p style={{ marginTop: 10, fontFamily: 'var(--sv-font)', fontWeight: 400, fontSize: 'clamp(17px, 4.6vw, 20px)', lineHeight: 1.55, color: '#000000' }}>
                {questionClose}
              </p>
            )}

            <textarea
              ref={fieldRef}
              value={answer}
              rows={3}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
              }}
              style={{
                marginTop: 22, width: '100%', boxSizing: 'border-box', resize: 'vertical',
                background: 'transparent', color: '#1A1A1A',
                border: '1px solid #E4E0D6', borderRadius: 2,
                fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 16, lineHeight: 1.6,
                padding: '14px 14px',
              }}
            />
            <button
              onClick={() => void send()}
              disabled={!answer.trim() || sending}
              style={{
                marginTop: 12, width: '100%', minHeight: 48,
                background: answer.trim() ? '#000000' : '#E4E0D6',
                color: answer.trim() ? '#FBFAF7' : '#9A9A9A',
                border: 'none', borderRadius: 2,
                fontFamily: 'var(--sv-font)', fontWeight: 700, fontSize: 13,
                textTransform: 'uppercase', letterSpacing: '0.12em', padding: '16px 24px',
                cursor: answer.trim() && !sending ? 'pointer' : 'not-allowed',
              }}
            >
              {sending ? 'Reading it…' : 'That is my answer'}
            </button>
            {failed && (
              <p style={{ marginTop: 10, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 14, color: '#1A1A1A' }}>
                That didn&rsquo;t send. Your words are still in the box &mdash; try again.
              </p>
            )}
            <p style={{ marginTop: 14, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 13, lineHeight: 1.6, color: '#9A9A9A' }}>
              You can leave this. The next act arrives either way.
            </p>
          </div>
        ) : (
          <div style={{ marginTop: 44, borderTop: '1px solid #E4E0D6', paddingTop: 32 }}>
            {result.changed ? (
              <>
                <p className="sv-label" style={{ fontSize: 11, letterSpacing: '0.18em', color: '#9A9A9A' }}>
                  YOU CAME IN AS {result.previous}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '6vh 0 4vh' }}>
                  <SquareReveal
                    name={resolvedName}
                    fill={1}
                    dissolveMs={DISSOLVE_MS}
                    nameDelayMs={reduceMotion ? 0 : 700}
                    nameFadeMs={NAME_FADE_MS}
                    size="clamp(120px, 38vw, 164px)"
                  />
                </div>
              </>
            ) : (
              <p className="sv-label" style={{ fontSize: 11, letterSpacing: '0.18em', color: '#1A1A1A' }}>
                STILL {result.becoming}
              </p>
            )}
            <p style={{ marginTop: 18, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 'clamp(16px, 4.4vw, 19px)', lineHeight: 1.6, color: '#1A1A1A' }}>
              {result.reason}
            </p>
            {/* The resolved name, and the day it resolved. No loop line — that
                week is closed. */}
            <div style={{ marginTop: 30, display: 'flex', justifyContent: 'center' }}>
              <SaveCard becoming={result.becoming} earnedAt={new Date()} />
            </div>

            <p style={{ marginTop: 26, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 14, lineHeight: 1.65, color: '#6E6A66' }}>
              Tomorrow at 6am the daily act starts again, written from all of this rather than from yesterday alone.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
