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

const SECTION_HEADERS = [
  'SOUL ARCHITECTURE',
  'HIDDEN GIFTS',
  'SHADOW PATTERN',
  'TRUE NORTH',
  'FIRST SOVEREIGN ACT',
  'RELATIONSHIP BLUEPRINT',
  'CAREER DESTINY',
];
const HEADER_SET = new Set(SECTION_HEADERS);

interface Block {
  title: string | null; // null for intro/pre-header content
  lines: string[];
}

// Parse the streamed prose into ordered blocks, one per section header.
function parseBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let current: Block = { title: null, lines: [] };

  for (const line of lines) {
    if (HEADER_SET.has(line.trim())) {
      if (current.title !== null || current.lines.some((l) => l.trim() !== '')) {
        blocks.push(current);
      }
      current = { title: line.trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  blocks.push(current);

  // Drop a leading empty intro block
  return blocks.filter(
    (b) => b.title !== null || b.lines.some((l) => l.trim() !== '')
  );
}

// A "quote" line: wrapped in quotation marks or em-dashes on its own line.
function isQuoteLine(trimmed: string): boolean {
  if (trimmed.length < 12) return false;
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('“') && trimmed.endsWith('”'));
  const dashed = trimmed.startsWith('—') && trimmed.endsWith('—');
  return quoted || dashed;
}

function renderBody(lines: string[], attachCursor: boolean) {
  // Find the last non-empty line index (where the cursor should sit)
  let lastTextIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() !== '') {
      lastTextIdx = i;
      break;
    }
  }

  const out: React.ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const showCursorHere = attachCursor && i === lastTextIdx;

    if (trimmed === '') {
      out.push(<div key={i} style={{ height: 12 }} />);
      continue;
    }

    if (isQuoteLine(trimmed)) {
      out.push(
        <p
          key={i}
          style={{
            color: '#DC2626',
            fontSize: 18,
            fontWeight: 600,
            fontStyle: 'italic',
            lineHeight: 1.5,
            margin: '8px 0',
          }}
        >
          {line}
          {showCursorHere && <span className="stream-cursor" />}
        </p>
      );
    } else {
      out.push(
        <p
          key={i}
          style={{ color: '#4A4A4A', fontSize: 16, lineHeight: 1.7, marginBottom: 4 }}
        >
          {line}
          {showCursorHere && <span className="stream-cursor" />}
        </p>
      );
    }
  }

  // If cursor belongs to this block but the last line is empty/header-only, float it
  if (attachCursor && lastTextIdx === -1) {
    out.push(<span key="cursor" className="stream-cursor" style={{ marginTop: 4 }} />);
  }

  return out;
}

export default function BlueprintPage({ text, isDone, quizData }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const [showBooking, setShowBooking] = useState(false);

  useEffect(() => {
    trackEvent('pageView', 'blueprint');
  }, []);

  // Auto-scroll to keep the current streaming text visible
  useEffect(() => {
    if (!isDone && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [text, isDone]);

  useEffect(() => {
    if (showBooking) {
      const script = document.createElement('script');
      script.src = 'https://app.iclosed.io/assets/widget.js';
      script.async = true;
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    }
  }, [showBooking]);

  const handleDownload = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 22;

    const red: [number, number, number] = [220, 38, 38];
    const ink: [number, number, number] = [26, 26, 26];
    const body: [number, number, number] = [74, 74, 74];
    const subtle: [number, number, number] = [154, 154, 154];

    const checkPage = (needed: number) => {
      if (y + needed > 275) {
        doc.addPage();
        y = 22;
      }
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...subtle);
    doc.text('SOVRN', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(20);
    doc.setTextColor(...red);
    doc.text('SOVEREIGN BLUEPRINT', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...body);
    doc.text(`Prepared for ${quizData.name}`, pageWidth / 2, y, { align: 'center' });
    y += 12;

    doc.setDrawColor(...red);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (HEADER_SET.has(trimmed)) {
        checkPage(18);
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...ink);
        doc.text(trimmed, margin, y);
        y += 9;
      } else if (trimmed === '') {
        y += 3;
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...body);
        const wrapped = doc.splitTextToSize(line, contentWidth);
        checkPage(wrapped.length * 5 + 2);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 5 + 2;
      }
    }

    checkPage(10);
    y += 8;
    doc.setFontSize(8);
    doc.setTextColor(...subtle);
    doc.text('Generated by SOVRN — Your Sovereign Blueprint', pageWidth / 2, y, { align: 'center' });

    doc.save(`SOVRN-Sovereign-Blueprint-${quizData.name.replace(/\s+/g, '-')}.pdf`);
  };

  const handleTransformation = () => {
    trackEvent('ctaClick');
    setShowBooking(true);
  };

  const blocks = parseBlocks(text);
  const lastBlockIdx = blocks.length - 1;
  let sectionNumber = 0;

  return (
    <div className="app-screen px-6 pt-8 pb-16" style={{ maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div className="text-center" style={{ marginBottom: 24 }}>
        <p className="sovrn-wordmark">SOVRN</p>
        <h1 style={{ color: '#DC2626', fontSize: 24, fontWeight: 700, marginTop: 8 }}>
          Your Sovereign Blueprint
        </h1>
      </div>

      {/* Section cards */}
      <div className="flex flex-col">
        {blocks.map((block, i) => {
          const isLast = i === lastBlockIdx;
          const attachCursor = !isDone && isLast;

          if (block.title === null) {
            // Pre-header intro prose — render plainly, no card
            return (
              <div key={i} style={{ marginBottom: 16 }}>
                {renderBody(block.lines, attachCursor)}
              </div>
            );
          }

          sectionNumber += 1;
          const accent = sectionNumber % 2 === 1 ? '#DC2626' : '#1A1A1A';
          const numLabel = String(sectionNumber).padStart(2, '0');

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                position: 'relative',
                background: '#FAFAFA',
                border: '1px solid #E5E5E5',
                borderLeft: `3px solid ${accent}`,
                borderRadius: 12,
                padding: 24,
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#E5E5E5',
                }}
              >
                {numLabel}
              </span>
              <h2
                style={{
                  color: '#1A1A1A',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  marginBottom: 14,
                  paddingRight: 28,
                }}
              >
                {block.title}
              </h2>
              {renderBody(block.lines, attachCursor)}
            </motion.div>
          );
        })}
      </div>

      <div ref={endRef} />

      {/* Completion CTAs */}
      {isDone && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{ marginTop: 24 }}
        >
          {!showBooking ? (
            <>
              <p
                className="text-center"
                style={{ color: '#4A4A4A', fontSize: 15, lineHeight: 1.6, marginBottom: 20, maxWidth: 340, marginLeft: 'auto', marginRight: 'auto' }}
              >
                Your blueprint is the map. The transformation is the journey.
              </p>

              <button onClick={handleDownload} className="app-button-outline" style={{ marginBottom: 14 }}>
                Download Blueprint
              </button>

              <button onClick={handleTransformation} className="app-button breathe">
                Begin Your Transformation
              </button>
            </>
          ) : (
            <div
              className="iclosed-widget"
              data-url="https://app.iclosed.io/e/sovrngrowth/strategy-call"
              title="Strategy Call"
              style={{ width: '100%', height: 620 }}
            />
          )}

          <p
            className="text-center"
            style={{ color: '#9A9A9A', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 28 }}
          >
            SOVRN
          </p>
        </motion.div>
      )}
    </div>
  );
}
