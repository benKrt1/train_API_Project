// Our own API endpoints. They combine a data provider (Trafikverket for trains,
// ResRobot for public transport) + the database.
import { Router } from "express";
import { getProvider, normalizeMode } from "./providers.js";
import { saveDepartures, getHistory } from "./db.js";

const router = Router();

// GET /api/departures?station=Stockholm&limit=10&type=departure|arrival&mode=train|bus|metro|tram
//   ?stationId=<code/extId>   (optional, preferred — comes from the dropdown)
// Input -> find stop -> call the provider -> save -> Output (JSON)
router.get("/departures", async (req, res) => {
  const station = req.query.station;
  const stationId = req.query.stationId;
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
  // "arrival" -> "Ankomst"; anything else -> "Avgang" (departure).
  const type = req.query.type === "arrival" ? "arrival" : "departure";
  const activityType = type === "arrival" ? "Ankomst" : "Avgang";
  const mode = normalizeMode(req.query.mode);
  const provider = getProvider(mode);

  if (!station && !stationId) {
    return res.status(400).json({ error: "Missing 'station' parameter." });
  }

  try {
    // A stationId picked from the dropdown is already the exact stop code, so
    // we skip resolution. Otherwise we resolve the free-text input.
    const resolved = stationId
      ? { signature: stationId, name: station || stationId }
      : await provider.resolveStation(station);
    if (!resolved) {
      return res.status(404).json({ error: `Station not found: ${station}` });
    }
    const trains = await provider.fetchDepartures(
      resolved.signature,
      limit,
      activityType,
      mode
    );
    saveDepartures(resolved.name, resolved.signature, trains, type, mode);

    res.json({
      station: resolved.name,
      signature: resolved.signature,
      type,
      mode,
      usingMockData: !provider.hasApiKey,
      count: trains.length,
      departures: trains,
    });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Error while fetching departures." });
  }
});

// GET /api/stations?search=stockholm&mode=train  -> list of stops ({ id/signature, name })
// For trains this is the curated built-in list; for public transport it is a
// live ResRobot stop search.
router.get("/stations", async (req, res) => {
  const search = req.query.search ?? "";
  const mode = normalizeMode(req.query.mode);
  const provider = getProvider(mode);
  try {
    const raw = await provider.fetchStations(search);
    // Normalize to { id, name } so the frontend handles both providers the
    // same way (trains expose "signature", ResRobot exposes "id").
    const stations = raw.map((s) => ({
      id: s.id ?? s.signature,
      name: s.name,
    }));
    res.json({ mode, usingMockData: !provider.hasApiKey, count: stations.length, stations });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Error while searching for stations." });
  }
});

// GET /api/history  -> previous searches from the database
router.get("/history", (req, res) => {
  res.json({ searches: getHistory() });
});

export default router;
