# SOVRN — Product Specification

## Three Layers

### Layer 1: The Mirror (Free — Sovereign Blueprint)
8-question intake → natal chart calculation → Claude Sonnet 
generates personalized blueprint streaming in real time.

Blueprint sections:
1. Soul Architecture — Sun, Rising, North Node as archetypes 
   with trait pills and elemental balance
2. Hidden Gifts — septiles, quintiles, trines decoded as 
   latent superpowers
3. Shadow Pattern — the wound and limiting belief loop traced 
   to South Node, Saturn, Chiron, and hard aspects, cross-
   referenced with user's stated fear and repeating pattern
4. Relationship Blueprint — Venus, Mars, 7th House decoded: 
   how they love, what they attract, the pattern they repeat
5. Career Destiny — Midheaven, 10th House, Saturn: what they 
   were built to create in the world
6. True North — North Node trajectory mapped against their 
   stated desired reality, alignment score
7. First Sovereign Act — one specific action within 24 hours 
   that interrupts the shadow pattern

### Layer 2: The Daily OS ($15/month)

Morning practice (3 minutes):
1. State Reset — 60-second guided relaxation (Maltz technique: 
   release jaw, drop shoulders, open hands, three breaths)
2. Affirmation Rewrite — logged negative self-talk shown 
   crossed out on LEFT, chart-aligned correction on RIGHT. 
   User taps "I CHOOSE THE SOVEREIGN VERSION" to commit.
   The correction references their specific chart placements.
3. Daily Mission — one action calibrated to their chart + 
   current transits. Specific to THEIR wound pattern.

Evening check-in (2 minutes):
1. "Did your shadow pattern activate today?" YES/NO
2. "Did you complete today's mission?" YES/NO + one sentence
3. "Where did you spend most of today?" SURVIVAL / SOVEREIGN

Weekly briefing:
- AI-generated synthesis of behavioral data correlated with 
  transit data. Shadow activation frequency, mission completion 
  rate, state trends. Gets more accurate each week.

### Layer 3: The Forge ($497-$1,000)
8-week Death Module cohort. 12 people. Four phases:
Death → Space → Rebirth → Ultimate Self.
Weekly live Zoom calls + daily journaling + completion ceremony.

## The 8 Intake Questions

Q1: "What's your first name?" → name (text)
Q2: "What's your date of birth?" → birthDate (date picker)
Q3: "What time were you born?" → birthTime (time picker)
    Helper: "Check your birth certificate if you're not sure."
    Skip link: "I don't know my birth time" → birthTimeUnknown=true
Q4: "Where were you born?" → birthPlace (text + autocomplete)
    Helper: "City and country is enough."

[CHART INSIGHT REVEAL — 4 second auto-advancing screen]
Shows Sun archetype name calculated from birth date.
Archetype mapping:
  Aries = THE PIONEER
  Taurus = THE SOVEREIGN BUILDER
  Gemini = THE ORACLE OF TONGUES
  Cancer = THE GUARDIAN
  Leo = THE SOVEREIGN FLAME
  Virgo = THE ARCHITECT OF ORDER
  Libra = THE EMISSARY
  Scorpio = THE INITIATOR
  Sagittarius = THE TORCH BEARER
  Capricorn = THE ANCIENT AUTHORITY
  Aquarius = THE PATTERN BREAKER
  Pisces = THE MYSTIC CHANNEL

Q5: "What's the one fear you've never said out loud?" → deepestFear
    Helper: "Be specific. Not just 'failure' — what would failure 
    actually look like for you? Who would see it? Why does that 
    terrify you? 2-3 sentences."
Q6: "Describe the life you know you're supposed to be living." 
    → desiredReality
    Helper: "Not goals. Not a vision board. The life that keeps 
    you up at night because you're not living it yet. What does 
    it look like? What does it feel like? Why aren't you there? 
    Be brutally honest."
Q7: "What's the pattern you keep repeating no matter how many 
    times you swear you've broken it?" → repeatingPattern
    Helper: "Don't name it — describe the cycle. What triggers 
    it? What do you do every time? How does it end? And then 
    what happens next?"
Q8: "Where should we send your blueprint?" → email
    Helper: "We'll deliver a copy to your inbox too."
    Button: "GENERATE MY BLUEPRINT"

Progress bar: starts at 12% on Q1. Never starts at 0%.
Q1=12%, Q2=24%, Q3=36%, Q4=48%, reveal=55%, Q5=64%, 
Q6=76%, Q7=88%, Q8=100%

On Q8 submit:
1. Fire Formspree POST (fire and forget) to 
   https://formspree.io/f/xdarebvj with ALL fields
2. Trigger existing chart calculation + Claude API streaming
3. Transition to loading screen

## Tech Stack (reference only — do not modify)
- React + Vite + TypeScript
- Chart engine: astronomy-engine library (chart.ts)
- AI: Claude Sonnet 4.6 via Vercel serverless (SSE streaming)
- Email: Formspree (endpoint: xdarebvj)
- Hosting: Vercel Pro
- Repo: github.com/OGHydroHomie/sovrn-sovereign

## Protected Files (NEVER modify)
- src/utils/chart.ts
- api/generate.ts
- src/utils/api.ts (streaming logic)
