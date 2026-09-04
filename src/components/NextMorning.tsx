/* What happens next, stated once, at the bottom of the Ledger.

   Someone who has committed to an act has no way of knowing the next one is
   written out of this one — that the thing is reading them back. Left unsaid,
   tomorrow's act looks like the next item on a list, and an uncompleted day
   looks like a dead end rather than the input it actually is.

   Two sentences. No steps, no tour, no dismiss button — it is not an
   interruption to be cleared, it is the terms of the thing, and it sits at the
   bottom where it can be read or ignored. */
export default function NextMorning() {
  return (
    <div
      style={{
        marginTop: 44,
        borderTop: '1px solid #E4E0D6',
        paddingTop: 22,
      }}
    >
      <p
        style={{
          fontFamily: 'var(--sv-font)', fontWeight: 300,
          fontSize: 15, lineHeight: 1.7, color: '#6E6A66', maxWidth: 460,
        }}
      >
        Tomorrow morning at 6am you get a new act. It won&rsquo;t be a repeat &mdash;
        it&rsquo;s written from what you actually did today, including if you didn&rsquo;t.
      </p>
    </div>
  );
}
