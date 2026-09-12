import { useEffect, useRef, useState } from 'react';
import { admitTarget, openCycle, type Admission } from '../lib/cycle';

interface Props {
  onOpened: () => void | Promise<void>;
}

const FIELD: React.CSSProperties = {
  marginTop: 14, width: '100%', boxSizing: 'border-box', minHeight: 52, resize: 'vertical',
  background: 'transparent', color: '#1A1A1A',
  border: '1px solid #E4E0D6', borderRadius: 2,
  fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 16, lineHeight: 1.6, padding: '14px 16px',
};
const PRIMARY: React.CSSProperties = {
  marginTop: 14, width: '100%', minHeight: 52, background: '#000000', color: '#FBFAF7',
  border: 'none', borderRadius: 2, fontFamily: 'var(--sv-font)', fontWeight: 700, fontSize: 13,
  textTransform: 'uppercase', letterSpacing: '0.14em', padding: '18px 24px', cursor: 'pointer',
};
const QUIET: React.CSSProperties = {
  marginTop: 16, background: 'none', border: 'none', padding: '8px 2px', cursor: 'pointer',
  fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 14, color: '#6E6A66',
  textDecoration: 'underline', textUnderlineOffset: 3,
};
const LABEL: React.CSSProperties = {
  fontFamily: 'var(--sv-font)', fontSize: 11, fontWeight: 700,
  letterSpacing: '0.14em', color: '#000000', textTransform: 'uppercase',
};

/* Naming the thing, and agreeing to the boundary before attempting it.

   Three steps and no list to choose from. A target picked off a menu is not a
   thing someone has been avoiding, it is a thing someone selected — the naming
   has to be theirs, so the examples are examples and nothing more. */
export default function TargetAdmission({ onOpened }: Props) {
  const [step, setStep] = useState<'name' | 'cost' | 'narrowed'>('name');
  const [target, setTarget] = useState('');
  const [cost, setCost] = useState('');
  const [admission, setAdmission] = useState<Admission | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const submitCost = async () => {
    if (!cost.trim() || busy) return;
    setBusy(true); setFailed(false);
    const a = await admitTarget(target, cost);
    setBusy(false);
    if (!a) { setFailed(true); return; }
    setAdmission(a);
    setStep('narrowed');
  };

  const accept = async () => {
    if (!admission || busy) return;
    setBusy(true); setFailed(false);
    const opened = await openCycle(target, admission.admitted, admission.rubric, cost);
    setBusy(false);
    if (!opened) { setFailed(true); return; }
    await onOpened();
  };

  /* Focus without scrolling.

     `autoFocus` on the first textarea made the browser scroll it into view the
     moment the reveal mounted, which put the archetype card — and the name above
     it — off the top of the screen before anyone had seen either. The whole
     crystallization was running above the fold, to nobody. The focus is still
     wanted, so it is taken by hand with preventScroll rather than dropped. */
  const focusRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    focusRef.current?.focus({ preventScroll: true });
  }, [step]);

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      {step === 'name' && (
        <>
          <p style={LABEL}>What have you been putting off?</p>
          <textarea
            ref={focusRef}
            value={target}
            rows={3}
            onChange={(e) => setTarget(e.target.value)}
            style={FIELD}
          />
          <div style={{ marginTop: 18, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 14, lineHeight: 2, color: '#6E6A66' }}>
            <div>Send the proposal I keep polishing.</div>
            <div>Tell my business partner the arrangement isn&rsquo;t working.</div>
            <div>Publish the thing under my own name.</div>
          </div>
          <button
            onClick={() => setStep('cost')}
            disabled={!target.trim()}
            style={{ ...PRIMARY, marginTop: 26, background: target.trim() ? '#000000' : '#E4E0D6', color: target.trim() ? '#FBFAF7' : '#9A9A9A', cursor: target.trim() ? 'pointer' : 'not-allowed' }}
          >
            Next
          </button>
        </>
      )}

      {step === 'cost' && (
        <>
          <p style={LABEL}>What does it cost you that this hasn&rsquo;t happened?</p>
          <textarea
            ref={focusRef}
            value={cost}
            rows={4}
            onChange={(e) => setCost(e.target.value)}
            style={FIELD}
          />
          <button
            onClick={() => void submitCost()}
            disabled={!cost.trim() || busy}
            style={{ ...PRIMARY, background: cost.trim() ? '#000000' : '#E4E0D6', color: cost.trim() ? '#FBFAF7' : '#9A9A9A', cursor: cost.trim() && !busy ? 'pointer' : 'not-allowed' }}
          >
            {busy ? 'Reading it…' : 'Set the target'}
          </button>
          <button onClick={() => setStep('name')} style={QUIET}>Back</button>
        </>
      )}

      {step === 'narrowed' && admission && (
        <>
          <p style={{ ...LABEL, color: '#6E6A66' }}>You said</p>
          <p style={{ marginTop: 10, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 17, lineHeight: 1.55, color: '#6E6A66' }}>
            {target}
          </p>

          {admission.reason && (
            <p style={{ marginTop: 22, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 16, lineHeight: 1.7, color: '#1A1A1A' }}>
              {admission.reason}
            </p>
          )}

          <p style={{ ...LABEL, marginTop: 26 }}>
            {admission.narrowed ? 'Try this instead' : 'The target'}
          </p>
          <p style={{ marginTop: 10, fontFamily: 'var(--sv-font)', fontWeight: 400, fontSize: 'clamp(18px, 4.8vw, 21px)', lineHeight: 1.5, color: '#000000' }}>
            {admission.admitted}
          </p>

          {/* Shown before anything is attempted, and the database will not let it
              move afterwards. */}
          <p style={{ marginTop: 24, borderTop: '1px solid #E4E0D6', paddingTop: 18, fontFamily: 'var(--sv-font)', fontWeight: 400, fontSize: 16, lineHeight: 1.65, color: '#1A1A1A' }}>
            {admission.rubric}
          </p>
          <p style={{ marginTop: 10, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 13, lineHeight: 1.7, color: '#6E6A66' }}>
            That is the whole test, and it doesn&rsquo;t change. Thirty days from now this
            cycle closes whether or not you&rsquo;ve crossed it.
          </p>

          <button onClick={() => void accept()} disabled={busy} style={PRIMARY}>
            {busy ? 'Opening…' : "That's it"}
          </button>
          <button
            onClick={() => { setAdmission(null); setStep('name'); }}
            style={QUIET}
          >
            Not quite &mdash; let me rewrite
          </button>
        </>
      )}

      {failed && (
        <p style={{ marginTop: 12, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 14, color: '#1A1A1A' }}>
          That didn&rsquo;t go through. Your words are still here &mdash; try again.
        </p>
      )}
    </div>
  );
}
