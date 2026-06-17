// Our own API endpoints. They combine Trafikverket + the database.
import { Router } from "express";
import { fetchDepartures, fetchStations, resolveStation, hasApiKey } from "./trafikverket.js";
import { saveDepartures, getHistory } from "./db.js";

const router = Router();

// GET /api/departures?station=Stockholm&limit=10
// Input -> find station -> call Trafikverket -> save -> Output (JSON)
router.get("/departures", async (req, res) => {
  const station = req.query.station;
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

  if (!station) {
    return res.status(400).json({ error: "Missing 'station' parameter." });
  }

  try {
    const resolved = await resolveStation(station);
    if (!resolved) {
      return res.status(404).json({ error: `Station not found: ${station}` });
    }
    const trains = await fetchDepartures(resolved.signature, limit);
    saveDepartures(station, resolved.signature, trains);

    res.json({
      station: resolved.name,
      signature: resolved.signature,
      usingMockData: !hasApiKey,
      count: trains.length,
      departures: trains,
    });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Error while calling Trafikverket." });
  }
});

// GET /api/stations?search=stockholm  -> list of stations (signature + name)
router.get("/stations", async (req, res) => {
  const search = req.query.search ?? "";
  try {
    const stations = await fetchStations(search);
    res.json({ usingMockData: !hasApiKey, count: stations.length, stations });
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
