import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  maxDuration: 120,
};

interface RequestBody {
  name: string;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  birthPlace: string;
  deepestFear: string;
  desiredReality: string;
  repeatingPattern: string;
  email: string;
  chartData: string;
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

function buildUserMessage(data: RequestBody): string {
  const chartData = data.chartData || '';
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: missing API key' });
  }

  const data: RequestBody = req.body;
  if (!data.birthDate || !data.name || !data.email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const chartData = data.chartData || '';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Connection', 'keep-alive');

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        stream: true,
        system: buildSystemPrompt(chartData),
        messages: [{ role: 'user', content: buildUserMessage(data) }],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      console.error('Anthropic API error:', anthropicRes.status, errBody);
      res.write(`data: ${JSON.stringify({ error: `Anthropic API error: ${anthropicRes.status}` })}\n\n`);
      return res.end();
    }

    if (!anthropicRes.body) {
      res.write(`data: ${JSON.stringify({ error: 'No response body' })}\n\n`);
      return res.end();
    }

    const reader = anthropicRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;

        try {
          const event = JSON.parse(raw);
          if (
            event.type === 'content_block_delta' &&
            event.delta?.type === 'text_delta' &&
            typeof event.delta.text === 'string'
          ) {
            res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
          }
        } catch {
          // skip malformed SSE lines
        }
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : 'Internal server error';
    console.error('Blueprint generation failed:', err);
    try {
      res.write(`data: ${JSON.stringify({ error: errMessage })}\n\n`);
      res.end();
    } catch {
      res.end();
    }
  }
}
