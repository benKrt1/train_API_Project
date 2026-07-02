// Communication with the Trafiklab ResRobot v2.1 API — this is where the
// public transport (bus / metro / tram / ferry) data comes from. Trafikverket
// is rail-only, so anything that is not a train is served from here instead.
//
// Unlike Trafikverket (POST + XML), ResRobot is a plain JSON REST API: the key
// goes in the "accessId" query parameter. This module mirrors the exports of
// trafikverket.js (hasApiKey, fetchDepartures, fetchStations, resolveStation)
// so the two providers are interchangeable behind providers.js.
import { mockPublicTransport } from "./mock.js";

const BASE_URL = "https://api.resrobot.se/v2.1";
const API_KEY = process.env.RESROBOT_API_KEY;

// True when a real key exists. Otherwise we fall back to mock data.
export const hasApiKey = Boolean(API_KEY && API_KEY.trim());

// GET a ResRobot endpoint with the key + JSON format already applied.
async function getJson(endpoint, params) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set("accessId", API_KEY);
  url.searchParams.set("format", "json");
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, String(value));
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ResRobot API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// Maps a raw ResRobot departure to one of our modes. ResRobot is not fully
// consistent about the fields it exposes, so we look at every category string
// we can find (long name, short code, journey name) and match on keywords,
// with a numeric catCode table as a last resort.
function modeFromDeparture(d) {
  const product = Array.isArray(d.Product) ? d.Product[0] : d.Product;
  const p = product ?? d.ProductAtStop ?? {};
  const text = [p.catOutL, p.catOut, p.catIn, d.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/tunnelbana|metro|\bt-bana\b/.test(text)) return "metro";
  if (/spårväg|spΓ₯rväg|tram|spårvagn/.test(text)) return "tram";
  if (/buss|\bbus\b/.test(text)) return "bus";
  if (/färja|ferry|båt|ship|boat/.test(text)) return "ferry";
  if (/tåg|train|pendel/.test(text)) return "train";

  // Best-effort numeric fallback (ResRobot product categories). Verified
  // values may need tuning against live responses.
  const byCode = {
    2: "train", // Snabbtåg
    4: "train", // Regional/InterCity/local trains
    16: "metro", // Tunnelbana
    32: "tram", // Spårväg
    64: "bus", // Buss
    128: "ferry", // Färja
  };
  const code = Number(p.cls ?? p.catCode);
  return byCode[code] ?? "train";
}

// Combines ResRobot's separate "date" (YYYY-MM-DD) and "time" (HH:MM:SS) into
// a single local ISO-like string, or null when either part is missing.
function combineDateTime(date, time) {
  if (!date || !time) return null;
  return `${date}T${time}`;
}

// Cleans a raw ResRobot Departure/Arrival into our normalized shape — the same
// object that trafikverket.js produces, so the routes, DB and frontend do not
// care which provider it came from.
function cleanDeparture(d, activityType) {
  const product = Array.isArray(d.Product) ? d.Product[0] : d.Product;
  const p = product ?? d.ProductAtStop ?? {};
  const scheduled = combineDateTime(d.date, d.time);
  const estimated = combineDateTime(d.rtDate ?? d.date, d.rtTime) ?? scheduled;

  let delayMinutes = 0;
  if (scheduled && estimated) {
    delayMinutes = Math.round((new Date(estimated) - new Date(scheduled)) / 60000);
  }

  const line = p.line ?? p.num ?? d.name ?? "?";
  // For departures the passenger cares about where the vehicle is going
  // (direction). For arrivals, where it came from (origin).
  const place = activityType === "Ankomst" ? d.origin ?? d.stop : d.direction;

  return {
    line,
    mode: modeFromDeparture(d),
    trainNumber: line, // kept so older frontend code still has a value
    destination: activityType === "Ankomst" ? d.stop ?? "?" : place ?? "?",
    origin: activityType === "Ankomst" ? place ?? "?" : d.stop ?? "?",
    scheduledTime: scheduled,
    estimatedTime: estimated,
    track: d.rtTrack ?? d.track ?? "",
    delayMinutes,
    canceled: Boolean(d.cancelled),
  };
}

// Fetches departures (or arrivals) for a ResRobot stop extId (e.g. 740000001).
// activityType is "Avgang" (departures) or "Ankomst" (arrivals) to match the
// Trafikverket provider's contract. `mode` optionally filters to a single
// transport mode (e.g. "bus"); "all"/undefined returns every public mode.
export async function fetchDepartures(stopId, limit = 10, activityType = "Avgang", mode) {
  const wantMode = mode && mode !== "all" && mode !== "train" ? mode : null;

  if (!hasApiKey) {
    const rows = wantMode
      ? mockPublicTransport.filter((r) => r.mode === wantMode)
      : mockPublicTransport;
    return rows.slice(0, limit);
  }

  const endpoint = activityType === "Ankomst" ? "arrivalBoard" : "departureBoard";
  // Over-fetch, then filter by mode client-side so a single-mode view still
  // returns a full page of results.
  const json = await getJson(endpoint, {
    id: stopId,
    maxJourneys: Math.min(limit * 5, 100),
  });

  const raw = json.Departure ?? json.Arrival ?? [];
  let cleaned = raw.map((d) => cleanDeparture(d, activityType));
  if (wantMode) cleaned = cleaned.filter((r) => r.mode === wantMode);
  return cleaned.slice(0, limit);
}

// Extracts StopLocation entries from either shape ResRobot returns for
// location.name (a flat StopLocation array, or the wrapped
// stopLocationOrCoordLocation array).
function extractStops(json) {
  if (Array.isArray(json.StopLocation)) return json.StopLocation;
  if (Array.isArray(json.stopLocationOrCoordLocation)) {
    return json.stopLocationOrCoordLocation
      .map((entry) => entry.StopLocation)
      .filter(Boolean);
  }
  return [];
}

// Live stop search. Returns [{ id: extId, name }] — the ResRobot location.name
// endpoint works with the free key, so (unlike trains) no hardcoded list is
// needed for public transport.
export async function fetchStations(search) {
  const q = (search ?? "").trim();
  if (!q) return [];
  if (!hasApiKey) {
    // Without a key there is no live search; surface the mock stops instead.
    return [
      { id: "740000001", name: "Stockholm Centralstation (mock)" },
      { id: "740000002", name: "Göteborg Centralstation (mock)" },
    ];
  }
  const json = await getJson("location.name", { input: q, maxNo: 12 });
  return extractStops(json).map((s) => ({
    id: s.extId ?? s.id,
    name: s.name,
  }));
}

// Resolves user input to a stop. If it already looks like a numeric extId we
// pass it straight through; otherwise we take the first live search match.
export async function resolveStation(input) {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return null;
  if (/^\d{5,}$/.test(trimmed)) return { id: trimmed, name: trimmed };

  const matches = await fetchStations(trimmed);
  // "signature" is the generic stop identifier used by routes.js and passed
  // back into fetchDepartures — for ResRobot that is the numeric extId.
  if (matches.length) return { signature: matches[0].id, name: matches[0].name };
  return null;
}
