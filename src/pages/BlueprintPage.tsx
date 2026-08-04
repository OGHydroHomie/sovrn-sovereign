import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { jsPDF } from 'jspdf';
import type { QuizData } from '../types';
import { trackEvent } from '../utils/storage';

interface Props {
  text: string;
  isDone: boolean;
  quizData: QuizData;
}

/* Superset of every section header the oracle can emit (backend emits the
   first, third, sixth, seventh — the rest are handled defensively). */
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
    const cursor = showCursor && i === lastText ? <span className="sv-cursor" /> : null;
    if (t === '') {
      out.push(<div key={i} style={{ height: 10 }} />);
    } else if (isQuoteLine(t)) {
      out.push(
        <p
          key={i}
          className="sv-display"
          style={{ fontStyle: 'italic', fontWeight: 400, fontSize: 18, lineHeight: 1.5, color: '#D93A2B', margin: '10px 0' }}
        >
          {line}{cursor}
        </p>
      );
    } else {
      out.push(
        <p key={i} className="sv-serif" style={{ fontSize: 16, lineHeight: 1.7, color: '#A8A29B', marginBottom: 4 }}>
          {line}{cursor}
        </p>
      );
    }
  });
  return out;
}

export default function BlueprintPage({ text, isDone, quizData }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const [blueprintNo] = useState(() => String(Math.floor(1000 + Math.random() * 9000)));
  const [showBooking, setShowBooking] = useState(false);

  useEffect(() => { trackEvent('pageView', 'blueprint'); }, []);

  // Keep the latest streaming text in view
  useEffect(() => {
    if (!isDone && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [text, isDone]);

  // Existing booking widget (loaded on demand)
  useEffect(() => {
    if (showBooking) {
      const script = document.createElement('script');
      script.src = 'https://app.iclosed.io/assets/widget.js';
      script.async = true;
      document.body.appendChild(script);
      return () => { document.body.removeChild(script); };
    }
  }, [showBooking]);

  const { preamble, sections } = parseBlueprint(text);
  const twoTone = ['#D93A2B', '#E8B04B']; // alternating accent bars

  const handleDownload = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    const gilt: [number, number, number] = [232, 176, 75];
    const ember: [number, number, number] = [217, 58, 43];
    const bone: [number, number, number] = [244, 241, 234];
    const body: [number, number, number] = [168, 162, 155];

    const fill = () => { doc.setFillColor(10, 14, 26); doc.rect(0, 0, pageWidth, pageHeight, 'F'); };
    fill();
    const checkPage = (needed: number) => { if (y + needed > 272) { doc.addPage(); fill(); y = 20; } };

    doc.setFont('times', 'normal');
    doc.setFontSize(10); doc.setTextColor(...gilt);
    doc.text('SOVRN', pageWidth / 2, y, { align: 'center' }); y += 10;
    doc.setFontSize(20); doc.setTextColor(...bone);
    doc.text('SOVEREIGN BLUEPRINT', pageWidth / 2, y, { align: 'center' }); y += 9;
    doc.setFontSize(11); doc.setTextColor(...body);
    doc.text(`Prepared for ${quizData.name}  ·  No. ${blueprintNo}`, pageWidth / 2, y, { align: 'center' }); y += 12;
    doc.setDrawColor(...gilt); doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y); y += 10;

    for (const line of text.split('\n')) {
      const t = line.trim();
      if (HEADER_SET.has(t)) {
        checkPage(18); y += 4;
        doc.setFontSize(14); doc.setTextColor(...gilt);
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
    doc.setFontSize(8); doc.setTextColor(110, 106, 102);
    doc.text('SOVRN — 2026', pageWidth / 2, y, { align: 'center' });
    doc.save(`SOVRN-Blueprint-${quizData.name.replace(/\s+/g, '-')}.pdf`);
  };

  const handleTransform = () => { trackEvent('ctaClick'); setShowBooking(true); };

  return (
    <div style={{ minHeight: '100svh', padding: '24px 20px 56px' }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        {/* ── Masthead ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="sv-eyebrow" style={{ fontSize: 13, letterSpacing: '0.22em', color: '#E8B04B' }}>SOVRN</span>
          <span className="sv-label" style={{ fontSize: 11, color: '#6E6A66', letterSpacing: '0.12em' }}>
            Blueprint No. {blueprintNo}
          </span>
        </div>
        <div className="sv-divider" style={{ margin: '14px 0 18px' }} />
        <p className="sv-label" style={{ fontSize: 11, color: '#D93A2B', letterSpacing: '0.18em', fontWeight: 500 }}>
          Results · Verified Reading
        </p>

        {/* ── Core quote (screenshot moment) — any text before the first header ── */}
        {preamble && (
          <p
            className="sv-display"
            style={{
              fontStyle: 'italic', fontWeight: 400,
              fontSize: 'clamp(24px, 6.6vw, 28px)', lineHeight: 1.35,
              color: '#D93A2B', textAlign: 'center', maxWidth: 480,
              margin: '48px auto', padding: '0 4px',
            }}
          >
            {preamble}
            {!isDone && sections.length === 0 && <span className="sv-cursor" />}
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
                className="sv-card"
                style={{ borderLeft: `3px solid ${twoTone[i % 2]}` }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h2 className="sv-label" style={{ fontSize: 12, color: '#F4F1EA', fontWeight: 700, letterSpacing: '0.1em' }}>
                    {s.title}
                  </h2>
                  <span className="sv-label" style={{ fontSize: 12, color: 'rgba(232,176,75,0.35)', fontWeight: 700 }}>
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
            <div style={{ height: 32 }} />
            <div className="sv-divider" />
            <p
              className="sv-display"
              style={{ fontStyle: 'italic', fontWeight: 400, fontSize: 16, color: '#9A9A9A', textAlign: 'center', margin: '24px auto 0', maxWidth: 420 }}
            >
              This is your architecture. What you do with it defines everything.
            </p>

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <button className="sv-btn-ghost" onClick={handleDownload}>Download Blueprint</button>
              <button className="sv-btn" onClick={handleTransform}>Begin Your Transformation</button>
            </div>

            {showBooking && (
              <div
                className="iclosed-widget"
                data-url="https://app.iclosed.io/e/sovrngrowth/strategy-call"
                title="Strategy Call"
                style={{ width: '100%', height: 620, marginTop: 24 }}
              />
            )}

            <p
              style={{ marginTop: 40, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 400, fontSize: 11, letterSpacing: '0.1em', color: '#6E6A66', textAlign: 'center' }}
            >
              SOVRN — 2026
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
