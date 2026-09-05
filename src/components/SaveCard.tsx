import { useState } from 'react';
import {
  CARD, blueprintCard, daySevenCard, drawCard, ensureFonts, loadMark, saveCard,
} from '../lib/card';

interface Props {
  becoming: string;
  /** The reveal card carries the loop. Day 7 does not. */
  loop?: string | null;
  /** Set on day 7. Its presence is what makes this the resolved card. */
  earnedAt?: Date | null;
}

type State = 'idle' | 'working' | 'failed';

/* One control, one artefact. Everything on the card is the becoming, the mark,
   one line, and the domain — nothing the person typed goes near it, so this is
   safe to post without them having to think about what is on it. */
export default function SaveCard({ becoming, loop = null, earnedAt = null }: Props) {
  const [state, setState] = useState<State>('idle');

  const run = async () => {
    if (state === 'working') return;
    setState('working');
    try {
      // Fonts before measurement: canvas does not wait for a webface, and a card
      // measured in the fallback exports at the wrong metrics with no way back.
      await ensureFonts();
      const mark = await loadMark(becoming);

      const canvas = document.createElement('canvas');
      canvas.width = CARD.width;
      canvas.height = CARD.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no 2d context');

      const content = earnedAt ? daySevenCard(becoming, earnedAt) : blueprintCard(becoming, loop);
      drawCard(ctx, content, mark);

      await saveCard(canvas, `SOVRN-${content.becoming.replace(/\s+/g, '-')}.png`);
      setState('idle');
    } catch (err) {
      console.warn('Card save failed:', err);
      setState('failed');
    }
  };

  return (
    <div>
      <button
        onClick={() => void run()}
        disabled={state === 'working'}
        style={{
          width: '100%', maxWidth: 320, minHeight: 48,
          background: 'none', color: '#1A1A1A',
          border: '1px solid #1A1A1A', borderRadius: 2,
          fontFamily: 'var(--sv-font)', fontWeight: 700, fontSize: 12,
          textTransform: 'uppercase', letterSpacing: '0.12em',
          padding: '16px 24px', cursor: state === 'working' ? 'wait' : 'pointer',
        }}
      >
        {state === 'working' ? 'Drawing it…' : 'Save your card'}
      </button>
      {state === 'failed' && (
        <p style={{ marginTop: 10, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 13, lineHeight: 1.6, color: '#6E6A66' }}>
          That didn&rsquo;t save. Nothing was sent anywhere &mdash; try it again.
        </p>
      )}
    </div>
  );
}
