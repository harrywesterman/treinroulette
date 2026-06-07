const screens = document.querySelectorAll(".screen");
const gameCode = document.querySelector("#game-code");
const joinCodeInput = document.querySelector("#join-code");
const playerList = document.querySelector("#player-list");
const settingsPlayerList = document.querySelector("#settings-player-list");
const voteOptions = document.querySelector("#vote-options");
const activeMode = document.querySelector("#active-mode");
const destinationName = document.querySelector("#destination-name");
const destinationCopy = document.querySelector("#destination-copy");
const questTitle = document.querySelector("#quest-title");
const questCopy = document.querySelector("#quest-copy");
const bingoGrid = document.querySelector("#bingo-grid");
const qrCode = document.querySelector("#qr-code");
const settingsNameInput = document.querySelector("#settings-name");
const locationTitle = document.querySelector("#location-title");
const locationCopy = document.querySelector("#location-copy");
const battlePanel = document.querySelector("#battle-panel");
const battleScoreList = document.querySelector("#battle-score-list");

let players = ["Maartje", "Pepijn", "Djurre"];
let selectedGame = "Team up";
let currentQuest = 0;
let currentDestination = 0;
let checkedBingo = new Set();
let sharedLocation = null;
let battleScores = {};
let isRestoring = false;

const games = [
  {
    name: "Team up",
    votes: "2/4",
    copy:
      "Bij Team Up voeren jullie samen zoveel mogelijk quests uit op de bingokaart. Pak de grote uitdagingen aan en race samen tegen de klok!",
  },
  {
    name: "Battle",
    votes: "1/4",
    copy:
      "Ben jij klaar om het op te nemen tegen je vrienden? Bij Battle krijgt iedereen een eigen bingokaart. Wie vult de meeste vakjes?",
  },
];

const destinations = [
  {
    name: "Utrecht Centraal",
    copy: "Zoek de grootste stationshal en kies daar jullie eerste opdracht.",
  },
  {
    name: "Rotterdam Blaak",
    copy: "Loop richting de kubuswoningen en laat de stad het decor worden.",
  },
  {
    name: "Den Haag HS",
    copy: "Tijd voor een koninklijke omweg met een opdracht onderweg.",
  },
  {
    name: "Amersfoort Centraal",
    copy: "Pak een korte wandeling en verzamel bewijs voor jullie bingokaart.",
  },
];

let stations = [
  { name: "Utrecht Centraal", lat: 52.0894, lon: 5.1103 },
  { name: "Rotterdam Blaak", lat: 51.9202, lon: 4.4897 },
  { name: "Den Haag HS", lat: 52.0693, lon: 4.3226 },
  { name: "Amersfoort Centraal", lat: 52.1537, lon: 5.3745 },
  { name: "Amsterdam Centraal", lat: 52.3789, lon: 4.9003 },
  { name: "Leiden Centraal", lat: 52.1662, lon: 4.4824 },
  { name: "Gouda", lat: 52.0176, lon: 4.7047 },
  { name: "Eindhoven Centraal", lat: 51.4433, lon: 5.4796 },
  { name: "Zwolle", lat: 52.5051, lon: 6.0918 },
  { name: "Groningen", lat: 53.2105, lon: 6.5646 },
];

async function loadStations() {
  try {
    const response = await fetch("/api/stations", { cache: "no-store" });

    if (!response.ok) {
      return;
    }

    const payload = await response.json();

    if (Array.isArray(payload.stations) && payload.stations.length) {
      stations = payload.stations;
    }
  } catch {
    // Keep the bundled fallback stations.
  }
}

const quests = [
  {
    title: "Maak een teamfoto met een stationsklok",
    copy: "Bonus als iedereen tegelijk naar een andere kant kijkt.",
  },
  {
    title: "Vind iets groens in de stad",
    copy: "Iedereen moet het ermee eens zijn dat het telt.",
  },
  {
    title: "Vraag iemand om een lokale tip",
    copy: "Gebruik de tip voor jullie volgende mini-route.",
  },
  {
    title: "Koop de goedkoopste snack",
    copy: "Presenteer hem alsof het haute cuisine is.",
  },
  {
    title: "Spot drie verschillende treintypes",
    copy: "Foto's tellen, discussie achteraf ook.",
  },
  {
    title: "Maak een route van precies 750 stappen",
    copy: "Stop waar je uitkomt en verzin daar een teamnaam.",
  },
  {
    title: "Vind een straatnaam met een dier",
    copy: "Geen succes? Kies de vreemdste straatnaam die je tegenkomt.",
  },
  {
    title: "Doe een stille high five bij het perron",
    copy: "Niemand buiten jullie groep mag doorhebben waarom.",
  },
  {
    title: "Maak een ansichtkaart-foto",
    copy: "Kies samen welke foto de stad het best verkoopt.",
  },
];

function showScreen(name) {
  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.id === `screen-${name}`);
  });
  window.scrollTo(0, 0);

  if (!isRestoring && name !== "home") {
    saveGame(name);
  }
}

function makeCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function getShareLink() {
  return `${location.origin}${location.pathname}?code=${gameCode.textContent}`;
}

function updateQrCode() {
  const qrTarget = encodeURIComponent(getShareLink());
  qrCode.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${qrTarget}`;
}

function storageKey(code = gameCode.textContent) {
  return `treinroulette:game:${code}`;
}

function getActiveScreenName() {
  return document.querySelector(".screen.active")?.id.replace("screen-", "") || "lobby";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function resetGameState() {
  players = ["Maartje", "Pepijn", "Djurre"];
  selectedGame = "Team up";
  currentQuest = 0;
  currentDestination = 0;
  checkedBingo = new Set();
  sharedLocation = null;
  battleScores = {};
}

function getGameState(activeScreen = getActiveScreenName()) {
  const code = gameCode.textContent;

  if (!/^\d{4}$/.test(code)) {
    return null;
  }

  return {
    code,
    players,
    selectedGame,
    currentQuest,
    currentDestination,
    checkedBingo: [...checkedBingo],
    sharedLocation,
    battleScores,
    activeScreen,
    updatedAt: new Date().toISOString(),
  };
}

async function saveGame(activeScreen = getActiveScreenName()) {
  const state = getGameState(activeScreen);

  if (!state) {
    return;
  }

  localStorage.setItem(storageKey(state.code), JSON.stringify(state));

  try {
    await fetch(`/api/games/${state.code}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
  } catch {
    // Local fallback keeps the current browser usable if the API is temporarily unavailable.
  }
}

async function deleteGame() {
  const code = gameCode.textContent;

  localStorage.removeItem(storageKey(code));

  if (/^\d{4}$/.test(code)) {
    try {
      await fetch(`/api/games/${code}`, { method: "DELETE" });
    } catch {
      // If the API is unavailable, local reset still lets the user continue.
    }
  }

  resetGameState();
  renderPlayers();
  renderVotes();
  renderGame();
  showScreen("home");
}

function applyGameState(state) {
  if (!state) {
    resetGameState();
    return null;
  }

  players = Array.isArray(state.players) && state.players.length ? state.players : players;
  selectedGame = games.some((game) => game.name === state.selectedGame) ? state.selectedGame : selectedGame;
  currentQuest = Number.isInteger(state.currentQuest) ? state.currentQuest : 0;
  currentDestination = Number.isInteger(state.currentDestination) ? state.currentDestination : 0;
  checkedBingo = new Set(Array.isArray(state.checkedBingo) ? state.checkedBingo : []);
  sharedLocation = state.sharedLocation && Number.isFinite(state.sharedLocation.lat) ? state.sharedLocation : null;
  battleScores = state.battleScores && typeof state.battleScores === "object" ? state.battleScores : {};

  return state;
}

async function loadGame(code) {
  try {
    const response = await fetch(`/api/games/${code}`, { cache: "no-store" });

    if (response.ok) {
      const payload = await response.json();

      if (payload.game) {
        localStorage.setItem(storageKey(code), JSON.stringify(payload.game));
        return applyGameState(payload.game);
      }
    }
  } catch {
    // Fall back to this browser's saved state below.
  }

  const rawState = localStorage.getItem(storageKey(code));

  try {
    if (!rawState) {
      return applyGameState(null);
    }

    const state = JSON.parse(rawState);
    return applyGameState(state);
  } catch {
    localStorage.removeItem(storageKey(code));
    return applyGameState(null);
  }
}

async function useGameCode(code) {
  const normalizedCode = /^\d{4}$/.test(code) ? code : makeCode();
  const storedState = await loadGame(normalizedCode);

  gameCode.textContent = normalizedCode;
  joinCodeInput.value = normalizedCode;
  renderPlayers();
  renderVotes();
  renderGame();
  updateQrCode();
  saveGame(storedState?.activeScreen || "lobby");

  return storedState;
}

async function copyShareLink() {
  const link = getShareLink();

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(link);
    }
  } catch {
    // The app still shows the link feedback when clipboard permission is unavailable.
  }

  return link;
}

function renderPlayers() {
  const markup = players
    .map(
      (player, index) => `
        <li>
          <span>${escapeHtml(player)}</span>
          <button class="icon-button" type="button" data-remove-player="${index}" aria-label="${escapeHtml(player)} verwijderen">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </li>
      `,
    )
    .join("");

  playerList.innerHTML = markup;
  settingsPlayerList.innerHTML = markup;
  settingsNameInput.value = players[0] || "";
}

function renderVotes() {
  voteOptions.innerHTML = games
    .map(
      (game) => `
        <article class="vote-card ${game.name === selectedGame ? "selected" : ""}">
          <button class="vote-choice" type="button" data-vote="${game.name}">
            <span>${game.name}</span>
            <span>${game.votes}</span>
          </button>
          <p class="vote-copy">${game.copy}</p>
        </article>
      `,
    )
    .join("");
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceInMeters(pointA, pointB) {
  const earthRadius = 6371e3;
  const latA = toRadians(pointA.lat);
  const latB = toRadians(pointB.lat);
  const deltaLat = toRadians(pointB.lat - pointA.lat);
  const deltaLon = toRadians(pointB.lon - pointA.lon);
  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function formatDistance(meters) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }

  return `${Math.round(meters)} m`;
}

function findNearestStation(location) {
  return stations
    .map((station) => ({
      ...station,
      distance: distanceInMeters(location, station),
    }))
    .sort((left, right) => left.distance - right.distance)[0];
}

function ensureBattleScores() {
  battleScores = players.reduce((scores, player) => {
    scores[player] = Number.isInteger(battleScores[player]) ? battleScores[player] : 0;
    return scores;
  }, {});
}

function renderLocation() {
  if (!sharedLocation) {
    locationTitle.textContent = "GPS-toestemming nodig";
    locationCopy.textContent = "Klik op Vraag GPS of rond het stemmen af om je locatie met deze spelcode te delen.";
    return;
  }

  const nearest = findNearestStation(sharedLocation);
  locationTitle.textContent = `${nearest.name} dichtbij`;
  locationCopy.textContent = `${formatDistance(nearest.distance)} van jullie gedeelde GPS-locatie. Nauwkeurigheid ongeveer ${Math.round(
    sharedLocation.accuracy || 0,
  )} m.`;
}

function renderBattle() {
  ensureBattleScores();
  battlePanel.hidden = selectedGame !== "Battle";
  battleScoreList.innerHTML = players
    .map(
      (player) => `
        <li>
          <span>${escapeHtml(player)}</span>
          <strong>${battleScores[player] || 0}</strong>
        </li>
      `,
    )
    .join("");
}

function renderGame() {
  const destination = destinations[currentDestination % destinations.length];
  const quest = quests[currentQuest % quests.length];

  activeMode.textContent = selectedGame;
  destinationName.textContent = destination.name;
  destinationCopy.textContent = destination.copy;
  questTitle.textContent = quest.title;
  questCopy.textContent = quest.copy;
  renderLocation();
  renderBattle();
  bingoGrid.innerHTML = quests
    .map(
      (questItem, index) => `
        <button class="bingo-cell ${checkedBingo.has(index) ? "done" : ""}" type="button" data-bingo="${index}">
          <span>${index + 1}</span>
          ${questItem.title}
        </button>
      `,
    )
    .join("");
}

function addPlayer(form) {
  const input = form.querySelector("input");
  const name = input.value.trim();

  if (!name) {
    input.focus();
    return;
  }

  players = [...new Set([...players, name])];
  ensureBattleScores();
  input.value = "";
  renderPlayers();
  renderBattle();
  saveGame();
}

function renameCurrentPlayer() {
  const input = document.querySelector("#settings-name");
  const name = input.value.trim();

  if (!name) {
    input.focus();
    return;
  }

  players = [name, ...players.slice(1)];
  ensureBattleScores();
  renderPlayers();
  renderBattle();
  saveGame();
}

function requestLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS wordt niet ondersteund door deze browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 30_000,
      timeout: 12_000,
    });
  });
}

async function shareLocation(button = null) {
  if (button) {
    button.textContent = "GPS ophalen...";
  }

  try {
    const position = await requestLocation();
    sharedLocation = {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      accuracy: position.coords.accuracy,
      updatedAt: new Date().toISOString(),
    };
    renderGame();
    saveGame("game");
  } catch (error) {
    locationTitle.textContent = "GPS niet beschikbaar";
    locationCopy.textContent =
      error.code === 1
        ? "Locatie is geweigerd. Sta locatie toe in je browserinstellingen en probeer opnieuw."
        : "Kon je locatie niet ophalen. Controleer GPS/bereik en probeer opnieuw.";
  } finally {
    if (button) {
      button.textContent = "Vraag GPS";
    }
  }
}

document.addEventListener("click", async (event) => {
  const screenButton = event.target.closest("[data-screen]");
  const actionButton = event.target.closest("[data-action]");
  const removeButton = event.target.closest("[data-remove-player]");
  const voteButton = event.target.closest("[data-vote]");

  if (screenButton) {
    showScreen(screenButton.dataset.screen);
  }

  if (actionButton?.dataset.action === "host") {
    const preferredCode = joinCodeInput.value.trim();
    await useGameCode(preferredCode);
    showScreen("lobby");
  }

  if (actionButton?.dataset.action === "copy-link") {
    await copyShareLink();
    actionButton.textContent = "Link gekopieerd";
    setTimeout(() => {
      actionButton.textContent = actionButton.classList.contains("secondary-button")
        ? "Link kopieren"
        : "Spel-link kopieren";
    }, 1200);
  }

  if (actionButton?.dataset.action === "finish-vote") {
    renderGame();
    showScreen("game");
    await shareLocation();
  }

  if (actionButton?.dataset.action === "next-quest") {
    currentQuest = (currentQuest + 1) % quests.length;
    currentDestination = (currentDestination + 1) % destinations.length;
    renderGame();
    saveGame("game");
  }

  if (actionButton?.dataset.action === "share-location") {
    await shareLocation(actionButton);
  }

  if (actionButton?.dataset.action === "claim-battle-point") {
    ensureBattleScores();
    const player = players[0] || "Speler";
    battleScores[player] = (battleScores[player] || 0) + 1;
    checkedBingo.add(currentQuest);
    renderGame();
    saveGame("game");
  }

  if (actionButton?.dataset.action === "mark-quest") {
    checkedBingo.add(currentQuest);
    const activeCell = bingoGrid.querySelector(`[data-bingo="${currentQuest}"]`);
    activeCell?.classList.add("done");
    saveGame("game");
  }

  if (actionButton?.dataset.action === "rename-player") {
    renameCurrentPlayer();
  }

  if (actionButton?.dataset.action === "end-game") {
    await deleteGame();
  }

  if (removeButton) {
    players = players.filter((_, index) => index !== Number(removeButton.dataset.removePlayer));
    ensureBattleScores();
    renderPlayers();
    renderBattle();
    saveGame();
  }

  if (voteButton) {
    selectedGame = voteButton.dataset.vote;
    ensureBattleScores();
    renderVotes();
    renderGame();
    saveGame("vote");
  }

  const bingoCell = event.target.closest("[data-bingo]");
  if (bingoCell) {
    const index = Number(bingoCell.dataset.bingo);
    if (checkedBingo.has(index)) {
      checkedBingo.delete(index);
    } else {
      checkedBingo.add(index);
    }
    bingoCell.classList.toggle("done");
    saveGame("game");
  }
});

document.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;

  if (form.dataset.action === "join") {
    const code = form.elements.code.value.trim();
    const storedState = await useGameCode(code || "1221");
    showScreen(storedState?.activeScreen || "lobby");
  }

  if (form.dataset.action === "add-player") {
    addPlayer(form);
  }
});

async function init() {
  await loadStations();

  const urlCode = new URLSearchParams(location.search).get("code");

  if (urlCode) {
    const storedState = await useGameCode(urlCode.slice(0, 4));
    isRestoring = true;
    showScreen(storedState?.activeScreen || "lobby");
    isRestoring = false;
    return;
  }

  renderPlayers();
  renderVotes();
  renderGame();
  updateQrCode();
}

init();
