<script lang="ts">
  /**
   * BLMOfficeFinder — interactive search + list component for locating
   * BLM field offices. Map initialization deferred to Phase 1.
   *
   * Hydrated as a Svelte island via Astro's client:visible directive:
   *   <BLMOfficeFinder client:visible offices={offices} />
   */

  import type { BLMOffice } from "@lib/blm/types";
  import { officeTypeLabels } from "@lib/badges";

  type OfficeItem = Pick<BLMOffice, "id" | "name" | "type" | "state" | "lat" | "lng" | "address">;

  interface Props {
    offices?: OfficeItem[];
  }

  let { offices = [] }: Props = $props();

  let searchQuery = $state("");
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

  function handleSearch() {
    // Filtering is reactive via $derived on searchQuery.
    // In Phase 1, this will also trigger geocoding for zip codes.
  }
</script>

<div class="flex flex-col gap-4 w-full">
  <!-- Search bar -->
  <div class="flex gap-2">
    <input
      type="text"
      placeholder="Search by name, state, or zip code..."
      class="input input-bordered flex-1"
      bind:value={searchQuery}
      oninput={handleSearch}
      onkeydown={(e) => e.key === "Enter" && handleSearch()}
    />
    <button class="btn btn-primary" onclick={handleSearch}>
      Search
    </button>
  </div>

  <!-- Map + results layout -->
  <div class="flex flex-col lg:flex-row gap-4">
    <!-- Map container (placeholder until Phase 1) -->
    <div
      class="w-full lg:w-2/3 h-[400px] lg:h-[500px] rounded-lg border border-base-300 bg-base-300/50 flex items-center justify-center"
    >
      <div class="text-center text-base-content/40">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <p class="font-semibold">Interactive map coming in Phase 1</p>
        <p class="text-sm mt-1">Use the search to find offices by name or state</p>
      </div>
    </div>

    <!-- Results list -->
    <div class="w-full lg:w-1/3 flex flex-col gap-3 max-h-[500px] overflow-y-auto">
      {#if filteredOffices.length === 0}
        <div class="card bg-base-100">
          <div class="card-body items-center text-center">
            <p class="text-base-content/60">
              {searchQuery ? "No offices found matching your search." : "Search to find BLM field offices."}
            </p>
          </div>
        </div>
      {:else}
        {#each filteredOffices as office (office.id)}
          <a
            href={`/offices/${office.id}`}
            class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer text-left"
          >
            <div class="card-body p-4">
              <h3 class="card-title text-sm">{office.name}</h3>
              <div class="flex gap-1 flex-wrap">
                <span class="badge badge-sm badge-outline">{officeTypeLabels[office.type] ?? office.type}</span>
                <span class="badge badge-sm badge-ghost">{office.state}</span>
              </div>
              {#if office.address}
                <p class="text-xs text-base-content/50 mt-1">{office.address}</p>
              {/if}
            </div>
          </a>
        {/each}
      {/if}
    </div>
  </div>
</div>
