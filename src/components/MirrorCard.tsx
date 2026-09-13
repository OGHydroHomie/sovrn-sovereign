export interface Mirror {
  /** "This week you wrote:" */
  lead: string;
  /** Their words, verbatim. The quotation marks are added here, nowhere else. */
  quotes: string[];
  /** The counts. One sentence, or two. */
  tally: string;
  /** The one fixed interpretive line, or null. */
  close: string | null;
}

const INK = '#1A1A1A';
const MUTED = '#6E6A66';
const RULE = '#E4E0D6';

/* The Mirror.
 *
 * Their sentences, and a count of them. It sits where a trial would sit on the
 * days there isn't one, which is most days, and it is quieter than the act
 * underneath it on purpose: the act is the thing to do today and this is only
 * something to notice on the way past.
 *
 * Every quote is on its own line. People do not end their filings with full
 * stops, so three of them set inline ran together into a single line with
 * quotation marks scattered through it and no way to see where one ended. The
 * alternative would have been to add the punctuation, and that is a paraphrase
 * wearing quotation marks — the layout gives them the separation the
 * punctuation doesn't, and the words stay exactly as they were typed.
 */
export default function MirrorCard({ mirror }: { mirror: Mirror }) {
  if (!mirror.quotes.length) return null;

  return (
    <section
      data-mirror=""
      style={{ marginBottom: 26, paddingBottom: 22, borderBottom: `1px solid ${RULE}` }}
    >
      <p
        className="sv-label"
        style={{ margin: 0, fontSize: 11, letterSpacing: '0.14em', color: MUTED }}
      >
        {mirror.lead}
      </p>

      <div style={{ marginTop: 12 }}>
        {mirror.quotes.map((q, i) => (
          <p
            key={i}
            data-mirror-quote=""
            style={{
              margin: i === 0 ? 0 : '8px 0 0',
              fontFamily: 'var(--sv-font)', fontWeight: 300,
              fontSize: 16, lineHeight: 1.5, color: INK,
            }}
          >
            &ldquo;{q}&rdquo;
          </p>
        ))}
      </div>

      {/* A count, never a diagnosis. */}
      <p
        data-mirror-tally=""
        style={{
          margin: '18px 0 0', fontFamily: 'var(--sv-font)', fontWeight: 300,
          fontSize: 15, lineHeight: 1.6, color: MUTED,
        }}
      >
        {mirror.tally}
      </p>

      {/* The only interpretive sentence in the feature, and a fixed string. */}
      {mirror.close && (
        <p
          data-mirror-close=""
          style={{
            margin: '16px 0 0', fontFamily: 'var(--sv-font)', fontWeight: 400,
            fontSize: 16, lineHeight: 1.5, color: INK,
          }}
        >
          {mirror.close}
        </p>
      )}
    </section>
  );
}
