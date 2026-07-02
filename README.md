# 🚆 Departure Board — APL Project 2026

A small **Node.js + Express** app that shows live **departures and arrivals** for
both **trains** (free **Trafikverket** open API) and **public transport** — bus,
metro and tram (free **Trafiklab ResRobot** API). Built for the assignment
*"4. Reverse Engineer a Result"*.

## ✨ Features

- 🚆 **Transport mode selector**: Train / All / Bus / Metro / Tram
- 🚍 **"All" view** — every bus, metro and tram at a stop in one board, each row
  tagged with its mode icon
- 🎯 **Find your line fast** — clickable line chips and a live filter box (by line
  or destination) narrow the board without a new request
- 🔁 Departures **and** arrivals for a stop (toggle)
- 📊 Delay statistics (on time / delayed / canceled / average delay) that follow
  the filtered view
- 🔄 Optional auto-refresh every 45 seconds (live board)
- 📜 Recent searches stored in SQLite — **click one to jump back** to that stop
- 🔎 Trains: pick from a curated list or type a signature code. Public transport:
  live stop search as you type.

## 🕵️ The assignment idea: Reverse Engineer a Result

The assignment asks us to take a **result** and think backwards: what were the
**inputs**, what was the **logic (process)**, and how is the **output** produced?

Here, the "result" is the Trafikverket data. We built the app that requests it,
processes it, and presents it:

| Step | In our app |
|------|------------|
| **Input** | The user types a station (e.g. `Stockholm` or `Cst`) |
| **Process** | The API resolves the station signature, calls Trafikverket with XML, cleans the JSON, and stores it in SQLite |
| **Output** | Clean JSON + a table on the web page with train, destination, time, delay |

## 🚀 How to run it

```bash
npm install
npm start
```

Open: **http://localhost:3100**

> Without an API key, the app works with **mock (fake) data** — so you can try it
> right away.

## 🔑 API keys (for real data)

Each mode has its own key; without one, that mode falls back to mock data.

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Trains — register at https://api.trafikinfo.trafikverket.se/Account/Register and set:
   ```
   TRAFIKVERKET_API_KEY=your_key_here
   ```
3. Public transport (bus/metro/tram) — register a ResRobot v2.1 project at
   https://www.trafiklab.se/api/trafiklab-apis/resrobot-v21/ and set:
   ```
   RESROBOT_API_KEY=your_key_here
   ```
4. Run `npm start` again.

## 📡 The endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/departures?station=Stockholm&type=departure&mode=train&limit=10` | Departures (`type=departure`) or arrivals (`type=arrival`) for a stop. `mode` = `train`\|`bus`\|`metro`\|`tram`. Optional `stationId` for an exact stop code. |
| GET | `/api/stations?search=stockholm&mode=bus` | Search stops for a mode (trains: curated list; others: live ResRobot search) |
| GET | `/api/history` | Previous searches (from SQLite) |

Example:
```bash
curl "http://localhost:3100/api/departures?station=Cst&mode=train&limit=5"
curl "http://localhost:3100/api/departures?station=Gullmarsplan&mode=bus&limit=5"
```

## 🗂️ Structure

```
server.js              # starts Express, serves public/ + API
src/
  providers.js         # picks the provider for a mode (train vs public transport)
  trafikverket.js      # trains: calls Trafikverket (XML -> JSON), cleans the data
  resrobot.js          # public transport: calls Trafiklab ResRobot (JSON REST)
  stations.js          # built-in name -> signature list for trains
  db.js                # SQLite: storage & history
  routes.js            # the 3 API endpoints
  mock.js              # fake data when there is no key
public/
  index.html, app.js, style.css   # the web page
```

## 🛠️ Tech

- **Node.js + Express** — web server & API
- **node:sqlite** — Node's built-in database (no external package)
- **Trafikverket Open API** — train data ([docs](https://api.trafikinfo.trafikverket.se/))
- **Trafiklab ResRobot v2.1** — public transport data ([docs](https://www.trafiklab.se/api/trafiklab-apis/resrobot-v21/))
- Vanilla HTML/CSS/JS — frontend
