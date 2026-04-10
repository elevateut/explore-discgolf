# EXPLORE Disc Golf — Brand Guide

## Brand identity

**EXPLORE Disc Golf** is a national program to expand disc golf access on America's public lands through federal partnerships, community-driven course development, environmental stewardship, and policy advocacy. It operates as an independent brand under the legal structure of ElevateUT Disc Golf, a 501(c)(3) nonprofit.

### Name treatment

The brand name is **EXPLORE Disc Golf**.

- **EXPLORE** is always set in all caps. It references both the verb (go explore public lands) and the EXPLORE Act (P.L. 118-234), the federal statute that provides the legal foundation for this work.
- **Disc Golf** is set in title case.
- In running text: **EXPLORE Disc Golf**
- Abbreviated form: **EXPLORE DG** (informal contexts, social media, hashtags)
- Never: "Explore disc golf" (lowercase E), "EXPLORE DISC GOLF" (all caps throughout), "ExploreDiscGolf" (camelCase)

### Tagline

**Primary:** Disc golf on America's public lands.

**Secondary:** Find your land. Build your course.

**Tertiary:** Where the wild things fly.

### Legal attribution

ElevateUT appears only in legal and formal contexts:

- Website footer: "EXPLORE Disc Golf is a program of ElevateUT Disc Golf, a 501(c)(3) nonprofit organization."
- Grant applications and legal documents: "ElevateUT Disc Golf (dba EXPLORE Disc Golf)"
- Tax receipts: "ElevateUT Disc Golf, EIN [number]"
- Press releases: "EXPLORE Disc Golf, a program of ElevateUT Disc Golf"

ElevateUT does **not** appear in the logo, primary navigation, social media handles, or campaign materials.

---

## Color palette

The palette is rooted in the western public lands landscape: burnt earth, sage, desert sky, and sandstone. It intentionally echoes BLM's own visual identity (burnt orange, teal, olive) so that EXPLORE Disc Golf materials feel native to BLM contexts — like they belong on the same table as a Resource Management Plan.

The palette signals "credible public lands advocacy organization" first and "disc golf" second.

### Primary colors

| Role | Name | Hex | Usage |
|------|------|-----|-------|
| **Primary** | Terra Cotta | `#B85C38` | Brand anchor. Buttons, headings, logo mark. Evokes western desert, BLM landscapes, red rock. |
| **Secondary** | Sage | `#5B7F3B` | Conservation, stewardship, success states. Evokes rangeland, healthy ecosystems. |
| **Accent** | Summit Gold | `#D4952B` | Calls to action, highlights, data points. Evokes sunlight, amber, warmth. |

### Neutral colors

| Role | Name | Hex | Usage |
|------|------|-----|-------|
| **Dark** | Night Sky | `#1E2D3B` | Body text, dark backgrounds, authority. Deep blue-slate. |
| **Mid** | Driftwood | `#6B6560` | Secondary text, borders, subtle UI. Warm gray. |
| **Light** | Sandstone | `#F5F0E8` | Page backgrounds, cards. Warm cream — like a field guide page. |
| **White** | Snow | `#FEFDFB` | Clean backgrounds, high contrast areas. Warm white. |

### Extended colors

| Role | Name | Hex | Usage |
|------|------|-----|-------|
| **Info / Links** | Basin Teal | `#1A8BA3` | Interactive elements, links, map UI. Nods to BLM's teal. |
| **Warning** | Amber | `#E8A93E` | Deadlines, time-sensitive callouts. |
| **Error** | Signal Red | `#C4422B` | Errors, critical alerts. Muted, not aggressive. |
| **Success** | Trail Green | `#3D8B37` | Completed status, positive outcomes. |

### DaisyUI theme definition

```javascript
// tailwind.config.mjs
daisyui: {
  themes: [
    {
      explore: {
        "primary": "#B85C38",          // Terra Cotta
        "primary-content": "#FEFDFB",  // Snow (text on primary)
        "secondary": "#5B7F3B",        // Sage
        "secondary-content": "#FEFDFB",
        "accent": "#D4952B",           // Summit Gold
        "accent-content": "#1E2D3B",   // Night Sky
        "neutral": "#1E2D3B",          // Night Sky
        "neutral-content": "#F5F0E8",  // Sandstone
        "base-100": "#FEFDFB",         // Snow
        "base-200": "#F5F0E8",         // Sandstone
        "base-300": "#EBE5DA",         // Darker sandstone
        "base-content": "#1E2D3B",     // Night Sky
        "info": "#1A8BA3",             // Basin Teal
        "info-content": "#FEFDFB",
        "success": "#3D8B37",          // Trail Green
        "success-content": "#FEFDFB",
        "warning": "#E8A93E",          // Amber
        "warning-content": "#1E2D3B",
        "error": "#C4422B",            // Signal Red
        "error-content": "#FEFDFB",
      },
    },
  ],
}
```

### Color usage rules

- **Never use more than 3 colors on a single page element.** Terra Cotta + Night Sky + Sandstone is the workhorse combination.
- **Terra Cotta is the brand.** If only one color can be used (favicon, single-color logo), it's Terra Cotta.
- **Sage signals stewardship.** Use it for environmental content, maintenance pledges, Leave No Trace messaging.
- **Summit Gold signals action.** Use it for CTAs, deadlines, calls to comment, "act now" moments.
- **Basin Teal is for interaction.** Links, map elements, clickable UI. It connects to BLM's digital presence.
- **Sandstone backgrounds feel like a field guide.** White backgrounds feel like a tech app. Default to Sandstone.

### Contrast and accessibility

All primary text meets WCAG 2.1 AA contrast requirements:
- Night Sky (#1E2D3B) on Sandstone (#F5F0E8): ratio 9.8:1 (AAA)
- Night Sky (#1E2D3B) on Snow (#FEFDFB): ratio 12.1:1 (AAA)
- Snow (#FEFDFB) on Terra Cotta (#B85C38): ratio 4.6:1 (AA)
- Snow (#FEFDFB) on Sage (#5B7F3B): ratio 4.5:1 (AA)
- Snow (#FEFDFB) on Night Sky (#1E2D3B): ratio 12.1:1 (AAA)

---

## Typography

### Typeface selection

| Role | Typeface | Weight(s) | Fallback |
|------|----------|-----------|----------|
| **Headings** | **Plus Jakarta Sans** | 700 (Bold), 800 (ExtraBold) | system-ui, sans-serif |
| **Body** | **Inter** | 400 (Regular), 500 (Medium), 600 (SemiBold) | system-ui, sans-serif |
| **Monospace / Data** | **JetBrains Mono** | 400 | ui-monospace, monospace |

**Why these faces:**
- **Plus Jakarta Sans** has geometric confidence without being cold. It reads as modern and authoritative — suitable for headings that need to command attention in a BLM office or on a legislator's desk.
- **Inter** is the most readable screen font available, designed specifically for UI. It's already a standard in open source projects.
- Both are open source (SIL Open Font License), free to use, and available via Google Fonts or self-hosted.

### Type scale

| Element | Size | Weight | Line height | Tracking |
|---------|------|--------|-------------|----------|
| H1 (page title) | 2.5rem / 40px | ExtraBold 800 | 1.1 | -0.02em |
| H2 (section) | 1.875rem / 30px | Bold 700 | 1.2 | -0.01em |
| H3 (subsection) | 1.5rem / 24px | Bold 700 | 1.3 | 0 |
| H4 (card title) | 1.25rem / 20px | SemiBold 600 | 1.4 | 0 |
| Body | 1rem / 16px | Regular 400 | 1.6 | 0 |
| Body (emphasis) | 1rem / 16px | Medium 500 | 1.6 | 0 |
| Small / Caption | 0.875rem / 14px | Regular 400 | 1.5 | 0.01em |
| Overline / Label | 0.75rem / 12px | SemiBold 600 | 1.4 | 0.08em |

### Special treatments

- **EXPLORE** in the brand name: Plus Jakarta Sans, ExtraBold 800, all caps, letter-spacing 0.05em
- **Section numbers** (in legislative references like "Section 341"): JetBrains Mono, Regular 400
- **Pull quotes and statistics**: Plus Jakarta Sans, Bold 700, oversized (2x-3x body)
- **"Where the wild things fly."**: Plus Jakarta Sans, ExtraBold 800. The tagline gets the hero treatment.

---

## Logo

### The wordmark

The EXPLORE Disc Golf logo is a **wordmark with an integrated landscape silhouette**. "EXPLORE" is set in bold uppercase with a continuous American landscape flowing through the letterforms — transitioning left to right from desert cactus and buttes, through canyon walls, to a lone savanna tree, through an evergreen forest, to mountain peaks. "Disc Golf" sits below in clean rounded type.

The landscape tells the story of America's diverse public lands in a single mark. It says "this is a national program" — not limited to one region or terrain type.

### Logo files

All logo files are in `/brand/final/` as transparent PNGs:

| File | Description | Usage |
|------|-------------|-------|
| `explore-disc-golf-dark.png` | Night Sky (#1E2D3B) on transparent | Primary — light backgrounds, documents, web |
| `explore-disc-golf-white.png` | White on transparent | Dark backgrounds, photography overlays, merch |
| `explore-disc-golf-terracotta.png` | Terra Cotta (#B85C38) on transparent | Accent usage, single-brand-color contexts |
| `explore-disc-golf-logo-transparent.png` | Full-size Night Sky on transparent | Source file for further production |

### Color variants

- **Night Sky (dark)** — default for Sandstone and light backgrounds
- **White** — for Night Sky, Terra Cotta, and photographic backgrounds
- **Terra Cotta** — for single-brand-color applications

Never recolor the logo outside these three approved variants.

### Style characteristics

- **Single-color capable.** Each variant is a single flat color with transparency.
- **Diverse landscape narrative.** The terrain transitions (desert → canyon → savanna → forest → mountains) represent the breadth of BLM lands nationwide.
- **Inspired by:** National Park Service passport stamps, USGS topographic symbols, trail markers. NOT inspired by: disc golf manufacturer logos (too sporty), tech startups (too clean), government seals (too formal).
- **Sense of scale.** The logo represents 245 million acres, not a local league.

### Minimum sizes

- Full logo: 120px width minimum
- Favicon: Use a simplified version (the "E" with landscape cut, or a standalone landscape element)

### Logo usage rules

- Minimum clear space: equal to the height of the "E" in EXPLORE on all sides
- Never stretch, rotate, skew, or add effects (drop shadows, glows, outlines)
- Never recolor outside the three approved variants
- On photographs: use white version only, never on busy backgrounds without a solid backing or scrim
- On dark backgrounds: use white version only
- On brand-color backgrounds: use white version

---

## Photography and imagery

### Direction

Photography should show **disc golf in spectacular public lands settings** — not manicured parks. The goal is to claim the visual identity of western public lands for disc golf the way Access Fund's photography claims rock faces.

### Subject matter (in priority order)

1. **Landscape-dominant shots** with disc golf as a small element: a basket against a red rock canyon, a player throwing across a sagebrush flat with mountains behind, a course winding through high desert. The land is the star.
2. **Diverse players** in natural settings: families, veterans, adaptive athletes, youth groups. Not just competitive players. Show the breadth of who disc golf serves.
3. **Volunteer stewardship**: installation days, maintenance work, community builds. Show the partnership model in action.
4. **BLM landscapes without disc golf**: the untouched potential. Sagebrush valleys, pinyon-juniper hillsides, desert vistas. "Imagine a basket here."

### Style

- **Natural light.** Golden hour preferred. No flash, no studio lighting.
- **Wide and medium shots.** Show the scale of the land. Close-ups of baskets and discs are secondary.
- **Warm color grading.** Lean into the warm tones of the palette — golden light, warm shadows. Avoid cool/blue grading.
- **No heavy editing.** These are real places, real people. The authenticity is the point.

### Photography to avoid

- Tournament/competition action shots (reads "sports brand")
- Product shots of discs (reads "manufacturer")
- Urban park courses (reads "local rec")
- Stock photography of any kind

---

## Voice and tone

### Brand voice

EXPLORE Disc Golf speaks with **informed confidence**. It knows the statute, knows the data, knows the land. It's not asking permission — it's offering a partnership.

| Attribute | What it means | Example |
|-----------|--------------|---------|
| **Knowledgeable** | We've read the law and done the homework | "Section 214 requires BLM to select accessible recreation opportunities in each region — disc golf fits." |
| **Inviting** | We want everyone at the table | "You don't need to be a policy expert. We built the packet. You deliver it." |
| **Grounded** | We deal in facts, not hype | "3 courses on 245 million acres. The gap is the opportunity." |
| **Respectful** | We're partners, not adversaries | "We seek to partner with your field office" — never "we demand" |
| **Urgent but patient** | Deadlines are real, relationships take time | "The GNA sunset is January 2030. We have time, but not unlimited time." |

### Tone spectrum

- **Website / educational content:** Warm, accessible, confident. A knowledgeable guide, not a professor.
- **BLM engagement materials:** Formal but not stiff. Professional, data-driven, partnership-oriented.
- **Social media:** Energetic, visual, action-oriented. "Where the wild things fly" energy.
- **Grant applications:** Institutional, metrics-heavy, aligned with funder language.
- **Community/disc golf audience:** Passionate, inclusive, movement-building. "Let's change that."

### Words we use

- "Partner" (not "demand" or "require")
- "Public lands" (not "government land")
- "Accessible" (both physically and financially)
- "Stewardship" (not "maintenance")
- "Low-impact" (not "no-impact" — be honest)
- "Community-driven" (not "grassroots" — too political)
- "The EXPLORE Act" (always with "the" and in italics or bold on first reference)

### Words we avoid

- "Fight" or "battle" (we're building partnerships, not waging war)
- "Free" as the primary selling point (leads with cost, not value)
- "Deserve" (implies entitlement; prefer "fits" or "aligns")
- "Just" as a minimizer ("it's just a disc golf course" — don't undervalue the work)
- Technical jargon without explanation (SRMA, ERMA, NEPA, CatEx — always define on first use)

---

## Application examples

### Website

- **Background:** Sandstone (#F5F0E8), not pure white
- **Navigation:** Night Sky background, Snow text, Terra Cotta active state
- **Cards:** Snow background with subtle Sandstone border, Terra Cotta accent on hover
- **CTAs:** Terra Cotta buttons with Snow text ("Find Your BLM Office"), Summit Gold for secondary actions ("Download Packet")
- **Map UI:** Basin Teal for interactive elements, boundaries, and selected states
- **Status badges:** Sage for "course built," Summit Gold for "in progress," Driftwood for "no contact"

### BLM engagement packet (PDF)

- **Cover page:** Landscape photo (full bleed), "EXPLORE Disc Golf" logo in white, office name in Summit Gold
- **Headers:** Plus Jakarta Sans Bold, Terra Cotta
- **Body text:** Inter Regular, Night Sky on Snow/Sandstone
- **Data callouts:** Summit Gold background strip, Night Sky text, oversized numbers
- **Section dividers:** Thin Sage line
- **Footer:** "A program of ElevateUT Disc Golf, 501(c)(3)" in Driftwood, small

### Social media

- **Post backgrounds:** Terra Cotta, Night Sky, or full-bleed landscape photography
- **Text overlays:** Snow or Summit Gold on dark backgrounds, Night Sky on light
- **Stat graphics:** Oversized numbers in Plus Jakarta Sans ExtraBold, Summit Gold
- **Hashtags:** #EXPLOREDiscGolf #PublicLandsDiscGolf #WildThingsFly

### Presentation slides

- **Title slides:** Night Sky background, "EXPLORE" in Terra Cotta, subtitle in Snow
- **Content slides:** Sandstone background, Night Sky text, Sage and Terra Cotta accents
- **Data slides:** Clean, minimal, oversized numbers in Summit Gold
- **Photo slides:** Full-bleed landscape, minimal text overlay in Snow

---

## Brand architecture

```
ElevateUT Disc Golf (501(c)(3) — legal entity)
    |
    +-- EXPLORE Disc Golf (national public lands program)
    |       |
    |       +-- explorediscgolf.org (website + tools)
    |       +-- BLM Office Finder (interactive tool)
    |       +-- Packet Generator (LLM-powered)
    |       +-- Educational content
    |       +-- Campaign: "Where the Wild Things Fly"
    |       +-- Affiliate chapters
    |
    +-- [ElevateUT's other programs — Utah-focused work]
```

EXPLORE Disc Golf operates with full brand independence. It has its own visual identity, voice, website, and social presence. ElevateUT provides the 501(c)(3) status, fiscal infrastructure, and legal framework — visible only in legal attribution.

---

## File formats and assets

| Asset | Formats | Location |
|-------|---------|----------|
| Logo (dark/white/terracotta) | PNG transparent | `/brand/final/` |
| Logo preview comps | PNG on backgrounds | `/brand/final/preview-*.png` |
| Website logo copies | PNG | `/public/images/brand/` |
| Social media templates | Figma source + PNG exports | `/brand/social/` |
| Presentation template | Google Slides / PPTX | `/brand/presentations/` |
| Packet cover template | Figma source + PDF | `/brand/packets/` |
| Color palette file | CSS variables in tailwind.config.mjs | `/tailwind.config.mjs` |
| Font files (self-hosted) | WOFF2 | `/public/fonts/` |

---

*This brand guide is a living document. Update it as the brand evolves. The visual identity should feel like it belongs on BLM land — warm, western, vast, and grounded.*
