// Frontend: calls OUR OWN API (/api/departures) and shows the trains in a table.
const form = document.getElementById("searchForm");
const input = document.getElementById("stationInput");
const status = document.getElementById("status");
const table = document.getElementById("resultsTable");
const tbody = document.getElementById("resultsBody");
const stationSelect = document.getElementById("stationSelect");
const typeToggle = document.getElementById("typeToggle");
const modeToggle = document.getElementById("modeToggle");
const placeHeader = document.getElementById("placeHeader");
const statsBox = document.getElementById("stats");
const autoRefresh = document.getElementById("autoRefresh");
const lastUpdated = document.getElementById("lastUpdated");
const historyList = document.getElementById("historyList");
const searchHint = document.getElementById("searchHint");
const filterBar = document.getElementById("filterBar");
const resultFilter = document.getElementById("resultFilter");
const lineChips = document.getElementById("lineChips");

// Current view type: "departure" or "arrival".
let currentType = "departure";
// Current transport mode: "train" (Trafikverket), "all"/"bus"/"metro"/"tram" (ResRobot).
let currentMode = "train";
// The exact stop id picked from the dropdown, if any (preferred over free text).
let selectedStationId = null;
let refreshTimer = null;
let stopSearchTimer = null;

// The last departures fetched, kept so we can filter them without refetching.
let lastResults = [];
// Active client-side filters over the public-transport board.
let activeLine = null; // a single line designator, or null for "all lines"
let textFilter = ""; // free-text substring over line + destination + origin

// Emoji per transport mode, shown on each row (handy in the mixed "All" view).
function modeIcon(mode) {
  return (
    { train: "🚆", bus: "🚌", metro: "🚇", tram: "🚊", ferry: "⛴️" }[mode] ?? "🚍"
  );
}

// Shows only the time (HH:MM) from an ISO timestamp.
function timeOnly(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Fill the dropdown with a list of stops. Each option carries the exact stop
// id in data-id so we can pass it straight to the API when picked.
function fillStationSelect(stations, placeholder) {
  stationSelect.innerHTML =
    `<option value="">${placeholder}</option>` +
    stations
      .map(
        (s) =>
          `<option value="${s.name}" data-id="${s.id}">${s.name}${
            s.id && s.id !== s.name ? ` (${s.id})` : ""
          }</option>`
      )
      .join("");
}

// Load the stops for the current mode into the dropdown. Trains use the curated
// built-in list; public-transport modes start empty and search live as you type.
async function loadStations() {
  if (currentMode !== "train") {
    fillStationSelect([], "— Type a stop name to search —");
    return;
  }
  try {
    const res = await fetch("/api/stations?mode=train");
    const data = await res.json();
    fillStationSelect(data.stations, "— Choose a station —");
  } catch {
    /* not critical — the user can still type a station */
  }
}

// Live stop search for public-transport modes. Debounced from the text input.
async function searchStops(query) {
  const q = query.trim();
  if (currentMode === "train" || q.length < 2) return;
  try {
    const res = await fetch(
      `/api/stations?mode=${currentMode}&search=${encodeURIComponent(q)}`
    );
    const data = await res.json();
    fillStationSelect(data.stations, "— Pick a matching stop —");
  } catch {
    /* not critical */
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

    // Public-transport rows get a mode icon so mixed lists stay readable.
    const icon = currentMode === "train" ? "" : `${modeIcon(t.mode)} `;

    tr.innerHTML = `
      <td>${icon}${t.line ?? t.trainNumber}</td>
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

// Build the clickable line chips from the current results (public transport
// only). One chip per distinct line, plus an "All lines" reset chip.
function renderLineChips() {
  if (currentMode === "train") {
    lineChips.innerHTML = "";
    return;
  }
  const lines = [...new Set(lastResults.map((t) => String(t.line)))].sort(
    (a, b) => a.localeCompare(b, "sv", { numeric: true })
  );
  const chip = (label, value, active) =>
    `<button type="button" class="chip${active ? " active" : ""}" data-line="${value}">${label}</button>`;

  lineChips.innerHTML =
    chip("All lines", "", activeLine === null) +
    lines.map((l) => chip(l, l, activeLine === l)).join("");
}

// Apply the active line + text filters to the last results and re-render the
// stats and table. No network call — purely client-side.
function applyFilters() {
  const q = textFilter.trim().toLowerCase();
  const filtered = lastResults.filter((t) => {
    if (activeLine !== null && String(t.line) !== activeLine) return false;
    if (q) {
      const hay = `${t.line} ${t.destination} ${t.origin}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  renderLineChips();
  if (filtered.length === 0) {
    statsBox.hidden = true;
    table.hidden = true;
    return;
  }
  renderStats(filtered);
  renderTable(filtered);
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
        const mode = s.mode ?? "train";
        // data-* attributes let a single click restore the whole search.
        return `<li class="history-item" role="button" tabindex="0"
          data-station="${encodeURIComponent(s.station)}"
          data-signature="${encodeURIComponent(s.signature)}"
          data-mode="${mode}" data-type="${s.activity_type ?? "departure"}">
          <span class="mode-tag">${mode}</span>
          <strong>${s.station}</strong> (${s.signature}) —
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
    const idParam = selectedStationId
      ? `&stationId=${encodeURIComponent(selectedStationId)}`
      : "";
    const res = await fetch(
      `/api/departures?station=${encodeURIComponent(station)}` +
        `&type=${currentType}&mode=${currentMode}&limit=15${idParam}`
    );
    const data = await res.json();

    if (!res.ok) {
      status.textContent = `⚠️ ${data.error ?? "Error"}`;
      table.hidden = true;
      statsBox.hidden = true;
      return;
    }

    const word = currentType === "arrival" ? "arrivals" : "departures";
    lastResults = data.departures;

    // Drop an active line chip if that line is no longer present after a
    // refresh; keep the text filter as-is.
    if (activeLine !== null && !lastResults.some((t) => String(t.line) === activeLine)) {
      activeLine = null;
    }

    if (data.departures.length === 0) {
      status.textContent = `No ${word} found for: ${data.station}`;
      table.hidden = true;
      statsBox.hidden = true;
      lineChips.innerHTML = "";
    } else {
      const mockNote = data.usingMockData ? " (MOCK data — no API key)" : "";
      status.textContent = `${data.station} — ${data.count} ${word}${mockNote}`;
      applyFilters();
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

// When a stop is picked from the dropdown, remember its exact id and search.
stationSelect.addEventListener("change", () => {
  if (!stationSelect.value) return;
  input.value = stationSelect.value;
  const opt = stationSelect.selectedOptions[0];
  selectedStationId = opt?.dataset.id || null;
  runSearch();
});

// Typing in the box means the user is no longer using the picked stop id. For
// public-transport modes we also run a debounced live stop search.
input.addEventListener("input", () => {
  selectedStationId = null;
  if (currentMode === "train") return;
  clearTimeout(stopSearchTimer);
  stopSearchTimer = setTimeout(() => searchStops(input.value), 300);
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

// Transport mode toggle (Train / All / Bus / Metro / Tram).
modeToggle.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-mode]");
  if (!btn) return;
  currentMode = btn.dataset.mode;
  selectedStationId = null;
  for (const b of modeToggle.querySelectorAll("button")) {
    b.classList.toggle("active", b === btn);
  }
  searchHint.innerHTML =
    currentMode === "train"
      ? `Pick a station from the list, or type a signature code (e.g. <code>Cst</code>).`
      : `Type a stop name (e.g. <code>Gullmarsplan</code>) and pick it from the list.`;

  // The line chips + filter box only make sense for public transport.
  activeLine = null;
  textFilter = "";
  resultFilter.value = "";
  filterBar.hidden = currentMode === "train";

  loadStations();
  runSearch();
});

// Line chips: click one to filter the board to that line ("All lines" resets).
lineChips.addEventListener("click", (e) => {
  const chip = e.target.closest("button[data-line]");
  if (!chip) return;
  activeLine = chip.dataset.line || null;
  applyFilters();
});

// Free-text filter over line + destination + origin.
resultFilter.addEventListener("input", () => {
  textFilter = resultFilter.value;
  applyFilters();
});

// Restore a previous search when a recent-search item is clicked. Sets the
// mode, type and stop (with its exact id) and re-runs the search.
function restoreSearch(el) {
  const mode = el.dataset.mode || "train";
  const type = el.dataset.type === "arrival" ? "arrival" : "departure";
  currentMode = mode;
  currentType = type;
  selectedStationId = decodeURIComponent(el.dataset.signature || "") || null;
  input.value = decodeURIComponent(el.dataset.station || "");

  // Sync the toggle buttons and mode-specific UI to match.
  for (const b of modeToggle.querySelectorAll("button")) {
    b.classList.toggle("active", b.dataset.mode === mode);
  }
  for (const b of typeToggle.querySelectorAll("button")) {
    b.classList.toggle("active", b.dataset.type === type);
  }
  activeLine = null;
  textFilter = "";
  resultFilter.value = "";
  filterBar.hidden = mode === "train";

  runSearch();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

historyList.addEventListener("click", (e) => {
  const item = e.target.closest(".history-item");
  if (item) restoreSearch(item);
});
historyList.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const item = e.target.closest(".history-item");
  if (item) {
    e.preventDefault();
    restoreSearch(item);
  }
});

autoRefresh.addEventListener("change", updateAutoRefresh);

// --- On load: populate the dropdown, run a first search, show history. ---
loadStations();
loadHistory();
runSearch();
