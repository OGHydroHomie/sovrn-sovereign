import type { QuizData } from '../types';
import { calculateBirthChart, formatChartForPrompt } from './chart';

interface StreamCallbacks {
  onFirstChunk: () => void;
  onChunk: (text: string) => void;
  onDone: (fullText: string) => void;
  onError: (err: Error) => void;
}

export async function generateBlueprint(
  data: QuizData,
  callbacks: StreamCallbacks,
  apiKey?: string
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

  if (!apiKey) {
    return streamViaProxy(data, chartData, callbacks);
  }

  return streamViaSdk(data, chartData, callbacks, apiKey);
}

async function streamViaProxy(
  data: QuizData,
  chartData: string,
  callbacks: StreamCallbacks
): Promise<void> {
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

  if (!res.ok) {
    const errText = await res.text().catch(() => `Server error: ${res.status}`);
    let message = errText;
    try { message = JSON.parse(errText).error ?? errText; } catch { /* plain text */ }
    callbacks.onError(new Error(message));
    return;
  }

  if (!res.body) {
    callbacks.onError(new Error('No response body'));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let firstChunkFired = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();

        if (raw === '[DONE]') {
          callbacks.onDone(fullText);
          return;
        }

        try {
          const parsed = JSON.parse(raw);
          if (parsed.error) {
            callbacks.onError(new Error(parsed.error));
            return;
          }
          if (typeof parsed.text === 'string') {
            if (!firstChunkFired) {
              firstChunkFired = true;
              callbacks.onFirstChunk();
            }
            fullText += parsed.text;
            callbacks.onChunk(parsed.text);
          }
        } catch {
          // skip malformed lines
        }
      }
    }
    callbacks.onDone(fullText);
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error('Stream read error'));
  }
}

async function streamViaSdk(
  data: QuizData,
  chartData: string,
  callbacks: StreamCallbacks,
  apiKey: string
): Promise<void> {
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

    let fullText = '';
    let firstChunkFired = false;

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: buildSystemPrompt(chartData),
      messages: [{ role: 'user', content: buildUserMessage(data, chartData) }],
    });

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        const text = chunk.delta.text;
        if (!firstChunkFired) {
          firstChunkFired = true;
          callbacks.onFirstChunk();
        }
        fullText += text;
        callbacks.onChunk(text);
      }
    }

    callbacks.onDone(fullText);
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error('SDK stream error'));
  }
}

function buildSystemPrompt(chartData: string): string {
  const housesVerified = chartData.includes('Houses verified: YES');
  const chartFailed = chartData.includes('CHART CALCULATION FAILED');

  let chartRules: string;
  if (chartFailed) {
    chartRules = `CHART STATUS: NO CHART DATA AVAILABLE.
You do NOT have calculated chart data. DO NOT fabricate any placements.
- You may reference their Sun sign based on birth date ONLY.
- DO NOT claim any Rising sign, MC, house placements, or aspects.
- Ground your reading in their personal data (fear, desired reality, repeating pattern) and Jungian depth psychology.`;
  } else if (housesVerified) {
    chartRules = `CHART STATUS: FULL CHART — houses and angles verified.
You have verified planetary positions, houses, angles, and aspects.
- Use EXACT degrees, signs, AND house numbers throughout.
- Reference Ascendant, MC, and house placements with confidence.
- Format: "Your Mars at 14.7° Aries in House 10..."
- Every paragraph must cite at least one specific placement with exact degree, sign, and house.`;
  } else {
    chartRules = `CHART STATUS: SIGNS & ASPECTS ONLY — houses NOT verified.
Planetary signs and degrees are accurate. Houses and angles are approximate.

SAFE TO REFERENCE: Planetary signs and exact degrees, aspects between planets, North/South Node signs, dominant element/modality, retrograde status.
DO NOT REFERENCE: House numbers, Ascendant/Rising sign (marked approximate), Midheaven/MC (marked approximate).

For the Rising archetype: acknowledge that the Rising sign is approximate and frame it as a possibility rather than a certainty.`;
  }

  return `You are the Sovereign Wisdom Oracle — a synthesis of Hermetic philosophy, Jungian depth psychology, astrology as lived architecture, Kabbalistic wisdom, and ancestral healing traditions. You do not speak in generalities. You extract the hidden architecture from someone's natal chart and personal data, then deliver it as direct, personalized spiritual intelligence.

You are BOLD. You are PRECISE. You name what others are afraid to name. You speak to the person as an equal who is mid-initiation, not a student who needs hand-holding. Every statement must reference specific chart placements with exact degrees and signs.

CRITICAL: Use ONLY the chart data provided. Never fabricate placements. If a placement is not in the data, do not reference it.

${chartRules}

ARCHETYPE NAMING: Do NOT use generic sign names as archetypes. Create evocative, original archetype titles that capture the essence of the placement — titles like "The Pioneer," "The Sovereign Flame," "The Emissary," "The Initiator," "The Mirror Walker," "The Storm Keeper," "The Threshold Guardian." Each name should feel like a title of power, not an astrology textbook label.

MAPPING RULES:
- Map the person's stated FEAR to South Node + Saturn + 12th house placements (if available). Show how the chart encodes their specific fear pattern.
- Map the person's stated DESIRED REALITY to North Node + MC + Jupiter placements. Show how their desired future aligns (or conflicts) with their chart's trajectory.
- Map the person's stated REPEATING PATTERN to South Node + hard aspects (squares, oppositions) + retrograde planets. Decode the astrological mechanism behind the loop.

QUOTE RULES:
- The core quote in Soul Architecture must be a single devastating line of recognition — the kind of sentence that makes someone stop breathing for a moment because they feel SEEN.
- The key quote in Shadow Pattern must boldly NAME their specific pattern — not a generic observation, but a precise naming of their loop. It should sting with accuracy.
- The declaration in First Sovereign Act must be a first-person sovereign statement they speak aloud — a reclamation, not an affirmation.

FIRST SOVEREIGN ACT: Must be hyper-specific and time-bound (within 24 hours). Not "journal about your feelings" — a concrete, bold, uncomfortable action that breaks the pattern identified in the shadow section.

Write the blueprint as flowing prose with clear section headers. Use these exact headers on their own line:

SOUL ARCHITECTURE
SHADOW PATTERN
TRUE NORTH
FIRST SOVEREIGN ACT

Write naturally and powerfully. No JSON. No markdown code blocks. Every statement must reference specific chart placements. After each main section header, write the content as continuous prose paragraphs. Use a blank line between paragraphs. For the core quote, shadow quote, and sovereign declaration, set them on their own line surrounded by em-dashes or quotation marks so they stand out visually.`;
}

function buildUserMessage(data: QuizData, chartData: string): string {
  return `=== NATAL CHART DATA ===
${chartData}

=== PERSONAL DATA ===
Name: ${data.name}

Deepest Fear (their words):
"${data.deepestFear}"

Desired Reality (their words):
"${data.desiredReality}"

Repeating Pattern (their words):
"${data.repeatingPattern}"

=== RESPONSE FORMAT ===
Write the complete Sovereign Blueprint as flowing prose using the four section headers exactly as specified. Begin with SOUL ARCHITECTURE and cover: the Sun archetype (name, sign, degree, full description), the Rising archetype (name, sign, degree, description), the North Node archetype (name, sign, degree, description), the Sovereign Flame synthesis, and a core quote on its own line. Then SHADOW PATTERN covering the pattern decode, root cause, and a key quote on its own line. Then TRUE NORTH covering direction, alignment, and destiny. Then FIRST SOVEREIGN ACT covering the specific instruction, why this act, and the sovereign declaration on its own line. Write in second person, directly to ${data.name}.`;
}
