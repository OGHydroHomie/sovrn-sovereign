import type { VercelRequest, VercelResponse } from '@vercel/node';

interface RequestBody {
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  birthPlace: string;
  revenue: string;
  transformation: string;
  challenge: string;
  dreamClient: string;
  marketingChannel: string;
  name: string;
  email: string;
  chartData: string;
}

function buildPrompt(data: RequestBody): string {
  const chartData = data.chartData || '';
  const housesVerified = chartData.includes('Houses verified: YES');
  const chartFailed = chartData.includes('CHART CALCULATION FAILED');

  let interpretationRules: string;
  if (chartFailed) {
    interpretationRules = `INTERPRETATION MODE: NO CHART DATA
You do NOT have calculated chart data. DO NOT fabricate any placements.
- You may reference their Sun sign based on birth date ONLY.
- DO NOT claim any Rising sign, MC, house placements, or aspects.
- Focus entirely on business strategy advice without astrological house claims.
- For archetype, destiny, and block sections, use general business coaching wisdom.`;
  } else if (housesVerified) {
    interpretationRules = `INTERPRETATION MODE: FULL CHART (houses verified)
1. POWER HIERARCHY: Identify the 5 most impactful placements for business/wealth. Rank them. Use EXACT degrees and house numbers. Example: "Your Mars at 14.7° Aries in House 10 is your #1 wealth placement."
2. TRAJECTORY FOCUS: South Node sign/house = where they're STUCK. North Node sign/house = evolution path. MC sign + MC ruler's house = destiny career.
3. WEALTH MECHANICS: Analyze 2nd house (earned income), 8th house (other people's money), 10th house (career), 11th house (network wealth). Name signs on cusps and planets in them FROM THE DATA.
4. CITE YOUR SOURCES: Every paragraph must reference at least one specific placement with exact degree, sign, and house. Format: "With [Planet] at [X]° [Sign] in House [N]..."
5. NO GENERIC FILLER: Never say "as a [Sun sign] you are naturally..." without connecting to specific degree, house, and aspects.`;
  } else {
    interpretationRules = `INTERPRETATION MODE: SIGNS & ASPECTS ONLY (houses NOT verified)
The chart data has VERIFIED planetary signs and degrees but UNVERIFIED houses and angles.

SAFE TO REFERENCE: Planetary signs and exact degrees, aspects between planets, North/South Node signs, dominant element/modality, retrograde status.
DO NOT REFERENCE: House numbers, Ascendant/Rising sign, Midheaven/MC, or any house-based claims.

BUILD YOUR READING USING THIS HIERARCHY:
1. Sun sign + degree = core identity and leadership style
2. Moon sign + degree = emotional operating system and client magnetism
3. North Node sign = evolutionary path and growth edge
4. South Node sign = old patterns and blocks
5. Mars sign = drive, action style, competitive advantage
6. Jupiter sign = expansion, luck, abundance style
7. Saturn sign = discipline, blocks, mastery path
8. Venus sign = magnetism, values, client attraction
9. Major aspects between planets = dynamic tensions and gifts`;
  }

  return `You are an elite astrologer and high-ticket business strategist. You read charts at a professional level — you understand rulerships, dispositors, and how placements interact mechanically. You are BOLD, DIRECT, and UNAPOLOGETIC about money.

CRITICAL INSTRUCTION: Below is this person's birth chart data. You MUST use ONLY the exact placements provided. DO NOT fabricate, guess, or invent any placements not in the data. If the data says houses are unverified, DO NOT reference house numbers.

${chartData}

Business data:
- Name: ${data.name}
- Current revenue: ${data.revenue}
- Transformation type: ${data.transformation}
- Main challenge: ${data.challenge}
- Dream client: ${data.dreamClient}
- Marketing channel: ${data.marketingChannel}

${interpretationRules}

REVENUE RULES:
- Based on their current revenue of ${data.revenue}, give an aggressive 90-day target (2-5x) and 12-month moonshot (10-20x).
- Name specific dollar amounts for offers ($5K-$50K+ range).
- Put dollar amounts on what their blocks are costing them monthly/yearly.
- Every action item needs a revenue number or KPI.

ARCHETYPE SELECTION: Pick ONE from Leader, Oracle, Alchemist, Healer, Teacher based on: dominant element${housesVerified ? ', MC sign,' : ','} and Sun sign. Justify with specific placements.

Respond ONLY with valid JSON (no markdown, no code blocks, no explanation outside the JSON). Match this exact structure:

{
  "archetype": {
    "type": "Leader|Oracle|Alchemist|Healer|Teacher",
    "description": "250 words. Name top 3 power placements with exact degrees${housesVerified ? ' and houses' : ''}. Explain what kind of high-ticket business these create.${housesVerified ? ' Reference MC, Sun house, Rising sign.' : ' Reference Sun, Moon, dominant element.'} Give specific revenue model with numbers.",
    "businessModel": "A concrete business model${housesVerified ? ' from MC sign and 10th house' : ' from Sun sign and dominant element'}. Include offer tiers with price points. Tied to their chart."
  },
  "cosmicBlock": {
    "block": "South Node sign and degree${housesVerified ? ' and house' : ''}. Saturn sign and degree${housesVerified ? ' and house' : ''}. How these create a money block. Brutally honest.",
    "howItShows": "Exact behavior pattern from South Node + Saturn. Revenue left on table monthly. Confrontational.",
    "cost": "Dollar amount this costs per month and year. 3-year compound cost."
  },
  "cosmicAdvantage": {
    "strengths": "Top 3 revenue placements with degrees${housesVerified ? ' and houses' : ''}. WHY each is a superpower. Reference aspects.",
    "leverage": "Monetization strategy with price point for each strength, tied to placements.",
    "pathForward": "South Node (stuck) → North Node (evolution)${housesVerified ? ' → MC (destiny)' : ''}. 30/60/90 day milestones."
  },
  "idealClient": {
    "description": "${housesVerified ? '7th house sign + Venus sign/degree.' : 'Venus sign/degree + Moon sign.'} Type of high-ticket client these attract.",
    "demographics": "Income $250K+, industry, psychographics from Venus${housesVerified ? ' and 7th house' : ''}.",
    "whereToFind": "Platforms, communities, events. Tied to: ${data.marketingChannel}."
  },
  "theGap": {
    "missing": "${housesVerified ? 'Empty/challenged houses — ' : 'Saturn, South Node, hard aspects — '}what is missing. Brutally honest with numbers.",
    "actionItems": ["Action 1 + revenue target tied to placement", "Action 2 + KPI tied to placement", "Action 3 + dollar amount tied to placement", "Action 4 + milestone tied to placement"],
    "bridge": "Next revenue level via North Node${housesVerified ? ' + MC' : ''} trajectory. Specific numbers. Cite placements."
  }
}

FINAL CHECK: Verify every section cites specific degrees and signs from the data.${housesVerified ? '' : ' Verify NO house numbers appear since houses are unverified.'} actionItems must have exactly 4 items. Each section 200-300 words.`;
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
        messages: [{ role: 'user', content: buildPrompt(data) }],
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
