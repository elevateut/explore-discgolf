/**
 * Shared badge/label maps for DaisyUI components across the site.
 * Single source of truth for status colors and display labels.
 */

import type { EngagementStatus } from "@lib/blm/types";

// ---------------------------------------------------------------------------
// Engagement status (BLM office outreach pipeline)
// ---------------------------------------------------------------------------

export const engagementBadges: Record<
  EngagementStatus["status"],
  { label: string; class: string }
> = {
  "no-contact": { label: "No Contact", class: "badge-ghost" },
  "initial-outreach": { label: "Initial Outreach", class: "badge-info" },
  "meeting-scheduled": { label: "Meeting Scheduled", class: "badge-warning" },
  "meeting-completed": { label: "Meeting Completed", class: "badge-accent" },
  "proposal-submitted": { label: "Proposal Submitted", class: "badge-secondary" },
  "project-active": { label: "Project Active", class: "badge-primary" },
  "course-built": { label: "Course Built", class: "badge-success" },
};

// ---------------------------------------------------------------------------
// Case study status
// ---------------------------------------------------------------------------

export const caseStudyBadges: Record<string, { label: string; class: string }> = {
  built: { label: "Built", class: "badge-success" },
  approved: { label: "Approved", class: "badge-info" },
  "in-progress": { label: "In Progress", class: "badge-warning" },
  proposed: { label: "Proposed", class: "badge-ghost" },
};

// ---------------------------------------------------------------------------
// Office type labels
// ---------------------------------------------------------------------------

export const officeTypeLabels: Record<string, string> = {
  field: "Field Office",
  district: "District Office",
  state: "State Office",
  other: "Other",
};

// ---------------------------------------------------------------------------
// US state abbreviation → full name
// ---------------------------------------------------------------------------

export const stateNames: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
  CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
  KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia",
  WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
};
