# SOVRN — Design System (Obsidian Oracle)

## Visual Narrative
The user journey moves from DARKNESS to LIGHT. Screens 1-3 
(landing, quiz, loading) are dark — representing the unknown, 
the descent into self. Screen 4 (blueprint results) transitions 
to warm white — the emergence, the revelation, the truth made 
visible. This transition IS the transformation made visual.

## Dark Screens (1-3: Landing, Quiz, Loading)

Background: #0A0E1A deep midnight blue-black
Surface/cards: glass-morphism
  background: rgba(255, 255, 255, 0.06)
  backdrop-filter: blur(20px) saturate(1.2)
  border: 1px solid rgba(255, 255, 255, 0.12)
  box-shadow: 0 0 40px rgba(232, 176, 75, 0.08)
  border-radius: 16px
Card left borders: 3px solid #E8B04B (gilt gold)
Accent primary: #C21F2C ember red — CTAs and action elements ONLY
Accent secondary: #E8B04B gilt gold — oracle elements, brands, borders
Text primary: #F4F1EA bone white
Text secondary: #A8A29B warm gray
Text muted: #6E6A66
Progress bar track: #2A272B, fill: #C21F2C

## Light Screen (4: Blueprint Results)

Background: #FBFAF7 warm white
Cards: #FFFFFF
  border: 1px solid #E8E6E1
  border-radius: 12px
  box-shadow: 0 2px 8px rgba(0,0,0,0.04)
  padding: 24px
Card left borders: alternating #C21F2C (ember) and #1A1A1A (ink)
Accent: #C21F2C ember red — quotes, highlights, CTA
Text headline: #1A1A1A
Text body: #4A4A4A, 16px, line-height 1.7
Text muted: #9A9A9A, 13px
Dividers: 1px solid #E8E6E1

## Typography

Headlines/display: Fraunces 700-900 (import from Google Fonts)
  - Hero headline: 34px mobile / 48px desktop
  - Section headers: 12px uppercase, tracked 0.08em (Space Grotesk)
  - Core quote: 24px mobile / 28px desktop, italic
  - Archetype names: 28px, Fraunces 800

UI labels/coordinates: Space Grotesk 500-700 (import from Google Fonts)
  - uppercase, letter-spacing 0.08-0.15em
  - Used for: section numbers, progress labels, status text, 
    wordmark, button text

Body: Georgia, serif fallback
  - 16px, line-height 1.6-1.7
  - Used for: all prose, helper text, card body content

Key quotes within blueprint: Fraunces italic, 18px, #C21F2C

## Buttons

Primary CTA:
  background: #C21F2C
  color: white
  font: Space Grotesk 600, 14px, uppercase, tracking 0.08em
  padding: 18px 24px (full width on mobile, max 340px)
  border-radius: 12px
  animation: breathing pulse
    @keyframes pulse {
      0%, 100% { transform: scale(1); 
        box-shadow: 0 0 20px rgba(220,38,38,0.15); }
      50% { transform: scale(1.02); 
        box-shadow: 0 0 30px rgba(220,38,38,0.3); }
    }
    animation: pulse 2.5s ease-in-out infinite

Secondary (outline):
  background: transparent
  border: 1px solid #1A1A1A (dark screens: #F4F1EA)
  color: #1A1A1A (dark screens: #F4F1EA)
  Same font, padding, radius as primary

## Animation

Screen transitions: 300ms ease-out (opacity 0→1 + translateX)
Loading messages: fade in/out over 3.5s cycle
Streaming cursor: 2px wide, 20px tall, #C21F2C, blinks 800ms
  @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0 } }
Ember wave dots (loading): three 6px dots, left-to-right 
  lighting sequence, 280ms per dot, #6E6A66 → #D93A2B with glow
Constellation: 5-7 dots (3px, #E8B04B at 40% opacity) connected 
  by 0.5px lines at 15% opacity, gentle pulse (opacity 0.3-0.5, 
  3s staggered)

## Mobile First
Primary viewport: 375px
All tap targets: minimum 48px
Page padding: 20px horizontal
Max content width: 340px on mobile
Cards: always stack vertically on mobile, never side-by-side
Native pickers: date and time inputs use native mobile pickers
