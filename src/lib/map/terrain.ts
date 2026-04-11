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

import type {
  IControl,
  Map as MaplibreMap,
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

// Dynamic image export from BLM's ArcGIS MapServer. MapLibre templates
// `{bbox-epsg-3857}` per tile request, and the server renders a PNG of the
// Surface Management Agency polygon layer on demand. `layers=show:1` picks
// just the polygon layer (not the server-side labels, which would clash
// with Positron's labels and can't be styled client-side).
const SMA_TILE_URL =
  "https://gis.blm.gov/arcgis/rest/services/lands/BLM_Natl_SMA_LimitedScale" +
  "/MapServer/export" +
  "?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857" +
  "&size=512,512&format=png32&transparent=true" +
  "&layers=show:1" +
  "&f=image";

/**
 * Idempotently add the BLM Surface Management Agency overlay — a dynamic
 * raster layer showing every acre of federal land classified by its active
 * surface-managing agency (BLM yellow, USFS green, NPS dark green, FWS,
 * DoD, tribal, etc.) across the continental US, Alaska, Hawaii, and
 * territories.
 *
 * BLM's SMA LimitedScale service only renders below scale ~1:36K (roughly
 * zoom 14 and wider), which is exactly the office-scouting zoom range we
 * care about. Past zoom ~14 the server returns nothing and the overlay
 * effectively hides — by which point a satellite basemap is more useful.
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
      tileSize: 512,
      attribution:
        'Surface lands: <a href="https://www.blm.gov" target="_blank" rel="noopener">© Bureau of Land Management</a>',
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
