import type { QuizData } from '../types';
import { calculateBirthChart, formatChartForPrompt } from './chart';

interface GenerateCallbacks {
  onDone: (fullText: string) => void;
  onError: (err: Error) => void;
}

/**
 * Generate the blueprint and hand it back whole.
 *
 * The prompt lives in api/generate.ts and nowhere else. There used to be a second
 * copy here for a browser-side API-key path; it had drifted to the old four-section
 * prompt, so anyone with a key in localStorage would have received a reading the
 * reveal cannot parse. One prompt, one place.
 */
export async function generateBlueprint(
  data: QuizData,
  callbacks: GenerateCallbacks
): Promise<void> {
  let chartData = '';
  try {
    const chart = await calculateBirthChart(
      data.birthDate,
      data.birthTime || 'Unknown',
      data.birthPlace
    );
    chartData = formatChartForPrompt(chart);
  } catch (err) {
    console.warn('Chart calculation failed:', err);
    chartData = [
      `=== CHART CALCULATION FAILED ===`,
      `Raw birth data only (NO calculated chart available):`,
      `- Date: ${data.birthDate}`,
      `- Time: ${data.birthTime || 'Unknown'}`,
      `- Location: ${data.birthPlace}`,
      ``,
      `IMPORTANT: You do NOT have calculated planetary positions, houses, or angles.`,
      `DO NOT fabricate or guess any chart placements.`,
      `DO NOT assign houses. DO NOT claim an Ascendant, MC, or Rising sign.`,
      `You may ONLY reference the person's Sun sign based on their birth date.`,
      `For all sections requiring chart placements, use depth psychology and the person's stated inputs only.`,
    ].join('\n');
  }

  let res: Response;
  try {
    res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, chartData }),
    });
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error('Failed to fetch'));
    return;
  }

  let payload: { text?: string; error?: string };
  try {
    payload = await res.json();
  } catch {
    callbacks.onError(new Error(`Server error: ${res.status}`));
    return;
  }

  if (!res.ok || payload.error) {
    callbacks.onError(new Error(payload.error ?? `Server error: ${res.status}`));
    return;
  }

  if (!payload.text) {
    callbacks.onError(new Error('Empty response'));
    return;
  }

  callbacks.onDone(payload.text);
}
