<script lang="ts">
  /**
   * BLMOfficeFinder — interactive map + search component for locating
   * BLM field offices and viewing office details.
   *
   * Hydrated as a Svelte island via Astro's client:visible directive:
   *   <BLMOfficeFinder client:visible />
   *
   * TODO:
   * - Initialize MapLibre GL map in the #blm-map container on mount
   * - Load BLM field office boundary polygons from ArcGIS tile service
   * - Implement zip code / location search → nearest office lookup
   * - On office selection, fly to office bounds and show OfficeCard
   * - Add GeoJSON source for office point markers with clustering
   */

  import maplibregl from "maplibre-gl";
  import type { BLMOffice } from "@lib/blm/types";

  // TODO: import { getFieldOffices, getFieldOfficeBoundary } from "@lib/blm/client";

  let searchQuery = $state("");
  let selectedOffice: BLMOffice | null = $state(null);
  let offices: BLMOffice[] = $state([]);
  let mapContainer: HTMLDivElement;
  let map: maplibregl.Map | undefined = $state(undefined);

  // TODO: initialize map on mount
  // $effect(() => {
  //   if (mapContainer && !map) {
  //     map = new maplibregl.Map({
  //       container: mapContainer,
  //       style: "https://demotiles.maplibre.org/style.json",
  //       center: [-98.5795, 39.8283], // center of US
  //       zoom: 4,
  //     });
  //   }
  // });

  function handleSearch() {
    // TODO: geocode searchQuery → lat/lng, then find nearest BLM office
    console.warn("[BLMOfficeFinder] search not implemented:", searchQuery);
  }
</script>

<div class="flex flex-col gap-4 w-full">
  <!-- Search bar -->
  <div class="flex gap-2">
    <input
      type="text"
      placeholder="Enter zip code or location..."
      class="input input-bordered flex-1"
      bind:value={searchQuery}
      onkeydown={(e) => e.key === "Enter" && handleSearch()}
    />
    <button class="btn btn-primary" onclick={handleSearch}>
      Find Office
    </button>
  </div>

  <!-- Map + results layout -->
  <div class="flex flex-col lg:flex-row gap-4">
    <!-- Map container -->
    <div
      bind:this={mapContainer}
      id="blm-map"
      class="w-full lg:w-2/3 h-[400px] lg:h-[600px] rounded-lg border border-base-300 bg-base-200 flex items-center justify-center"
    >
      <span class="text-base-content/50">Map loading...</span>
    </div>

    <!-- Results list -->
    <div class="w-full lg:w-1/3 flex flex-col gap-3 max-h-[600px] overflow-y-auto">
      {#if offices.length === 0}
        <div class="card bg-base-200">
          <div class="card-body items-center text-center">
            <p class="text-base-content/60">
              Search by zip code or click the map to find BLM field offices near you.
            </p>
          </div>
        </div>
      {:else}
        {#each offices as office (office.id)}
          <button
            class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer text-left"
            onclick={() => (selectedOffice = office)}
          >
            <div class="card-body p-4">
              <h3 class="card-title text-sm">{office.name}</h3>
              <div class="flex gap-1">
                <span class="badge badge-sm badge-outline">{office.type}</span>
                <span class="badge badge-sm badge-ghost">{office.state}</span>
              </div>
            </div>
          </button>
        {/each}
      {/if}
    </div>
  </div>
</div>
