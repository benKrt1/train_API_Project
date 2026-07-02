// Communication with the Trafikverket open API.
// All requests go to ONE endpoint with POST + XML body, and it returns JSON.
import { mockAnnouncements } from "./mock.js";
import { stations } from "./stations.js";

const API_URL = "https://api.trafikinfo.trafikverket.se/v2/data.json";
const API_KEY = process.env.TRAFIKVERKET_API_KEY;

// True when a real key exists. Otherwise we work with mock data.
export const hasApiKey = Boolean(API_KEY && API_KEY.trim());

// Sends an XML request to Trafikverket and returns the first RESULT array.
async function postRequest(xmlBody) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/xml" },
    body: xmlBody,
  });
  if (!res.ok) {
    throw new Error(`Trafikverket API error: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return json?.RESPONSE?.RESULT?.[0] ?? {};
}

// Cleans a raw TrainAnnouncement into a simple object of our own.
function cleanAnnouncement(a) {
  const scheduled = a.AdvertisedTimeAtLocation ?? null;
  const estimated = a.EstimatedTimeAtLocation ?? null;
  let delayMinutes = 0;
  if (scheduled && estimated) {
    delayMinutes = Math.round(
      (new Date(estimated) - new Date(scheduled)) / 60000
    );
  }
  const trainNumber = a.AdvertisedTrainIdent ?? "?";
  return {
    // "line" and "mode" are the generalized fields shared with the public
    // transport provider (see resrobot.js). For trains, the line designator
    // is just the train number and the mode is always "train".
    line: trainNumber,
    mode: "train",
    trainNumber, // kept for backward compatibility
    destination: a.ToLocation?.[0]?.LocationName ?? "?",
    origin: a.FromLocation?.[0]?.LocationName ?? "?",
    scheduledTime: scheduled,
    estimatedTime: estimated,
    track: a.TrackAtLocation ?? "",
    delayMinutes,
    canceled: Boolean(a.Canceled),
  };
}

// Fetches train announcements for a station signature (e.g. "Cst").
// activityType is "Avgang" (departures) or "Ankomst" (arrivals).
export async function fetchDepartures(signature, limit = 10, activityType = "Avgang") {
  if (!hasApiKey) {
    return mockAnnouncements.slice(0, limit).map(cleanAnnouncement);
  }
  const xml = `<REQUEST>
    <LOGIN authenticationkey="${API_KEY}" />
    <QUERY objecttype="TrainAnnouncement" schemaversion="1.9" limit="${limit}">
      <FILTER>
        <AND>
          <EQ name="ActivityType" value="${activityType}" />
          <EQ name="LocationSignature" value="${signature}" />
        </AND>
      </FILTER>
      <INCLUDE>AdvertisedTrainIdent</INCLUDE>
      <INCLUDE>ToLocation</INCLUDE>
      <INCLUDE>FromLocation</INCLUDE>
      <INCLUDE>AdvertisedTimeAtLocation</INCLUDE>
      <INCLUDE>EstimatedTimeAtLocation</INCLUDE>
      <INCLUDE>TrackAtLocation</INCLUDE>
      <INCLUDE>Canceled</INCLUDE>
    </QUERY>
  </REQUEST>`;
  const result = await postRequest(xml);
  return (result.TrainAnnouncement ?? []).map(cleanAnnouncement);
}

// Searches our built-in station list by name (e.g. "Stockholm").
// (The Trafikverket TrainStation dataset needs a Trav-avtal, so we use a
// local list instead — see stations.js.)
export function fetchStations(search) {
  const q = (search ?? "").trim().toLowerCase();
  if (!q) return stations;
  return stations.filter((s) => s.name.toLowerCase().includes(q));
}

// Resolves a station's signature from user input. We try, in order:
//   1) an exact name match in our list,
//   2) a partial name match (e.g. "stockholm" -> "Stockholm Central"),
//   3) otherwise treat the input as a signature code directly (e.g. "Cst").
// This always returns something, so any valid signature works too.
export function resolveStation(input) {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  const exact = stations.find((s) => s.name.toLowerCase() === lower);
  if (exact) return exact;

  const partial = stations.find((s) => s.name.toLowerCase().includes(lower));
  if (partial) return partial;

  // Fall back to treating the input as a signature code.
  return { signature: trimmed, name: trimmed };
}
