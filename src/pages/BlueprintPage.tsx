import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Crown,
  Eye,
  FlaskConical,
  Heart,
  GraduationCap,
  ShieldAlert,
  Zap,
  Users,
  TrendingUp,
  Calendar,
  Share2,
  Download,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import type { BlueprintResult, QuizData } from '../types';
import { trackEvent } from '../utils/storage';

interface Props {
  blueprint: BlueprintResult;
  quizData: QuizData;
}

const ARCHETYPE_ICONS: Record<string, typeof Crown> = {
  Leader: Crown,
  Oracle: Eye,
  Alchemist: FlaskConical,
  Healer: Heart,
  Teacher: GraduationCap,
};

const ARCHETYPE_COLORS: Record<string, string> = {
  Leader: '#f59e0b',
  Oracle: '#8b5cf6',
  Alchemist: '#06b6d4',
  Healer: '#ec4899',
  Teacher: '#10b981',
};

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

export default function BlueprintPage({ blueprint, quizData }: Props) {
  const [shared, setShared] = useState(false);
  const ArchetypeIcon = ARCHETYPE_ICONS[blueprint.archetype.type] || Crown;
  const archetypeColor =
    ARCHETYPE_COLORS[blueprint.archetype.type] || '#f59e0b';

  useEffect(() => {
    trackEvent('pageView', 'blueprint');
  }, []);

  const handleShare = async () => {
    const text = `I just discovered I'm a ${blueprint.archetype.type} Archetype! Find your Cosmic Business Blueprint at SOVRN.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My SOVRN Blueprint', text });
      } catch {
        // User cancelled
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
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    const checkPage = (needed: number) => {
      if (y + needed > 270) {
        doc.addPage();
        y = 20;
      }
    };

    const addTitle = (text: string, size: number, color: [number, number, number]) => {
      checkPage(15);
      doc.setFontSize(size);
      doc.setTextColor(...color);
      doc.text(text, margin, y);
      y += size * 0.5 + 2;
    };

    const addBody = (text: string) => {
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const lines = doc.splitTextToSize(text, contentWidth);
      checkPage(lines.length * 5);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 4;
    };

    const addDivider = () => {
      checkPage(10);
      y += 3;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;
    };

    // Header
    doc.setFontSize(10);
    doc.setTextColor(139, 92, 246);
    doc.text('SOVRN', pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(22);
    doc.setTextColor(30, 30, 30);
    doc.text('Cosmic Business Blueprint', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Prepared for ${quizData.name}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    addDivider();

    // Section 1: Archetype
    addTitle(`Success Archetype: The ${blueprint.archetype.type}`, 16, [139, 92, 246]);
    addBody(blueprint.archetype.description);
    addTitle('Your Natural Business Model', 11, [245, 158, 11]);
    addBody(blueprint.archetype.businessModel);
    addDivider();

    // Section 2: Cosmic Block
    addTitle('Your #1 Cosmic Block', 16, [220, 60, 60]);
    addBody(blueprint.cosmicBlock.block);
    addTitle('How It Shows Up', 11, [180, 60, 60]);
    addBody(blueprint.cosmicBlock.howItShows);
    addTitle("What It's Costing You", 11, [180, 60, 60]);
    addBody(blueprint.cosmicBlock.cost);
    addDivider();

    // Section 3: Cosmic Advantage
    addTitle('Your Cosmic Advantage', 16, [139, 92, 246]);
    addBody(blueprint.cosmicAdvantage.strengths);
    addTitle('How to Leverage', 11, [139, 92, 246]);
    addBody(blueprint.cosmicAdvantage.leverage);
    addTitle('Path Forward', 11, [245, 158, 11]);
    addBody(blueprint.cosmicAdvantage.pathForward);
    addDivider();

    // Section 4: Ideal Client
    addTitle('Your Ideal Client Avatar', 16, [139, 92, 246]);
    addBody(blueprint.idealClient.description);
    addTitle('Demographics & Psychographics', 11, [100, 100, 100]);
    addBody(blueprint.idealClient.demographics);
    addTitle('Where to Find Them', 11, [100, 100, 100]);
    addBody(blueprint.idealClient.whereToFind);
    addDivider();

    // Section 5: The Gap
    addTitle('The Gap', 16, [245, 158, 11]);
    addBody(blueprint.theGap.missing);
    addTitle('Action Items', 11, [245, 158, 11]);
    blueprint.theGap.actionItems.forEach((item, i) => {
      addBody(`${i + 1}. ${item}`);
    });
    addBody(blueprint.theGap.bridge);

    // Footer
    checkPage(20);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated by SOVRN — Your cosmic blueprint for business sovereignty', pageWidth / 2, y, { align: 'center' });

    doc.save(`SOVRN-Blueprint-${quizData.name.replace(/\s+/g, '-')}.pdf`);
  };

  const [showBooking, setShowBooking] = useState(false);

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
              className="text-sm tracking-[0.4em] uppercase text-cosmic-purple-light font-medium mb-6"
            >
              SOVRN
            </motion.p>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              <span className="text-gradient">Your Cosmic Business Blueprint</span>
            </h1>
            <p className="text-xl text-white/60">{quizData.name}</p>

            {/* Action buttons */}
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

        {/* Archetype */}
        <Section delay={0.1}>
          <div className="glass-card-gold p-8 md:p-10 mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${archetypeColor}20` }}
              >
                <ArchetypeIcon
                  className="w-8 h-8"
                  style={{ color: archetypeColor }}
                />
              </div>
              <div>
                <p className="text-sm text-white/50 uppercase tracking-wider">
                  Your Success Archetype
                </p>
                <h2
                  className="text-3xl font-bold"
                  style={{ color: archetypeColor }}
                >
                  The {blueprint.archetype.type}
                </h2>
              </div>
            </div>
            <p className="text-white/80 leading-relaxed mb-6">
              {blueprint.archetype.description}
            </p>
            <div className="bg-white/5 rounded-xl p-5 border border-white/5">
              <p className="text-sm text-cosmic-gold font-medium mb-2">
                Your Natural Business Model
              </p>
              <p className="text-white/70 text-sm leading-relaxed">
                {blueprint.archetype.businessModel}
              </p>
            </div>
          </div>
        </Section>

        {/* Cosmic Block */}
        <Section delay={0.15}>
          <div className="glass-card p-8 md:p-10 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <ShieldAlert className="w-6 h-6 text-red-400" />
              <h2 className="text-2xl font-bold">Your #1 Cosmic Block</h2>
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-white/80 leading-relaxed">
                  {blueprint.cosmicBlock.block}
                </p>
              </div>
              <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-5">
                <p className="text-sm text-red-400 font-medium mb-2">
                  How It Shows Up
                </p>
                <p className="text-white/70 text-sm leading-relaxed">
                  {blueprint.cosmicBlock.howItShows}
                </p>
              </div>
              <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-5">
                <p className="text-sm text-red-400 font-medium mb-2">
                  What It's Costing You
                </p>
                <p className="text-white/70 text-sm leading-relaxed">
                  {blueprint.cosmicBlock.cost}
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* Cosmic Advantage */}
        <Section delay={0.2}>
          <div className="glass-card p-8 md:p-10 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-6 h-6 text-cosmic-gold" />
              <h2 className="text-2xl font-bold">Your Cosmic Advantage</h2>
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-sm text-cosmic-purple-light font-medium mb-2">
                  Your Unique Strengths
                </p>
                <p className="text-white/80 leading-relaxed">
                  {blueprint.cosmicAdvantage.strengths}
                </p>
              </div>
              <div className="bg-cosmic-purple/5 border border-cosmic-purple/10 rounded-xl p-5">
                <p className="text-sm text-cosmic-purple-light font-medium mb-2">
                  How to Leverage Them
                </p>
                <p className="text-white/70 text-sm leading-relaxed">
                  {blueprint.cosmicAdvantage.leverage}
                </p>
              </div>
              <div className="bg-cosmic-gold/5 border border-cosmic-gold/10 rounded-xl p-5">
                <p className="text-sm text-cosmic-gold font-medium mb-2">
                  Your Path Forward
                </p>
                <p className="text-white/70 text-sm leading-relaxed">
                  {blueprint.cosmicAdvantage.pathForward}
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* Ideal Client */}
        <Section delay={0.25}>
          <div className="glass-card p-8 md:p-10 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6 text-cosmic-purple-light" />
              <h2 className="text-2xl font-bold">Your Ideal Client Avatar</h2>
            </div>
            <div className="space-y-6">
              <p className="text-white/80 leading-relaxed">
                {blueprint.idealClient.description}
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-5 border border-white/5">
                  <p className="text-sm text-cosmic-purple-light font-medium mb-2">
                    Demographics & Psychographics
                  </p>
                  <p className="text-white/70 text-sm leading-relaxed">
                    {blueprint.idealClient.demographics}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-5 border border-white/5">
                  <p className="text-sm text-cosmic-gold font-medium mb-2">
                    Where to Find Them
                  </p>
                  <p className="text-white/70 text-sm leading-relaxed">
                    {blueprint.idealClient.whereToFind}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* The Gap */}
        <Section delay={0.3}>
          <div className="glass-card p-8 md:p-10 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-cosmic-gold" />
              <h2 className="text-2xl font-bold">The Gap</h2>
            </div>
            <p className="text-white/80 leading-relaxed mb-6">
              {blueprint.theGap.missing}
            </p>
            <div className="space-y-3 mb-6">
              {blueprint.theGap.actionItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 bg-white/5 rounded-xl p-4 border border-white/5"
                >
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-cosmic-gold/20 text-cosmic-gold text-sm font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {item}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-white/60 text-sm italic">{blueprint.theGap.bridge}</p>
          </div>
        </Section>

        {/* CTA */}
        <Section delay={0.35}>
          <div className="relative overflow-hidden rounded-2xl p-8 md:p-12 text-center mb-16">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-cosmic-purple/20 via-space-card to-cosmic-gold/10 border border-cosmic-purple/20 rounded-2xl" />
            <div className="relative z-10">
              <Calendar className="w-10 h-10 text-cosmic-gold mx-auto mb-4" />
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                Want me to build this system for you?
              </h2>
              <p className="text-white/60 mb-8 max-w-lg mx-auto">
                15 qualified calls with your dream clients in 30 days —
                guaranteed.
              </p>
              {!showBooking ? (
                <>
                  <button onClick={handleBookCall} className="glow-button text-lg">
                    Book Your Cosmic Business Strategy Call
                  </button>
                  <p className="text-white/30 text-xs mt-4">
                    Free 30-minute strategy session. No obligation.
                  </p>
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
        <Section delay={0.4}>
          <div className="text-center pb-12">
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-cosmic-purple/50 to-transparent mx-auto mb-6" />
            <p className="text-sm text-white/30">
              Join 500+ spiritual entrepreneurs who've discovered their cosmic
              advantage
            </p>
            <p className="text-xs text-white/20 mt-2">
              SOVRN — Your cosmic blueprint for business sovereignty
            </p>
          </div>
        </Section>
      </div>
    </div>
  );
}
