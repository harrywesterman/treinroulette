const { createServer } = require("node:http");
const { promises: fs } = require("node:fs");
const path = require("node:path");

const port = Number(process.env.PORT || 3000);
const publicDir = __dirname;
const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
const dataFile = path.join(dataDir, "games.json");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

let games = {};

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
  return {
    code,
    players: Array.isArray(state.players) ? state.players.slice(0, 20).map(String) : [],
    selectedGame: state.selectedGame === "Battle" ? "Battle" : "Team up",
    currentQuest: Number.isInteger(state.currentQuest) ? state.currentQuest : 0,
    currentDestination: Number.isInteger(state.currentDestination) ? state.currentDestination : 0,
    checkedBingo: Array.isArray(state.checkedBingo)
      ? state.checkedBingo.filter((item) => Number.isInteger(item) && item >= 0 && item < 25)
      : [],
    activeScreen: ["lobby", "intro", "vote", "game", "settings"].includes(state.activeScreen)
      ? state.activeScreen
      : "lobby",
    updatedAt: new Date().toISOString(),
  };
}

async function handleApi(request, response, url) {
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
