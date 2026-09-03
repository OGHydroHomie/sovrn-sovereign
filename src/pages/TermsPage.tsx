import PaperPage, { H2, P } from '../components/PaperPage';

export default function TermsPage() {
  return (
    <PaperPage title="Terms" standfirst="What SOVRN is, what it is not, and where responsibility sits.">
      <H2>SOVRN is not therapy or medical care</H2>
      <P>
        SOVRN is not therapy. It is not medical care. It is not psychiatric care,
        and it is not a diagnosis of anything. Nothing it tells you is a clinical
        opinion, and no part of it is delivered by a licensed professional.
      </P>
      <P>
        It is not a substitute for professional help. If something in your life
        needs a doctor, a therapist, or another qualified professional, SOVRN is
        not a replacement for seeing one, and it is not a reason to delay.
      </P>

      <H2>SOVRN is not a crisis service</H2>
      <P>
        If you are in crisis or thinking about harming yourself, please contact your
        local emergency number or a crisis line now. SOVRN is not monitored, no one
        reads your entries as you write them, and it cannot respond to an emergency.
      </P>

      <H2>Missions are suggestions</H2>
      <P>
        A mission is a suggestion. It is generated text, offered for you to consider.
        It is not an instruction, not a prescription, and not advice tailored to your
        circumstances by someone who knows them. You decide whether to act on it, and
        you are free to ignore any of it.
      </P>
      <P>
        Missions are checked before you see them and are meant to stay away from
        anything medical, dietary, psychiatric, or substance-related. That check is
        automated, so use your own judgement about anything you are asked to do.
      </P>

      <H2>You are responsible for what you do</H2>
      <P>
        You are responsible for your own actions and their consequences. If you act
        on a mission, that choice is yours. SOVRN is not liable for what follows from
        anything you decide to do.
      </P>

      <H2>What SOVRN actually is</H2>
      <P>
        A reading built from your birth chart and your own answers, and a record of
        the choices you make afterwards. Astrology is an interpretive lens here, not
        proof of anything about your psychology. Take what is useful and leave the
        rest.
      </P>

      <H2>Your data</H2>
      <P>
        What we collect and how to remove it is covered in the{' '}
        <a href="/privacy" style={{ color: '#000000' }}>Privacy</a> page. You can
        delete everything at any time from{' '}
        <a href="/delete" style={{ color: '#000000' }}>/delete</a>.
      </P>
    </PaperPage>
  );
}
