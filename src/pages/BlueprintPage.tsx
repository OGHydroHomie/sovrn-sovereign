import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { jsPDF } from 'jspdf';
import type { QuizData } from '../types';
import { trackEvent } from '../utils/storage';
import type { LedgerEntry } from '../lib/ledger';
import DayOne from '../components/DayOne';

interface Props {
  text: string;
  isDone: boolean;
  quizData: QuizData;
  /* Day 1 mission, written to the ledger when the blueprint finished. Null while
     it is still being derived, or if derivation failed. */
  dayOne: LedgerEntry | null;
}

/* Superset of every section header the oracle can emit (backend emits four). */
const SECTION_HEADERS = [
  'SOUL ARCHITECTURE',
  'HIDDEN GIFTS',
  'SHADOW PATTERN',
  'RELATIONSHIP BLUEPRINT',
  'CAREER DESTINY',
  'TRUE NORTH',
  'FIRST SOVEREIGN ACT',
];
const HEADER_SET = new Set(SECTION_HEADERS);

interface Section { title: string; lines: string[]; }

function parseBlueprint(text: string): { preamble: string; sections: Section[] } {
  const lines = text.split('\n');
  const preamble: string[] = [];
  const sections: Section[] = [];
  let cur: Section | null = null;
  for (const line of lines) {
    const t = line.trim();
    if (HEADER_SET.has(t)) {
      cur = { title: t, lines: [] };
      sections.push(cur);
    } else if (cur) {
      cur.lines.push(line);
    } else {
      preamble.push(line);
    }
  }
  return { preamble: preamble.join('\n').trim(), sections };
}

/* A quote line = wrapped in quotation marks or set off with an em/en dash. */
function isQuoteLine(t: string): boolean {
  if (!t) return false;
  return /^["“]/.test(t) || /^[—–]/.test(t) || (t.startsWith('-') && t.length > 40);
}

function renderBody(lines: string[], showCursor: boolean) {
  const out: React.ReactNode[] = [];
  let lastText = -1;
  lines.forEach((l, i) => { if (l.trim()) lastText = i; });

  lines.forEach((line, i) => {
    const t = line.trim();
    const cursor = showCursor && i === lastText ? <span className="sv-cursor-light" /> : null;
    if (t === '') {
      out.push(<div key={i} style={{ height: 10 }} />);
    } else if (isQuoteLine(t)) {
      out.push(
        <p
          key={i}
          className="sv-display"
          style={{ fontStyle: 'italic', fontWeight: 400, fontSize: 18, lineHeight: 1.5, color: '#C21F2C', margin: '10px 0' }}
        >
          {line}{cursor}
        </p>
      );
    } else {
      out.push(
        <p key={i} className="sv-serif" style={{ fontSize: 16, lineHeight: 1.7, color: '#4A4A4A', marginBottom: 4 }}>
          {line}{cursor}
        </p>
      );
    }
  });
  return out;
}

export default function BlueprintPage({ text, isDone, quizData, dayOne }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const [blueprintNo] = useState(() => String(Math.floor(1000 + Math.random() * 9000)));

  useEffect(() => { trackEvent('pageView', 'blueprint'); }, []);

  // Keep the latest streaming text in view
  useEffect(() => {
    if (!isDone && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [text, isDone]);

  const { preamble, sections } = parseBlueprint(text);
  const twoTone = ['#C21F2C', '#1A1A1A']; // alternating left bars: ember / ink

  const handleDownload = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    const ember: [number, number, number] = [194, 31, 44];
    const ink: [number, number, number] = [26, 26, 26];
    const body: [number, number, number] = [74, 74, 74];
    const muted: [number, number, number] = [154, 154, 154];

    const fill = () => { doc.setFillColor(251, 250, 247); doc.rect(0, 0, pageWidth, pageHeight, 'F'); };
    fill();
    const checkPage = (needed: number) => { if (y + needed > 272) { doc.addPage(); fill(); y = 20; } };

    doc.setFont('times', 'normal');
    doc.setFontSize(10); doc.setTextColor(...ember);
    doc.text('SOVRN', pageWidth / 2, y, { align: 'center' }); y += 10;
    doc.setFontSize(20); doc.setTextColor(...ink);
    doc.text('SOVEREIGN BLUEPRINT', pageWidth / 2, y, { align: 'center' }); y += 9;
    doc.setFontSize(11); doc.setTextColor(...muted);
    doc.text(`Prepared for ${quizData.name}  ·  No. ${blueprintNo}`, pageWidth / 2, y, { align: 'center' }); y += 12;
    doc.setDrawColor(232, 230, 225); doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y); y += 10;

    for (const line of text.split('\n')) {
      const t = line.trim();
      if (HEADER_SET.has(t)) {
        checkPage(18); y += 4;
        doc.setFontSize(13); doc.setTextColor(...ink);
        doc.text(t, margin, y); y += 9;
      } else if (t === '') {
        y += 3;
      } else {
        const quote = isQuoteLine(t);
        doc.setFontSize(quote ? 12 : 10);
        doc.setTextColor(...(quote ? ember : body));
        const wrapped = doc.splitTextToSize(line, contentWidth);
        checkPage(wrapped.length * 5 + 2);
        doc.text(wrapped, margin, y); y += wrapped.length * (quote ? 6 : 5) + 2;
      }
    }
    checkPage(10); y += 8;
    doc.setFontSize(8); doc.setTextColor(...muted);
    doc.text('SOVRN — 2026', pageWidth / 2, y, { align: 'center' });
    doc.save(`SOVRN-Blueprint-${quizData.name.replace(/\s+/g, '-')}.pdf`);
  };

  return (
    <div style={{ minHeight: '100svh', background: '#FBFAF7', color: '#4A4A4A', padding: '24px 20px 56px', position: 'relative' }}>
      {/* Dawn bloom — a warm veil that clears on mount, so the blueprint
          materializes into daylight as the dark loading screen crossfades out. */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        style={{ position: 'fixed', inset: 0, background: '#FBFAF7', pointerEvents: 'none', zIndex: 10 }}
      />
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        {/* ── Masthead ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="sv-eyebrow" style={{ fontSize: 13, letterSpacing: '0.22em', color: '#1A1A1A' }}>SOVRN</span>
          <span className="sv-label" style={{ fontSize: 11, color: '#9A9A9A', letterSpacing: '0.12em' }}>
            Blueprint No. {blueprintNo}
          </span>
        </div>
        <div style={{ height: 1, background: '#E8E6E1', margin: '14px 0 18px' }} />
        <p className="sv-label" style={{ fontSize: 11, color: '#C21F2C', letterSpacing: '0.18em', fontWeight: 500 }}>
          Results · Verified Reading
        </p>

        {/* ── Core quote (screenshot moment) ── */}
        {preamble && (
          <p
            className="sv-display"
            style={{
              fontStyle: 'italic', fontWeight: 400,
              fontSize: 'clamp(24px, 6.6vw, 28px)', lineHeight: 1.35,
              color: '#C21F2C', textAlign: 'center', maxWidth: 480,
              margin: '48px auto', padding: '0 4px',
            }}
          >
            {preamble}
            {!isDone && sections.length === 0 && <span className="sv-cursor-light" />}
          </p>
        )}

        {/* ── Section cards ── */}
        <div style={{ marginTop: preamble ? 8 : 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sections.map((s, i) => {
            const isLast = i === sections.length - 1;
            const num = String(i + 1).padStart(2, '0');
            return (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E8E6E1',
                  borderLeft: `3px solid ${twoTone[i % 2]}`,
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  padding: 24,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h2 className="sv-label" style={{ fontSize: 12, color: '#1A1A1A', fontWeight: 700, letterSpacing: '0.1em' }}>
                    {s.title}
                  </h2>
                  <span className="sv-label" style={{ fontSize: 12, color: '#E8E6E1', fontWeight: 700 }}>
                    {num}
                  </span>
                </div>
                <div style={{ marginTop: 12 }}>
                  {renderBody(s.lines, !isDone && isLast)}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Scroll anchor for auto-follow while streaming */}
        <div ref={endRef} />

        {/* ── Completion ── */}
        {isDone && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
            {/* ── Day 1 mission, completion, and the Ledger ── */}
            {dayOne && <DayOne key={dayOne.id} entry={dayOne} />}

            <div style={{ height: 32 }} />
            <div style={{ height: 1, background: '#E8E6E1' }} />
            <p
              className="sv-display"
              style={{ fontStyle: 'italic', fontWeight: 400, fontSize: 16, color: '#9A9A9A', textAlign: 'center', margin: '24px auto 0', maxWidth: 420 }}
            >
              This is your architecture. What you do with it defines everything.
            </p>

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <button
                onClick={handleDownload}
                style={{
                  width: '100%', maxWidth: 340, minHeight: 48,
                  background: 'transparent', color: '#1A1A1A',
                  border: '1px solid #1A1A1A', borderRadius: 12,
                  fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14,
                  textTransform: 'uppercase', letterSpacing: '0.08em', padding: '18px 24px', cursor: 'pointer',
                }}
              >
                Download Blueprint
              </button>
            </div>

            <p
              style={{ marginTop: 40, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 400, fontSize: 11, letterSpacing: '0.1em', color: '#9A9A9A', textAlign: 'center' }}
            >
              SOVRN — 2026
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
