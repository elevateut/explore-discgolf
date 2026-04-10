/**
 * FLiPT API Client — Disc golf course and shop search.
 *
 * Private API for the explore-discgolf application.
 * All requests require FLIPT_API_KEY in env.
 */

const FLIPT_BASE_URL = import.meta.env.FLIPT_BASE_URL || "https://fliptleagues.com";
const FLIPT_API_KEY = import.meta.env.FLIPT_API_KEY;

let _warned = false;

interface FliptEnvelope<T> {
  data: T;
  meta: { brand: string; domain: string; version: string; timestamp: string; requestId?: string };
  error: { code: string; message: string } | null;
}

interface NearbyResponse<T> {
  items: T[];
  totalCount: number;
  radiusMiles: number;
  centerLat: number;
  centerLng: number;
}

export interface FliptCourse {
  id: number;
  name: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceMiles: number | null;
  numberOfHoles: number | null;
  udiscUrl: string | null;
  udiscRating: number | null;
  udiscRatingCount: number | null;
  description: string | null;
  courseFeatures: string | null;
}

export interface FliptDiscShop {
  id: number;
  name: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceMiles: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  website: string | null;
  phoneNumber: string | null;
  businessHours: string | null;
  description: string | null;
  logoUrl: string | null;
  isOnlineRetailer: boolean;
}

/** Returns true when the FLiPT API key is configured. */
export function isFliptAvailable(): boolean {
  if (!FLIPT_API_KEY) {
    if (!_warned) {
      console.warn("[flipt/client] Missing FLIPT_API_KEY — course/shop search disabled.");
      _warned = true;
    }
    return false;
  }
  return true;
}

async function fliptFetch<T>(path: string, params: Record<string, string | number>): Promise<T> {
  if (!FLIPT_API_KEY) {
    throw new Error("FLiPT API key is not configured.");
  }

  const url = new URL(`${FLIPT_BASE_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url.toString(), {
    headers: { "X-Api-Key": FLIPT_API_KEY },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as FliptEnvelope<null> | null;
    throw new Error(body?.error?.message ?? `FLiPT API error: ${res.status}`);
  }

  const envelope = (await res.json()) as FliptEnvelope<T>;
  if (envelope.error) throw new Error(envelope.error.message);
  return envelope.data;
}

export async function getNearbyCourses(
  lat: number,
  lng: number,
  radiusMiles = 50,
  limit = 20,
): Promise<NearbyResponse<FliptCourse>> {
  return fliptFetch("/api/v1/explore/courses/nearby", { lat, lng, radiusMiles, limit });
}

export async function getNearbyDiscShops(
  lat: number,
  lng: number,
  radiusMiles = 50,
  limit = 20,
): Promise<NearbyResponse<FliptDiscShop>> {
  return fliptFetch("/api/v1/explore/discshops/nearby", { lat, lng, radiusMiles, limit });
}
