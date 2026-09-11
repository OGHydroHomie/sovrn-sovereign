import { useEffect, useState } from 'react';
import { markUrl, MARK_ASPECT } from '../lib/marks';

interface Props {
  becoming: string | null | undefined;
  /* The size of the mark along whichever axis `basis` names. A number is px; a
     string is any CSS length, so the reveal can scale with the viewport. */
  size: number | string;
  /* Which axis `size` sets. The art is portrait, so a header that wants to keep
     its row height constrains by height, and the reveal — where the mark is the
     character — constrains by width and gets taller. */
  basis?: 'width' | 'height';
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
export default function ArchetypeMark({ becoming, size, basis = 'width', inline = false }: Props) {
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

  /* The other axis follows the art's own proportions rather than being forced
     square, which would squash a 896x1216 mark by a third. */
  const box: React.CSSProperties = {
    ...(basis === 'width'
      ? { width: size, aspectRatio: `${MARK_ASPECT}` }
      : { height: size, aspectRatio: `${MARK_ASPECT}` }),
    flex: 'none',
    ...(inline ? { display: 'inline-block', verticalAlign: 'middle' } : {}),
  };

  if (state === 'ok' && src) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        style={{ ...box, objectFit: 'contain', display: 'block' }}
      />
    );
  }

  /* The fallback, and the mark the product already has. Square regardless of the
     art's shape — it is the loading square, not a stand-in for a missing file. */
  return (
    <div
      aria-hidden="true"
      style={{
        ...(basis === 'width' ? { width: size, height: size } : { height: size, width: size }),
        flex: 'none', background: '#000000',
        ...(inline ? { display: 'inline-block', verticalAlign: 'middle' } : {}),
      }}
    />
  );
}
