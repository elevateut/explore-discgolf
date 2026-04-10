/**
 * Import offices from blm-offices.json into Supabase.
 *
 * Upserts all offices by blm_unit_code, then seeds initial
 * engagement_status rows as 'no-contact' for offices without one.
 *
 * Usage: node scripts/import-offices.mjs
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Load .env
const envFile = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
function env(key) {
  return envFile.match(new RegExp(`${key}=(.+)`))?.[1]?.trim();
}

const url = env("SUPABASE_URL");
const key = env("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const offices = JSON.parse(
    fs.readFileSync(path.join(ROOT, "src/data/blm-offices.json"), "utf8")
  );
  console.log(`Importing ${offices.length} offices...`);

  // Upsert offices
  const rows = offices.map((o) => ({
    blm_unit_code: o.id,
    name: o.name,
    office_type: o.type,
    state: o.state,
    lat: o.lat,
    lng: o.lng,
  }));

  const { data: upserted, error: upsertErr } = await supabase
    .from("blm_offices")
    .upsert(rows, { onConflict: "blm_unit_code" })
    .select("id, blm_unit_code");

  if (upsertErr) {
    console.error("Upsert failed:", upsertErr.message);
    process.exit(1);
  }
  console.log(`Upserted ${upserted.length} offices.`);

  // Seed engagement_status for offices that don't have one yet
  const officeIds = upserted.map((o) => o.id);
  const { data: existing } = await supabase
    .from("engagement_status")
    .select("office_id")
    .in("office_id", officeIds);

  const existingIds = new Set((existing ?? []).map((e) => e.office_id));
  const newStatuses = officeIds
    .filter((id) => !existingIds.has(id))
    .map((id) => ({
      office_id: id,
      status: "no-contact",
    }));

  if (newStatuses.length > 0) {
    const { error: statusErr } = await supabase
      .from("engagement_status")
      .insert(newStatuses);

    if (statusErr) {
      console.error("Status seed failed:", statusErr.message);
      process.exit(1);
    }
    console.log(`Seeded ${newStatuses.length} engagement statuses.`);
  } else {
    console.log("All offices already have engagement status.");
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
