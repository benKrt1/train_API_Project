// Frontend: calls OUR OWN API (/api/departures) and shows the trains in a table.
const form = document.getElementById("searchForm");
const input = document.getElementById("stationInput");
const status = document.getElementById("status");
const table = document.getElementById("resultsTable");
const tbody = document.getElementById("resultsBody");
const stationSelect = document.getElementById("stationSelect");

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

// When a station is picked from the dropdown, search for it automatically.
stationSelect.addEventListener("change", () => {
  if (!stationSelect.value) return;
  input.value = stationSelect.value;
  form.dispatchEvent(new Event("submit"));
});

// Shows only the time (HH:MM) from an ISO timestamp.
function timeOnly(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const station = input.value.trim();
  if (!station) return;

  status.textContent = "Loading…";
  table.hidden = true;
  tbody.innerHTML = "";

  try {
    const res = await fetch(
      `/api/departures?station=${encodeURIComponent(station)}&limit=15`
    );
    const data = await res.json();

    if (!res.ok) {
      status.textContent = `⚠️ ${data.error ?? "Error"}`;
      return;
    }

    if (data.departures.length === 0) {
      status.textContent = `No trains found for: ${data.station}`;
      return;
    }

    const mockNote = data.usingMockData ? " (MOCK data — no API key)" : "";
    status.textContent = `${data.station} — ${data.count} trains${mockNote}`;

    for (const t of data.departures) {
      const tr = document.createElement("tr");
      if (t.canceled) tr.classList.add("canceled");

      const delayText = t.canceled
        ? "CANCELED"
        : t.delayMinutes > 0
          ? `+${t.delayMinutes} min`
          : "On time";

      tr.innerHTML = `
        <td>${t.trainNumber}</td>
        <td>${t.destination}</td>
        <td>${timeOnly(t.scheduledTime)}</td>
        <td>${timeOnly(t.estimatedTime)}</td>
        <td>${t.track || "—"}</td>
        <td class="${t.delayMinutes > 0 || t.canceled ? "late" : "ontime"}">${delayText}</td>
      `;
      tbody.appendChild(tr);
    }
    table.hidden = false;
  } catch (err) {
    console.error(err);
    status.textContent = "⚠️ Connection error with the server.";
  }
});

// Populate the station dropdown and run an automatic search on page load.
loadStations();
form.dispatchEvent(new Event("submit"));
