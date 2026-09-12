import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { EASE, T, prefersReducedMotion } from '../lib/motion';
import { jsPDF } from 'jspdf';
import type { QuizData } from '../types';
import { trackEvent } from '../utils/storage';
import type { LedgerEntry } from '../lib/ledger';
import { parseBlueprint, teaser } from '../lib/blueprint';
import RevealCard from '../components/RevealCard';
import ArchetypeMark from '../components/ArchetypeMark';
import Crystallization from '../components/Crystallization';
import SaveCard from '../components/SaveCard';
import SurfaceNav, { NavLink } from '../components/SurfaceNav';
import TargetAdmission from '../components/TargetAdmission';
import ActButton from '../components/ActButton';
import DayOne from '../components/DayOne';

interface Props {
  text: string;
  /* Absent on the saved view — the quiz answers live in the browser that took
     the quiz, and /blueprint is reachable from any device. */
  quizData?: QuizData | null;
  /** Set once an act has been chosen and written to the ledger. */
  dayOne?: LedgerEntry | null;
  onChooseAct?: (chosen: 'hard' | 'next', missionText: string) => Promise<void>;
  /* The saved view at /blueprint. The choice was made long ago, so the acts
     render as a record rather than as two buttons. */
  readOnly?: boolean;
  chosen?: 'hard' | 'next' | null;
  /* Null until a target has been admitted. The acts are not offered before it:
     an act with nothing to serve is the thing this build exists to end. */
  hasCycle?: boolean;
  onCycleOpened?: () => void | Promise<void>;
  /* The first reveal, with all six crystallization frames already decoded. Runs
     the four-beat sequence; false opens on the finished mark and the shorter
     header timeline the page has always had. */
  crystallize?: boolean;
}

/* The card on the reveal. Named once because the crystallization and the
   finished mark both render into it and a difference between them would show up
   as the picture jumping at the end of the sequence. */
const MARK_SIZE = 'clamp(220px, 58vw, 280px)';

const QUIET_LINK: React.CSSProperties = {
  background: 'none', border: 'none', padding: '8px 2px', cursor: 'pointer',
  fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 14, color: '#6E6A66',
  textDecoration: 'underline', textUnderlineOffset: 3,
};

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

export default function BlueprintPage({
  text, quizData = null, dayOne = null, onChooseAct, readOnly = false, chosen = null,
  hasCycle = true, onCycleOpened,
  crystallize = false,
}: Props) {
  /* Derived from the reading, not rolled fresh. It was Math.random() in a state
     initialiser, so the same person's blueprint was No. 6936, then 3289, then
     7153 — an identity number that changes every visit is not an identity
     number. Same reading, same four digits, on every device. */
  const blueprintNo = useMemo(() => {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
    return String(1000 + (Math.abs(h) % 9000));
  }, [text]);
  const [saving, setSaving] = useState<'hard' | 'next' | null>(null);
  const bp = useMemo(() => parseBlueprint(text), [text]);

  useEffect(() => { trackEvent('pageView', 'blueprint'); }, []);

  /* The mark comes in behind the name. The name is the sentence; the mark is the
     picture of it, and a picture that arrives first is decoration.

     It fades and settles rather than drawing itself on — the thirteen marks are
     filled paths with no strokes, so there is no outline for a stroke-dash draw
     to travel along. Claiming otherwise would just be a fade with extra steps. */
  const headerRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const progressRef = useRef<HTMLParagraphElement>(null);
  const loopRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      if (crystallize && !reduced) {
        /* The four beats. The mark is already on screen and crystallizing under
           its own tween; this timeline owns everything that comes after it, and
           the numbers are absolute positions on one clock rather than delays
           chained off each other, so the gaps stay exactly as specified when any
           single duration is tuned.

           The name is a stamp, not a fade: it scales down the last 4% and its
           opacity is a hard cut at the same instant. A word that fades up is
           still arriving; a word that is simply there has arrived. */
        tl.set(nameRef.current, { opacity: 1, scale: T.crystal.nameScaleFrom }, T.crystal.nameAt);
        tl.to(nameRef.current,
          { scale: 1, duration: T.crystal.nameStamp, ease: EASE.in },
          T.crystal.nameAt);

        /* "In progress" belongs with the loop line, not with the stamp. Both are
           qualifications of the name and the name is given its own second before
           anything qualifies it. */
        for (const el of [progressRef.current, loopRef.current]) {
          if (!el) continue;
          tl.fromTo(el, { opacity: 0 },
            { opacity: 1, duration: T.crystal.loop, ease: EASE.in },
            T.crystal.loopAt);
        }
        return;
      }

      /* Every other way onto this page: the saved view, a return visit, reduced
         motion. The mark is finished on arrival and cross-fades in where the
         crystallization would have ended. */
      tl.fromTo(markRef.current, { opacity: 0 },
        { opacity: 1, duration: reduced ? T.crystal.reducedFade : T.reveal.mark, ease: EASE.in },
        0);
      tl.fromTo(nameRef.current, { opacity: 0 },
        { opacity: 1, duration: reduced ? 0.01 : T.reveal.name, ease: EASE.in },
        reduced ? 0 : T.reveal.markAt);
      if (progressRef.current) {
        tl.fromTo(progressRef.current, { opacity: 0 },
          { opacity: 1, duration: reduced ? 0.01 : T.reveal.progress, ease: EASE.in },
          reduced ? 0 : T.reveal.progressAt);
      }
      if (loopRef.current) {
        tl.fromTo(loopRef.current, { opacity: 0 },
          { opacity: 1, duration: reduced ? 0.01 : T.reveal.loop, ease: EASE.in },
          reduced ? 0 : T.reveal.loopAt);
      }
    }, headerRef);
    return () => ctx.revert();
  }, [bp.becoming, bp.loop, crystallize]);

  /* Spread onto all three so a change lands on all three. */
  const cardTiming = crystallize && !prefersReducedMotion()
    ? { enterAt: T.crystal.cardsAt, stagger: T.crystal.cardsStagger }
    : {};

  const choose = async (which: 'hard' | 'next') => {
    if (saving || dayOne || readOnly || !onChooseAct) return;
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
    <ActButton
      label={label}
      body={body}
      committing={saving === which}
      disabled={saving !== null}
      onCommit={() => void choose(which)}
    />
  );

  const oneActTeaser = !readOnly && !dayOne && !hasCycle
    ? 'One thing you have been putting off.'
    : dayOne
    ? teaser(dayOne.mission_text)
    : readOnly
      ? teaser(chosen === 'next' ? bp.nextOne : bp.hardOne)
      : 'Two ways in. You pick one.';

  /* On the saved view both acts stay visible and the one they took is marked.
     The road not taken is part of the reading, and hiding it would quietly edit
     what they were offered. */
  const actRecord = (which: 'hard' | 'next', label: string, body: string) => {
    if (!body) return null;
    const took = chosen === which;
    return (
      <div
        style={{
          marginTop: 12, padding: '16px 16px 18px',
          border: '1px solid #E4E0D6', borderRadius: 2,
          borderLeft: took ? '3px solid #000000' : '1px solid #E4E0D6',
        }}
      >
        <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: '#6E6A66' }}>
          {label}
        </span>
        <span style={{ display: 'block', marginTop: 8, fontSize: 16, lineHeight: 1.5, fontWeight: 400, color: '#1A1A1A' }}>
          {body}
        </span>
        {took && (
          <span style={{ display: 'block', marginTop: 12, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#000000' }}>
            YOU TOOK THIS ONE
          </span>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100svh', background: '#FBFAF7', color: '#1A1A1A', padding: '0 22px 72px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        {/* Without this the reading is a room with no door — it is the one screen
            reachable both from the reveal and from a magic link, and neither
            offered a way anywhere else. */}
        <SurfaceNav becoming={readOnly ? bp.becoming : null} sticky>
          <NavLink href="/ledger">Your Ledger</NavLink>
        </SurfaceNav>

        {/* The name lands. Silence around it. */}
        <div ref={headerRef} style={{ paddingTop: '9vh', textAlign: 'center' }}>
          {/* The mark, above the name. Falls back to the square until the art
              exists, which is what it renders today. */}
          {/* The card. On the first reveal it is already on screen at frame one
              when this paints — no opacity of its own, nothing to fade — and it
              resolves into the mark under its own tween. Everywhere else the
              slot starts at zero and the header timeline fades the finished mark
              in. The two cases render the same box at the same size, so the
              picture ends up in exactly the same place either way. */}
          <div
            ref={markRef}
            style={{
              display: 'flex', justifyContent: 'center', marginBottom: 14,
              opacity: crystallize ? 1 : 0,
            }}
          >
            {crystallize
              ? <Crystallization becoming={bp.becoming} size={MARK_SIZE} ready />
              : <ArchetypeMark becoming={bp.becoming} size={MARK_SIZE} />}
          </div>

          <h1
            ref={nameRef}
            style={{
              /* Hidden on both routes until its beat — the stamp sets opacity to
                 1 outright rather than tweening it, so there is no fade to
                 catch it half-way. */
              opacity: 0,
              fontFamily: 'var(--sv-font)',
              fontWeight: 300,
              fontSize: 'clamp(38px, 11.5vw, 60px)',
              lineHeight: 1.04,
              letterSpacing: '0.01em',
              color: '#000000',
              textTransform: 'uppercase',
            }}
          >
            {bp.becoming || 'YOUR BLUEPRINT'}
          </h1>

          {/* DESIGN_FROZEN: a visual change to a shipped surface, and the reason
              is that day 7 resolves the becoming. A name cannot resolve if it
              was never provisional — this is the qualifier it drops. */}
          <p
            ref={progressRef}
            style={{
              opacity: 0,
              marginTop: 14, fontFamily: 'var(--sv-font)', fontWeight: 700,
              fontSize: 11, letterSpacing: '0.22em', color: '#6E6A66',
              textTransform: 'uppercase',
            }}
          >
            In progress
          </p>

          {bp.loop && (
            <p
              ref={loopRef}
              style={{
                opacity: 0,
                marginTop: 22, fontFamily: 'var(--sv-font)', fontWeight: 300,
                fontSize: 15, letterSpacing: '0.01em', color: '#6E6A66',
              }}
            >
              Right now you&rsquo;re the {bp.loop}.
            </p>
          )}
        </div>

        {/* Three cards, collapsed by default. On the crystallization reveal they
            are held until 4.0s — after the mark has resolved, after the name has
            stamped, after the loop line. They rise last because they are the
            only thing on the page that asks anything of the reader. */}
        <div style={{ marginTop: 56 }}>
          <RevealCard header="WHO YOU ARE" teaser={teaser(bp.whoYouAre)} index={0} {...cardTiming}>
            <Body text={bp.whoYouAre} />
          </RevealCard>

          <RevealCard header="THE PATTERN" teaser={teaser(bp.thePattern)} index={1} {...cardTiming}>
            <Body text={bp.thePattern} />
          </RevealCard>

          <RevealCard header="ONE ACT" teaser={oneActTeaser} index={2} {...cardTiming} defaultOpen>
            {!readOnly && !dayOne && !hasCycle ? (
              /* The naming comes first. Everything after it points somewhere. */
              <TargetAdmission onOpened={() => onCycleOpened?.() ?? undefined} />
            ) : dayOne && !readOnly ? (
              <DayOne entry={dayOne} embedded />
            ) : (
              <>
                {readOnly ? actRecord('hard', 'THE HARD ONE', bp.hardOne) : actButton('hard', 'THE HARD ONE', bp.hardOne)}
                {readOnly ? actRecord('next', 'THE NEXT ONE', bp.nextOne) : actButton('next', 'THE NEXT ONE', bp.nextOne)}
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

        {/* Footer.

            Nothing about sharing before there is something to share. Download
            and the card only exist once an act has been committed, and they are
            text links when they do — a full-width button for the shareable
            artifact sitting under a collapsed act was the page saying which of
            the two it thought mattered. */}
        <div style={{ marginTop: 44, textAlign: 'center' }}>
          {(dayOne || readOnly) && (
            <div style={{ display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={handleDownload} style={QUIET_LINK}>Download</button>
              {bp.becoming && <SaveCard becoming={bp.becoming} loop={bp.loop} quiet />}
            </div>
          )}

          <p style={{ marginTop: 28, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 11, letterSpacing: '0.1em', color: '#6E6A66' }}>
            {quizData?.name ? `${quizData.name} - ` : ''}No. {blueprintNo}
          </p>
        </div>
      </div>
    </div>
  );
}
