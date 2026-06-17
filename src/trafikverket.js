// Communication with the Trafikverket open API.
// All requests go to ONE endpoint with POST + XML body, and it returns JSON.
import { mockAnnouncements, mockStations } from "./mock.js";

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
  return {
    trainNumber: a.AdvertisedTrainIdent ?? "?",
    destination: a.ToLocation?.[0]?.LocationName ?? "?",
    scheduledTime: scheduled,
    estimatedTime: estimated,
    track: a.TrackAtLocation ?? "",
    delayMinutes,
    canceled: Boolean(a.Canceled),
  };
}

// Fetches train departures for a station (signature, e.g. "Cst").
export async function fetchDepartures(signature, limit = 10) {
  if (!hasApiKey) {
    return mockAnnouncements.slice(0, limit).map(cleanAnnouncement);
  }
  const xml = `<REQUEST>
    <LOGIN authenticationkey="${API_KEY}" />
    <QUERY objecttype="TrainAnnouncement" schemaversion="1.9" limit="${limit}">
      <FILTER>
        <AND>
          <EQ name="ActivityType" value="Avgang" />
          <EQ name="LocationSignature" value="${signature}" />
        </AND>
      </FILTER>
      <INCLUDE>AdvertisedTrainIdent</INCLUDE>
      <INCLUDE>ToLocation</INCLUDE>
      <INCLUDE>AdvertisedTimeAtLocation</INCLUDE>
      <INCLUDE>EstimatedTimeAtLocation</INCLUDE>
      <INCLUDE>TrackAtLocation</INCLUDE>
      <INCLUDE>Canceled</INCLUDE>
    </QUERY>
  </REQUEST>`;
  const result = await postRequest(xml);
  return (result.TrainAnnouncement ?? []).map(cleanAnnouncement);
}

// Searches for stations by name (e.g. "Stockholm") and returns signature + name.
export async function fetchStations(search) {
  if (!hasApiKey) {
    const q = (search ?? "").toLowerCase();
    return mockStations
      .filter((s) => s.AdvertisedLocationName.toLowerCase().includes(q))
      .map((s) => ({ signature: s.LocationSignature, name: s.AdvertisedLocationName }));
  }
  const xml = `<REQUEST>
    <LOGIN authenticationkey="${API_KEY}" />
    <QUERY objecttype="TrainStation" schemaversion="1.5" limit="20">
      <FILTER>
        <LIKE name="AdvertisedLocationName" value="/${search}/i" />
      </FILTER>
      <INCLUDE>LocationSignature</INCLUDE>
      <INCLUDE>AdvertisedLocationName</INCLUDE>
    </QUERY>
  </REQUEST>`;
  const result = await postRequest(xml);
  return (result.TrainStation ?? []).map((s) => ({
    signature: s.LocationSignature,
    name: s.AdvertisedLocationName,
  }));
}

// Resolves a station's signature. If the input already looks like a signature
// (short, e.g. "Cst"), it is returned as is; otherwise we search by name.
export async function resolveStation(input) {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return null;

  // Short input without spaces -> most likely already a signature.
  if (trimmed.length <= 4 && !trimmed.includes(" ")) {
    return { signature: trimmed, name: trimmed };
  }
  const matches = await fetchStations(trimmed);
  return matches[0] ?? null;
}
