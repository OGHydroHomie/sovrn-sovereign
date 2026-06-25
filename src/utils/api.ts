import type { QuizData, BlueprintResult } from '../types';
import { calculateBirthChart, formatChartForPrompt } from './chart';

export async function generateBlueprint(
  data: QuizData,
  apiKey?: string
): Promise<BlueprintResult> {
  // Calculate birth chart client-side (browser has no geocoding restrictions)
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
    // EXPLICIT: tell Claude this is NOT a calculated chart — do NOT invent houses
    chartData = [
      `=== CHART CALCULATION FAILED ===`,
      `Raw birth data only (NO calculated chart available):`,
      `- Date: ${data.birthDate}`,
      `- Time: ${data.birthTime || 'Unknown'}`,
      `- Location: ${data.birthPlace}`,
      ``,
      `⚠ IMPORTANT: You do NOT have calculated planetary positions, houses, or angles.`,
      `⚠ DO NOT fabricate or guess any chart placements.`,
      `⚠ DO NOT assign houses. DO NOT claim an Ascendant, MC, or Rising sign.`,
      `⚠ You may ONLY reference the person's Sun sign based on their birth date.`,
      `⚠ For all other sections, give business strategy advice WITHOUT astrological house claims.`,
    ].join('\n');
  }

  if (!apiKey) {
    return generateViaProxy(data, chartData);
  }

  // Local dev fallback: direct browser call
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 6000,
    messages: [{ role: 'user', content: buildPrompt(data, chartData) }],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  return parseResponse(content.text);
}

async function generateViaProxy(data: QuizData, chartData: string): Promise<BlueprintResult> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, chartData }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Server error: ${res.status}`);
  }

  return res.json();
}

function parseResponse(text: string): BlueprintResult {
  let jsonText = text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(jsonText);
}

function buildPrompt(data: QuizData, chartData: string): string {
  const housesVerified = chartData.includes('Houses verified: YES');
  const chartFailed = chartData.includes('CHART CALCULATION FAILED');

  // Determine which interpretation mode to use
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
2. TRAJECTORY FOCUS: South Node sign/house = where they're STUCK. North Node sign/house = evolution path. MC sign + MC ruler's house = destiny career. Map this explicitly.
3. WEALTH MECHANICS: Analyze 2nd house (earned income), 8th house (other people's money), 10th house (career), 11th house (network wealth). Name signs on cusps and planets in them FROM THE DATA.
4. CITE YOUR SOURCES: Every paragraph must reference at least one specific placement with exact degree, sign, and house. Format: "With [Planet] at [X]° [Sign] in House [N]..."
5. NO GENERIC FILLER: Never say "as a [Sun sign] you are naturally..." without connecting to specific degree, house, and aspects.`;
  } else {
    interpretationRules = `INTERPRETATION MODE: SIGNS & ASPECTS ONLY (houses NOT verified)
The chart data below has VERIFIED planetary signs and degrees but UNVERIFIED houses and angles.

SAFE TO REFERENCE (these are astronomically accurate):
- Planetary signs and exact degrees (e.g., "Your Sun at 12.3° Aries")
- Aspects between planets (e.g., "Sun trine Jupiter")
- North Node and South Node signs and degrees
- Dominant element and modality
- Retrograde status

DO NOT REFERENCE (these may be wrong):
- House numbers (e.g., "Sun in House 7" — FORBIDDEN)
- Ascendant / Rising sign (marked approximate — do NOT state confidently)
- Midheaven / MC (marked approximate — do NOT state confidently)
- "2nd house of money" or "10th house of career" — FORBIDDEN without verified houses

BUILD YOUR READING USING THIS HIERARCHY:
1. Sun sign + degree = core identity and leadership style
2. Moon sign + degree = emotional operating system and client magnetism
3. North Node sign = evolutionary path and growth edge
4. South Node sign = old patterns and blocks
5. Mars sign = drive, action style, and competitive advantage
6. Jupiter sign = expansion, luck, and abundance style
7. Saturn sign = discipline, blocks, and mastery path
8. Venus sign = magnetism, values, and client attraction
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

ARCHETYPE SELECTION: Pick ONE from Leader, Oracle, Alchemist, Healer, Teacher based on: dominant element${housesVerified ? ', MC sign,' : ','} and Sun sign. Justify with specific placements from the data.

Respond ONLY with valid JSON (no markdown, no code blocks, no explanation outside the JSON). Match this exact structure:

{
  "archetype": {
    "type": "Leader|Oracle|Alchemist|Healer|Teacher",
    "description": "250 words. Start by naming their top 3 power placements with exact degrees${housesVerified ? ' and houses' : ''}. Explain what kind of high-ticket business these placements create.${housesVerified ? ' Reference MC sign, MC ruler, Sun house, and Rising sign.' : ' Reference Sun sign, Moon sign, and dominant element.'} Give specific revenue model with numbers.",
    "businessModel": "A concrete business model${housesVerified ? ' derived from MC sign and 10th house' : ' derived from Sun sign energy and dominant element'}. Include specific offer tiers with price points. Not generic — tied to their chart."
  },
  "cosmicBlock": {
    "block": "Name their South Node sign and degree${housesVerified ? ' and house' : ''}. Name their Saturn sign and degree${housesVerified ? ' and house' : ''}. Explain how these create a specific money block. Be brutally honest.",
    "howItShows": "The exact behavior pattern this South Node + Saturn creates. Name revenue left on the table monthly. Be confrontational and specific.",
    "cost": "A specific dollar amount this block costs per month and year based on current revenue. Show 3-year compound cost."
  },
  "cosmicAdvantage": {
    "strengths": "Top 3 revenue-generating placements with exact degrees${housesVerified ? ' and houses' : ''}. WHY each is a money superpower. Reference aspects between these planets.",
    "leverage": "For each strength, a specific monetization strategy with price point tied to the planetary placement.",
    "pathForward": "North Node trajectory: South Node sign (stuck) → North Node sign (evolution)${housesVerified ? ' → MC sign (destiny)' : ''}. Include 30/60/90 day revenue milestones."
  },
  "idealClient": {
    "description": "${housesVerified ? 'Based on 7th house sign (name it), Venus sign/degree (name it). ' : 'Based on Venus sign/degree (name it) and Moon sign. '}Describe the specific type of high-ticket client these placements attract.",
    "demographics": "Income level ($250K+), industry, psychographics. Derived from Venus placement${housesVerified ? ' and 7th house sign' : ''}.",
    "whereToFind": "Specific platforms, communities, events. Tie to their marketing channel: ${data.marketingChannel}."
  },
  "theGap": {
    "missing": "${housesVerified ? 'Based on empty or challenged houses, ' : 'Based on Saturn placement, South Node, and hard aspects, '}what is missing to hit next revenue milestone. Be brutally honest with numbers.",
    "actionItems": ["Action 1 with revenue target tied to a chart placement", "Action 2 with KPI tied to a chart placement", "Action 3 with dollar amount tied to a chart placement", "Action 4 with revenue milestone tied to a chart placement"],
    "bridge": "Their next revenue level using North Node${housesVerified ? ' + MC' : ''} trajectory. Be specific — '$50K months', '$500K year'. Show chart makes this inevitable, citing exact placements."
  }
}

FINAL CHECK: Verify every section cites specific degrees and signs from the chart data.${housesVerified ? '' : ' Verify NO house numbers are referenced since houses are unverified.'} The actionItems array must have exactly 4 items. Each section should be 200-300 words.`;
}
