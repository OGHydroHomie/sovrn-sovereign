import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import type { BlueprintResult, QuizData } from '../types';
import { trackEvent } from '../utils/storage';

interface Props {
  blueprint: BlueprintResult;
  quizData: QuizData;
}

function Section({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.8, delay }}
    >
      {children}
    </motion.div>
  );
}

function ArchetypeBlock({ archetype }: { archetype: BlueprintResult['soulArchitecture']['sunArchetype'] }) {
  return (
    <div className="mb-10">
      <div className="flex items-baseline gap-3 mb-3">
        <h3 className="text-xl md:text-2xl font-bold gold-glow">
          {archetype.name}
        </h3>
        <span style={{ color: 'rgba(245, 240, 232, 0.4)', fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.75rem', letterSpacing: '0.1em' }}>
          {archetype.sign} {archetype.degree}
        </span>
      </div>
      <p style={{ color: 'rgba(245, 240, 232, 0.8)', lineHeight: '1.7' }}>
        {archetype.description}
      </p>
    </div>
  );
}

export default function BlueprintPage({ blueprint, quizData }: Props) {
  const [shared, setShared] = useState(false);
  const [showBooking, setShowBooking] = useState(false);

  useEffect(() => {
    trackEvent('pageView', 'blueprint');
  }, []);

  const handleShare = async () => {
    const text = `I just received my Sovereign Blueprint from SOVRN. Remember who you are.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Sovereign Blueprint', text });
      } catch {
        // cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  const handleDownload = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    const fillBackground = () => {
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
    };

    fillBackground();

    const checkPage = (needed: number) => {
      if (y + needed > 270) {
        doc.addPage();
        fillBackground();
        y = 20;
      }
    };

    const gold: [number, number, number] = [212, 175, 55];
    const bone: [number, number, number] = [245, 240, 232];
    const boneDim: [number, number, number] = [160, 155, 145];

    const addTitle = (text: string, size: number, color: [number, number, number] = gold) => {
      checkPage(15);
      doc.setFontSize(size);
      doc.setTextColor(...color);
      doc.text(text.toUpperCase(), margin, y);
      y += size * 0.5 + 3;
    };

    const addBody = (text: string, color: [number, number, number] = boneDim) => {
      doc.setFontSize(10);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, contentWidth);
      checkPage(lines.length * 5);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 4;
    };

    const addQuote = (text: string) => {
      checkPage(20);
      doc.setFontSize(12);
      doc.setTextColor(...gold);
      const lines = doc.splitTextToSize(`"${text}"`, contentWidth - 20);
      doc.text(lines, pageWidth / 2, y, { align: 'center' });
      y += lines.length * 6 + 6;
    };

    const addDivider = () => {
      checkPage(10);
      y += 4;
      doc.setDrawColor(...gold);
      doc.setLineWidth(0.2);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;
    };

    // Header
    doc.setFontSize(10);
    doc.setTextColor(...gold);
    doc.text('SOVRN', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(20);
    doc.setTextColor(...bone);
    doc.text('SOVEREIGN BLUEPRINT', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(11);
    doc.setTextColor(...boneDim);
    doc.text(`Prepared for ${quizData.name}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    addDivider();

    // Soul Architecture
    addTitle('I. Soul Architecture', 14);
    y += 2;

    const { sunArchetype, risingArchetype, northNodeArchetype } = blueprint.soulArchitecture;

    addTitle(`${sunArchetype.name} — ${sunArchetype.sign} ${sunArchetype.degree}`, 11, bone);
    addBody(sunArchetype.description);

    addTitle(`${risingArchetype.name} — ${risingArchetype.sign} ${risingArchetype.degree}`, 11, bone);
    addBody(risingArchetype.description);

    addTitle(`${northNodeArchetype.name} — ${northNodeArchetype.sign} ${northNodeArchetype.degree}`, 11, bone);
    addBody(northNodeArchetype.description);

    addTitle('The Sovereign Flame', 11, gold);
    addBody(blueprint.soulArchitecture.sovereignFlame);

    addQuote(blueprint.soulArchitecture.coreQuote);
    addDivider();

    // Shadow Pattern
    addTitle('II. Shadow Pattern', 14);
    addBody(blueprint.shadowPattern.pattern);
    addTitle('Root Cause', 11, bone);
    addBody(blueprint.shadowPattern.rootCause);
    addQuote(blueprint.shadowPattern.keyQuote);
    addDivider();

    // True North
    addTitle('III. True North', 14);
    addBody(blueprint.trueNorth.direction);
    addTitle('Alignment', 11, bone);
    addBody(blueprint.trueNorth.alignment);
    addTitle('Destiny', 11, bone);
    addBody(blueprint.trueNorth.destiny);
    addDivider();

    // First Sovereign Act
    addTitle('IV. Your First Sovereign Act', 14);
    addBody(blueprint.firstSovereignAct.instruction);
    addTitle('Why This Act', 11, bone);
    addBody(blueprint.firstSovereignAct.reason);
    addQuote(blueprint.firstSovereignAct.declaration);

    // Footer
    checkPage(20);
    y += 8;
    doc.setFontSize(8);
    doc.setTextColor(100, 95, 85);
    doc.text('Generated by SOVRN — Your Sovereign Blueprint', pageWidth / 2, y, { align: 'center' });

    doc.save(`SOVRN-Sovereign-Blueprint-${quizData.name.replace(/\s+/g, '-')}.pdf`);
  };

  const handleBookCall = () => {
    trackEvent('ctaClick');
    setShowBooking(true);
  };

  useEffect(() => {
    if (showBooking) {
      const script = document.createElement('script');
      script.src = 'https://app.iclosed.io/assets/widget.js';
      script.async = true;
      document.body.appendChild(script);
      return () => { document.body.removeChild(script); };
    }
  }, [showBooking]);

  return (
    <div className="relative min-h-screen px-4 py-16 md:py-24">
      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Header */}
        <Section>
          <div className="text-center mb-20">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm tracking-[0.4em] uppercase gold-glow font-medium mb-8"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              SOVRN
            </motion.p>
            <h1 className="text-3xl md:text-5xl font-bold mb-4 gold-glow-strong">
              Your Sovereign Blueprint
            </h1>
            <p className="text-xl" style={{ color: 'rgba(245, 240, 232, 0.5)' }}>
              {quizData.name}
            </p>

            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 text-sm transition-colors px-4 py-2"
                style={{
                  color: 'rgba(245, 240, 232, 0.4)',
                  border: '1px solid rgba(212, 175, 55, 0.2)',
                  fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const,
                  fontSize: '0.7rem',
                }}
              >
                <Share2 className="w-3 h-3" />
                {shared ? 'Copied' : 'Share'}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 text-sm transition-colors px-4 py-2"
                style={{
                  color: 'rgba(245, 240, 232, 0.4)',
                  border: '1px solid rgba(212, 175, 55, 0.2)',
                  fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const,
                  fontSize: '0.7rem',
                }}
              >
                <Download className="w-3 h-3" />
                Download PDF
              </button>
            </div>
          </div>
        </Section>

        {/* I. Soul Architecture */}
        <Section delay={0.1}>
          <div className="sovereign-section pt-12 pb-12">
            <h2 className="text-2xl md:text-3xl font-bold gold-glow mb-12">
              I. Soul Architecture
            </h2>

            <ArchetypeBlock archetype={blueprint.soulArchitecture.sunArchetype} />
            <ArchetypeBlock archetype={blueprint.soulArchitecture.risingArchetype} />
            <ArchetypeBlock archetype={blueprint.soulArchitecture.northNodeArchetype} />

            <div className="mt-12 mb-12">
              <h3 className="text-lg font-bold gold-glow mb-4"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.08em' }}>
                THE SOVEREIGN FLAME
              </h3>
              <p style={{ color: 'rgba(245, 240, 232, 0.8)', lineHeight: '1.7' }}>
                {blueprint.soulArchitecture.sovereignFlame}
              </p>
            </div>

            {/* Core Quote — large pull quote */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="py-12 text-center"
            >
              <p className="pull-quote text-2xl md:text-3xl max-w-2xl mx-auto">
                "{blueprint.soulArchitecture.coreQuote}"
              </p>
            </motion.div>
          </div>
        </Section>

        {/* II. Shadow Pattern */}
        <Section delay={0.15}>
          <div className="sovereign-section pt-12 pb-12">
            <h2 className="text-2xl md:text-3xl font-bold gold-glow mb-8">
              II. Shadow Pattern
            </h2>
            <p style={{ color: 'rgba(245, 240, 232, 0.8)', lineHeight: '1.7' }} className="mb-8">
              {blueprint.shadowPattern.pattern}
            </p>
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4"
                  style={{ color: 'rgba(245, 240, 232, 0.5)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                ROOT CAUSE
              </h3>
              <p style={{ color: 'rgba(245, 240, 232, 0.7)', lineHeight: '1.7' }}>
                {blueprint.shadowPattern.rootCause}
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="py-8 text-center"
            >
              <p className="pull-quote text-xl md:text-2xl max-w-2xl mx-auto">
                "{blueprint.shadowPattern.keyQuote}"
              </p>
            </motion.div>
          </div>
        </Section>

        {/* III. True North */}
        <Section delay={0.2}>
          <div className="sovereign-section pt-12 pb-12">
            <h2 className="text-2xl md:text-3xl font-bold gold-glow mb-8">
              III. True North
            </h2>
            <p style={{ color: 'rgba(245, 240, 232, 0.8)', lineHeight: '1.7' }} className="mb-8">
              {blueprint.trueNorth.direction}
            </p>
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4"
                  style={{ color: 'rgba(245, 240, 232, 0.5)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                ALIGNMENT
              </h3>
              <p style={{ color: 'rgba(245, 240, 232, 0.7)', lineHeight: '1.7' }}>
                {blueprint.trueNorth.alignment}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4"
                  style={{ color: 'rgba(245, 240, 232, 0.5)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                DESTINY
              </h3>
              <p style={{ color: 'rgba(245, 240, 232, 0.7)', lineHeight: '1.7' }}>
                {blueprint.trueNorth.destiny}
              </p>
            </div>
          </div>
        </Section>

        {/* IV. First Sovereign Act */}
        <Section delay={0.25}>
          <div className="sovereign-section pt-12 pb-12">
            <h2 className="text-2xl md:text-3xl font-bold gold-glow mb-8">
              IV. Your First Sovereign Act
            </h2>
            <p style={{ color: 'rgba(245, 240, 232, 0.8)', lineHeight: '1.7' }} className="mb-8">
              {blueprint.firstSovereignAct.instruction}
            </p>
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4"
                  style={{ color: 'rgba(245, 240, 232, 0.5)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                WHY THIS ACT
              </h3>
              <p style={{ color: 'rgba(245, 240, 232, 0.7)', lineHeight: '1.7' }}>
                {blueprint.firstSovereignAct.reason}
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="py-8 text-center"
            >
              <p className="pull-quote text-xl md:text-2xl max-w-2xl mx-auto">
                "{blueprint.firstSovereignAct.declaration}"
              </p>
            </motion.div>
          </div>
        </Section>

        {/* CTA — Death Module */}
        <Section delay={0.3}>
          <div className="sovereign-section pt-16 pb-16 text-center">
            <p className="pull-quote text-2xl md:text-3xl mb-8 max-w-xl mx-auto">
              Your blueprint is a map. The Death Module is the journey.
            </p>
            <p style={{ color: 'rgba(245, 240, 232, 0.5)', lineHeight: '1.7' }} className="mb-2">
              The first SOVRN cohort opens July 2026. Twelve people. Eight weeks.
            </p>
            <p className="gold-glow text-xl mb-10"
               style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.05em' }}>
              Investment: $1,000
            </p>

            {!showBooking ? (
              <>
                <button onClick={handleBookCall} className="sovereign-button mb-4">
                  Apply for the Founding Cohort
                </button>
                <div className="sovereign-divider max-w-xs mx-auto my-8" />
                <button onClick={handleBookCall} className="sovereign-button"
                        style={{ background: 'transparent', color: '#D4AF37', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                  Book a Sovereign Strategy Call
                </button>
              </>
            ) : (
              <div
                className="iclosed-widget mt-4"
                data-url="https://app.iclosed.io/e/sovrngrowth/strategy-call"
                title="Strategy Call"
                style={{ width: '100%', height: '620px' }}
              />
            )}
          </div>
        </Section>

        {/* Footer */}
        <Section delay={0.35}>
          <div className="text-center pb-12">
            <div className="sovereign-divider max-w-xs mx-auto mb-8" />
            <p style={{ color: 'rgba(245, 240, 232, 0.2)', fontSize: '0.75rem', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
              SOVRN — Your Sovereign Blueprint
            </p>
          </div>
        </Section>
      </div>
    </div>
  );
}
