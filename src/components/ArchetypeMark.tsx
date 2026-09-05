import { useEffect, useState } from 'react';
import { markUrl } from '../lib/marks';

interface Props {
  becoming: string | null | undefined;
  /** Rendered square, in px. */
  size: number;
  /** Sits inline beside type rather than on its own line. */
  inline?: boolean;
}

type State = 'pending' | 'ok' | 'missing';

/* The mark slot.

   None of the thirteen marks exist yet, so today this renders the solid black
   square every time. That is the point: the slot and its fallback ship now, the
   art drops into /public/marks later and is picked up with no code change.

   The file is probed with an Image rather than rendered straight into an <img>,
   because a missing src paints a broken-image glyph for a frame before the error
   handler runs — and a broken image on the reveal is worse than no mark at all. */
export default function ArchetypeMark({ becoming, size, inline = false }: Props) {
  const src = markUrl(becoming);
  const [state, setState] = useState<State>('pending');

  useEffect(() => {
    if (!src) { setState('missing'); return; }
    let live = true;
    const probe = new Image();
    probe.onload = () => { if (live) setState('ok'); };
    probe.onerror = () => { if (live) setState('missing'); };
    probe.src = src;
    return () => { live = false; };
  }, [src]);

  const box: React.CSSProperties = {
    width: size,
    height: size,
    flex: 'none',
    ...(inline ? { display: 'inline-block', verticalAlign: 'middle' } : {}),
  };

  if (state === 'ok' && src) {
    return <img src={src} alt="" aria-hidden="true" style={box} />;
  }

  /* The fallback, and the mark the product already has. Solid black on cream,
     the same object the loading screen resolves and day 7 opens. */
  return <div aria-hidden="true" style={{ ...box, background: '#000000' }} />;
}
