/**
 * Generate branded OG images using Gemini's image generation.
 *
 * Usage: node scripts/generate-og-image.mjs <key> [--list]
 *
 * Reads GEMINI_API_KEY from .env file.
 * Passes the logo as a reference image for brand consistency.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Load .env
const envFile = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
const GEMINI_API_KEY = envFile.match(/GEMINI_API_KEY=(.+)/)?.[1]?.trim();
if (!GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY in .env');
  process.exit(1);
}

// Logo reference image (dark version so Gemini can see the design)
const logoPath = path.join(ROOT, 'public/images/brand/explore-disc-golf-dark.png');
const logoBase64 = fs.readFileSync(logoPath).toString('base64');

const BRAND_CONTEXT = `
BRAND GUIDELINES for the image:
- Organization: EXPLORE Disc Golf (501c3 nonprofit)
- Primary color: Terra Cotta #B85C38 (warm burnt orange)
- Secondary color: Sage #5B7F3B (natural green)
- Accent color: Summit Gold #D4952B (golden yellow)
- Background: Night Sky #1E2D3B (deep navy blue)
- Light tones: Sandstone #F5F0E8, Snow #FEFDFB
- Info color: Basin Teal #1A8BA3
- Style: Professional outdoor advocacy organization. Think Access Fund, Outdoor Alliance, Trust for Public Land.
- The attached image is our logo — use it as brand reference for color palette and tone.

IMAGE REQUIREMENTS:
- Dimensions: 1200x630 pixels (OG image aspect ratio, roughly 2:1 landscape)
- Must work as a social media preview card
- Text must be large and readable at small sizes
- No photographs of real people
- Infographic/illustration style with flat design elements
- Include "explorediscgolf.org" subtly in bottom corner
- Night Sky (#1E2D3B) as the dominant background color
`;

const IMAGE_SPECS = {
  'explore-act': {
    filename: 'og-explore-act.png',
    prompt: `${BRAND_CONTEXT}

Create an infographic-style OG image (1200x630) for the "EXPLORE Act" page.

STORY: "The law that opens the door for disc golf on public lands"

Visual elements:
- A stylized document/legislation icon with "P.L. 118-234" or "EXPLORE Act" text
- Arrows or flow lines connecting the law to icons representing: recreation inventory, accessible recreation, volunteer authority, permitting reform
- Disc golf basket silhouette integrated naturally into the landscape
- Western US landscape silhouette (mesas, mountains) along the bottom
- Large heading text: "The EXPLORE Act" in white
- Subtext: "New authorities for recreation on public lands" in Sandstone color
- Night Sky background with subtle topographic line pattern
- Terra Cotta and Summit Gold accents for the icons and flow lines
- "explorediscgolf.org" in small text bottom-right
`,
  },

  'resources': {
    filename: 'og-resources.png',
    prompt: `${BRAND_CONTEXT}

Create an infographic-style OG image (1200x630) for the "Resources" page.

STORY: "Your advocacy toolkit — everything you need to engage BLM"

Visual elements:
- Flat-design illustration of documents fanning out or arranged as a toolkit
- Icons for: one-pager document, proposal template, talking points speech bubble, strategy guide compass
- Each icon in a different brand color (Terra Cotta, Sage, Summit Gold, Basin Teal)
- Large heading text: "Advocacy Resources" in white
- Subtext: "Free tools for disc golf on public lands" in Sandstone color
- Night Sky background
- Subtle grid or organizational layout suggesting order and preparation
- "explorediscgolf.org" in small text bottom-right
`,
  },

  'case-studies': {
    filename: 'og-case-studies.png',
    prompt: `${BRAND_CONTEXT}

Create an infographic-style OG image (1200x630) for the "Case Studies" page.

STORY: "It's already happening — disc golf courses on BLM land exist"

BIOME FOCUS: Pacific Northwest — lush green forests, wetlands, moss-covered trees, misty valleys (Stewart Pond in Oregon's West Eugene Wetlands)

Visual elements:
- Stylized map of western United States with 5 location pins/markers
- Pins in brand colors marking: Oregon, Utah (2 pins close together), Nevada, California/Oregon border
- Each pin connected to a small label or disc golf basket icon
- Pacific Northwest forest and wetland landscape illustration along bottom — green conifers, ferns, wetland grasses
- Large heading text: "Case Studies" in white
- Subtext: "5 courses on BLM land and counting" in Sandstone color
- Night Sky background transitioning to Sage greens in the landscape
- Terra Cotta pins, Sage and Basin Teal landscape accents
- "explorediscgolf.org" in small text bottom-right
`,
  },

  'offices': {
    filename: 'og-offices.png',
    prompt: `${BRAND_CONTEXT}

Create an infographic-style OG image (1200x630) for the "Find Your BLM Office" page.

STORY: "Find the BLM field office managing land near you"

BIOME FOCUS: Great Basin — vast sagebrush steppe, wide open horizons, basin and range topography, big sky country (where most BLM acreage is)

Visual elements:
- Stylized US map with many small dots representing ~220 BLM field offices across western states
- A large search/magnifying glass or location pin icon as the focal point
- Dots clustered in western US (where BLM land is concentrated)
- Great Basin landscape illustration along bottom — rolling sagebrush hills, distant mountain ranges, wide horizon
- Large heading text: "Find Your BLM Office" in white
- Subtext: "Your entry point for disc golf on public lands" in Sandstone color
- Night Sky background with subtle sage-colored landscape
- Basin Teal for the map dots, Terra Cotta for the search/pin focal point
- "explorediscgolf.org" in small text bottom-right
`,
  },

  'about': {
    filename: 'og-about.png',
    prompt: `${BRAND_CONTEXT}

Create an infographic-style OG image (1200x630) for the "About" page.

STORY: "A 501(c)(3) nonprofit building the bridge between disc golf and public lands"

BIOME FOCUS: Rocky Mountains — dramatic peaks, alpine meadows, evergreen forests, snowcapped summits (aspirational, national scope)

Visual elements:
- Clean, mission-forward design with the organization name prominent
- "EXPLORE Disc Golf" as large heading text in white
- Subtext: "A 501(c)(3) nonprofit by ElevateUT" in Sandstone
- Stylized illustration: a path or trail leading from a disc golf basket toward majestic Rocky Mountain peaks
- Alpine meadow with wildflowers in brand colors, evergreen tree silhouettes
- Brand color accents (Terra Cotta, Sage, Summit Gold) used as design elements
- Night Sky background transitioning to mountain landscape
- Professional and trustworthy tone — like a nonprofit annual report cover
- "explorediscgolf.org" in small text bottom-right
`,
  },

  'thunderbird-hero': {
    filename: 'thunderbird-hero.png',
    prompt: `${BRAND_CONTEXT}

Create a wide cinematic hero illustration (1200x630) of a mythic Thunderbird for the homepage.

CONCEPT: "Where the wild things fly" — a majestic Thunderbird soaring over BLM public lands

IMAGE REQUIREMENTS (OVERRIDE):
- This is NOT an OG card — it's a hero background illustration
- Do NOT include "explorediscgolf.org" text
- Dark edges so it composites over Night Sky (#1E2D3B) background

LOGO INSTRUCTIONS:
- The attached image is our "EXPLORE Disc Golf" logo — it spells "EXPLORE" with mountains, mesas, a tree, and a cactus integrated into the letterforms, with "Disc Golf" in clean text below
- Reproduce this logo in WHITE/Sandstone (#F5F0E8) in the upper portion of the image, above the Thunderbird
- The logo must be clearly legible and faithfully reproduce the attached design

Visual elements:
- The "EXPLORE Disc Golf" logo rendered in white/Sandstone at the top, clearly readable
- Below the logo: a powerful stylized Thunderbird with wings fully spread, viewed from slightly below
- The bird rendered in Terra Cotta (#B85C38) and Summit Gold (#D4952B) tones with Sandstone (#F5F0E8) highlights
- Geometric/tribal-inspired design language — not cartoonish, not photorealistic
- Below the bird: vast western landscape silhouette — mesas, sagebrush, distant mountains
- A single disc golf disc subtly visible in flight, catching the light
- Night Sky (#1E2D3B) dominant background with warm atmospheric glow behind the bird
- The tagline "Where the wild things fly" in elegant serif lettering below the bird
- Mood: mythic, aspirational, powerful — like a national park poster meets Pacific Northwest art
- Illustration style with painterly edges, not hard vector graphics
`,
  },

  'favicon': {
    filename: 'favicon-generated.png',
    prompt: `${BRAND_CONTEXT}

IMAGE REQUIREMENTS (OVERRIDE):
- Dimensions: 512x512 pixels (SQUARE — this is a favicon/app icon)
- This is NOT an OG image — it is a favicon / app icon
- Do NOT include any text whatsoever — no words, no letters, no URL
- Must be instantly recognizable at 32x32 pixels and 16x16 pixels
- Simple, bold shapes with strong silhouette — avoid fine detail

LOGO REFERENCE:
The attached image is the "EXPLORE Disc Golf" logo. It contains these iconic visual elements:
- Desert mesas/buttes (inside the letters E and X)
- A saguaro cactus (left side)
- A lone tree on a trail/path line
- Mountain peaks with snow caps (right side)
- Evergreen/pine trees (right side)

ICON DESIGN:
Create a single iconic favicon that distills the brand into one simple mark. Ideas to consider:
- A stylized mesa/butte silhouette with a disc golf disc flying past it
- Mountain peaks with a disc in flight
- The lone tree from the logo on a mesa with a disc
- A landscape silhouette combining desert and mountain elements with a disc

Use Night Sky (#1E2D3B) as the background with rounded corners (like an app icon).
Use Terra Cotta (#B85C38) and Sandstone (#F5F0E8) for the icon elements.
Keep it EXTREMELY simple — 2-3 shapes maximum. It must read clearly as a tiny browser tab icon.
`,
  },

  'blm': {
    filename: 'og-blm.png',
    prompt: `${BRAND_CONTEXT}

Create an infographic-style OG image (1200x630) for the "What is the BLM?" page.

STORY: "The Bureau of Land Management oversees 245 million acres of America's public lands — and you can help shape how they're used"

BIOME FOCUS: High desert — pinyon-juniper woodland, red sandstone formations, Utah canyon country (classic BLM landscape)

Visual elements:
- Large heading text: "What is the BLM?" in white
- Subtext: "245 million acres of America's public lands" in Sandstone color
- Infographic showing: BLM logo/shield silhouette, "245M acres" stat, map showing BLM land distribution in western US
- High desert landscape illustration — red rock formations, pinyon-juniper trees, sandy washes, blue sky
- Icons showing BLM's multiple uses: recreation, grazing, energy, conservation, wildlife
- A disc golf basket subtly placed in the landscape, showing it fits naturally
- Night Sky background with warm desert tones (Terra Cotta, Summit Gold) in the landscape
- "explorediscgolf.org" in small text bottom-right
`,
  },
};

async function generateImage(key) {
  const spec = IMAGE_SPECS[key];
  if (!spec) {
    console.error(`Unknown image key: ${key}`);
    console.error('Available:', Object.keys(IMAGE_SPECS).join(', '));
    process.exit(1);
  }

  console.log(`Generating ${spec.filename}...`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: logoBase64,
                },
              },
              {
                text: spec.prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['image', 'text'],
          temperature: 1.0,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error(`API error ${response.status}:`, err);
    process.exit(1);
  }

  const data = await response.json();

  // Extract image from response
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith('image/'));

  if (!imagePart) {
    console.error('No image in response. Text parts:');
    parts.filter((p) => p.text).forEach((p) => console.log(p.text));
    process.exit(1);
  }

  const outPath = path.join(ROOT, 'public/images', spec.filename);
  fs.writeFileSync(outPath, Buffer.from(imagePart.inlineData.data, 'base64'));
  console.log(`Saved: ${outPath}`);
  console.log(`Size: ${(fs.statSync(outPath).size / 1024).toFixed(0)} KB`);

  // Print any text response
  const textParts = parts.filter((p) => p.text);
  if (textParts.length) {
    console.log('\nGemini notes:', textParts.map((p) => p.text).join('\n'));
  }
}

// CLI
const args = process.argv.slice(2);
if (args.includes('--list')) {
  console.log('Available images:');
  for (const [key, spec] of Object.entries(IMAGE_SPECS)) {
    console.log(`  ${key} → ${spec.filename}`);
  }
  process.exit(0);
}

const key = args[0];
if (!key) {
  console.log('Usage: node scripts/generate-og-image.mjs <key> [--list]');
  console.log('Keys:', Object.keys(IMAGE_SPECS).join(', '));
  process.exit(0);
}

generateImage(key);
