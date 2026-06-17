# 🚆 Trafikverket Train Board — APL Project 2026

A small **Node.js + Express** app that shows live train **departures and arrivals**
from the free **Trafikverket** open API. Built for the assignment
*"4. Reverse Engineer a Result"*.

## ✨ Features

- 🚆 Departures **and** arrivals for a station (toggle)
- 📊 Delay statistics (on time / delayed / canceled / average delay)
- 🔄 Optional auto-refresh every 45 seconds (live board)
- 📜 Recent searches, stored in and read back from SQLite
- 🔎 Pick a station from a dropdown or type a name / signature code

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

## 🔑 API key (for real data)

1. Register: https://api.trafikinfo.trafikverket.se/Account/Register
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Put your key in `.env`:
   ```
   TRAFIKVERKET_API_KEY=your_key_here
   ```
4. Run `npm start` again.

## 📡 The endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/departures?station=Stockholm&type=departure&limit=10` | Departures (`type=departure`) or arrivals (`type=arrival`) from a station |
| GET | `/api/stations?search=stockholm` | Search stations (signature + name) |
| GET | `/api/history` | Previous searches (from SQLite) |

Example:
```bash
curl "http://localhost:3100/api/departures?station=Cst&limit=5"
```

## 🗂️ Structure

```
server.js              # starts Express, serves public/ + API
src/
  trafikverket.js      # calls Trafikverket (XML -> JSON), cleans the data
  db.js                # SQLite: storage & history
  routes.js            # the 3 API endpoints
  mock.js              # fake data when there is no key
public/
  index.html, app.js, style.css   # the web page
```

## 🛠️ Tech

- **Node.js + Express** — web server & API
- **node:sqlite** — Node's built-in database (no external package)
- **Trafikverket Open API** — data source ([docs](https://api.trafikinfo.trafikverket.se/))
- Vanilla HTML/CSS/JS — frontend
