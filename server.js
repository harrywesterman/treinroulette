const { createServer } = require("node:http");
const { promises: fs } = require("node:fs");
const path = require("node:path");

const port = Number(process.env.PORT || 3000);
const publicDir = __dirname;
const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
const dataFile = path.join(dataDir, "games.json");
const nsApiKey = process.env.NS_API_KEY || "";
const nsStationsUrl = "https://gateway.apiportal.ns.nl/reisinformatie-api/api/v2/stations";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

let games = {};

const fallbackStations = [
  { code: "UT", name: "Utrecht Centraal", lat: 52.0894, lon: 5.1103 },
  { code: "RTB", name: "Rotterdam Blaak", lat: 51.9202, lon: 4.4897 },
  { code: "GV", name: "Den Haag HS", lat: 52.0693, lon: 4.3226 },
  { code: "AMF", name: "Amersfoort Centraal", lat: 52.1537, lon: 5.3745 },
  { code: "ASD", name: "Amsterdam Centraal", lat: 52.3789, lon: 4.9003 },
  { code: "ASA", name: "Amsterdam Amstel", lat: 52.3469, lon: 4.9188 },
  { code: "ASS", name: "Amsterdam Sloterdijk", lat: 52.3889, lon: 4.8378 },
  { code: "SCH", name: "Schiphol Airport", lat: 52.3091, lon: 4.7613 },
  { code: "LEDN", name: "Leiden Centraal", lat: 52.1662, lon: 4.4824 },
  { code: "GVC", name: "Den Haag Centraal", lat: 52.0801, lon: 4.324 },
  { code: "RTD", name: "Rotterdam Centraal", lat: 51.9244, lon: 4.4694 },
  { code: "GDM", name: "Gouda", lat: 52.0176, lon: 4.7047 },
  { code: "HLM", name: "Haarlem", lat: 52.3874, lon: 4.6384 },
  { code: "ZVT", name: "Zandvoort aan Zee", lat: 52.375, lon: 4.5327 },
  { code: "ALM", name: "Almere Centrum", lat: 52.3755, lon: 5.217 },
  { code: "Lls", name: "Lelystad Centrum", lat: 52.5075, lon: 5.4722 },
  { code: "ZL", name: "Zwolle", lat: 52.5051, lon: 6.0918 },
  { code: "GN", name: "Groningen", lat: 53.2105, lon: 6.5646 },
  { code: "LW", name: "Leeuwarden", lat: 53.1958, lon: 5.7924 },
  { code: "HDR", name: "Den Helder", lat: 52.9563, lon: 4.7617 },
  { code: "ALK", name: "Alkmaar", lat: 52.6379, lon: 4.7398 },
  { code: "HN", name: "Hoorn", lat: 52.6448, lon: 5.0559 },
  { code: "ED", name: "Ede-Wageningen", lat: 52.0278, lon: 5.6728 },
  { code: "AH", name: "Arnhem Centraal", lat: 51.9846, lon: 5.9008 },
  { code: "NM", name: "Nijmegen", lat: 51.8428, lon: 5.8526 },
  { code: "HT", name: "'s-Hertogenbosch", lat: 51.6905, lon: 5.2936 },
  { code: "EHV", name: "Eindhoven Centraal", lat: 51.4433, lon: 5.4796 },
  { code: "TB", name: "Tilburg", lat: 51.5606, lon: 5.0836 },
  { code: "BD", name: "Breda", lat: 51.5956, lon: 4.7805 },
  { code: "RM", name: "Roermond", lat: 51.1943, lon: 5.9931 },
  { code: "STD", name: "Sittard", lat: 50.9973, lon: 5.8588 },
  { code: "MT", name: "Maastricht", lat: 50.8492, lon: 5.7057 },
  { code: "VL", name: "Venlo", lat: 51.3635, lon: 6.1723 },
  { code: "DV", name: "Deventer", lat: 52.2574, lon: 6.1609 },
  { code: "ZP", name: "Zutphen", lat: 52.1459, lon: 6.1944 },
  { code: "AP", name: "Apeldoorn", lat: 52.2095, lon: 5.9699 },
  { code: "HGL", name: "Hengelo", lat: 52.2624, lon: 6.7936 },
  { code: "ES", name: "Enschede", lat: 52.2215, lon: 6.8937 },
  { code: "ASB", name: "Assen", lat: 52.9927, lon: 6.5708 },
  { code: "HR", name: "Heerenveen", lat: 52.9596, lon: 5.9144 },
  { code: "SN", name: "Sneek", lat: 53.0329, lon: 5.6588 },
  { code: "MRB", name: "Middelburg", lat: 51.4956, lon: 3.6091 },
  { code: "VS", name: "Vlissingen", lat: 51.4423, lon: 3.5956 },
  { code: "RS", name: "Roosendaal", lat: 51.5405, lon: 4.4587 },
  { code: "BGN", name: "Bergen op Zoom", lat: 51.4947, lon: 4.2895 },
  { code: "DR", name: "Dordrecht", lat: 51.8078, lon: 4.6683 },
  { code: "GLD", name: "Geldermalsen", lat: 51.8836, lon: 5.288 },
  { code: "TL", name: "Tiel", lat: 51.9221, lon: 5.4217 },
  { code: "WP", name: "Weesp", lat: 52.3129, lon: 5.0436 },
  { code: "BKL", name: "Breukelen", lat: 52.1716, lon: 5.0016 },
];

async function loadGames() {
  try {
    const raw = await fs.readFile(dataFile, "utf8");
    games = JSON.parse(raw);
  } catch {
    games = {};
  }
}

async function saveGames() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(games, null, 2));
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function normalizeStation(station) {
  const lat = station.lat ?? station.latitude ?? station.location?.lat;
  const lon = station.lng ?? station.lon ?? station.longitude ?? station.location?.lng ?? station.location?.lon;
  const name =
    station.namen?.lang ||
    station.namen?.middel ||
    station.name ||
    station.longName ||
    station.stationName ||
    station.code;

  if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return {
    code: String(station.code || station.UICCode || station.id || name),
    name: String(name),
    lat,
    lon,
  };
}

async function getStations() {
  if (!nsApiKey) {
    return { source: "fallback", stations: fallbackStations };
  }

  const url = new URL(nsStationsUrl);
  url.searchParams.set("subscription-key", nsApiKey);

  try {
    const response = await fetch(url, {
      headers: {
        "Ocp-Apim-Subscription-Key": nsApiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`NS API returned ${response.status}`);
    }

    const payload = await response.json();
    const rawStations = Array.isArray(payload) ? payload : payload.payload || payload.stations || [];
    const stations = rawStations.map(normalizeStation).filter(Boolean);

    return { source: "ns", stations: stations.length ? stations : fallbackStations };
  } catch {
    return { source: "fallback", stations: fallbackStations };
  }
}

async function readJson(request) {
  let body = "";

  for await (const chunk of request) {
    body += chunk;
    if (body.length > 100_000) {
      throw new Error("Payload too large");
    }
  }

  return body ? JSON.parse(body) : {};
}

function normalizeCode(code) {
  return /^\d{4}$/.test(code) ? code : null;
}

function sanitizeGameState(code, state) {
  const sharedLocation =
    state.sharedLocation &&
    Number.isFinite(state.sharedLocation.lat) &&
    Number.isFinite(state.sharedLocation.lon)
      ? {
          lat: state.sharedLocation.lat,
          lon: state.sharedLocation.lon,
          accuracy: Number.isFinite(state.sharedLocation.accuracy) ? state.sharedLocation.accuracy : null,
          updatedAt: String(state.sharedLocation.updatedAt || new Date().toISOString()),
        }
      : null;
  const battleScores =
    state.battleScores && typeof state.battleScores === "object"
      ? Object.fromEntries(
          Object.entries(state.battleScores)
            .slice(0, 20)
            .map(([player, score]) => [String(player).slice(0, 40), Number.isInteger(score) ? score : 0]),
        )
      : {};

  return {
    code,
    players: Array.isArray(state.players) ? state.players.slice(0, 20).map(String) : [],
    selectedGame: state.selectedGame === "Battle" ? "Battle" : "Team up",
    currentQuest: Number.isInteger(state.currentQuest) ? state.currentQuest : 0,
    currentDestination: Number.isInteger(state.currentDestination) ? state.currentDestination : 0,
    checkedBingo: Array.isArray(state.checkedBingo)
      ? state.checkedBingo.filter((item) => Number.isInteger(item) && item >= 0 && item < 25)
      : [],
    sharedLocation,
    battleScores,
    activeScreen: ["lobby", "intro", "vote", "game", "settings"].includes(state.activeScreen)
      ? state.activeScreen
      : "lobby",
    updatedAt: new Date().toISOString(),
  };
}

async function handleApi(request, response, url) {
  if (url.pathname === "/api/stations") {
    const payload = await getStations();
    sendJson(response, 200, payload);
    return;
  }

  const match = url.pathname.match(/^\/api\/games\/(\d{4})$/);

  if (!match) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  const code = normalizeCode(match[1]);

  if (!code) {
    sendJson(response, 400, { error: "Invalid code" });
    return;
  }

  if (request.method === "GET") {
    sendJson(response, 200, { game: games[code] || null });
    return;
  }

  if (request.method === "PUT") {
    const state = await readJson(request);
    games[code] = sanitizeGameState(code, state);
    await saveGames();
    sendJson(response, 200, { game: games[code] });
    return;
  }

  if (request.method === "DELETE") {
    delete games[code];
    await saveGames();
    sendJson(response, 200, { ok: true });
    return;
  }

  response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Method not allowed");
}

async function serveStatic(response, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(publicDir, requestedPath));

  if (!filePath.startsWith(publicDir) || filePath.includes(`${path.sep}data${path.sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const extension = path.extname(filePath);
    const isAsset = extension === ".js" || extension === ".css" || extension === ".html";

    response.writeHead(200, {
      "Content-Type": contentTypes[extension] || "application/octet-stream",
      "Cache-Control": isAsset ? "no-store" : "public, max-age=604800",
    });
    response.end(file);
  } catch {
    const index = await fs.readFile(path.join(publicDir, "index.html"));
    response.writeHead(200, {
      "Content-Type": contentTypes[".html"],
      "Cache-Control": "no-store",
    });
    response.end(index);
  }
}

async function start() {
  await loadGames();

  createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    try {
      if (url.pathname.startsWith("/api/")) {
        await handleApi(request, response, url);
      } else {
        await serveStatic(response, url);
      }
    } catch (error) {
      sendJson(response, 500, { error: error.message });
    }
  }).listen(port, () => {
    console.log(`Treinroulette listening on ${port}`);
  });
}

start();
