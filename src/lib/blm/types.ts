/**
 * BLM data layer type definitions.
 *
 * These interfaces model the data returned by BLM ArcGIS REST services
 * and the application-level engagement tracking we layer on top.
 */

/** A BLM administrative office (state, district, or field level). */
export interface BLMOffice {
  id: string;
  name: string;
  type: "state" | "district" | "field" | "other";
  state: string;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  email?: string;
  recreationPlannerName?: string;
  recreationPlannerEmail?: string;
}

/** A BLM-managed recreation site returned from the Natl Recreation MapServer. */
export interface BLMRecreationSite {
  id: string;
  name: string;
  description: string;
  state: string;
  lat: number;
  lng: number;
  /** Activity names associated with this site (e.g. "Disc Golf", "Hiking"). */
  activities: string[];
  feeDescription?: string;
  /** URL to the BLM visit page for this site, if one exists. */
  blmVisitUrl?: string;
}

/** A GeoJSON polygon boundary for a BLM administrative unit. */
export interface BLMBoundary {
  officeId: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

/**
 * Tracks our outreach / engagement status with a specific BLM office.
 * This data lives in Supabase, not in BLM's GIS services.
 */
export interface EngagementStatus {
  officeId: string;
  status:
    | "no-contact"
    | "initial-outreach"
    | "meeting-scheduled"
    | "meeting-completed"
    | "proposal-submitted"
    | "project-active"
    | "course-built";
  lastUpdated: string;
  notes?: string;
}

/** Bounding box as [west, south, east, north] (EPSG:4326). */
export type BBox = [number, number, number, number];
