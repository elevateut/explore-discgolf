/**
 * BLM ArcGIS REST service client.
 *
 * All queries hit public (no-auth) ArcGIS MapServer endpoints hosted by the
 * Bureau of Land Management. Returns typed results mapped from ArcGIS
 * attribute tables to application-level interfaces.
 */

import type { BLMOffice, BLMRecreationSite, BLMBoundary, BBox } from "./types";

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

/**
 * Validates and sanitizes a BLM admin unit code to prevent injection in
 * ArcGIS REST where-clauses. Codes are uppercase alphanumeric strings
 * (e.g. "UTC01000", "NM000000").
 */
const BLM_UNIT_CODE_RE = /^[A-Z0-9]{2,20}$/;

function sanitizeOfficeId(officeId: string): string {
  const trimmed = officeId.trim().toUpperCase();
  if (!BLM_UNIT_CODE_RE.test(trimmed)) {
    throw new Error(
      `Invalid BLM unit code: "${officeId}". Expected alphanumeric (e.g. "UTC01000").`,
    );
  }
  return trimmed;
}

// ---------------------------------------------------------------------------
// Base URLs
// ---------------------------------------------------------------------------

const ADMIN_UNIT_BASE =
  "https://gis.blm.gov/arcgis/rest/services/admin_boundaries/BLM_Natl_AdminUnit/MapServer";

const RECREATION_BASE =
  "https://gis.blm.gov/arcgis/rest/services/recreation/BLM_Natl_Recreation/MapServer";

// ---------------------------------------------------------------------------
// Query engine
// ---------------------------------------------------------------------------

const QUERY_TIMEOUT_MS = 15_000;
const MAX_RECORD_COUNT = 1000;

/**
 * Perform a query against a specific ArcGIS MapServer layer and return JSON.
 * Uses AbortController for timeout. Paginates automatically when the server
 * returns `exceededTransferLimit`.
 */
async function queryLayer(
  baseUrl: string,
  layerId: number,
  params: Record<string, string>,
): Promise<any> {
  const allFeatures: any[] = [];
  let offset = 0;

  while (true) {
    const url = new URL(`${baseUrl}/${layerId}/query`);
    url.searchParams.set("f", "json");
    url.searchParams.set("outFields", "*");
    url.searchParams.set("resultOffset", String(offset));
    url.searchParams.set("resultRecordCount", String(MAX_RECORD_COUNT));
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

    try {
      const res = await fetch(url.toString(), { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`BLM ArcGIS HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.error) {
        throw new Error(
          `BLM ArcGIS error ${data.error.code}: ${data.error.message}`,
        );
      }

      const features = data.features ?? [];
      allFeatures.push(...features);

      if (data.exceededTransferLimit && features.length > 0) {
        offset += features.length;
        continue;
      }
      return { ...data, features: allFeatures };
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error(
          `BLM ArcGIS query timed out after ${QUERY_TIMEOUT_MS}ms`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

// ---------------------------------------------------------------------------
// ArcGIS → Application type mappers
// ---------------------------------------------------------------------------

const ORG_TYPE_MAP: Record<string, BLMOffice["type"]> = {
  State: "state",
  District: "district",
  Field: "field",
  Other: "other",
};

/**
 * Map a raw ArcGIS AdminUnit point feature to a BLMOffice.
 * Layer 0 returns point geometry (x/y) and attribute fields:
 *   ADM_UNIT_CD, ADMU_NAME, BLM_ORG_TYPE, ADMIN_ST, Label, Label_Full_Name
 */
function mapOfficeFeature(feature: any): BLMOffice {
  const a = feature.attributes;
  return {
    id: a.ADM_UNIT_CD,
    name: a.Label_Full_Name || a.ADMU_NAME,
    type: ORG_TYPE_MAP[a.BLM_ORG_TYPE] ?? "other",
    state: a.ADMIN_ST,
    lat: feature.geometry?.y ?? 0,
    lng: feature.geometry?.x ?? 0,
  };
}

/**
 * Map a raw ArcGIS Recreation feature to a BLMRecreationSite.
 * Layer 1 returns point geometry and attributes including:
 *   SiteName, SiteDescription, ADMIN_ST, ActivityID, ActivityName, FeeDescription
 */
function mapRecreationFeature(feature: any): BLMRecreationSite {
  const a = feature.attributes;
  return {
    id: String(a.OBJECTID || a.RecAreaID || ""),
    name: a.SiteName || a.RecAreaName || "Unknown",
    description: a.SiteDescription || a.RecAreaDescription || "",
    state: a.ADMIN_ST || "",
    lat: feature.geometry?.y ?? 0,
    lng: feature.geometry?.x ?? 0,
    activities: a.ActivityName ? [a.ActivityName] : [],
    feeDescription: a.FeeDescription,
    blmVisitUrl: a.URL || undefined,
  };
}

/**
 * Convert ArcGIS polygon rings to a GeoJSON Polygon or MultiPolygon.
 * ArcGIS rings are arrays of [x, y] coordinate pairs.
 * If there are multiple outer rings, we create a MultiPolygon.
 */
function ringsToGeoJSON(
  rings: number[][][],
): GeoJSON.Polygon | GeoJSON.MultiPolygon {
  if (!rings || rings.length === 0) {
    return { type: "Polygon", coordinates: [] };
  }
  // ArcGIS: outer rings are clockwise, holes are counter-clockwise.
  // GeoJSON: outer rings are counter-clockwise.
  // For simplicity, treat all rings as a single polygon group.
  // (Works for most BLM field office boundaries which are contiguous.)
  const coordinates = rings.map((ring) =>
    ring.map(([x, y]) => [x, y] as [number, number]),
  );
  if (coordinates.length === 1) {
    return { type: "Polygon", coordinates };
  }
  // Multiple rings — wrap each as its own polygon in a MultiPolygon
  return {
    type: "MultiPolygon",
    coordinates: coordinates.map((ring) => [ring]),
  };
}

// ---------------------------------------------------------------------------
// Public API — typed
// ---------------------------------------------------------------------------

/**
 * Fetch all BLM offices (state, district, field, other) as typed BLMOffice[].
 * Layer 0 of the AdminUnit MapServer. Returns ~220 offices.
 */
export async function getFieldOffices(): Promise<BLMOffice[]> {
  const data = await queryLayer(ADMIN_UNIT_BASE, 0, {
    where: "1=1",
    returnGeometry: "true",
    outSR: "4326",
  });
  return (data.features ?? []).map(mapOfficeFeature);
}

/**
 * Fetch the polygon boundary for a specific BLM office by ADM_UNIT_CD.
 * Layer 3 of the AdminUnit MapServer.
 */
export async function getFieldOfficeBoundary(
  officeId: string,
): Promise<BLMBoundary | null> {
  const safeId = sanitizeOfficeId(officeId);
  const data = await queryLayer(ADMIN_UNIT_BASE, 3, {
    where: `ADM_UNIT_CD='${safeId}'`,
    returnGeometry: "true",
    outSR: "4326",
  });
  const feature = data.features?.[0];
  if (!feature?.geometry?.rings) return null;
  return {
    officeId,
    geometry: ringsToGeoJSON(feature.geometry.rings) as GeoJSON.Polygon,
  };
}

/**
 * Fetch BLM recreation sites within a bounding box as typed BLMRecreationSite[].
 * Layer 1 of the Recreation MapServer.
 */
export async function getRecreationSites(
  bbox: BBox,
): Promise<BLMRecreationSite[]> {
  const [west, south, east, north] = bbox;
  const data = await queryLayer(RECREATION_BASE, 1, {
    where: "1=1",
    geometry: `${west},${south},${east},${north}`,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    returnGeometry: "true",
    outSR: "4326",
  });
  return (data.features ?? []).map(mapRecreationFeature);
}

/**
 * Fetch recreation sites where disc golf is a listed activity.
 * BLM uses ActivityID 100024 for disc golf.
 */
export async function getDiscGolfSites(): Promise<BLMRecreationSite[]> {
  const data = await queryLayer(RECREATION_BASE, 1, {
    where: "ActivityID=100024",
    returnGeometry: "true",
    outSR: "4326",
  });
  return (data.features ?? []).map(mapRecreationFeature);
}
