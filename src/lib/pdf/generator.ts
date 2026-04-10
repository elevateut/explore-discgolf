/**
 * PDF Generation Layer — explore_discgolf
 *
 * Converts LLM-generated packet content into branded, downloadable PDFs.
 * Each PDF includes:
 *   - ElevateUT logo and branding (colors from the "elevateut" DaisyUI theme)
 *   - Tailored one-pager for the target BLM office
 *   - EXPLORE Act alignment memo
 *   - Cover letter addressed to the office's recreation planner
 *   - Suggested contacts and next steps
 *
 * Technology choice is TBD. Options under consideration:
 *   1. **puppeteer** — Full HTML-to-PDF rendering. Heaviest dependency but
 *      supports the exact same Tailwind/DaisyUI styles used on the site.
 *   2. **@react-pdf/renderer** — React component tree to PDF. Lighter than
 *      puppeteer but requires a parallel set of React layout components.
 *   3. **pdfkit** — Programmatic PDF construction. No HTML involved;
 *      lightest dependency but most manual layout work.
 *
 * This module runs server-side only (Astro Actions / SSR endpoints).
 * Generated PDFs can be uploaded to Supabase Storage and the URL stored
 * in the generated_packets.output_pdf_url column.
 */

import type { BLMOffice } from "@lib/blm/types";
import type { GeneratedPacket } from "@lib/supabase/queries";

/**
 * Generate a branded PDF proposal packet for a specific BLM office.
 *
 * @param packet - The LLM-generated packet content (markdown, prompt context, etc.)
 * @param office - The target BLM office with contact and location details
 * @returns A Buffer containing the rendered PDF, suitable for download or storage upload
 *
 * TODO:
 *   - Choose and install a PDF library (puppeteer, @react-pdf/renderer, or pdfkit)
 *   - Build the PDF template with ElevateUT branding:
 *     - Header with logo, "Disc golf on America's public lands." tagline
 *     - EXPLORE Disc Golf brand colors (Terra Cotta #B85C38, Night Sky #1E2D3B, Sandstone #F5F0E8)
 *     - Professional but approachable tone — not corporate
 *   - Parse packet.output_markdown into structured sections:
 *     - Cover letter (addressed to office.recreationPlannerName if available)
 *     - One-pager: why disc golf on public lands
 *     - EXPLORE Act alignment memo with specific section references
 *     - Suggested contacts and engagement roadmap
 *   - Add office-specific details (name, state, address, contact info)
 *   - Include page numbers, generation date, and a disclaimer footer
 *   - Upload the resulting Buffer to Supabase Storage (bucket: "packets")
 *   - Return the Buffer so callers can serve it as a direct download
 */
export async function generatePacketPDF(
  packet: GeneratedPacket,
  office: BLMOffice,
): Promise<Buffer> {
  // TODO: Implement PDF generation
  throw new Error(
    `[pdf/generator] Not implemented. ` +
      `Would generate PDF for office "${office.name}" (${office.id}) ` +
      `from packet ${packet.id}.`,
  );
}
