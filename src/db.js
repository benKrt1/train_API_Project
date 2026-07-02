// Small SQLite database to store the search history and the trains found.
// We use Node's built-in SQLite (node:sqlite) -> synchronous, simple API,
// with no external packages or native compilation.
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(path.join(__dirname, "..", "data.db"));

// Create the tables if they do not exist.
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      station   TEXT NOT NULL,
      signature TEXT NOT NULL,
      count     INTEGER NOT NULL,
      activity_type TEXT,
      mode      TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS departures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      search_id      INTEGER NOT NULL,
      train_number   TEXT,
      mode           TEXT,
      destination    TEXT,
      scheduled_time TEXT,
      estimated_time TEXT,
      track          TEXT,
      delay_minutes  INTEGER,
      canceled       INTEGER,
      FOREIGN KEY (search_id) REFERENCES searches(id)
    );
  `);

  // For databases created before these columns existed, add them.
  // Ignore the error if a column is already there.
  for (const alter of [
    "ALTER TABLE searches ADD COLUMN activity_type TEXT",
    "ALTER TABLE searches ADD COLUMN mode TEXT",
    "ALTER TABLE departures ADD COLUMN mode TEXT",
  ]) {
    try {
      db.exec(alter);
    } catch {
      /* column already exists */
    }
  }
}

// Saves a search + its trains. Returns the id of the search.
export function saveDepartures(station, signature, trains, activityType = "departure", mode = "train") {
  const insertSearch = db.prepare(
    `INSERT INTO searches (station, signature, count, activity_type, mode, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const info = insertSearch.run(
    station,
    signature,
    trains.length,
    activityType,
    mode,
    new Date().toISOString()
  );
  const searchId = info.lastInsertRowid;

  const insertTrain = db.prepare(
    `INSERT INTO departures
       (search_id, train_number, mode, destination, scheduled_time,
        estimated_time, track, delay_minutes, canceled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  // Transaction = all together, fast and safely.
  db.exec("BEGIN");
  try {
    for (const t of trains) {
      insertTrain.run(
        searchId,
        t.line ?? t.trainNumber,
        t.mode ?? mode,
        t.destination,
        t.scheduledTime,
        t.estimatedTime,
        t.track,
        t.delayMinutes,
        t.canceled ? 1 : 0
      );
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return searchId;
}

// Returns the most recent searches (newest first).
export function getHistory(limit = 20) {
  return db
    .prepare(
      `SELECT id, station, signature, count, activity_type, mode, created_at
       FROM searches ORDER BY id DESC LIMIT ?`
    )
    .all(limit);
}
