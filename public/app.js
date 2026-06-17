// Frontend: calls OUR OWN API (/api/departures) and shows the trains in a table.
const form = document.getElementById("searchForm");
const input = document.getElementById("stationInput");
const status = document.getElementById("status");
const table = document.getElementById("resultsTable");
const tbody = document.getElementById("resultsBody");
const stationSelect = document.getElementById("stationSelect");
const typeToggle = document.getElementById("typeToggle");
const placeHeader = document.getElementById("placeHeader");
const statsBox = document.getElementById("stats");
const autoRefresh = document.getElementById("autoRefresh");
const lastUpdated = document.getElementById("lastUpdated");
const historyList = document.getElementById("historyList");

// Current view type: "departure" or "arrival".
let currentType = "departure";
let refreshTimer = null;

// Shows only the time (HH:MM) from an ISO timestamp.
function timeOnly(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Load the list of available stations into the dropdown (select).
async function loadStations() {
  try {
    const res = await fetch("/api/stations");
    const data = await res.json();
    stationSelect.innerHTML =
      `<option value="">— Choose a station —</option>` +
      data.stations
        .map((s) => `<option value="${s.name}">${s.name} (${s.signature})</option>`)
        .join("");
  } catch {
    /* not critical — the user can still type a station */
  }
}

// Build the small statistics dashboard from the current list of trains.
function renderStats(trains) {
  const total = trains.length;
  const canceled = trains.filter((t) => t.canceled).length;
  const delayed = trains.filter((t) => !t.canceled && t.delayMinutes > 0);
  const onTime = total - canceled - delayed.length;
  const avgDelay = delayed.length
    ? Math.round(delayed.reduce((sum, t) => sum + t.delayMinutes, 0) / delayed.length)
    : 0;

  statsBox.innerHTML = `
    <div class="stat"><span class="num">${total}</span>Total</div>
    <div class="stat ok"><span class="num">${onTime}</span>On time</div>
    <div class="stat warn"><span class="num">${delayed.length}</span>Delayed</div>
    <div class="stat bad"><span class="num">${canceled}</span>Canceled</div>
    <div class="stat"><span class="num">${avgDelay}</span>Avg delay (min)</div>
  `;
  statsBox.hidden = false;
}

// Render the train table. Departures show destination ("To"), arrivals origin ("From").
function renderTable(trains) {
  placeHeader.textContent = currentType === "arrival" ? "From" : "To";
  tbody.innerHTML = "";
  for (const t of trains) {
    const tr = document.createElement("tr");
    if (t.canceled) tr.classList.add("canceled");

    const place = currentType === "arrival" ? t.origin : t.destination;
    const delayText = t.canceled
      ? "CANCELED"
      : t.delayMinutes > 0
        ? `+${t.delayMinutes} min`
        : "On time";

    tr.innerHTML = `
      <td>${t.trainNumber}</td>
      <td>${place}</td>
      <td>${timeOnly(t.scheduledTime)}</td>
      <td>${timeOnly(t.estimatedTime)}</td>
      <td>${t.track || "—"}</td>
      <td class="${t.delayMinutes > 0 || t.canceled ? "late" : "ontime"}">${delayText}</td>
    `;
    tbody.appendChild(tr);
  }
  table.hidden = false;
}

// Load and display the recent searches from the database.
async function loadHistory() {
  try {
    const res = await fetch("/api/history");
    const data = await res.json();
    if (!data.searches.length) {
      historyList.innerHTML = `<li class="muted">No searches yet.</li>`;
      return;
    }
    historyList.innerHTML = data.searches
      .map((s) => {
        const time = new Date(s.created_at).toLocaleTimeString("sv-SE");
        const kind = s.activity_type === "arrival" ? "arrivals" : "departures";
        return `<li><strong>${s.station}</strong> (${s.signature}) —
          ${s.count} ${kind} <span class="muted">· ${time}</span></li>`;
      })
      .join("");
  } catch {
    /* not critical */
  }
}

// The main search: fetch trains for the current station + type, then render.
async function runSearch() {
  const station = input.value.trim();
  if (!station) return;

  status.textContent = "Loading…";

  try {
    const res = await fetch(
      `/api/departures?station=${encodeURIComponent(station)}&type=${currentType}&limit=15`
    );
    const data = await res.json();

    if (!res.ok) {
      status.textContent = `⚠️ ${data.error ?? "Error"}`;
      table.hidden = true;
      statsBox.hidden = true;
      return;
    }

    const word = currentType === "arrival" ? "arrivals" : "departures";
    if (data.departures.length === 0) {
      status.textContent = `No ${word} found for: ${data.station}`;
      table.hidden = true;
      statsBox.hidden = true;
    } else {
      const mockNote = data.usingMockData ? " (MOCK data — no API key)" : "";
      status.textContent = `${data.station} — ${data.count} ${word}${mockNote}`;
      renderStats(data.departures);
      renderTable(data.departures);
    }

    lastUpdated.textContent = `Last updated ${new Date().toLocaleTimeString("sv-SE")}`;
    loadHistory();
  } catch (err) {
    console.error(err);
    status.textContent = "⚠️ Connection error with the server.";
  }
}

// Start/stop the auto-refresh timer based on the checkbox.
function updateAutoRefresh() {
  clearInterval(refreshTimer);
  refreshTimer = null;
  if (autoRefresh.checked) {
    refreshTimer = setInterval(runSearch, 45000);
  }
}

// --- Event wiring ---

form.addEventListener("submit", (e) => {
  e.preventDefault();
  runSearch();
});

// When a station is picked from the dropdown, search for it automatically.
stationSelect.addEventListener("change", () => {
  if (!stationSelect.value) return;
  input.value = stationSelect.value;
  runSearch();
});

// Departures / Arrivals toggle.
typeToggle.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-type]");
  if (!btn) return;
  currentType = btn.dataset.type;
  for (const b of typeToggle.querySelectorAll("button")) {
    b.classList.toggle("active", b === btn);
  }
  runSearch();
});

autoRefresh.addEventListener("change", updateAutoRefresh);

// --- On load: populate the dropdown, run a first search, show history. ---
loadStations();
loadHistory();
runSearch();
