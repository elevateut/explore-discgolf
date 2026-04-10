/**
 * BLM ArcGIS REST service client.
 *
 * All queries hit public (no-auth) ArcGIS MapServer endpoints hosted by the
 * Bureau of Land Management. These are intended to run client-side in the
 * browser so we avoid CORS issues with the MapServer JSON API.
 *
 * TODO: Replace `Promise<any>` return types with typed response interfaces
 * once we finalize the field mappings from ArcGIS attribute tables.
 */

import type { BBox } from "./types";

// ---------------------------------------------------------------------------
// Base URLs
// ---------------------------------------------------------------------------

const ADMIN_UNIT_BASE =
  "https://gis.blm.gov/arcgis/rest/services/admin_boundaries/BLM_Natl_AdminUnit/MapServer";

const RECREATION_BASE =
  "https://gis.blm.gov/arcgis/rest/services/recreation/BLM_Natl_Recreation/MapServer";

// ---------------------------------------------------------------------------
// Helpers
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
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch all BLM field offices from the AdminUnit MapServer (layer 0).
 *
 * Endpoint: https://gis.blm.gov/arcgis/rest/services/admin_boundaries/BLM_Natl_AdminUnit/MapServer/0/query
 *
 * TODO: map raw ArcGIS attributes to BLMOffice[].
 */
export async function getFieldOffices(): Promise<any> {
  return queryLayer(ADMIN_UNIT_BASE, 0, {
    where: "1=1",
    returnGeometry: "true",
    outSR: "4326",
  });
}

/**
 * Fetch the polygon boundary for a specific BLM field office (layer 3).
 *
 * Endpoint: https://gis.blm.gov/arcgis/rest/services/admin_boundaries/BLM_Natl_AdminUnit/MapServer/3/query
 *
 * TODO: convert ArcGIS geometry rings to GeoJSON Polygon and return BLMBoundary.
 */
export async function getFieldOfficeBoundary(
  officeId: string,
): Promise<any> {
  return queryLayer(ADMIN_UNIT_BASE, 3, {
    where: `ADMIN_UNIT_CODE='${officeId}'`,
    returnGeometry: "true",
    outSR: "4326",
  });
}

/**
 * Fetch BLM recreation sites within a bounding box (layer 1).
 *
 * Endpoint: https://gis.blm.gov/arcgis/rest/services/recreation/BLM_Natl_Recreation/MapServer/1/query
 *
 * TODO: map raw attributes to BLMRecreationSite[].
 */
export async function getRecreationSites(bbox: BBox): Promise<any> {
  const [west, south, east, north] = bbox;
  return queryLayer(RECREATION_BASE, 1, {
    where: "1=1",
    geometry: `${west},${south},${east},${north}`,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    returnGeometry: "true",
    outSR: "4326",
  });
}

/**
 * Fetch recreation sites where disc golf is a listed activity.
 *
 * BLM uses ActivityID 100024 for disc golf. Note: ShowActivity=0 in most
 * records, meaning disc golf is present in the data but hidden from BLM's
 * own public recreation search UI.
 *
 * Endpoint: https://gis.blm.gov/arcgis/rest/services/recreation/BLM_Natl_Recreation/MapServer/1/query
 *   with where=ActivityID=100024
 *
 * TODO: map raw attributes to BLMRecreationSite[].
 */
export async function getDiscGolfSites(): Promise<any> {
  return queryLayer(RECREATION_BASE, 1, {
    where: "ActivityID=100024",
    returnGeometry: "true",
    outSR: "4326",
  });
}
