// Application entry point.
import "dotenv/config";
import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";

import apiRoutes from "./src/routes.js";
import { initDb } from "./src/db.js";
import { hasApiKey } from "./src/trafikverket.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3100;

initDb();

// Serve the web page from the public/ folder.
app.use(express.static(path.join(__dirname, "public")));

// Our own API under /api
app.use("/api", apiRoutes);

app.listen(PORT, () => {
  console.log(`🚆 Server: http://localhost:${PORT}`);
  if (!hasApiKey) {
    console.log("ℹ️  No TRAFIKVERKET_API_KEY -> using MOCK data.");
    console.log("   Get a key: https://api.trafikinfo.trafikverket.se/Account/Register");
  } else {
    console.log("✅ API key found -> using real Trafikverket data.");
  }
});
