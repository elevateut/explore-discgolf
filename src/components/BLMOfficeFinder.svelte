<script lang="ts">
  /**
   * BLMOfficeFinder — interactive MapLibre map + sidebar for locating
   * BLM field offices across the western United States.
   *
   * Hydrated as a Svelte island via Astro's client:visible directive:
   *   <BLMOfficeFinder client:visible offices={offices} />
   */

  import maplibregl from "maplibre-gl";
  import "maplibre-gl/dist/maplibre-gl.css";
  import { officeTypeLabels } from "@lib/badges";

  /** Shape of each office passed as a prop. */
  interface OfficeItem {
    id: string;
    name: string;
    type: string;
    state: string;
    lat: number;
    lng: number;
    address?: string;
  }

  interface Props {
    offices?: OfficeItem[];
  }

  let { offices = [] }: Props = $props();

  // ---------------------------------------------------------------------------
  // Reactive state
  // ---------------------------------------------------------------------------

  let searchQuery = $state("");
  let selectedOfficeId = $state<string | null>(null);
  let mapContainer: HTMLDivElement | undefined = $state();
  let map: maplibregl.Map | undefined = $state();
  let popup: maplibregl.Popup | undefined = $state();
  let mapReady = $state(false);

  // ---------------------------------------------------------------------------
  // Office type color mapping
  // ---------------------------------------------------------------------------

  const typeColors: Record<string, string> = {
    field: "#B85C38",
    district: "#1A8BA3",
    state: "#D4952B",
    other: "#5B7F3B",
  };

  // ---------------------------------------------------------------------------
  // Derived: filtered + grouped offices
  // ---------------------------------------------------------------------------

  let filteredOffices = $derived.by(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return offices;
    return offices.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.state.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        (o.address && o.address.toLowerCase().includes(q))
    );
  });

  /** When geocoded results exist, show those. Otherwise group filtered offices by state. */
  let displayOffices = $derived.by(() => {
    return sortedByDistance.length > 0 ? sortedByDistance : filteredOffices;
  });

  let groupedByState = $derived.by(() => {
    if (sortedByDistance.length > 0) return []; // Don't group when showing proximity results
    const groups: Record<string, OfficeItem[]> = {};
    for (const office of filteredOffices) {
      if (!groups[office.state]) groups[office.state] = [];
      groups[office.state].push(office);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  });

  let selectedOffice = $derived.by(() => {
    if (!selectedOfficeId) return null;
    return offices.find((o) => o.id === selectedOfficeId) ?? null;
  });

  // ---------------------------------------------------------------------------
  // GeoJSON source data
  // ---------------------------------------------------------------------------

  function buildGeoJSON(items: OfficeItem[]): GeoJSON.FeatureCollection {
    return {
      type: "FeatureCollection",
      features: items
        .filter((o) => o.lat && o.lng)
        .map((o) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [o.lng, o.lat],
          },
          properties: {
            id: o.id,
            name: o.name,
            type: o.type,
            state: o.state,
            address: o.address ?? "",
          },
        })),
    };
  }

  // ---------------------------------------------------------------------------
  // Map initialization
  // ---------------------------------------------------------------------------

  $effect(() => {
    if (!mapContainer) return;

    const m = new maplibregl.Map({
      container: mapContainer,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [-98.5, 39.8],
      zoom: 3.5,
      attributionControl: true,
    });

    m.addControl(new maplibregl.NavigationControl(), "top-right");

    m.on("load", () => {
      // Add GeoJSON source
      m.addSource("offices", {
        type: "geojson",
        data: buildGeoJSON(offices),
      });

      // Circle layer for all offices
      m.addLayer({
        id: "offices-circles",
        type: "circle",
        source: "offices",
        paint: {
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            9,
            6,
          ],
          "circle-color": [
            "match",
            ["get", "type"],
            "field",
            typeColors.field,
            "district",
            typeColors.district,
            "state",
            typeColors.state,
            typeColors.other,
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.9,
        },
      });

      // Highlight ring for selected office
      m.addLayer({
        id: "offices-selected",
        type: "circle",
        source: "offices",
        paint: {
          "circle-radius": 12,
          "circle-color": "transparent",
          "circle-stroke-color": "#B85C38",
          "circle-stroke-width": 2.5,
        },
        filter: ["==", ["get", "id"], ""],
      });

      mapReady = true;
    });

    // ----- Hover interaction -----
    let hoveredFeatureId: string | number | null = null;

    m.on("mouseenter", "offices-circles", () => {
      m.getCanvas().style.cursor = "pointer";
    });

    m.on("mouseleave", "offices-circles", () => {
      m.getCanvas().style.cursor = "";
      if (hoveredFeatureId !== null) {
        m.setFeatureState(
          { source: "offices", id: hoveredFeatureId },
          { hover: false }
        );
        hoveredFeatureId = null;
      }
    });

    m.on("mousemove", "offices-circles", (e) => {
      if (!e.features || e.features.length === 0) return;
      if (hoveredFeatureId !== null) {
        m.setFeatureState(
          { source: "offices", id: hoveredFeatureId },
          { hover: false }
        );
      }
      hoveredFeatureId = e.features[0].id ?? null;
      if (hoveredFeatureId !== null) {
        m.setFeatureState(
          { source: "offices", id: hoveredFeatureId },
          { hover: true }
        );
      }
    });

    // ----- Click interaction -----
    m.on("click", "offices-circles", (e) => {
      if (!e.features || e.features.length === 0) return;
      const props = e.features[0].properties;
      if (props?.id) {
        selectOffice(props.id as string);
      }
    });

    map = m;

    return () => {
      popup?.remove();
      m.remove();
      map = undefined;
      mapReady = false;
    };
  });

  // ---------------------------------------------------------------------------
  // Update GeoJSON source when filtered offices change (needs promoteId)
  // We use feature index as id for feature-state hover support.
  // ---------------------------------------------------------------------------

  $effect(() => {
    if (!map || !mapReady) return;
    const source = map.getSource("offices") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const geojson = buildGeoJSON(offices);
    // Assign numeric ids for feature-state support
    geojson.features.forEach((f, i) => {
      f.id = i;
    });
    source.setData(geojson);
  });

  // ---------------------------------------------------------------------------
  // Update selected highlight filter when selection changes
  // ---------------------------------------------------------------------------

  $effect(() => {
    if (!map || !mapReady) return;
    const filterId = selectedOfficeId ?? "";
    map.setFilter("offices-selected", ["==", ["get", "id"], filterId]);
  });

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function selectOffice(officeId: string) {
    selectedOfficeId = officeId;
    const office = offices.find((o) => o.id === officeId);
    if (!office || !map) return;

    map.flyTo({
      center: [office.lng, office.lat],
      zoom: 9,
      duration: 1200,
    });

    showPopup(office);
  }

  function showPopup(office: OfficeItem) {
    if (!map) return;
    popup?.remove();

    const typeLabel = officeTypeLabels[office.type] ?? office.type;
    const html = `
      <div style="font-family: system-ui, sans-serif; min-width: 180px;">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #1E2D3B;">
          ${escapeHtml(office.name)}
        </div>
        <div style="font-size: 12px; color: ${typeColors[office.type] ?? typeColors.other}; margin-bottom: 6px;">
          ${escapeHtml(typeLabel)}
        </div>
        <a href="/offices/${encodeURIComponent(office.id)}"
           style="font-size: 12px; color: #B85C38; text-decoration: underline;">
          View Details &rarr;
        </a>
      </div>
    `;

    popup = new maplibregl.Popup({ offset: 14, closeButton: true, maxWidth: "260px" })
      .setLngLat([office.lng, office.lat])
      .setHTML(html)
      .addTo(map);
  }

  function escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function clearSelection() {
    selectedOfficeId = null;
    popup?.remove();
    if (map) {
      map.flyTo({
        center: [-98.5, 39.8],
        zoom: 3.5,
        duration: 1000,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Geocoding via Nominatim
  // ---------------------------------------------------------------------------

  let isGeocoding = $state(false);
  let geocodeError = $state<string | null>(null);
  let sortedByDistance = $state<OfficeItem[]>([]);
  let geocodeCenter = $state<[number, number] | null>(null);

  function haversineDistance(
    lat1: number, lng1: number, lat2: number, lng2: number,
  ): number {
    const R = 3959; // miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Show the nearest offices to a given lat/lng, fly the map there,
   * and select the closest one.
   */
  function showNearby(lat: number, lng: number, zoom = 6) {
    geocodeCenter = [lng, lat];
    const withDistance = offices.map((o) => ({
      office: o,
      distance: haversineDistance(lat, lng, o.lat, o.lng),
    }));
    withDistance.sort((a, b) => a.distance - b.distance);
    sortedByDistance = withDistance.slice(0, 20).map((w) => w.office);

    if (map) {
      map.flyTo({ center: [lng, lat], zoom, duration: 1200 });
    }
    if (sortedByDistance.length) {
      selectOffice(sortedByDistance[0].id);
    }
  }

  async function geocodeAndSearch(query: string) {
    isGeocoding = true;
    geocodeError = null;
    sortedByDistance = [];
    geocodeCenter = null;

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=us&limit=1&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "EXPLOREDiscGolf/1.0 (explorediscgolf.org)" },
      });
      if (!res.ok) throw new Error("Geocoding request failed");
      const results = await res.json();

      if (!results.length) {
        geocodeError = `No location found for "${query}"`;
        return;
      }

      const lat = parseFloat(results[0].lat);
      const lng = parseFloat(results[0].lon);
      showNearby(lat, lng);
    } catch (err: any) {
      geocodeError = err.message || "Geocoding failed";
    } finally {
      isGeocoding = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Browser geolocation
  // ---------------------------------------------------------------------------

  let locating = $state(false);
  let locationDismissed = $state(false);

  async function useMyLocation() {
    if (!navigator.geolocation) {
      geocodeError = "Geolocation is not supported by your browser.";
      return;
    }
    locating = true;
    geocodeError = null;
    locationDismissed = true;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locating = false;
        searchQuery = "";
        showNearby(pos.coords.latitude, pos.coords.longitude, 7);
      },
      (err) => {
        locating = false;
        if (err.code === err.PERMISSION_DENIED) {
          geocodeError = "Location access denied. Try searching by zip code instead.";
        } else {
          geocodeError = "Could not determine your location. Try searching by zip code.";
        }
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  }

  async function handleSearch() {
    const q = searchQuery.trim();
    if (!q) {
      clearSelection();
      return;
    }

    // If the query looks like a zip code or city/state, geocode it
    const looksLikeLocation = /^\d{5}$/.test(q) || /,\s*[A-Z]{2}$/i.test(q) || /\d/.test(q);
    if (looksLikeLocation) {
      await geocodeAndSearch(q);
    } else {
      // Text search — just filter (reactive via $derived)
      sortedByDistance = [];
      geocodeCenter = null;
      if (selectedOfficeId) {
        selectedOfficeId = null;
        popup?.remove();
      }
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }
</script>

<div class="flex flex-col gap-3 w-full">
  <!-- Location prompt banner -->
  {#if !locationDismissed && !sortedByDistance.length && !searchQuery}
    <div class="flex items-center gap-3 bg-info/10 border border-info/20 rounded-lg px-4 py-3">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-info shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <p class="text-sm text-base-content/70 flex-1">Find BLM offices near you?</p>
      <button class="btn btn-info btn-sm text-white" onclick={useMyLocation} disabled={locating}>
        {#if locating}
          <span class="loading loading-spinner loading-xs"></span>
        {:else}
          Use my location
        {/if}
      </button>
      <button class="btn btn-ghost btn-xs" onclick={() => locationDismissed = true} aria-label="Dismiss">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  {/if}

  <!-- Search bar -->
  <div class="flex gap-2">
    <input
      type="text"
      placeholder="Search by zip code, city, or office name..."
      class="input input-bordered flex-1"
      bind:value={searchQuery}
      oninput={handleSearch}
      onkeydown={handleKeydown}
      aria-label="Search BLM offices"
    />
    <button
      class="btn btn-ghost btn-square"
      onclick={useMyLocation}
      disabled={locating}
      title="Use my location"
      aria-label="Use my location"
    >
      {#if locating}
        <span class="loading loading-spinner loading-sm"></span>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
        </svg>
      {/if}
    </button>
    <button class="btn btn-primary" onclick={handleSearch} disabled={isGeocoding}>
      {#if isGeocoding}
        <span class="loading loading-spinner loading-sm"></span>
      {:else}
        Search
      {/if}
    </button>
    {#if searchQuery || selectedOfficeId}
      <button
        class="btn btn-ghost btn-sm self-center"
        onclick={() => {
          searchQuery = "";
          sortedByDistance = [];
          geocodeCenter = null;
          geocodeError = null;
          clearSelection();
        }}
        aria-label="Clear search"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    {/if}
  </div>

  <!-- Map + sidebar split layout -->
  <div class="flex flex-col lg:flex-row gap-4">
    <!-- Map container -->
    <div class="w-full lg:w-2/3 relative">
      <div
        bind:this={mapContainer}
        class="h-[300px] lg:h-[500px] rounded-lg overflow-hidden border border-base-300"
        role="application"
        aria-label="Map of BLM offices"
      ></div>

      <!-- Map legend -->
      <div class="absolute bottom-3 left-3 bg-base-100/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs shadow-md border border-base-300">
        <div class="font-semibold mb-1 text-base-content/70">Office Types</div>
        <div class="flex flex-col gap-0.5">
          {#each Object.entries(typeColors) as [type, color]}
            <div class="flex items-center gap-1.5">
              <span
                class="inline-block w-2.5 h-2.5 rounded-full border border-white"
                style="background-color: {color};"
              ></span>
              <span class="text-base-content/60">{officeTypeLabels[type] ?? type}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Sidebar: office list -->
    <div class="w-full lg:w-1/3 flex flex-col gap-0 max-h-[500px] overflow-y-auto rounded-lg border border-base-300 bg-base-100">
      <!-- Sidebar header -->
      <div class="sticky top-0 bg-base-100 z-10 px-4 py-3 border-b border-base-300">
        {#if geocodeError}
          <p class="text-sm text-error">{geocodeError}</p>
        {/if}
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold text-base-content/70">
            {#if sortedByDistance.length > 0}
              {sortedByDistance.length} nearest offices
            {:else if searchQuery}
              {filteredOffices.length} result{filteredOffices.length !== 1 ? "s" : ""}
            {:else}
              {offices.length} offices
            {/if}
          </span>
          {#if selectedOffice}
            <button
              class="btn btn-ghost btn-xs"
              onclick={clearSelection}
            >
              Clear selection
            </button>
          {/if}
        </div>
      </div>

      <!-- Office list -->
      <div class="flex flex-col">
        {#if displayOffices.length === 0}
          <div class="p-6 text-center">
            <p class="text-base-content/50 text-sm">
              {searchQuery ? "No offices match your search." : "No offices available."}
            </p>
          </div>
        {:else if sortedByDistance.length > 0}
          <!-- Proximity results (flat list, no grouping) -->
          {#each sortedByDistance as office (office.id)}
            <button
              class="w-full text-left px-4 py-3 hover:bg-base-200/60 transition-colors border-b border-base-200/50 last:border-b-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 {selectedOfficeId === office.id ? 'bg-primary/5 ring-2 ring-primary/30' : ''}"
              onclick={() => selectOffice(office.id)}
              aria-label="Select {office.name}"
              aria-pressed={selectedOfficeId === office.id}
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-medium text-base-content leading-snug truncate">
                    {office.name}
                  </div>
                  <div class="flex gap-1.5 mt-1 flex-wrap">
                    <span
                      class="badge badge-xs border-0 text-white"
                      style="background-color: {typeColors[office.type] ?? typeColors.other};"
                    >
                      {officeTypeLabels[office.type] ?? office.type}
                    </span>
                    <span class="badge badge-xs badge-ghost">{office.state}</span>
                  </div>
                </div>
                <a
                  href="/offices/{office.id}"
                  class="btn btn-ghost btn-xs text-primary shrink-0 mt-0.5"
                  onclick={(e) => e.stopPropagation()}
                >
                  View
                </a>
              </div>
            </button>
          {/each}
        {:else}
          <!-- Grouped by state -->
          {#each groupedByState as [state, stateOffices] (state)}
            <div class="border-b border-base-200 last:border-b-0">
              <div class="px-4 py-2 bg-base-200/50 text-xs font-bold text-base-content/60 uppercase tracking-wide sticky top-[49px] z-[5]">
                {state}
                <span class="font-normal ml-1">({stateOffices.length})</span>
              </div>
              {#each stateOffices as office (office.id)}
                <button
                  class="w-full text-left px-4 py-3 hover:bg-base-200/60 transition-colors border-b border-base-200/50 last:border-b-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 {selectedOfficeId === office.id ? 'bg-primary/5 ring-2 ring-primary/30' : ''}"
                  onclick={() => selectOffice(office.id)}
                  aria-label="Select {office.name}"
                  aria-pressed={selectedOfficeId === office.id}
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0 flex-1">
                      <div class="text-sm font-medium text-base-content leading-snug truncate">
                        {office.name}
                      </div>
                      <div class="flex gap-1.5 mt-1 flex-wrap">
                        <span
                          class="badge badge-xs border-0 text-white"
                          style="background-color: {typeColors[office.type] ?? typeColors.other};"
                        >
                          {officeTypeLabels[office.type] ?? office.type}
                        </span>
                        <span class="badge badge-xs badge-ghost">{office.state}</span>
                      </div>
                      {#if office.address}
                        <p class="text-xs text-base-content/40 mt-1 truncate">{office.address}</p>
                      {/if}
                    </div>
                    <a
                      href="/offices/{office.id}"
                      class="btn btn-ghost btn-xs text-primary shrink-0 mt-0.5"
                      onclick={(e) => e.stopPropagation()}
                    >
                      View
                    </a>
                  </div>
                </button>
              {/each}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  /* MapLibre popup styling overrides */
  :global(.maplibregl-popup-content) {
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  :global(.maplibregl-popup-close-button) {
    font-size: 16px;
    padding: 2px 6px;
    color: #666;
  }

  :global(.maplibregl-popup-close-button:hover) {
    color: #333;
    background: transparent;
  }

  /* Sidebar scrollbar styling */
  .overflow-y-auto {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.15) transparent;
  }

  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.15);
    border-radius: 3px;
  }
</style>
