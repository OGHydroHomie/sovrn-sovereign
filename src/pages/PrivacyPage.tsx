import PaperPage, { H2, P, UL } from '../components/PaperPage';

export default function PrivacyPage() {
  return (
    <PaperPage title="Privacy" standfirst="What SOVRN collects, where it goes, and how to remove it.">
      <H2>What we collect</H2>
      <P>Everything below comes from you, during the eight questions:</P>
      <UL
        items={[
          'Your birth date, birth time, and birth place. These are used to calculate your chart.',
          'Your answers to the eight questions, including what you wrote about your fear, the reality you want, and the pattern you keep repeating.',
          'Your email address.',
          'Your Ledger entries — each mission, whether you completed it, and what you wrote about what happened.',
        ]}
      />
      <P>
        We do not ask for your name for identification, we do not use tracking
        cookies, and we do not sell or share any of this with advertisers.
      </P>

      <H2>How your Blueprint is generated</H2>
      <P>
        Writing your Blueprint and your daily mission requires sending your chart
        data and your answers to Anthropic&rsquo;s API, which runs the Claude model
        that writes them. That means the text you enter leaves our servers and is
        processed by Anthropic in order to produce your reading. It is sent for
        that purpose and no other.
      </P>

      <H2>Where your data lives</H2>
      <P>
        Everything is stored in Supabase, our database provider. Your account is
        anonymous: it is a session held in your browser, not a name or a password.
        You can only read your own rows, and the database enforces that rather
        than trusting the app to.
      </P>

      <H2>Ledger entries cannot be edited or deleted individually</H2>
      <P>
        This one is deliberate. Once you record what happened, that entry is fixed.
        You cannot rewrite it later, and you cannot remove a single day you would
        rather not have on the record. A Ledger you can edit is not evidence. Days
        you miss stay visible as empty rows for the same reason.
      </P>
      <P>
        You can always delete everything. What you cannot do is keep the parts you
        like.
      </P>

      <H2>Deleting your data</H2>
      <P>
        Go to <a href="/delete" style={{ color: '#000000' }}>/delete</a>. It removes
        your Blueprint, every Ledger entry, your email address, and the account
        itself. It is immediate and permanent, and we cannot restore it afterwards.
      </P>
      <P>
        Because your account lives in your browser, delete from the browser you
        used to create it.
      </P>

      <H2>Getting in touch</H2>
      <P>
        Questions about any of this can go to{' '}
        <a href="mailto:hello@sovrn.app" style={{ color: '#000000' }}>hello@sovrn.app</a>.
      </P>
    </PaperPage>
  );
}
