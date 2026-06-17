// Frontend: calls OUR OWN API (/api/departures) and shows the trains in a table.
const form = document.getElementById("searchForm");
const input = document.getElementById("stationInput");
const status = document.getElementById("status");
const table = document.getElementById("resultsTable");
const tbody = document.getElementById("resultsBody");

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

// Automatic search on page load.
form.dispatchEvent(new Event("submit"));
