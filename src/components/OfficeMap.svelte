<script lang="ts">
  /**
   * OfficeMap — interactive scouting map for a single BLM field office.
   *
   * Renders the office's admin boundary polygon over a 3D-terrain basemap
   * (Positron + hillshade by default) and lets the user:
   *   - tilt the map to see hills (Ctrl+drag, or the pitch control)
   *   - switch between Terrain / Satellite / Topo basemaps
   *   - go fullscreen for serious site scouting
   *
   * Usage: <OfficeMap client:visible officeId="UTC01000" lat={37.6775} lng={-113.0619} />
   */

  import maplibregl from "maplibre-gl";
  import "maplibre-gl/dist/maplibre-gl.css";
  import {
    BasemapSwitcher,
    OverlayToggle,
    SMA_LAYER_ID,
    applySmaOverlay,
    applyTerrain,
    basemapStyle,
    type BasemapId,
  } from "@lib/map/terrain";

  interface Props {
    officeId: string;
    lat: number;
    lng: number;
    officeName?: string;
  }

  let { officeId, lat, lng, officeName = "" }: Props = $props();

  let mapWrapper: HTMLDivElement | undefined = $state();
  let mapContainer: HTMLDivElement | undefined = $state();
  let loadingBoundary = $state(true);
  let boundaryError = $state<string | null>(null);

  const ADMIN_UNIT_BASE =
    "https://gis.blm.gov/arcgis/rest/services/admin_boundaries/BLM_Natl_AdminUnit/MapServer";

  /** Escape a string for safe interpolation into popup HTML. */
  function escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Fetch boundary polygon from BLM ArcGIS and convert to GeoJSON.
   */
  async function fetchBoundary(): Promise<GeoJSON.Feature | null> {
    const url = new URL(`${ADMIN_UNIT_BASE}/3/query`);
    url.searchParams.set("f", "json");
    url.searchParams.set("where", `ADM_UNIT_CD='${officeId}'`);
    url.searchParams.set("outFields", "ADM_UNIT_CD,ADMU_NAME");
    url.searchParams.set("returnGeometry", "true");
    url.searchParams.set("outSR", "4326");

    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature?.geometry?.rings) return null;

    // Convert ArcGIS rings to GeoJSON
    const rings = feature.geometry.rings as number[][][];
    const coordinates = rings.map((ring: number[][]) =>
      ring.map(([x, y]: number[]) => [x, y] as [number, number])
    );

    return {
      type: "Feature",
      properties: { id: officeId, name: feature.attributes?.ADMU_NAME },
      geometry:
        coordinates.length === 1
          ? { type: "Polygon", coordinates }
          : { type: "MultiPolygon", coordinates: coordinates.map((r) => [r]) },
    };
  }

  $effect(() => {
    if (!mapContainer || !mapWrapper) return;

    // Local closure state — kept out of $state to avoid re-running this effect
    // when the basemap or boundary changes mid-session.
    let activeBasemap: BasemapId = "terrain";
    let smaVisible = true;
    let boundaryFeature: GeoJSON.Feature | null = null;
    let cancelled = false;
    let clickAbort: AbortController | null = null;
    let clickPopup: maplibregl.Popup | null = null;

    const m = new maplibregl.Map({
      container: mapContainer,
      style: basemapStyle(activeBasemap),
      center: [lng, lat],
      zoom: 8,
      pitch: 0,
      maxPitch: 75,
      attributionControl: { compact: true },
    });

    // Office marker (DOM overlay — survives setStyle, no need to re-add)
    new maplibregl.Marker({ color: "#B85C38" })
      .setLngLat([lng, lat])
      .addTo(m);

    // ----- Controls -----
    m.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "top-right",
    );
    m.addControl(
      new maplibregl.ScaleControl({ unit: "imperial", maxWidth: 120 }),
      "bottom-left",
    );
    m.addControl(
      new maplibregl.FullscreenControl({ container: mapWrapper }),
      "top-right",
    );

    const switcher = new BasemapSwitcher(activeBasemap, (id) => {
      activeBasemap = id;
      // Detach terrain BEFORE setStyle so MapLibre doesn't try to reference
      // the old DEM source mid-swap and throw "source does not exist".
      m.setTerrain(null);
      m.setStyle(basemapStyle(id), { diff: false });
      // The style.load handler below re-adds terrain + boundary on the new style.
    });
    m.addControl(switcher, "top-left");

    // BLM Surface Management Agency overlay toggle. The initial layer is
    // added inside handleStyleLoad() once the style has parsed.
    const smaToggle = new OverlayToggle("BLM Lands", smaVisible, (visible) => {
      smaVisible = visible;
      if (m.getLayer(SMA_LAYER_ID)) {
        m.setLayoutProperty(
          SMA_LAYER_ID,
          "visibility",
          visible ? "visible" : "none",
        );
      }
    });
    m.addControl(smaToggle, "top-left");

    // ----- Layer management -----
    function addBoundaryLayers(map: maplibregl.Map) {
      if (!boundaryFeature || map.getSource("boundary")) return;

      map.addSource("boundary", {
        type: "geojson",
        data: boundaryFeature,
      });

      map.addLayer({
        id: "boundary-fill",
        type: "fill",
        source: "boundary",
        paint: {
          "fill-color": "#1A8BA3", // Basin Teal
          "fill-opacity": 0.12,
        },
      });

      map.addLayer({
        id: "boundary-stroke",
        type: "line",
        source: "boundary",
        paint: {
          "line-color": "#1A8BA3",
          "line-width": 2,
          "line-opacity": 0.6,
        },
      });
    }

    // Re-add terrain + SMA overlay + boundary on every style load (initial
    // AND basemap swaps). Order matters: terrain goes under everything,
    // SMA overlay above terrain but under labels (via beforeId inside
    // applySmaOverlay), boundary on top.
    function handleStyleLoad() {
      if (cancelled) return;
      applyTerrain(m, activeBasemap === "terrain");
      applySmaOverlay(m, { visible: smaVisible });
      addBoundaryLayers(m);
      switcher.setCurrent(activeBasemap);
    }
    m.on("style.load", handleStyleLoad);

    // MapLibre doesn't always catch wrapper-fullscreen resizes automatically.
    // requestAnimationFrame ensures the new :fullscreen CSS is applied before
    // we measure the container.
    function handleFullscreenChange() {
      requestAnimationFrame(() => m.resize());
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // ----- Click to identify managing BLM field office -----
    // The SMA layer we render attributes only at the state level ("Bureau
    // of Land Management UT" for every polygon in Utah) so it can't tell
    // us which field office manages a clicked parcel. The AdminUnit layer
    // CAN — its polygons are the field-office jurisdictional boundaries,
    // and its ADM_UNIT_CD field is the same ID format as our office
    // detail pages, so we can link straight through with no fuzzy match.
    async function handleMapClick(e: maplibregl.MapMouseEvent) {
      if (!smaVisible) return;

      // Cancel any in-flight query and close the previous popup
      clickAbort?.abort();
      clickAbort = new AbortController();
      clickPopup?.remove();

      const { lng, lat } = e.lngLat;

      // Show a loading popup immediately so the click feels responsive
      clickPopup = new maplibregl.Popup({ offset: 12, maxWidth: "260px" })
        .setLngLat(e.lngLat)
        .setHTML(
          '<div style="font-family:system-ui,sans-serif;font-size:12px;color:#6b7280;padding:2px;">Looking up office…</div>',
        )
        .addTo(m);

      try {
        const url = new URL(
          "https://gis.blm.gov/arcgis/rest/services/admin_boundaries/BLM_Natl_AdminUnit/MapServer/3/query",
        );
        url.searchParams.set("where", "1=1");
        url.searchParams.set("geometry", `${lng},${lat}`);
        url.searchParams.set("geometryType", "esriGeometryPoint");
        url.searchParams.set("inSR", "4326");
        url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
        url.searchParams.set(
          "outFields",
          "ADM_UNIT_CD,ADMU_NAME,BLM_ORG_TYPE,ADMIN_ST,PARENT_NAME",
        );
        url.searchParams.set("returnGeometry", "false");
        url.searchParams.set("f", "json");

        const res = await fetch(url.toString(), { signal: clickAbort.signal });
        if (!res.ok) throw new Error(`BLM query HTTP ${res.status}`);
        const data = await res.json();

        // Guard against races where the user clicked elsewhere before
        // this query resolved.
        if (!clickPopup) return;

        const features = data.features ?? [];
        if (features.length === 0) {
          clickPopup.setHTML(
            '<div style="font-family:system-ui,sans-serif;font-size:12px;color:#6b7280;padding:2px;">Outside BLM field office jurisdiction.</div>',
          );
          return;
        }

        // AdminUnit returns all containing units at a point — field, district,
        // and state offices can overlap hierarchically. Prefer the narrowest
        // (Field > District > State).
        const priority: Record<string, number> = {
          Field: 0,
          District: 1,
          State: 2,
        };
        features.sort((a: { attributes: { BLM_ORG_TYPE?: string } }, b: { attributes: { BLM_ORG_TYPE?: string } }) => {
          const pa = priority[a.attributes.BLM_ORG_TYPE ?? ""] ?? 99;
          const pb = priority[b.attributes.BLM_ORG_TYPE ?? ""] ?? 99;
          return pa - pb;
        });

        const attrs = features[0].attributes;
        const adminCode = (attrs.ADM_UNIT_CD || "").toString().trim();
        const rawName = (attrs.ADMU_NAME || "").toString().trim();
        const orgType = (attrs.BLM_ORG_TYPE || "").toString().trim();
        const state = (attrs.ADMIN_ST || "").toString().trim();
        const parent = (attrs.PARENT_NAME || "").toString().trim();

        // BLM names are usually bare ("Salt Lake", "Cedar City") — append the
        // org type suffix for full display ("Salt Lake Field Office").
        const fullName = orgType && !/office|district/i.test(rawName)
          ? `${rawName} ${orgType} Office`
          : rawName || "BLM Administrative Unit";

        const metaParts: string[] = [];
        if (state) metaParts.push(escapeHtml(state));
        if (parent) metaParts.push(escapeHtml(parent));

        const linkHtml = adminCode
          ? `<a href="/offices/${encodeURIComponent(adminCode)}" style="display:inline-block;margin-top:6px;font-size:11px;color:#b85c38;text-decoration:underline;">View office details &rarr;</a>`
          : "";

        clickPopup.setHTML(
          `<div style="font-family:system-ui,sans-serif;padding:2px;min-width:180px;">
            <div style="font-weight:600;font-size:13px;color:#1e2d3b;line-height:1.25;margin-bottom:3px;">
              ${escapeHtml(fullName)}
            </div>
            <div style="font-size:11px;color:#6b7280;">
              Bureau of Land Management
            </div>
            ${metaParts.length ? `<div style="font-size:11px;color:#9ca3af;margin-top:4px;">${metaParts.join(" &middot; ")}</div>` : ""}
            ${linkHtml}
          </div>`,
        );
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") return;
        if (!clickPopup) return;
        clickPopup.setHTML(
          '<div style="font-family:system-ui,sans-serif;font-size:12px;color:#ef4444;padding:2px;">Could not look up office.</div>',
        );
      }
    }

    m.on("click", handleMapClick);

    // ----- One-time boundary fetch -----
    m.on("load", async () => {
      try {
        const boundary = await fetchBoundary();
        if (cancelled) return;

        if (boundary) {
          boundaryFeature = boundary;
          addBoundaryLayers(m);

          // Fit the map to the boundary
          const coords = boundary.geometry.type === "Polygon"
            ? (boundary.geometry as GeoJSON.Polygon).coordinates[0]
            : (boundary.geometry as GeoJSON.MultiPolygon).coordinates.flat(2);

          if (coords.length > 0) {
            const bounds = new maplibregl.LngLatBounds();
            for (const coord of coords) {
              bounds.extend(coord as [number, number]);
            }
            m.fitBounds(bounds, { padding: 40, maxZoom: 10 });
          }
        } else {
          boundaryError = "Boundary data not available for this office.";
        }
      } catch {
        if (!cancelled) boundaryError = "Could not load boundary data.";
      } finally {
        if (!cancelled) loadingBoundary = false;
      }
    });

    return () => {
      cancelled = true;
      clickAbort?.abort();
      clickPopup?.remove();
      clickPopup = null;
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      m.off("style.load", handleStyleLoad);
      m.off("click", handleMapClick);
      m.remove();
    };
  });
</script>

<div bind:this={mapWrapper} class="relative map-wrapper">
  <div
    bind:this={mapContainer}
    class="map-canvas h-[350px] lg:h-[400px] rounded-lg overflow-hidden border border-base-300"
    role="application"
    aria-label="Map showing {officeName || officeId} boundary"
  ></div>

  {#if loadingBoundary}
    <div class="absolute inset-0 flex items-center justify-center bg-base-200/50 rounded-lg pointer-events-none">
      <span class="loading loading-spinner loading-md text-primary"></span>
    </div>
  {/if}

  {#if boundaryError}
    <div class="absolute bottom-10 left-3 bg-base-100/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs shadow-md">
      <span class="text-base-content/50">{boundaryError}</span>
    </div>
  {/if}
</div>

<!-- Map legend — rendered in normal document flow below the map so it
     never collides with MapLibre's attribution, scale bar, or the click
     popup. Horizontal layout wraps on narrow screens. -->
<div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-xs text-base-content/70">
  <span class="font-semibold text-[10px] uppercase tracking-wide text-base-content/50">Legend</span>
  <div class="flex items-center gap-1.5">
    <span
      class="inline-block w-3 h-3 rounded-sm border border-black/10"
      style="background-color: #ffe778;"
    ></span>
    <span>BLM land</span>
  </div>
  <div class="flex items-center gap-1.5">
    <span
      class="inline-block w-3 h-3 rounded-sm border"
      style="background-color: rgba(26, 139, 163, 0.15); border-color: #1a8ba3;"
    ></span>
    <span>Office boundary</span>
  </div>
  <div class="flex items-center gap-1.5">
    <svg
      viewBox="0 0 24 32"
      xmlns="http://www.w3.org/2000/svg"
      class="w-3 h-4 shrink-0"
      aria-hidden="true"
    >
      <path
        d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z"
        fill="#b85c38"
      />
      <circle cx="12" cy="12" r="4" fill="#ffffff" />
    </svg>
    <span>Field office</span>
  </div>
</div>

<style>
  /* Fullscreen: wrapper fills viewport, .map-canvas inside fills the wrapper.
     Targeting .map-canvas by class avoids ambiguity with :first-child, which
     can be tripped up by Svelte's hydration anchors. Using vw/vh (rather than
     100%) bypasses any percentage-of-parent box-model surprises. */
  :global(.map-wrapper:fullscreen),
  :global(.map-wrapper:-webkit-full-screen),
  :global(.map-wrapper:-moz-full-screen) {
    width: 100vw;
    height: 100vh;
    background: #000;
  }
  :global(.map-wrapper:fullscreen .map-canvas),
  :global(.map-wrapper:-webkit-full-screen .map-canvas),
  :global(.map-wrapper:-moz-full-screen .map-canvas) {
    width: 100vw !important;
    height: 100vh !important;
    border-radius: 0 !important;
    border: none !important;
  }

  /* BasemapSwitcher — horizontal tab-style buttons in a single ctrl group.
     Selectors are scoped under .basemap-switcher to outweigh MapLibre's
     default `.maplibregl-ctrl-group button { width: 29px; height: 29px }`
     rule, which would otherwise crush the text labels. */
  :global(.basemap-switcher) {
    display: flex;
    overflow: hidden;
  }
  :global(.basemap-switcher button.basemap-switcher__btn) {
    width: auto;
    height: auto;
    min-width: 64px;
    background: white;
    border: none;
    border-right: 1px solid rgba(0, 0, 0, 0.08);
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.2;
    color: #4b5563;
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s;
    display: block;
  }
  :global(.basemap-switcher button.basemap-switcher__btn:last-child) {
    border-right: none;
  }
  :global(.basemap-switcher button.basemap-switcher__btn:hover) {
    background: #f3f4f6;
    color: #1f2937;
  }
  :global(.basemap-switcher button.basemap-switcher__btn.is-active) {
    background: #b85c38;
    color: white;
  }

  /* OverlayToggle — single toggle button, matches basemap switcher styling.
     Same specificity trick to outweigh MapLibre's 29x29 default. */
  :global(.overlay-toggle button.overlay-toggle__btn) {
    width: auto;
    height: auto;
    min-width: 64px;
    background: white;
    border: none;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.2;
    color: #4b5563;
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s;
    display: block;
  }
  :global(.overlay-toggle button.overlay-toggle__btn:hover) {
    background: #f3f4f6;
    color: #1f2937;
  }
  :global(.overlay-toggle button.overlay-toggle__btn.is-active) {
    background: #b85c38;
    color: white;
  }
</style>
