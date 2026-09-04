import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { jsPDF } from 'jspdf';
import type { QuizData } from '../types';
import { trackEvent } from '../utils/storage';
import type { LedgerEntry } from '../lib/ledger';
import { parseBlueprint, teaser } from '../lib/blueprint';
import RevealCard from '../components/RevealCard';
import DayOne from '../components/DayOne';

interface Props {
  text: string;
  quizData: QuizData;
  /** Set once an act has been chosen and written to the ledger. */
  dayOne: LedgerEntry | null;
  onChooseAct: (chosen: 'hard' | 'next', missionText: string) => Promise<void>;
}

/* Prose block on paper. */
function Body({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => {
        const t = line.trim();
        if (!t) return <div key={i} style={{ height: 12 }} />;
        const quote = /^["“]/.test(t);
        return (
          <p
            key={i}
            style={{
              fontFamily: 'var(--sv-font)',
              fontSize: quote ? 17 : 15,
              fontWeight: quote ? 500 : 300,
              lineHeight: quote ? 1.45 : 1.65,
              color: quote ? '#000000' : '#1A1A1A',
              margin: quote ? '14px 0' : '0 0 4px',
            }}
          >
            {line}
          </p>
        );
      })}
    </>
  );
}

export default function BlueprintPage({ text, quizData, dayOne, onChooseAct }: Props) {
  const [blueprintNo] = useState(() => String(Math.floor(1000 + Math.random() * 9000)));
  const [saving, setSaving] = useState<'hard' | 'next' | null>(null);
  const reduceMotion = useReducedMotion();
  const bp = useMemo(() => parseBlueprint(text), [text]);

  useEffect(() => { trackEvent('pageView', 'blueprint'); }, []);

  const choose = async (which: 'hard' | 'next') => {
    if (saving || dayOne) return;
    setSaving(which);
    await onChooseAct(which, which === 'hard' ? bp.hardOne : bp.nextOne);
    setSaving(null);
  };

  const handleDownload = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 26;

    const black: [number, number, number] = [0, 0, 0];
    const ink: [number, number, number] = [26, 26, 26];
    const muted: [number, number, number] = [110, 106, 102];

    const fill = () => { doc.setFillColor(251, 250, 247); doc.rect(0, 0, pageWidth, pageHeight, 'F'); };
    fill();
    const checkPage = (needed: number) => { if (y + needed > 272) { doc.addPage(); fill(); y = 26; } };

    // jsPDF ships only courier/helvetica/times; helvetica is the sans of the three.
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9); doc.setTextColor(...muted);
    doc.text('SOVRN', pageWidth / 2, y, { align: 'center' }); y += 14;
    doc.setFontSize(22); doc.setTextColor(...black);
    doc.text(bp.becoming || 'BLUEPRINT', pageWidth / 2, y, { align: 'center' }); y += 9;
    if (bp.loop) {
      doc.setFontSize(11); doc.setTextColor(...muted);
      doc.text(`Right now you're the ${bp.loop}.`, pageWidth / 2, y, { align: 'center' }); y += 12;
    }

    const section = (title: string, body: string) => {
      if (!body) return;
      checkPage(20); y += 6;
      doc.setFontSize(10); doc.setTextColor(...black);
      doc.text(title, margin, y); y += 8;
      doc.setFontSize(10); doc.setTextColor(...ink);
      for (const line of body.split('\n')) {
        if (!line.trim()) { y += 3; continue; }
        const wrapped = doc.splitTextToSize(line, contentWidth);
        checkPage(wrapped.length * 5 + 2);
        doc.text(wrapped, margin, y); y += wrapped.length * 5 + 2;
      }
    };

    section('WHO YOU ARE', bp.whoYouAre);
    section('THE PATTERN', bp.thePattern);
    section('ONE ACT', [
      bp.hardOne ? `THE HARD ONE - ${bp.hardOne}` : '',
      bp.nextOne ? `THE NEXT ONE - ${bp.nextOne}` : '',
      '',
      bp.oneActTail,
    ].filter(Boolean).join('\n'));

    checkPage(12); y += 10;
    doc.setFontSize(8); doc.setTextColor(...muted);
    doc.text(`No. ${blueprintNo}  -  SOVRN`, pageWidth / 2, y, { align: 'center' });
    doc.save(`SOVRN-${(bp.becoming || 'Blueprint').replace(/\s+/g, '-')}.pdf`);
  };

  const actButton = (which: 'hard' | 'next', label: string, body: string) => (
    <button
      onClick={() => void choose(which)}
      disabled={saving !== null}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        background: 'none', border: '1px solid #E4E0D6', borderRadius: 2,
        padding: '16px 16px 18px', marginTop: 12, cursor: saving ? 'wait' : 'pointer',
        fontFamily: 'var(--sv-font)',
      }}
    >
      <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: '#6E6A66' }}>
        {label}
      </span>
      <span style={{ display: 'block', marginTop: 8, fontSize: 16, lineHeight: 1.5, fontWeight: 400, color: '#1A1A1A' }}>
        {body}
      </span>
      <span style={{ display: 'block', marginTop: 12, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#000000' }}>
        {saving === which ? 'COMMITTING...' : 'I COMMIT'}
      </span>
    </button>
  );

  const oneActTeaser = dayOne ? teaser(dayOne.mission_text) : 'Two ways in. You pick one.';

  return (
    <div style={{ minHeight: '100svh', background: '#FBFAF7', color: '#1A1A1A', padding: '0 22px 72px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        {/* The name lands. Silence around it. */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          style={{ paddingTop: '22vh', textAlign: 'center' }}
        >
          <h1
            style={{
              fontFamily: 'var(--sv-font)',
              fontWeight: 100,
              fontSize: 'clamp(38px, 11.5vw, 60px)',
              lineHeight: 1.04,
              letterSpacing: '0.01em',
              color: '#000000',
              textTransform: 'uppercase',
            }}
          >
            {bp.becoming || 'YOUR BLUEPRINT'}
          </h1>

          {bp.loop && (
            <motion.p
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: reduceMotion ? 0 : 0.75 }}
              style={{
                marginTop: 22, fontFamily: 'var(--sv-font)', fontWeight: 300,
                fontSize: 15, letterSpacing: '0.01em', color: '#6E6A66',
              }}
            >
              Right now you&rsquo;re the {bp.loop}.
            </motion.p>
          )}
        </motion.div>

        {/* Three cards, collapsed by default */}
        <div style={{ marginTop: '16vh' }}>
          <RevealCard header="WHO YOU ARE" teaser={teaser(bp.whoYouAre)} index={0}>
            <Body text={bp.whoYouAre} />
          </RevealCard>

          <RevealCard header="THE PATTERN" teaser={teaser(bp.thePattern)} index={1}>
            <Body text={bp.thePattern} />
          </RevealCard>

          <RevealCard header="ONE ACT" teaser={oneActTeaser} index={2}>
            {dayOne ? (
              <DayOne entry={dayOne} embedded />
            ) : (
              <>
                {actButton('hard', 'THE HARD ONE', bp.hardOne)}
                {actButton('next', 'THE NEXT ONE', bp.nextOne)}
                {bp.oneActTail && (
                  <div style={{ marginTop: 20 }}>
                    <Body text={bp.oneActTail} />
                  </div>
                )}
              </>
            )}
          </RevealCard>

          <div style={{ borderTop: '1px solid #E4E0D6' }} />
        </div>

        {/* Footer */}
        <div style={{ marginTop: 44, textAlign: 'center' }}>
          <button
            onClick={handleDownload}
            style={{
              width: '100%', maxWidth: 320, minHeight: 48,
              background: 'none', color: '#1A1A1A', border: '1px solid #1A1A1A', borderRadius: 2,
              fontFamily: 'var(--sv-font)', fontWeight: 700, fontSize: 12,
              textTransform: 'uppercase', letterSpacing: '0.12em', padding: '16px 24px', cursor: 'pointer',
            }}
          >
            Download
          </button>
          <p style={{ marginTop: 28, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 11, letterSpacing: '0.1em', color: '#9A9A9A' }}>
            {quizData.name} - No. {blueprintNo}
          </p>
        </div>
      </div>
    </div>
  );
}
