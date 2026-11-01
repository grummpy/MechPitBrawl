import { BIND_ACTIONS, mapPlayerInputs } from "../core/inputmap.js";
import { createMatch, standings, step } from "../core/match.js";
import { AudioBus } from "./audio.js";
import { Keyboard, edgePads, padsConnected, readGamepads, snapshotPads } from "./input.js";
import { Renderer } from "./render.js";
import { loadSettings, saveSettings } from "./storage.js";

const STEP_MS = 1000 / 60;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const keys = new Keyboard(canvas);
const audio = new AudioBus();
const renderer = new Renderer(ctx);

const settings = loadSettings();
audio.setVolume(settings.volume);
audio.setMuted(settings.muted);

let screen = "title";
let match = null;
let slots = botSlots();
let pauseIndex = 0;
let settingsIndex = 0;
let settingsReturn = "title";
let resultsIndex = 0;
let remap = { player: 0, action: 0, capturing: false };
let joinMessage = "";
let joinMessageTimer = 0;
let shake = 0;
let padSnap = [null, null, null, null];
let connected = [false, false, false, false];
let last = performance.now();
let acc = 0;

canvas.addEventListener("mousedown", () => canvas.focus());
window.addEventListener("pointerdown", onPointer);
canvas.focus();

function botSlots() {
  return [{ kind: "bot" }, { kind: "bot" }, { kind: "bot" }, { kind: "bot" }];
}

function persist() {
  saveSettings(settings);
  audio.setVolume(settings.volume);
  audio.setMuted(settings.muted);
}

function unlock() {
  audio.unlock();
  audio.startTheme();
}

function toggleMute() {
  settings.muted = !settings.muted;
  persist();
  if (!settings.muted) audio.blip();
}

function cycleSlot(index, toHuman) {
  const slot = slots[index];
  if (toHuman) slot.kind = slot.kind === "human" ? "bot" : "human";
  else if (slot.kind === "human") slot.kind = "off";
  else slot.kind = slot.kind === "bot" ? "off" : "bot";
  audio.blip();
}

function flashJoin(message) {
  joinMessage = message;
  joinMessageTimer = 150;
}

function startMatch() {
  const humans = slots.filter((slot) => slot.kind === "human").length;
  const active = slots.filter((slot) => slot.kind !== "off").length;
  if (humans < 1) {
    flashJoin("A pilot has to join — press your punch key");
    return;
  }
  if (active < 2) {
    flashJoin("Turn another slot into a bot for a real match");
    return;
  }
  match = createMatch({
    seed: (Date.now() >>> 0) || 1,
    roundCount: settings.roundCount,
    slots,
  });
  screen = "fight";
  audio.blip();
}

function rematch() {
  match = createMatch({
    seed: (Date.now() >>> 0) || 1,
    roundCount: settings.roundCount,
    slots,
  });
  screen = "fight";
}

function openSettings(from) {
  settingsReturn = from;
  settingsIndex = 0;
  screen = "settings";
}

function closeSettings() {
  persist();
  screen = settingsReturn;
}

function choosePause() {
  if (pauseIndex === 0) screen = "fight";
  else if (pauseIndex === 1) openSettings("pause");
  else {
    screen = "title";
    match = null;
  }
  audio.blip();
}

function chooseSettings() {
  if (settingsIndex === 2) {
    remap = { player: 0, action: 0, capturing: false };
    screen = "controls";
  } else if (settingsIndex === 3) closeSettings();
  audio.blip();
}

function menuDelta(pressed, edges) {
  let dir = 0;
  if (pressed.has("ArrowUp") || pressed.has("KeyW")) dir -= 1;
  if (pressed.has("ArrowDown") || pressed.has("KeyS")) dir += 1;
  for (const edge of edges) {
    if (edge.up) dir -= 1;
    if (edge.down) dir += 1;
  }
  return dir;
}

function horizontalDelta(pressed, edges) {
  let dir = 0;
  if (pressed.has("ArrowLeft") || pressed.has("KeyA")) dir -= 1;
  if (pressed.has("ArrowRight") || pressed.has("KeyD")) dir += 1;
  for (const edge of edges) {
    if (edge.left) dir -= 1;
    if (edge.right) dir += 1;
  }
  return dir;
}

function confirmed(pressed, edges) {
  return pressed.has("Enter") || pressed.has("Space") || edges.some((edge) => edge.a || edge.start);
}

function cancelled(pressed, edges) {
  return pressed.has("Escape") || edges.some((edge) => edge.b);
}

function onPointer(event) {
  unlock();
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  const hit = renderer.hotspots.find((spot) => x >= spot.x && y >= spot.y && x <= spot.x + spot.w && y <= spot.y + spot.h);
  if (!hit) return;
  const id = hit.id;
  if (id === "start") {
    slots = botSlots();
    screen = "join";
    audio.blip();
  } else if (id.startsWith("join-")) {
    cycleSlot(Number(id.slice(5)), true);
  } else if (id.startsWith("pause-")) {
    pauseIndex = Number(id.slice(6));
    choosePause();
  } else if (id.startsWith("settings-")) {
    settingsIndex = Number(id.slice(9));
    if (settingsIndex === 0) settings.volume = settings.volume >= 1 ? 0 : Math.round((settings.volume + 0.1) * 10) / 10;
    else if (settingsIndex === 1) settings.roundCount = settings.roundCount >= 9 ? 1 : settings.roundCount + 1;
    chooseSettings();
    persist();
  } else if (id.startsWith("bind-")) {
    const parts = id.split("-");
    remap = { player: Number(parts[1]), action: Number(parts[2]), capturing: true };
    screen = "controls";
  } else if (id === "results-0") rematch();
  else if (id === "results-1") {
    screen = "title";
    match = null;
  }
}

function logic(pressed, edges) {
  if (joinMessageTimer > 0) joinMessageTimer -= 1;
  if (joinMessageTimer <= 0) joinMessage = "";
  shake *= 0.86;

  if (screen === "controls" && remap.capturing) {
    if (pressed.has("Escape") || edges.some((edge) => edge.b)) {
      remap.capturing = false;
      return;
    }
    const ignore = new Set(["Enter", "Space", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
    for (const code of pressed) {
      if (ignore.has(code)) continue;
      settings.bindings[remap.player][BIND_ACTIONS[remap.action]] = code;
      remap.capturing = false;
      persist();
      audio.blip();
      return;
    }
    return;
  }

  if (pressed.has("KeyM") && screen !== "controls") toggleMute();

  if (screen === "title") {
    if (confirmed(pressed, edges)) {
      unlock();
      slots = botSlots();
      screen = "join";
      audio.blip();
    } else if (pressed.has("KeyS")) openSettings("title");
    return;
  }

  if (screen === "join") {
    settings.bindings.forEach((binding, index) => {
      if (pressed.has(binding.action)) cycleSlot(index, true);
      if (pressed.has(binding.secondary)) cycleSlot(index, false);
    });
    edges.forEach((edge, index) => {
      if (edge.a) cycleSlot(index, true);
      if (edge.b) cycleSlot(index, false);
    });
    if (pressed.has("Enter") || edges.some((edge) => edge.start)) startMatch();
    if (pressed.has("Escape")) screen = "title";
    return;
  }

  if (screen === "fight") {
    if ((pressed.has("Escape") || edges.some((edge) => edge.start)) && match && match.phase !== "matchEnd") {
      screen = "pause";
      pauseIndex = 0;
      audio.blip();
    }
    return;
  }

  if (screen === "pause") {
    const dir = menuDelta(pressed, edges);
    if (dir) pauseIndex = (pauseIndex + dir + 3) % 3;
    if (confirmed(pressed, edges)) choosePause();
    else if (cancelled(pressed, edges)) screen = "fight";
    return;
  }

  if (screen === "settings") {
    const dir = menuDelta(pressed, edges);
    if (dir) settingsIndex = (settingsIndex + dir + 4) % 4;
    const side = horizontalDelta(pressed, edges);
    if (side && settingsIndex === 0) {
      settings.volume = Math.min(1, Math.max(0, Math.round((settings.volume + side * 0.1) * 10) / 10));
      persist();
    }
    if (side && settingsIndex === 1) {
      settings.roundCount = Math.min(9, Math.max(1, settings.roundCount + side));
      persist();
    }
    if (confirmed(pressed, edges)) chooseSettings();
    else if (cancelled(pressed, edges)) closeSettings();
    return;
  }

  if (screen === "controls") {
    const dir = menuDelta(pressed, edges);
    const side = horizontalDelta(pressed, edges);
    if (dir) remap.action = (remap.action + dir + BIND_ACTIONS.length) % BIND_ACTIONS.length;
    if (side) remap.player = (remap.player + side + 4) % 4;
    if (pressed.has("Enter") || edges.some((edge) => edge.a)) remap.capturing = true;
    if (cancelled(pressed, edges)) {
      persist();
      screen = "settings";
    }
    return;
  }

  if (screen === "results") {
    const dir = menuDelta(pressed, edges);
    if (dir) resultsIndex = (resultsIndex + dir + 2) % 2;
    if (confirmed(pressed, edges)) {
      if (resultsIndex === 0) rematch();
      else {
        screen = "title";
        match = null;
      }
    }
  }
}

function onSimEvent(event) {
  audio.play(event);
  if (event.type === "hit") shake = Math.min(10, 4 + (event.damage || 0) / 40);
  if (event.type === "ko") shake = 9;
}

function tick() {
  const pressed = keys.consume();
  const pads = readGamepads();
  connected = padsConnected(pads);
  const snap = snapshotPads(pads);
  const edges = edgePads(snap, padSnap);
  padSnap = snap;
  if (pressed.size || edges.some((edge) => edge.a || edge.start || edge.b)) unlock();
  logic(pressed, edges);

  if (screen === "fight" && match && match.phase !== "matchEnd") {
    const held = new Set(keys.down);
    for (const code of pressed) held.add(code);
    step(match, mapPlayerInputs({ keys: held, gamepads: pads, bindings: settings.bindings }));
    for (const event of match.events) onSimEvent(event);
    if (match.phase === "matchEnd") {
      screen = "results";
      resultsIndex = 0;
    }
  }
}

function frame(now) {
  const dt = Math.min(80, now - last);
  last = now;
  acc += dt;
  let guard = 0;
  while (acc >= STEP_MS && guard < 5) {
    tick();
    acc -= STEP_MS;
    guard += 1;
  }
  renderer.draw({
    screen,
    match,
    slots,
    settings,
    bindings: settings.bindings,
    pauseIndex,
    settingsIndex,
    resultsIndex,
    remap,
    pads: connected,
    shake,
    time: now,
    muted: settings.muted,
    joinMessage,
    standings: match ? standings(match) : [],
  });
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
