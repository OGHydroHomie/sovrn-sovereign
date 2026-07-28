import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import type { QuizData } from '../types';
import { trackEvent } from '../utils/storage';

interface Props {
  text: string;
  isDone: boolean;
  quizData: QuizData;
}

const SECTION_HEADERS = new Set([
  'SOUL ARCHITECTURE',
  'SHADOW PATTERN',
  'TRUE NORTH',
  'FIRST SOVEREIGN ACT',
]);

function renderLines(text: string, isDone: boolean) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const isLast = i === lines.length - 1;

    if (SECTION_HEADERS.has(trimmed)) {
      elements.push(
        <h2
          key={i}
          className="text-2xl md:text-3xl font-bold gold-glow mt-12 mb-6 first:mt-0"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {trimmed}
        </h2>
      );
    } else if (trimmed === '') {
      elements.push(<div key={i} className="h-4" />);
    } else {
      elements.push(
        <p
          key={i}
          className="text-white/85 leading-relaxed mb-1"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', lineHeight: '1.8' }}
        >
          {line}
          {isLast && !isDone && <span className="stream-cursor" />}
        </p>
      );
    }
  }

  // If last line was a header or blank, append floating cursor
  if (!isDone && lines.length > 0) {
    const lastTrimmed = lines[lines.length - 1].trim();
    if (SECTION_HEADERS.has(lastTrimmed) || lastTrimmed === '') {
      elements.push(
        <span key="cursor-standalone" className="stream-cursor inline-block mt-2" />
      );
    }
  }

  return elements;
}

export default function BlueprintPage({ text, isDone, quizData }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shared, setShared] = useState(false);
  const [showBooking, setShowBooking] = useState(false);

  useEffect(() => {
    trackEvent('pageView', 'blueprint');
  }, []);

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (!isDone && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text, isDone]);

  useEffect(() => {
    if (showBooking) {
      const script = document.createElement('script');
      script.src = 'https://app.iclosed.io/assets/widget.js';
      script.async = true;
      document.body.appendChild(script);
      return () => { document.body.removeChild(script); };
    }
  }, [showBooking]);

  const handleShare = async () => {
    const shareText = `I just received my Sovereign Blueprint from SOVRN. Remember who you are.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Sovereign Blueprint', text: shareText });
      } catch {
        // cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareText);
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
    y += 12;

    doc.setDrawColor(...gold);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    for (const line of text.split('\n')) {
      const trimmed = line.trim();

      if (SECTION_HEADERS.has(trimmed)) {
        checkPage(18);
        y += 4;
        doc.setFontSize(14);
        doc.setTextColor(...gold);
        doc.text(trimmed, margin, y);
        y += 10;
      } else if (trimmed === '') {
        y += 3;
      } else {
        doc.setFontSize(10);
        doc.setTextColor(...boneDim);
        const wrapped = doc.splitTextToSize(line, contentWidth);
        checkPage(wrapped.length * 5 + 2);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 5 + 2;
      }
    }

    checkPage(10);
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

  return (
    <div className="relative min-h-screen px-4 py-12 md:py-20">
      <div className="relative z-10 max-w-3xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm tracking-[0.4em] uppercase gold-glow font-medium mb-4"
          >
            SOVRN
          </motion.p>
          <h1 className="text-3xl md:text-5xl font-bold mb-2">
            <span className="text-gradient">Your Sovereign Blueprint</span>
          </h1>
          <p className="text-lg text-white/50">{quizData.name}</p>

          {isDone && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-center gap-4 mt-6"
            >
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
            </motion.div>
          )}
        </div>

        {/* Streaming text canvas */}
        <div
          ref={scrollRef}
          className="glass-card-gold p-8 md:p-10 mb-8"
          style={{ minHeight: '200px' }}
        >
          {renderLines(text, isDone)}
        </div>

        {/* CTA — shown only when stream is complete */}
        {isDone && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
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
                    <button
                      onClick={handleBookCall}
                      className="sovereign-button"
                      style={{ background: 'transparent', color: '#D4AF37', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '0.75rem' }}
                    >
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

            <div className="text-center pb-12">
              <div className="w-12 h-px bg-gradient-to-r from-transparent via-cosmic-gold/50 to-transparent mx-auto mb-6" />
              <p className="text-sm text-white/30">SOVRN — Your Sovereign Blueprint</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
