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
      transition={{ duration: 0.7, delay }}
    >
      {children}
    </motion.div>
  );
}

function ArchetypeBlock({ archetype }: { archetype: BlueprintResult['soulArchitecture']['sunArchetype'] }) {
  return (
    <div className="bg-white/5 rounded-xl p-5 border border-white/5 mb-4">
      <div className="flex items-baseline gap-3 mb-3">
        <h3 className="text-xl md:text-2xl font-bold gold-glow">
          {archetype.name}
        </h3>
        <span className="text-cosmic-purple-light text-xs tracking-wider">
          {archetype.sign} {archetype.degree}
        </span>
      </div>
      <p className="text-white/80 leading-relaxed">
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
      doc.setFillColor(10, 10, 15);
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

    addTitle('II. Shadow Pattern', 14);
    addBody(blueprint.shadowPattern.pattern);
    addTitle('Root Cause', 11, bone);
    addBody(blueprint.shadowPattern.rootCause);
    addQuote(blueprint.shadowPattern.keyQuote);
    addDivider();

    addTitle('III. True North', 14);
    addBody(blueprint.trueNorth.direction);
    addTitle('Alignment', 11, bone);
    addBody(blueprint.trueNorth.alignment);
    addTitle('Destiny', 11, bone);
    addBody(blueprint.trueNorth.destiny);
    addDivider();

    addTitle('IV. Your First Sovereign Act', 14);
    addBody(blueprint.firstSovereignAct.instruction);
    addTitle('Why This Act', 11, bone);
    addBody(blueprint.firstSovereignAct.reason);
    addQuote(blueprint.firstSovereignAct.declaration);

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
    <div className="relative min-h-screen px-4 py-12 md:py-20">
      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Header */}
        <Section>
          <div className="text-center mb-16">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm tracking-[0.4em] uppercase gold-glow font-medium mb-6"
            >
              SOVRN
            </motion.p>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              <span className="text-gradient">Your Sovereign Blueprint</span>
            </h1>
            <p className="text-xl text-white/60">{quizData.name}</p>

            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors px-4 py-2 rounded-lg border border-white/10 hover:border-white/20"
              >
                <Share2 className="w-4 h-4" />
                {shared ? 'Copied!' : 'Share'}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors px-4 py-2 rounded-lg border border-white/10 hover:border-white/20"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
        </Section>

        {/* I. Soul Architecture */}
        <Section delay={0.1}>
          <div className="glass-card-gold p-8 md:p-10 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold gold-glow mb-8">
              I. Soul Architecture
            </h2>

            <ArchetypeBlock archetype={blueprint.soulArchitecture.sunArchetype} />
            <ArchetypeBlock archetype={blueprint.soulArchitecture.risingArchetype} />
            <ArchetypeBlock archetype={blueprint.soulArchitecture.northNodeArchetype} />

            <div className="bg-white/5 rounded-xl p-5 border border-cosmic-gold/10 mt-6">
              <p className="text-sm text-cosmic-gold font-medium mb-2">
                The Sovereign Flame
              </p>
              <p className="text-white/80 text-sm leading-relaxed">
                {blueprint.soulArchitecture.sovereignFlame}
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="py-10 text-center"
            >
              <p className="pull-quote text-2xl md:text-3xl max-w-2xl mx-auto">
                &ldquo;{blueprint.soulArchitecture.coreQuote}&rdquo;
              </p>
            </motion.div>
          </div>
        </Section>

        {/* II. Shadow Pattern */}
        <Section delay={0.15}>
          <div className="glass-card p-8 md:p-10 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold gold-glow mb-8">
              II. Shadow Pattern
            </h2>
            <p className="text-white/80 leading-relaxed mb-6">
              {blueprint.shadowPattern.pattern}
            </p>
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-5 mb-6">
              <p className="text-sm text-red-400 font-medium mb-2">Root Cause</p>
              <p className="text-white/70 text-sm leading-relaxed">
                {blueprint.shadowPattern.rootCause}
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="py-6 text-center"
            >
              <p className="pull-quote text-xl md:text-2xl max-w-2xl mx-auto">
                &ldquo;{blueprint.shadowPattern.keyQuote}&rdquo;
              </p>
            </motion.div>
          </div>
        </Section>

        {/* III. True North */}
        <Section delay={0.2}>
          <div className="glass-card p-8 md:p-10 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold gold-glow mb-8">
              III. True North
            </h2>
            <p className="text-white/80 leading-relaxed mb-6">
              {blueprint.trueNorth.direction}
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-cosmic-purple/5 border border-cosmic-purple/10 rounded-xl p-5">
                <p className="text-sm text-cosmic-purple-light font-medium mb-2">Alignment</p>
                <p className="text-white/70 text-sm leading-relaxed">
                  {blueprint.trueNorth.alignment}
                </p>
              </div>
              <div className="bg-cosmic-gold/5 border border-cosmic-gold/10 rounded-xl p-5">
                <p className="text-sm text-cosmic-gold font-medium mb-2">Destiny</p>
                <p className="text-white/70 text-sm leading-relaxed">
                  {blueprint.trueNorth.destiny}
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* IV. First Sovereign Act */}
        <Section delay={0.25}>
          <div className="glass-card p-8 md:p-10 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold gold-glow mb-8">
              IV. Your First Sovereign Act
            </h2>
            <p className="text-white/80 leading-relaxed mb-6">
              {blueprint.firstSovereignAct.instruction}
            </p>
            <div className="bg-cosmic-gold/5 border border-cosmic-gold/10 rounded-xl p-5 mb-6">
              <p className="text-sm text-cosmic-gold font-medium mb-2">Why This Act</p>
              <p className="text-white/70 text-sm leading-relaxed">
                {blueprint.firstSovereignAct.reason}
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="py-6 text-center"
            >
              <p className="pull-quote text-xl md:text-2xl max-w-2xl mx-auto">
                &ldquo;{blueprint.firstSovereignAct.declaration}&rdquo;
              </p>
            </motion.div>
          </div>
        </Section>

        {/* CTA — Death Module */}
        <Section delay={0.3}>
          <div className="relative overflow-hidden rounded-2xl p-8 md:p-12 text-center mb-16">
            <div className="absolute inset-0 bg-gradient-to-br from-cosmic-purple/20 via-space-card to-cosmic-gold/10 border border-cosmic-gold/20 rounded-2xl" />
            <div className="relative z-10">
              <p className="pull-quote text-2xl md:text-3xl mb-8 max-w-xl mx-auto">
                Your blueprint is a map. The Death Module is the journey.
              </p>
              <p className="text-white/60 mb-2">
                The first SOVRN cohort opens July 2026. Twelve people. Eight weeks.
              </p>
              <p className="gold-glow text-xl font-bold mb-10">
                Investment: $1,000
              </p>

              {!showBooking ? (
                <>
                  <button onClick={handleBookCall} className="sovereign-button text-lg mb-4">
                    Apply for the Founding Cohort
                  </button>
                  <div className="sovereign-divider max-w-xs mx-auto my-8" />
                  <button onClick={handleBookCall} className="sovereign-button"
                          style={{ background: 'transparent', color: '#D4AF37', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '0.75rem' }}>
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
          </div>
        </Section>

        {/* Footer */}
        <Section delay={0.35}>
          <div className="text-center pb-12">
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-cosmic-gold/50 to-transparent mx-auto mb-6" />
            <p className="text-sm text-white/30">
              SOVRN — Your Sovereign Blueprint
            </p>
          </div>
        </Section>
      </div>
    </div>
  );
}
