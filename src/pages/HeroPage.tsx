import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { trackEvent } from '../utils/storage';

gsap.registerPlugin(ScrollTrigger);

interface Props {
  onStart: () => void;
}

function splitChars(text: string, className: string) {
  return text.split('').map((ch, i) => (
    <span key={i} className={className} style={{ display: 'inline-block', overflow: 'hidden' }}>
      <span className="char" style={{ display: 'inline-block' }}>
        {ch === ' ' ? ' ' : ch}
      </span>
    </span>
  ));
}

export default function HeroPage({ onStart }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleStart = () => {
    trackEvent('quizStart');
    onStart();
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title character animation
      gsap.from('.hero-title .char', {
        y: '110%',
        opacity: 0,
        stagger: 0.035,
        ease: 'power4.out',
        duration: 1.2,
        delay: 0.5,
      });

      gsap.from('.hero-eyebrow', {
        opacity: 0,
        y: -20,
        duration: 0.8,
        delay: 0.3,
        ease: 'power2.out',
      });

      gsap.from('.hero-sub', {
        opacity: 0,
        y: 20,
        duration: 0.9,
        delay: 1.4,
        ease: 'power2.out',
      });

      gsap.from('.hero-cta', {
        opacity: 0,
        scale: 0.9,
        duration: 0.8,
        delay: 1.8,
        ease: 'power2.out',
      });

      gsap.from('.scroll-hint', {
        opacity: 0,
        duration: 1,
        delay: 2.5,
      });

      // Feature cards scroll reveal
      gsap.from('.feature-card', {
        scrollTrigger: {
          trigger: '.features-section',
          start: 'top 75%',
        },
        opacity: 0,
        y: 60,
        stagger: 0.15,
        duration: 0.8,
        ease: 'power3.out',
      });

      gsap.from('.features-heading', {
        scrollTrigger: {
          trigger: '.features-section',
          start: 'top 80%',
        },
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: 'power3.out',
      });

      // Threshold section
      gsap.from('.threshold-content', {
        scrollTrigger: {
          trigger: '.threshold-section',
          start: 'top 70%',
        },
        opacity: 0,
        y: 50,
        duration: 1,
        ease: 'power3.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef}>
      {/* Section 1 — Hero */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-4"
        style={{ minHeight: '100vh', paddingTop: '10vh', paddingBottom: '10vh' }}
      >
        <p className="hero-eyebrow text-sm tracking-[0.5em] uppercase gold-glow font-medium mb-10">
          SOVRN
        </p>

        <h1
          className="hero-title font-bold leading-none mb-8"
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontSize: 'clamp(3.5rem, 10vw, 8rem)',
            lineHeight: 1.05,
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #a78bfa 50%, #D4AF37 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {splitChars('Remember', 'inline-block')}
          </div>
          <div
            style={{
              background: 'linear-gradient(135deg, #a78bfa 0%, #D4AF37 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {splitChars('who you are.', 'inline-block')}
          </div>
        </h1>

        <p
          className="hero-sub text-lg md:text-xl max-w-2xl mx-auto mb-14 leading-relaxed"
          style={{ color: 'rgba(245, 240, 232, 0.6)' }}
        >
          Enter your birth data. Receive your Sovereign Blueprint — a personalized
          decode of your soul architecture, shadow pattern, and true north written
          into your natal chart before you were born.
        </p>

        <div className="hero-cta">
          <button
            onClick={handleStart}
            className="sovereign-button text-lg"
          >
            Begin Your Blueprint
          </button>
        </div>

        <div className="scroll-hint absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-xs tracking-widest uppercase" style={{ color: 'rgba(212, 175, 55, 0.4)' }}>
            Scroll
          </span>
          <div
            style={{
              width: 1,
              height: 48,
              background: 'linear-gradient(to bottom, rgba(212,175,55,0.4), transparent)',
            }}
          />
        </div>
      </section>

      {/* Section 2 — Features */}
      <section
        className="features-section relative flex flex-col items-center justify-center px-4 py-24"
        style={{ minHeight: '100vh' }}
      >
        <div className="max-w-5xl mx-auto w-full">
          <div className="features-heading text-center mb-20">
            <p className="text-sm tracking-[0.4em] uppercase mb-4" style={{ color: 'rgba(212,175,55,0.6)' }}>
              What awaits you
            </p>
            <h2
              className="text-3xl md:text-5xl font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <span style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #a78bfa 60%, #D4AF37 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Your Sovereign Blueprint
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: '◈',
                title: 'Soul Architecture',
                body: 'Your Sun, Rising, and North Node decoded as archetypes of power — not signs, but titles. The hidden structure of who you were born to become.',
              },
              {
                icon: '◉',
                title: 'Shadow Pattern',
                body: 'The precise mechanism behind your repeating loops, mapped to your South Node and Saturn. Named with surgical accuracy so it can finally be seen.',
              },
              {
                icon: '◎',
                title: 'True North',
                body: 'The trajectory your chart is pulling you toward. Your Jupiter, North Node, and Midheaven converging into a clear direction — not a destination, a vector.',
              },
              {
                icon: '◇',
                title: 'First Sovereign Act',
                body: 'One hyper-specific action, within 24 hours, that breaks the pattern. Not an affirmation. An initiation.',
              },
            ].map((card) => (
              <div key={card.title} className="feature-card glass-card-gold p-8">
                <div
                  className="text-3xl mb-4 gold-glow"
                  style={{ fontFamily: 'monospace' }}
                >
                  {card.icon}
                </div>
                <h3
                  className="text-xl font-bold mb-3 gold-glow"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {card.title}
                </h3>
                <p style={{ color: 'rgba(245, 240, 232, 0.6)', lineHeight: 1.7 }}>
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 — The Threshold */}
      <section
        className="threshold-section relative flex flex-col items-center justify-center px-4 py-24 text-center"
        style={{ minHeight: '100vh' }}
      >
        <div className="threshold-content max-w-3xl mx-auto">
          <div className="sovereign-divider max-w-xs mx-auto mb-16" />

          <p className="text-sm tracking-[0.5em] uppercase mb-8" style={{ color: 'rgba(212,175,55,0.5)' }}>
            The Threshold
          </p>

          <h2
            className="font-bold mb-8"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(2.5rem, 6vw, 5rem)',
              lineHeight: 1.1,
            }}
          >
            <span style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #a78bfa 50%, #D4AF37 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Every initiation begins<br />with a single step.
            </span>
          </h2>

          <p
            className="pull-quote text-xl md:text-2xl mb-16 max-w-xl mx-auto"
          >
            "You are not lost. You are between who you were and who you are becoming."
          </p>

          <button
            onClick={handleStart}
            className="sovereign-button text-lg cta-pulse mb-8"
          >
            Receive Your Blueprint
          </button>

          <p className="text-sm" style={{ color: 'rgba(245, 240, 232, 0.3)' }}>
            Free. Takes 3 minutes.
          </p>

          <div className="sovereign-divider max-w-xs mx-auto mt-20 mb-8" />
          <p className="text-xs tracking-widest uppercase" style={{ color: 'rgba(245, 240, 232, 0.2)' }}>
            SOVRN — Your Sovereign Blueprint
          </p>
        </div>
      </section>
    </div>
  );
}
