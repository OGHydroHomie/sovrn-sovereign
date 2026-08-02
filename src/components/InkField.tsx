/**
 * InkField — the drifting ink-wisp atmosphere behind every page.
 * Pure CSS: large asymmetric blurred shapes on long horizontal loops,
 * pinned below all content (z-index: -1) over a white ground.
 */
export default function InkField() {
  return (
    <div className="ink-field" aria-hidden="true">
      <div className="ink-wisp ink-wisp--1" />
      <div className="ink-wisp ink-wisp--2" />
      <div className="ink-wisp ink-wisp--3" />
      <div className="ink-wisp ink-wisp--4" />
    </div>
  );
}
