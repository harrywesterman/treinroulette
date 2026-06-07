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
const winPanel = document.querySelector("#win-panel");
const winTitle = document.querySelector("#win-title");
const winCopy = document.querySelector("#win-copy");
const soundInput = document.querySelector("#sound");
const vibrationInput = document.querySelector("#vibration");
const journeyMapElement = document.querySelector("#journey-map");
const discoveryList = document.querySelector("#discovery-list");

let players = ["Maartje", "Pepijn", "Djurre"];
let selectedGame = "Team up";
let currentQuest = 0;
let currentDestination = 0;
let checkedBingo = new Set();
let sharedLocation = null;
let battleScores = {};
let soundLevel = 95;
let vibrationEnabled = true;
let discoveries = [];
let audioContext = null;
let journeyMap = null;
let routeLayer = null;
let markerLayer = null;
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
  soundLevel = 95;
  vibrationEnabled = true;
  discoveries = [];
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
    soundLevel,
    vibrationEnabled,
    discoveries,
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
  soundLevel = Number.isFinite(state.soundLevel) ? state.soundLevel : soundLevel;
  vibrationEnabled =
    typeof state.vibrationEnabled === "boolean" ? state.vibrationEnabled : vibrationEnabled;
  discoveries = Array.isArray(state.discoveries) ? state.discoveries : [];
  renderFeedbackSettings();

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

function renderFeedbackSettings() {
  soundInput.value = String(soundLevel);
  vibrationInput.checked = vibrationEnabled;
}

function vibrate(pattern = 35) {
  if (vibrationEnabled && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function playTone(frequency = 660, duration = 0.08) {
  if (soundLevel <= 0) {
    return;
  }

  try {
    audioContext ||= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.frequency.value = frequency;
    oscillator.type = "square";
    gain.gain.setValueAtTime((soundLevel / 100) * 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  } catch {
    // Audio is optional; some browsers block it until a user gesture.
  }
}

function feedback(type = "tap") {
  const patterns = {
    tap: 25,
    point: [35, 35, 45],
    win: [60, 45, 60, 45, 90],
  };
  const tones = {
    tap: 540,
    point: 720,
    win: 880,
  };

  vibrate(patterns[type] || patterns.tap);
  playTone(tones[type] || tones.tap, type === "win" ? 0.16 : 0.08);
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

function getBattleLeader() {
  ensureBattleScores();
  return players
    .map((player) => ({ player, score: battleScores[player] || 0 }))
    .sort((left, right) => right.score - left.score)[0];
}

function getDestinationStation() {
  const destination = destinations[currentDestination % destinations.length];
  return (
    stations.find((station) => station.name === destination.name) ||
    stations.find((station) => station.name.includes(destination.name.replace(" Centraal", ""))) ||
    stations[0]
  );
}

function getDiscoveryPlace() {
  if (sharedLocation) {
    const nearest = findNearestStation(sharedLocation);
    return {
      lat: sharedLocation.lat,
      lon: sharedLocation.lon,
      stationName: nearest.name,
      source: "GPS",
    };
  }

  const station = getDestinationStation();
  return {
    lat: station.lat,
    lon: station.lon,
    stationName: station.name,
    source: "Halte",
  };
}

function recordDiscovery(questIndex = currentQuest, player = selectedGame === "Battle" ? players[0] : "Team") {
  const quest = quests[questIndex % quests.length];
  const place = getDiscoveryPlace();
  const discovery = {
    questIndex,
    questTitle: quest.title,
    player,
    mode: selectedGame,
    lat: place.lat,
    lon: place.lon,
    stationName: place.stationName,
    source: place.source,
    foundAt: new Date().toISOString(),
  };
  const existingIndex = discoveries.findIndex((item) => item.questIndex === questIndex);

  if (existingIndex >= 0) {
    discoveries[existingIndex] = discovery;
  } else {
    discoveries.push(discovery);
  }
}

function removeDiscovery(questIndex) {
  discoveries = discoveries.filter((item) => item.questIndex !== questIndex);
}

function formatTime(value) {
  return new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function initJourneyMap() {
  if (journeyMap || !window.L || !journeyMapElement) {
    return;
  }

  journeyMap = L.map(journeyMapElement, {
    attributionControl: false,
    zoomControl: false,
  }).setView([52.15, 5.3], 7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(journeyMap);
  markerLayer = L.layerGroup().addTo(journeyMap);
}

function renderJourney() {
  discoveryList.innerHTML = discoveries.length
    ? discoveries
        .map(
          (item) => `
            <li>
              <strong>${escapeHtml(item.questTitle)}</strong>
              <span>${escapeHtml(item.stationName)} - ${escapeHtml(item.player)} - ${formatTime(item.foundAt)}</span>
            </li>
          `,
        )
        .join("")
    : "<li><strong>Nog niets gevonden</strong><span>Vink een quest af om jullie route te starten.</span></li>";

  initJourneyMap();

  if (!journeyMap || !markerLayer) {
    return;
  }

  markerLayer.clearLayers();
  routeLayer?.remove();

  const points = discoveries.map((item) => [item.lat, item.lon]);
  discoveries.forEach((item, index) => {
    L.marker([item.lat, item.lon])
      .bindPopup(`${index + 1}. ${item.questTitle}<br>${item.stationName}<br>${item.player}`)
      .addTo(markerLayer);
  });

  if (points.length > 1) {
    routeLayer = L.polyline(points, { color: "#287a22", weight: 4 }).addTo(journeyMap);
  }

  if (points.length) {
    journeyMap.fitBounds(L.latLngBounds(points), { padding: [22, 22], maxZoom: 14 });
  } else {
    journeyMap.setView([52.15, 5.3], 7);
  }

  setTimeout(() => journeyMap.invalidateSize(), 50);
}

function renderWinState() {
  const hasBingo = checkedBingo.size >= quests.length;
  winPanel.hidden = !hasBingo;

  if (!hasBingo) {
    return;
  }

  if (selectedGame === "Battle") {
    const leader = getBattleLeader();
    winTitle.textContent = `${leader.player} wint Battle`;
    winCopy.textContent = `Alle vakjes zijn voltooid. ${leader.player} staat bovenaan met ${leader.score} punt${leader.score === 1 ? "" : "en"}.`;
    return;
  }

  winTitle.textContent = "Jullie hebben gewonnen";
  winCopy.textContent = "Alle side quests zijn voltooid. Tijd voor een recap van jullie reis.";
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
  renderWinState();
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
  renderJourney();
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
    feedback("tap");
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
    recordDiscovery(currentQuest, player);
    renderGame();
    feedback(checkedBingo.size >= quests.length ? "win" : "point");
    actionButton.textContent = "Punt geclaimd";
    setTimeout(() => {
      actionButton.textContent = "Punt claimen";
    }, 900);
    saveGame("game");
  }

  if (actionButton?.dataset.action === "mark-quest") {
    checkedBingo.add(currentQuest);
    recordDiscovery(currentQuest);
    const activeCell = bingoGrid.querySelector(`[data-bingo="${currentQuest}"]`);
    activeCell?.classList.add("done");
    renderWinState();
    feedback(checkedBingo.size >= quests.length ? "win" : "tap");
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
      removeDiscovery(index);
    } else {
      checkedBingo.add(index);
      recordDiscovery(index);
    }
    bingoCell.classList.toggle("done");
    renderWinState();
    feedback(checkedBingo.size >= quests.length ? "win" : "tap");
    saveGame("game");
  }
});

document.addEventListener("input", (event) => {
  if (event.target === soundInput) {
    soundLevel = Number(soundInput.value);
    playTone(660, 0.05);
    saveGame();
  }
});

document.addEventListener("change", (event) => {
  if (event.target === vibrationInput) {
    vibrationEnabled = vibrationInput.checked;
    vibrate(40);
    saveGame();
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
  renderFeedbackSettings();
  renderVotes();
  renderGame();
  updateQrCode();
}

init();
