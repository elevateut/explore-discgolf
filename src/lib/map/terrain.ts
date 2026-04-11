/**
 * Map terrain, basemap, and overlay helpers — shared between MapLibre map
 * components.
 *
 * Exposes:
 *   - basemapStyle(id) — picks the right MapLibre style for a basemap choice
 *   - applyTerrain(map, showHillshade) — adds the DEM source + 3D terrain
 *     (and a hillshade overlay on the Terrain basemap). Idempotent; safe to
 *     call from a `style.load` handler on every basemap swap.
 *   - applySmaOverlay(map, opts) — adds the BLM Surface Management Agency
 *     overlay showing federal lands classified by agency. Idempotent.
 *   - BasemapSwitcher — a maplibregl IControl with three radio-style buttons.
 *   - OverlayToggle — a single-button IControl for toggling an overlay layer.
 *
 * All sources are free and no-auth (for use on a 501c3 advocacy site):
 *   - DEM: AWS Open Data Terrain Tiles (Mapzen, terrarium encoding)
 *   - Satellite: ESRI World Imagery
 *   - Topo: OpenTopoMap
 *   - BLM surface lands: BLM National SMA LimitedScale (gis.blm.gov)
 */

import maplibregl from "maplibre-gl";
import type {
  IControl,
  Map as MaplibreMap,
  MapMouseEvent,
  StyleSpecification,
} from "maplibre-gl";

// ---------------------------------------------------------------------------
// Basemap definitions
// ---------------------------------------------------------------------------

export type BasemapId = "terrain" | "satellite" | "topo";

export const BASEMAP_LABELS: Record<BasemapId, string> = {
  terrain: "Terrain",
  satellite: "Satellite",
  topo: "Topo",
};

const POSITRON_STYLE_URL =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "esri-world-imagery": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
  },
  layers: [
    {
      id: "esri-world-imagery",
      type: "raster",
      source: "esri-world-imagery",
    },
  ],
};

const TOPO_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    opentopo: {
      type: "raster",
      // Three subdomains (a/b/c) for parallel tile loading. The USGS
      // National Map ArcGIS endpoint we tried first returns 403 from
      // CloudFront with no CORS headers — the whole service appears to
      // have been locked down. OpenTopoMap is open, CORS-enabled, and
      // free for non-heavy use (CC-BY-SA, attribution required).
      tiles: [
        "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
        "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
        "https://c.tile.opentopomap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      maxzoom: 17,
      attribution:
        'Map data: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors, SRTM | Map style: © <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC-BY-SA</a>)',
    },
  },
  layers: [
    {
      id: "opentopo",
      type: "raster",
      source: "opentopo",
    },
  ],
};

/**
 * Returns the MapLibre style for a basemap. Terrain uses CartoCDN's hosted
 * Positron vector style (URL); satellite/topo are minimal one-layer raster
 * styles defined inline.
 */
export function basemapStyle(id: BasemapId): string | StyleSpecification {
  if (id === "satellite") return SATELLITE_STYLE;
  if (id === "topo") return TOPO_STYLE;
  return POSITRON_STYLE_URL;
}

// ---------------------------------------------------------------------------
// Terrain (DEM + hillshade)
// ---------------------------------------------------------------------------

const TERRAIN_DEM_SOURCE_ID = "terrain-dem";
const HILLSHADE_LAYER_ID = "terrain-hillshade";
const TERRAIN_EXAGGERATION = 1.3;

/**
 * Idempotently add a 3D terrain source + setTerrain to a map. When
 * `showHillshade` is true, also adds a hillshade overlay (only useful on the
 * flat Positron basemap — satellite/topo imagery already shows terrain
 * visually).
 *
 * Call from a `style.load` handler. After `setStyle()`, all sources and
 * layers are wiped, so this needs to re-add them on every basemap swap.
 *
 * The hillshade is inserted below the first symbol layer in the current
 * style so text labels (place names, roads) stay readable on top of shading.
 */
export function applyTerrain(map: MaplibreMap, showHillshade: boolean): void {
  if (!map.getSource(TERRAIN_DEM_SOURCE_ID)) {
    map.addSource(TERRAIN_DEM_SOURCE_ID, {
      type: "raster-dem",
      tiles: [
        "https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      maxzoom: 15,
      encoding: "terrarium",
      attribution: "Elevation data by Mapzen, hosted by AWS Open Data",
    });
  }

  map.setTerrain({
    source: TERRAIN_DEM_SOURCE_ID,
    exaggeration: TERRAIN_EXAGGERATION,
  });

  if (showHillshade && !map.getLayer(HILLSHADE_LAYER_ID)) {
    // Insert below the first symbol layer so place labels stay readable
    const layers = map.getStyle().layers ?? [];
    const firstSymbolId = layers.find((l) => l.type === "symbol")?.id;

    map.addLayer(
      {
        id: HILLSHADE_LAYER_ID,
        type: "hillshade",
        source: TERRAIN_DEM_SOURCE_ID,
        paint: {
          "hillshade-exaggeration": 0.55,
          "hillshade-shadow-color": "#1E2D3B",
          "hillshade-highlight-color": "#FFFFFF",
        },
      },
      firstSymbolId,
    );
  }
}

// ---------------------------------------------------------------------------
// BLM Surface Management Agency (SMA) overlay
// ---------------------------------------------------------------------------

export const SMA_LAYER_ID = "blm-sma";
const SMA_SOURCE_ID = "blm-sma";

// BLM's pre-rendered cached tile pyramid of BLM-administered surface lands.
// Web Mercator tile scheme (SR 102100), 256px tiles, 24 LODs covering zoom
// 0–23, singleFusedMapCache=true — drops in as a standard XYZ raster source.
// ArcGIS tile URL pattern is `tile/{level}/{row}/{column}` which is the same
// as slippy-map `{z}/{y}/{x}` (note y before x, not OSM's {z}/{x}/{y}).
//
// An earlier iteration used the dynamic `/export` endpoint against
// `BLM_Natl_SMA_LimitedScale`, which looked right until we realized that
// service has `minScale: 36113` meaning it only renders ZOOMED IN past
// 1:36K — so at office-overview zooms (8–12) the server returned empty
// transparent PNGs. The cached BLM_Only service renders at every zoom
// level we care about and is BLM-specific by construction (no client-
// or server-side filtering needed).
const SMA_TILE_URL =
  "https://gis.blm.gov/arcgis/rest/services/lands/BLM_Natl_SMA_Cached_BLM_Only" +
  "/MapServer/tile/{z}/{y}/{x}";

/**
 * Idempotently add the BLM Surface Management Agency overlay — a raster
 * layer showing every acre of BLM-administered surface land across the
 * continental US, Alaska, Hawaii, and territories.
 *
 * Call from a `style.load` handler — sources and layers are wiped on
 * `setStyle()`, so this needs to re-add them on every basemap swap.
 */
export function applySmaOverlay(
  map: MaplibreMap,
  opts: { visible?: boolean; opacity?: number } = {},
): void {
  const visible = opts.visible ?? true;
  const opacity = opts.opacity ?? 0.55;

  if (!map.getSource(SMA_SOURCE_ID)) {
    map.addSource(SMA_SOURCE_ID, {
      type: "raster",
      tiles: [SMA_TILE_URL],
      tileSize: 256,
      attribution:
        'BLM lands: <a href="https://www.blm.gov" target="_blank" rel="noopener">© Bureau of Land Management</a>',
    });
  }

  if (!map.getLayer(SMA_LAYER_ID)) {
    // Insert below the first symbol layer so place labels stay readable
    // over the overlay (same beforeId trick as hillshade).
    const layers = map.getStyle().layers ?? [];
    const firstSymbolId = layers.find((l) => l.type === "symbol")?.id;
    map.addLayer(
      {
        id: SMA_LAYER_ID,
        type: "raster",
        source: SMA_SOURCE_ID,
        layout: { visibility: visible ? "visible" : "none" },
        paint: { "raster-opacity": opacity },
      },
      firstSymbolId,
    );
  } else {
    map.setLayoutProperty(
      SMA_LAYER_ID,
      "visibility",
      visible ? "visible" : "none",
    );
  }
}

// ---------------------------------------------------------------------------
// BasemapSwitcher — a MapLibre IControl with 3 toggle buttons
// ---------------------------------------------------------------------------

type BasemapChangeHandler = (id: BasemapId) => void;

interface SwitcherEntry {
  id: BasemapId;
  button: HTMLButtonElement;
  handler: () => void;
}

export class BasemapSwitcher implements IControl {
  private container: HTMLDivElement;
  private entries: SwitcherEntry[] = [];
  private current: BasemapId;
  private onChange: BasemapChangeHandler;

  constructor(initial: BasemapId, onChange: BasemapChangeHandler) {
    this.current = initial;
    this.onChange = onChange;
    this.container = document.createElement("div");
    this.container.className =
      "maplibregl-ctrl maplibregl-ctrl-group basemap-switcher";
    this.build();
  }

  onAdd(_map: MaplibreMap): HTMLElement {
    return this.container;
  }

  onRemove(_map: MaplibreMap): void {
    for (const entry of this.entries) {
      entry.button.removeEventListener("click", entry.handler);
    }
    this.entries = [];
    this.container.parentNode?.removeChild(this.container);
  }

  /**
   * Reflect a basemap change. Updates active state without firing onChange.
   */
  setCurrent(id: BasemapId): void {
    if (this.current === id) return;
    this.current = id;
    for (const entry of this.entries) {
      const active = entry.id === id;
      entry.button.classList.toggle("is-active", active);
      entry.button.setAttribute("aria-pressed", String(active));
    }
  }

  private build(): void {
    (Object.keys(BASEMAP_LABELS) as BasemapId[]).forEach((id) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = BASEMAP_LABELS[id];
      btn.className =
        "basemap-switcher__btn" + (id === this.current ? " is-active" : "");
      btn.setAttribute("aria-pressed", id === this.current ? "true" : "false");
      btn.setAttribute("aria-label", `Switch to ${BASEMAP_LABELS[id]} basemap`);

      const handler = () => {
        if (this.current === id) return;
        this.setCurrent(id);
        this.onChange(id);
      };

      btn.addEventListener("click", handler);
      this.entries.push({ id, button: btn, handler });
      this.container.appendChild(btn);
    });
  }
}

// ---------------------------------------------------------------------------
// OverlayToggle — single-button IControl for toggling a data overlay
// ---------------------------------------------------------------------------

type OverlayToggleHandler = (visible: boolean) => void;

export class OverlayToggle implements IControl {
  private container: HTMLDivElement;
  private button: HTMLButtonElement;
  private active: boolean;
  private onChange: OverlayToggleHandler;
  private handler: () => void;

  constructor(
    label: string,
    initial: boolean,
    onChange: OverlayToggleHandler,
  ) {
    this.active = initial;
    this.onChange = onChange;

    this.container = document.createElement("div");
    this.container.className =
      "maplibregl-ctrl maplibregl-ctrl-group overlay-toggle";

    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.textContent = label;
    this.button.className =
      "overlay-toggle__btn" + (initial ? " is-active" : "");
    this.button.setAttribute("aria-pressed", String(initial));
    this.button.setAttribute("aria-label", `Toggle ${label}`);

    this.handler = () => {
      this.active = !this.active;
      this.button.classList.toggle("is-active", this.active);
      this.button.setAttribute("aria-pressed", String(this.active));
      this.onChange(this.active);
    };

    this.button.addEventListener("click", this.handler);
    this.container.appendChild(this.button);
  }

  onAdd(_map: MaplibreMap): HTMLElement {
    return this.container;
  }

  onRemove(_map: MaplibreMap): void {
    this.button.removeEventListener("click", this.handler);
    this.container.parentNode?.removeChild(this.container);
  }
}

// ---------------------------------------------------------------------------
// BLM field office click-to-identify
// ---------------------------------------------------------------------------

const BLM_IDENTIFIER_SOURCE_ID = "blm-identifier-highlight";
const BLM_IDENTIFIER_FILL_ID = "blm-identifier-highlight-fill";
const BLM_IDENTIFIER_STROKE_ID = "blm-identifier-highlight-stroke";

interface BlmFieldOfficeAttributes {
  ADM_UNIT_CD?: string;
  ADMU_NAME?: string;
  BLM_ORG_TYPE?: string;
  ADMIN_ST?: string;
  PARENT_NAME?: string;
}

interface ArcGisFeature {
  attributes: BlmFieldOfficeAttributes;
  geometry?: { rings?: number[][][] };
}

/** Escape a string for safe HTML interpolation in popup content. */
function escapeHtmlForPopup(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/** Convert an ArcGIS rings array to a GeoJSON Polygon or MultiPolygon. */
function ringsToGeometry(
  rings: number[][][],
): GeoJSON.Polygon | GeoJSON.MultiPolygon {
  const coords = rings.map((ring) =>
    ring.map(([x, y]) => [x, y] as [number, number]),
  );
  if (coords.length === 1) {
    return { type: "Polygon", coordinates: coords };
  }
  return {
    type: "MultiPolygon",
    coordinates: coords.map((r) => [r]),
  };
}

/** Build the popup HTML for a resolved BLM field office feature. */
function buildFieldOfficePopupHtml(attrs: BlmFieldOfficeAttributes): string {
  const adminCode = (attrs.ADM_UNIT_CD || "").toString().trim();
  const rawName = (attrs.ADMU_NAME || "").toString().trim();
  const orgType = (attrs.BLM_ORG_TYPE || "").toString().trim();
  const state = (attrs.ADMIN_ST || "").toString().trim();
  const parent = (attrs.PARENT_NAME || "").toString().trim();

  // BLM names are usually bare ("Salt Lake", "Cedar City") — append the
  // org type suffix for full display ("Salt Lake Field Office").
  const fullName =
    orgType && !/office|district/i.test(rawName)
      ? `${rawName} ${orgType} Office`
      : rawName || "BLM Administrative Unit";

  const metaParts: string[] = [];
  if (state) metaParts.push(escapeHtmlForPopup(state));
  if (parent) metaParts.push(escapeHtmlForPopup(parent));

  const linkHtml = adminCode
    ? `<a href="/offices/${encodeURIComponent(adminCode)}" style="display:inline-block;margin-top:6px;font-size:11px;color:#b85c38;text-decoration:underline;">View office details &rarr;</a>`
    : "";

  return `<div style="font-family:system-ui,sans-serif;padding:2px;min-width:180px;">
    <div style="font-weight:600;font-size:13px;color:#1e2d3b;line-height:1.25;margin-bottom:3px;">
      ${escapeHtmlForPopup(fullName)}
    </div>
    <div style="font-size:11px;color:#6b7280;">
      Bureau of Land Management
    </div>
    ${metaParts.length ? `<div style="font-size:11px;color:#9ca3af;margin-top:4px;">${metaParts.join(" &middot; ")}</div>` : ""}
    ${linkHtml}
  </div>`;
}

/**
 * Create a BLM field-office click identifier with its own popup, abort
 * controller, and highlight source/layer state. Each map component
 * instantiates its own so state is isolated.
 *
 * Usage:
 *   const identifier = createBlmIdentifier();
 *   map.on("click", (e) => identifier.onClick(map, e));
 *   // ...cleanup...
 *   identifier.dispose();
 *
 * On click, queries BLM's AdminUnit service for the field office
 * jurisdiction containing the click point, draws the office's boundary
 * polygon in Terra Cotta, and shows a popup with the office name,
 * state, parent district, and a deep link to /offices/{ADM_UNIT_CD}.
 * Closing the popup (X button or another click) clears the highlight.
 */
export function createBlmIdentifier() {
  let abort: AbortController | null = null;
  let popup: maplibregl.Popup | null = null;
  let boundMap: MaplibreMap | null = null;

  function addHighlight(
    map: MaplibreMap,
    geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  ): void {
    const data: GeoJSON.Feature = {
      type: "Feature",
      properties: {},
      geometry,
    };

    const existing = map.getSource(BLM_IDENTIFIER_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (existing) {
      existing.setData(data);
      return;
    }

    map.addSource(BLM_IDENTIFIER_SOURCE_ID, { type: "geojson", data });
    map.addLayer({
      id: BLM_IDENTIFIER_FILL_ID,
      type: "fill",
      source: BLM_IDENTIFIER_SOURCE_ID,
      paint: {
        "fill-color": "#b85c38",
        "fill-opacity": 0.1,
      },
    });
    map.addLayer({
      id: BLM_IDENTIFIER_STROKE_ID,
      type: "line",
      source: BLM_IDENTIFIER_SOURCE_ID,
      paint: {
        "line-color": "#b85c38",
        "line-width": 2.5,
        "line-opacity": 0.85,
      },
    });
  }

  function clearHighlight(map: MaplibreMap): void {
    try {
      if (map.getLayer(BLM_IDENTIFIER_STROKE_ID)) {
        map.removeLayer(BLM_IDENTIFIER_STROKE_ID);
      }
      if (map.getLayer(BLM_IDENTIFIER_FILL_ID)) {
        map.removeLayer(BLM_IDENTIFIER_FILL_ID);
      }
      if (map.getSource(BLM_IDENTIFIER_SOURCE_ID)) {
        map.removeSource(BLM_IDENTIFIER_SOURCE_ID);
      }
    } catch {
      // Map is mid-teardown — swallow.
    }
  }

  async function onClick(
    map: MaplibreMap,
    e: MapMouseEvent,
  ): Promise<void> {
    // Cancel any in-flight query, close previous popup (which clears
    // the highlight via the close handler below), set up new state.
    abort?.abort();
    abort = new AbortController();
    popup?.remove();
    boundMap = map;

    const { lng, lat } = e.lngLat;

    // Show loading popup immediately so the click feels responsive
    const thisPopup = new maplibregl.Popup({
      offset: 12,
      maxWidth: "260px",
    })
      .setLngLat(e.lngLat)
      .setHTML(
        '<div style="font-family:system-ui,sans-serif;font-size:12px;color:#6b7280;padding:2px;">Looking up office…</div>',
      )
      .addTo(map);

    // When this popup closes (X button, next click, etc), clear the
    // highlight — but only if it's still the "current" popup in our
    // closure state, so a stale close event from an already-replaced
    // popup doesn't wipe a newer highlight.
    thisPopup.on("close", () => {
      if (popup === thisPopup) {
        clearHighlight(map);
        popup = null;
      }
    });

    popup = thisPopup;

    try {
      const url = new URL(
        "https://gis.blm.gov/arcgis/rest/services/admin_boundaries/BLM_Natl_AdminUnit/MapServer/3/query",
      );
      url.searchParams.set("where", "1=1");
      url.searchParams.set("geometry", `${lng},${lat}`);
      url.searchParams.set("geometryType", "esriGeometryPoint");
      url.searchParams.set("inSR", "4326");
      url.searchParams.set("outSR", "4326");
      url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
      url.searchParams.set(
        "outFields",
        "ADM_UNIT_CD,ADMU_NAME,BLM_ORG_TYPE,ADMIN_ST,PARENT_NAME",
      );
      url.searchParams.set("returnGeometry", "true");
      url.searchParams.set("f", "json");

      const res = await fetch(url.toString(), { signal: abort.signal });
      if (!res.ok) throw new Error(`BLM query HTTP ${res.status}`);
      const data = await res.json();

      // Bail if the user clicked elsewhere or closed the popup while
      // the fetch was in flight.
      if (popup !== thisPopup) return;

      const features: ArcGisFeature[] = data.features ?? [];
      if (features.length === 0) {
        thisPopup.setHTML(
          '<div style="font-family:system-ui,sans-serif;font-size:12px;color:#6b7280;padding:2px;">Outside BLM field office jurisdiction.</div>',
        );
        return;
      }

      // Prefer the narrowest unit (Field > District > State) when
      // multiple overlapping jurisdictions contain the point.
      const priority: Record<string, number> = {
        Field: 0,
        District: 1,
        State: 2,
      };
      features.sort((a, b) => {
        const pa = priority[a.attributes.BLM_ORG_TYPE ?? ""] ?? 99;
        const pb = priority[b.attributes.BLM_ORG_TYPE ?? ""] ?? 99;
        return pa - pb;
      });

      const feature = features[0];

      // Draw the office boundary as a highlight before updating the
      // popup so the visual feedback is simultaneous.
      if (feature.geometry?.rings && feature.geometry.rings.length > 0) {
        addHighlight(map, ringsToGeometry(feature.geometry.rings));
      }

      thisPopup.setHTML(buildFieldOfficePopupHtml(feature.attributes));
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") return;
      if (popup !== thisPopup) return;
      thisPopup.setHTML(
        '<div style="font-family:system-ui,sans-serif;font-size:12px;color:#ef4444;padding:2px;">Could not look up office.</div>',
      );
    }
  }

  function dispose(): void {
    abort?.abort();
    if (boundMap) {
      clearHighlight(boundMap);
      boundMap = null;
    }
    popup?.remove();
    popup = null;
  }

  return { onClick, dispose };
}
