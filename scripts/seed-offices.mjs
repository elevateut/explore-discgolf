/**
 * Seed BLM offices from the ArcGIS MapServer.
 *
 * Fetches all ~220 BLM offices (state, district, field, other) from the
 * public AdminUnit MapServer and writes them to src/data/blm-offices.json.
 *
 * Usage: node scripts/seed-offices.mjs
 */

const ADMIN_UNIT_BASE =
  "https://gis.blm.gov/arcgis/rest/services/admin_boundaries/BLM_Natl_AdminUnit/MapServer";

const ORG_TYPE_MAP = {
  State: "state",
  District: "district",
  Field: "field",
  Other: "other",
};

async function fetchAllOffices() {
  const url = new URL(`${ADMIN_UNIT_BASE}/0/query`);
  url.searchParams.set("f", "json");
  url.searchParams.set("where", "1=1");
  url.searchParams.set("outFields", "*");
  url.searchParams.set("returnGeometry", "true");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("resultRecordCount", "1000");

  console.log("Fetching offices from BLM ArcGIS...");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const offices = data.features.map((f) => {
    const a = f.attributes;
    return {
      id: a.ADM_UNIT_CD,
      name: a.Label_Full_Name || a.ADMU_NAME,
      type: ORG_TYPE_MAP[a.BLM_ORG_TYPE] ?? "other",
      state: a.ADMIN_ST,
      lat: Math.round(f.geometry.y * 10000) / 10000,
      lng: Math.round(f.geometry.x * 10000) / 10000,
    };
  });

  // Sort by state, then type (state > district > field > other), then name
  const typeOrder = { state: 0, district: 1, field: 2, other: 3 };
  offices.sort((a, b) => {
    if (a.state !== b.state) return a.state.localeCompare(b.state);
    if (a.type !== b.type) return typeOrder[a.type] - typeOrder[b.type];
    return a.name.localeCompare(b.name);
  });

  return offices;
}

async function main() {
  const offices = await fetchAllOffices();

  const types = {};
  offices.forEach((o) => {
    types[o.type] = (types[o.type] || 0) + 1;
  });

  console.log(`Fetched ${offices.length} offices:`);
  console.log(`  State: ${types.state || 0}`);
  console.log(`  District: ${types.district || 0}`);
  console.log(`  Field: ${types.field || 0}`);
  console.log(`  Other: ${types.other || 0}`);
  console.log(`  States: ${[...new Set(offices.map((o) => o.state))].sort().join(", ")}`);

  const fs = await import("fs");
  const path = await import("path");
  const outPath = path.resolve("src/data/blm-offices.json");
  fs.writeFileSync(outPath, JSON.stringify(offices, null, 2) + "\n");
  console.log(`\nWritten to ${outPath}`);
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
