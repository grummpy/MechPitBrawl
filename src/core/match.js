import { decideBot } from "./bots.js";
import { hitStrength, launchVelocity, punchHitbox } from "./combat.js";
import {
  AIR_ACCEL,
  AIR_DRAG,
  COUNTDOWN_TICKS,
  DASH_COOLDOWN,
  DASH_FRAMES,
  DASH_SPEED,
  FAST_FALL,
  FIGHTER_H,
  FIGHTER_W,
  GRAVITY,
  GROUND_DRAG,
  JUMP_COOLDOWN,
  JUMP_V,
  LAVA_Y,
  MAX_FALL,
  MAX_RUN,
  MOVE_ACCEL,
  PALETTE_NAMES,
  PUNCH_COOLDOWN,
  PUNCH_END,
  PUNCH_START,
  PUNCH_TOTAL,
  RESPAWN_INVULN,
  ROUND_END_TICKS,
  STOCKS,
  TILE_STAND_WEAR,
} from "./constants.js";
import { overlap } from "./geom.js";
import { neutralInput } from "./inputmap.js";
import { collectPowerups, updatePowerups } from "./powerups.js";
import { makeRng } from "./rng.js";
import { createStage, moveBody, updateTiles } from "./stage.js";

const DEFAULT_SLOTS = [
  { kind: "human" },
  { kind: "bot" },
  { kind: "bot" },
  { kind: "bot" },
];

function copyInput(input) {
  const source = input || neutralInput();
  return {
    left: !!source.left,
    right: !!source.right,
    up: !!source.up,
    down: !!source.down,
    action: !!source.action,
    secondary: !!source.secondary,
    pause: !!source.pause,
    source: source.source || "none",
  };
}

function createFighter(id, kind, stocks) {
  return {
    id,
    kind,
    name: PALETTE_NAMES[id],
    x: 0,
    y: 0,
    w: FIGHTER_W,
    h: FIGHTER_H,
    vx: 0,
    vy: 0,
    facing: id % 2 === 0 ? 1 : -1,
    onGround: false,
    groundTile: null,
    damage: 0,
    stocks: kind === "off" ? 0 : stocks,
    score: 0,
    alive: kind !== "off",
    airDashes: 1,
    maxAirDashes: 1,
    dashTime: 0,
    dashCooldown: 0,
    attackTime: 0,
    attackCooldown: 0,
    hitIds: [],
    stun: 0,
    invuln: 0,
    overclock: 0,
    jumpCooldown: 0,
    prevInput: neutralInput(),
  };
}

function activePlayers(state) {
  return state.players.filter((player) => player.kind !== "off");
}

export function standings(state) {
  return activePlayers(state)
    .map((player) => ({
      id: player.id,
      kind: player.kind,
      name: player.name,
      score: player.score,
      stocks: player.stocks,
      damage: player.damage,
      alive: player.alive,
    }))
    .sort((a, b) => b.score - a.score || b.stocks - a.stocks || a.damage - b.damage || a.id - b.id);
}

export function leaderId(state) {
  const rows = standings(state);
  return rows.length ? rows[0].id : null;
}

export function matchDecided(state) {
  if (state.round < state.roundCount) return false;
  const rows = standings(state);
  if (rows.length <= 1) return rows.length === 1;
  return rows[0].score > rows[1].score;
}

export function countdownNumber(state) {
  if (state.phase !== "countdown") return 0;
  return Math.max(1, Math.ceil(state.countdown / 60));
}

function spawnPlayers(state) {
  const ground = state.tiles.filter((tile) => tile.row === 0 && !tile.gone && !tile.falling);
  const anchors = [2, Math.max(3, ground.length - 3), 7, 10];
  let slot = 0;
  for (const player of state.players) {
    if (player.kind === "off") continue;
    const tile = ground[anchors[slot] % ground.length] || ground[0];
    player.x = tile.x + (tile.w - player.w) / 2;
    player.y = tile.y - player.h;
    player.vx = 0;
    player.vy = 0;
    player.onGround = true;
    player.groundTile = tile.id;
    player.facing = slot % 2 === 0 ? 1 : -1;
    slot += 1;
  }
}

function resetRoundBody(player, stocks) {
  player.stocks = player.kind === "off" ? 0 : stocks;
  player.alive = player.kind !== "off";
  player.damage = 0;
  player.vx = 0;
  player.vy = 0;
  player.stun = 0;
  player.invuln = 0;
  player.attackTime = 0;
  player.attackCooldown = 0;
  player.hitIds = [];
  player.dashTime = 0;
  player.dashCooldown = 0;
  player.airDashes = 1;
  player.maxAirDashes = 1;
  player.overclock = 0;
  player.onGround = false;
  player.groundTile = null;
  player.jumpCooldown = 0;
  player.prevInput = neutralInput();
}

function startNextRound(state) {
  state.round += 1;
  state.phase = "countdown";
  state.countdown = COUNTDOWN_TICKS;
  state.roundWinner = null;
  state.roundEndTimer = 0;
  state.goTimer = 0;
  state.tiles = createStage(state.rng);
  state.powerups = [];
  state.powerupTimer = 240;
  for (const player of state.players) resetRoundBody(player, state.startingStocks);
  spawnPlayers(state);
}

function respawn(state, player) {
  const ground = state.tiles.filter((tile) => tile.row === 0 && !tile.gone && !tile.falling);
  const tile = ground.length ? ground[player.id % ground.length] : null;
  if (tile) {
    player.x = tile.x + (tile.w - player.w) / 2;
    player.y = tile.y - player.h;
    player.groundTile = tile.id;
  } else {
    player.x = 480 - player.w / 2;
    player.y = 200;
    player.groundTile = null;
  }
  player.vx = 0;
  player.vy = 0;
  player.damage = 0;
  player.stun = 0;
  player.attackTime = 0;
  player.hitIds = [];
  player.dashTime = 0;
  player.onGround = true;
  player.invuln = RESPAWN_INVULN;
  player.overclock = 0;
  player.airDashes = player.maxAirDashes || 1;
  player.alive = true;
}

function checkKo(state, player) {
  if (!player.alive || player.kind === "off" || player.invuln > 0) return;
  const feet = player.y + player.h;
  if (feet < LAVA_Y) return;
  player.stocks -= 1;
  state.events.push({ type: "ko", playerId: player.id, stocks: player.stocks });
  if (player.stocks > 0) {
    respawn(state, player);
  } else {
    player.alive = false;
    player.vx = 0;
    player.vy = 0;
    player.stocks = 0;
  }
}

function applyPunch(state, attacker) {
  const box = punchHitbox(attacker);
  for (const victim of state.players) {
    if (victim.id === attacker.id || victim.kind === "off" || !victim.alive) continue;
    if (victim.invuln > 0) continue;
    if (attacker.hitIds.includes(victim.id)) continue;
    if (!overlap(box, victim)) continue;
    const boosted = attacker.overclock > 0;
    const blow = hitStrength(victim.damage, boosted);
    if (boosted) attacker.overclock -= 1;
    attacker.hitIds.push(victim.id);
    victim.damage = blow.after;
    const vel = launchVelocity(blow.kb, attacker.facing);
    victim.vx = vel.vx;
    victim.vy = vel.vy;
    victim.stun = blow.stun;
    victim.onGround = false;
    state.events.push({
      type: "hit",
      attacker: attacker.id,
      victim: victim.id,
      damage: victim.damage,
      kb: blow.kb,
    });
  }
}

function integrate(state, player, rawInput) {
  const input = copyInput(rawInput);
  const prev = player.prevInput || neutralInput();
  const edge = {
    up: input.up && !prev.up,
    action: input.action && !prev.action,
    secondary: input.secondary && !prev.secondary,
  };

  if (player.invuln > 0) player.invuln -= 1;
  if (player.stun > 0) player.stun -= 1;
  if (player.dashCooldown > 0) player.dashCooldown -= 1;
  if (player.attackCooldown > 0) player.attackCooldown -= 1;
  if (player.jumpCooldown > 0) player.jumpCooldown -= 1;

  const control = player.stun <= 0 && player.dashTime <= 0 && player.attackTime <= 0;
  if (control) {
    if (input.left && !input.right) player.facing = -1;
    else if (input.right && !input.left) player.facing = 1;
  }

  let startedDash = false;
  const canDash = player.dashCooldown <= 0 && player.stun <= 0 && player.attackTime <= 0
    && (player.onGround || player.airDashes > 0);
  if (edge.secondary && canDash) {
    if (!player.onGround) player.airDashes -= 1;
    player.dashTime = DASH_FRAMES;
    player.dashCooldown = DASH_COOLDOWN;
    player.vx = player.facing * DASH_SPEED;
    player.vy = 0;
    startedDash = true;
  }

  if (edge.action && !startedDash && player.attackCooldown <= 0 && player.stun <= 0 && player.dashTime <= 0) {
    player.attackTime = 1;
    player.hitIds = [];
  } else if (player.attackTime > 0) {
    player.attackTime += 1;
  }

  if (player.dashTime > 0) {
    player.vx = player.facing * DASH_SPEED;
    player.vy = 0;
    player.dashTime -= 1;
  } else if (player.stun > 0) {
    player.vx *= 0.985;
  } else if (player.attackTime > 0) {
    player.vx *= 0.86;
    if (edge.up && player.onGround && player.jumpCooldown <= 0) {
      player.vy = JUMP_V;
      player.onGround = false;
      player.jumpCooldown = JUMP_COOLDOWN;
    }
  } else {
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir !== 0) player.vx += dir * (player.onGround ? MOVE_ACCEL : AIR_ACCEL);
    else player.vx *= player.onGround ? GROUND_DRAG : AIR_DRAG;
    if (player.vx > MAX_RUN) player.vx = MAX_RUN;
    if (player.vx < -MAX_RUN) player.vx = -MAX_RUN;
    if (Math.abs(player.vx) < 0.04) player.vx = 0;
    if (input.up && player.onGround && player.jumpCooldown <= 0) {
      player.vy = JUMP_V;
      player.onGround = false;
      player.jumpCooldown = JUMP_COOLDOWN;
    }
    if (input.down && player.vy > 0.4) player.vy += FAST_FALL;
  }

  if (player.dashTime <= 0) {
    player.vy += GRAVITY;
    if (player.vy > MAX_FALL) player.vy = MAX_FALL;
  }

  moveBody(player, state.tiles);
  if (player.onGround) player.airDashes = player.maxAirDashes || 1;

  if (player.onGround && player.groundTile != null) {
    const tile = state.tiles.find((candidate) => candidate.id === player.groundTile);
    if (tile && !tile.falling && !tile.gone) tile.life -= TILE_STAND_WEAR;
  }

  if (player.attackTime >= PUNCH_START && player.attackTime <= PUNCH_END) {
    applyPunch(state, player);
  }
  if (player.attackTime > PUNCH_TOTAL) {
    player.attackTime = 0;
    player.attackCooldown = PUNCH_COOLDOWN;
    player.hitIds = [];
  }

  collectPowerups(state, player);
  checkKo(state, player);
  player.prevInput = input;
}

function checkRoundOver(state) {
  const contenders = activePlayers(state);
  if (contenders.length < 2) return;
  const living = contenders.filter((player) => player.alive && player.stocks > 0);
  if (living.length > 1) return;
  state.phase = "roundEnd";
  state.roundEndTimer = ROUND_END_TICKS;
  if (living.length === 1) {
    living[0].score += 1;
    state.roundWinner = living[0].id;
  } else {
    state.roundWinner = null;
  }
  state.events.push({ type: "round", winner: state.roundWinner });
}

export function createMatch(options = {}) {
  const seed = options.seed ?? 1;
  const rng = makeRng(seed >>> 0);
  const slots = (options.slots ? options.slots.slice(0, 4) : DEFAULT_SLOTS.slice()).map((slot) => ({
    kind: slot && (slot.kind === "human" || slot.kind === "off" || slot.kind === "bot") ? slot.kind : "bot",
  }));
  while (slots.length < 4) slots.push({ kind: "off" });
  const stocks = options.stocks ?? STOCKS;
  const players = slots.map((slot, id) => createFighter(id, slot.kind, stocks));
  const state = {
    seed: seed >>> 0,
    rng,
    tick: 0,
    phase: options.skipCountdown ? "playing" : "countdown",
    countdown: options.skipCountdown ? 0 : COUNTDOWN_TICKS,
    goTimer: options.skipCountdown ? 0 : 0,
    round: 1,
    roundCount: options.roundCount ?? 3,
    roundWinner: null,
    roundEndTimer: 0,
    matchWinner: null,
    startingStocks: stocks,
    players,
    tiles: createStage(rng),
    powerups: [],
    powerupTimer: 280,
    events: [],
  };
  spawnPlayers(state);
  return state;
}

export function step(state, inputs) {
  state.events = [];
  state.tick += 1;

  if (state.phase === "countdown") {
    const mark = state.countdown;
    state.countdown -= 1;
    if (mark === COUNTDOWN_TICKS || state.countdown === 120 || state.countdown === 60) {
      state.events.push({ type: "countdown", n: Math.max(1, Math.ceil(state.countdown / 60)) });
    }
    if (state.countdown <= 0) {
      state.phase = "playing";
      state.goTimer = 36;
      state.events.push({ type: "go" });
    }
    return state;
  }

  if (state.phase === "roundEnd") {
    state.roundEndTimer -= 1;
    if (state.roundEndTimer <= 0) {
      if (matchDecided(state)) {
        state.phase = "matchEnd";
        state.matchWinner = leaderId(state);
        state.events.push({ type: "match", winner: state.matchWinner });
      } else {
        startNextRound(state);
        state.events.push({ type: "countdown", n: 3 });
      }
    }
    return state;
  }

  if (state.phase === "matchEnd") return state;

  if (state.goTimer > 0) state.goTimer -= 1;

  const provided = inputs || [];
  for (const player of state.players) {
    if (player.kind === "off" || !player.alive) continue;
    const input = player.kind === "bot" ? decideBot(state, player) : provided[player.id];
    integrate(state, player, input);
  }
  updateTiles(state.tiles);
  updatePowerups(state);
  if (state.phase === "playing") checkRoundOver(state);
  return state;
}

/** Compact deterministic fingerprint for replay tests. */
export function digest(state) {
  const round = (n) => Math.round(n * 100) / 100;
  return JSON.stringify({
    tick: state.tick,
    phase: state.phase,
    round: state.round,
    rng: state.rng.state(),
    players: state.players.map((player) => ({
      k: player.kind,
      x: round(player.x),
      y: round(player.y),
      vx: round(player.vx),
      vy: round(player.vy),
      d: player.damage,
      s: player.stocks,
      sc: player.score,
      a: player.alive,
      o: player.overclock,
    })),
    tiles: state.tiles.map((tile) => ({
      life: Math.round(tile.life),
      falling: tile.falling,
      gone: tile.gone,
      y: round(tile.y),
    })),
    powerups: state.powerups.map((powerup) => ({
      t: powerup.type,
      x: round(powerup.x),
      y: round(powerup.y),
    })),
  });
}
