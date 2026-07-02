// Picks the right data provider for a transport mode. "train" is served by
// Trafikverket (rail-only, curated station list); every other mode
// (bus / metro / tram / ferry) is served by Trafiklab ResRobot.
//
// Both provider modules expose the same interface — hasApiKey, fetchDepartures,
// fetchStations, resolveStation — so the routes can stay provider-agnostic.
import * as trafikverket from "./trafikverket.js";
import * as resrobot from "./resrobot.js";

const VALID_MODES = new Set(["train", "bus", "metro", "tram", "ferry", "all"]);

// Normalizes the incoming mode string; defaults to "train".
export function normalizeMode(mode) {
  const m = (mode ?? "train").toLowerCase();
  return VALID_MODES.has(m) ? m : "train";
}

// Returns the provider module responsible for a given mode.
export function getProvider(mode) {
  return normalizeMode(mode) === "train" ? trafikverket : resrobot;
}
