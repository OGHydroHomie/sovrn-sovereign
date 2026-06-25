import type { VercelRequest, VercelResponse } from '@vercel/node';

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
- For soulArchitecture, use Sun sign for sunArchetype. For risingArchetype and northNodeArchetype, state clearly that birth time is needed for accuracy but offer archetypal insight based on their stated inputs.
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

For risingArchetype: acknowledge that the Rising sign is approximate and frame it as a possibility rather than a certainty.`;
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
- The coreQuote in soulArchitecture must be a single devastating line of recognition — the kind of sentence that makes someone stop breathing for a moment because they feel SEEN. It should synthesize their entire architecture into one truth. Example tone: "You are not a man trying to find his purpose. You are a purpose that took the form of a man."
- The keyQuote in shadowPattern must boldly NAME their specific pattern — not a generic observation, but a precise naming of their loop. It should sting with accuracy.
- The declaration in firstSovereignAct must be a first-person sovereign statement they speak aloud — a reclamation, not an affirmation. Example tone: "I am no longer available for the version of my life where I dim my fire to keep others warm."

FIRST SOVEREIGN ACT: Must be hyper-specific and time-bound (within 24 hours). Not "journal about your feelings" — a concrete, bold, uncomfortable action that breaks the pattern identified in shadowPattern. Name the exact action, the exact context, and the exact words if applicable.

Respond ONLY with valid JSON (no markdown, no code blocks, no explanation outside the JSON).`;
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
Return valid JSON matching this exact structure:

{
  "soulArchitecture": {
    "sunArchetype": {
      "name": "An evocative archetype title (not the sign name)",
      "sign": "The Sun sign from chart data",
      "degree": "Exact degree from chart data, e.g. 24.3°",
      "description": "150-200 words. Decode this Sun placement as their core identity architecture. Reference exact degree and sign. Connect to their stated desired reality. Bold, precise, personal."
    },
    "risingArchetype": {
      "name": "An evocative archetype title",
      "sign": "The Rising/Ascendant sign from chart data",
      "degree": "Exact degree from chart data",
      "description": "150-200 words. Decode the Rising sign as the mask they wear and the first energy others encounter. Reference exact degree. Connect to how they show up in the world vs. who they are underneath."
    },
    "northNodeArchetype": {
      "name": "An evocative archetype title",
      "sign": "The North Node sign from chart data",
      "degree": "Exact degree from chart data",
      "description": "150-200 words. Decode the North Node as their evolutionary direction — the soul curriculum they enrolled in. Reference exact degree. Connect to their stated desired reality."
    },
    "sovereignFlame": "200 words. The synthesis — what happens when Sun + Rising + North Node activate together. Their unique gift to the world, stated as fact, not potential. Name the specific quality that no one else on earth carries in exactly this configuration.",
    "coreQuote": "One devastating line of recognition. Not an affirmation. A truth."
  },
  "shadowPattern": {
    "pattern": "200-250 words. Decode their specific shadow/block through South Node sign + degree + Saturn sign + degree + any hard aspects to these points. Weave in their stated fear and repeating pattern. Name the exact mechanism: what triggers it, how it operates, what it protects them from. Be surgical.",
    "rootCause": "150 words. Where this pattern originates in the chart. Name the specific placements and aspects that created this loop. Connect to their stated fear — show them that the fear is not random, it is architecturally encoded.",
    "keyQuote": "One bold line that names their specific pattern with precision. Should sting with accuracy."
  },
  "trueNorth": {
    "direction": "200-250 words. North Node decoded as their evolutionary path. Synthesize with their stated desired reality. Show them the specific trajectory their chart is pulling them toward. Name the exact qualities they must develop (from North Node sign) and the exact qualities they must release (from South Node sign).",
    "alignment": "150 words. How their stated desired reality aligns with (or conflicts with) their chart's trajectory. If it aligns, name exactly how. If it conflicts, name the specific tension and what adjustment would bring alignment.",
    "destiny": "100 words. The MC/career destiny decoded. What they are here to build, create, or become in the world. State it as inevitable, not aspirational."
  },
  "firstSovereignAct": {
    "instruction": "100 words. ONE specific action to take within 24 hours. Hyper-specific: name the exact action, context, and words if applicable. This action must directly break the pattern identified in shadowPattern.",
    "reason": "100 words. Why THIS specific action based on their chart — which placement it activates, which pattern it interrupts, what it signals to their nervous system.",
    "declaration": "One sentence. A first-person sovereign declaration they speak aloud. A reclamation, not an affirmation."
  }
}`;
}

export const config = {
  maxDuration: 60,
};

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

  try {
    const data: RequestBody = req.body;

    if (!data.birthDate || !data.name || !data.email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const chartData = data.chartData || '';

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        system: buildSystemPrompt(chartData),
        messages: [{ role: 'user', content: buildUserMessage(data) }],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      console.error('Anthropic API error:', anthropicRes.status, errBody);
      return res.status(502).json({ error: `Anthropic API error: ${anthropicRes.status} - ${errBody}` });
    }

    const message = await anthropicRes.json();
    const content = message.content?.[0];

    if (!content || content.type !== 'text') {
      return res.status(500).json({ error: 'Unexpected response type from Anthropic' });
    }

    let jsonText = content.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    const blueprint = JSON.parse(jsonText);
    return res.status(200).json(blueprint);
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : 'Internal server error';
    console.error('Blueprint generation failed:', err);
    return res.status(500).json({ error: errMessage });
  }
}
