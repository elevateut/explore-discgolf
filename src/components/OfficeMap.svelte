<script lang="ts">
  /**
   * OfficeMap — renders a MapLibre map showing a BLM field office location
   * and its boundary polygon fetched from the BLM ArcGIS MapServer.
   *
   * Usage: <OfficeMap client:visible officeId="UTC01000" lat={37.6775} lng={-113.0619} />
   */

  import maplibregl from "maplibre-gl";
  import "maplibre-gl/dist/maplibre-gl.css";

  interface Props {
    officeId: string;
    lat: number;
    lng: number;
    officeName?: string;
  }

  let { officeId, lat, lng, officeName = "" }: Props = $props();

  let mapContainer: HTMLDivElement | undefined = $state();
  let loadingBoundary = $state(true);
  let boundaryError = $state<string | null>(null);

  const ADMIN_UNIT_BASE =
    "https://gis.blm.gov/arcgis/rest/services/admin_boundaries/BLM_Natl_AdminUnit/MapServer";

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
    if (!mapContainer) return;

    const m = new maplibregl.Map({
      container: mapContainer,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [lng, lat],
      zoom: 8,
      attributionControl: true,
    });

    m.addControl(new maplibregl.NavigationControl(), "top-right");

    // Office marker
    new maplibregl.Marker({ color: "#B85C38" })
      .setLngLat([lng, lat])
      .addTo(m);

    m.on("load", async () => {
      try {
        const boundary = await fetchBoundary();
        if (boundary) {
          m.addSource("boundary", {
            type: "geojson",
            data: boundary,
          });

          // Fill
          m.addLayer({
            id: "boundary-fill",
            type: "fill",
            source: "boundary",
            paint: {
              "fill-color": "#1A8BA3", // Basin Teal
              "fill-opacity": 0.12,
            },
          });

          // Stroke
          m.addLayer({
            id: "boundary-stroke",
            type: "line",
            source: "boundary",
            paint: {
              "line-color": "#1A8BA3",
              "line-width": 2,
              "line-opacity": 0.6,
            },
          });

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
        boundaryError = "Could not load boundary data.";
      } finally {
        loadingBoundary = false;
      }
    });

    return () => {
      m.remove();
    };
  });
</script>

<div class="relative">
  <div
    bind:this={mapContainer}
    class="h-[350px] lg:h-[400px] rounded-lg overflow-hidden border border-base-300"
    role="application"
    aria-label="Map showing {officeName || officeId} boundary"
  ></div>

  {#if loadingBoundary}
    <div class="absolute inset-0 flex items-center justify-center bg-base-200/50 rounded-lg pointer-events-none">
      <span class="loading loading-spinner loading-md text-primary"></span>
    </div>
  {/if}

  {#if boundaryError}
    <div class="absolute bottom-3 left-3 bg-base-100/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs shadow-md">
      <span class="text-base-content/50">{boundaryError}</span>
    </div>
  {/if}

  <!-- Legend -->
  <div class="absolute bottom-3 right-3 bg-base-100/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs shadow-md border border-base-300">
    <div class="flex items-center gap-1.5">
      <span class="inline-block w-3 h-3 rounded-sm border border-base-300" style="background-color: rgba(26, 139, 163, 0.12); border-color: #1A8BA3;"></span>
      <span class="text-base-content/60">Office boundary</span>
    </div>
  </div>
</div>
