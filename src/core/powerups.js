import {
  COOLANT_AMOUNT,
  MAX_OVERCLOCK,
  MAX_POWERUPS,
  POWERUP_INTERVAL,
  POWERUP_TTL,
} from "./constants.js";
import { overlap } from "./geom.js";
import { solidTiles } from "./stage.js";

export const POWERUP_TYPES = ["coolant", "overclock", "thruster"];

export function applyPickup(fighter, type) {
  if (type === "coolant") {
    fighter.damage = Math.max(0, fighter.damage - COOLANT_AMOUNT);
  } else if (type === "overclock") {
    fighter.overclock = Math.min(MAX_OVERCLOCK, (fighter.overclock || 0) + 1);
  } else if (type === "thruster") {
    fighter.maxAirDashes = 2;
    fighter.airDashes = 2;
    fighter.dashCooldown = 0;
  }
  return type;
}

export function spawnPowerup(state) {
  const solids = solidTiles(state.tiles);
  if (!solids.length) return null;
  const tile = solids[state.rng.int(solids.length)];
  const type = POWERUP_TYPES[state.rng.int(POWERUP_TYPES.length)];
  const powerup = {
    type,
    x: tile.x + tile.w / 2 - 9,
    y: tile.y - 22,
    w: 18,
    h: 18,
    ttl: POWERUP_TTL,
  };
  state.powerups.push(powerup);
  return powerup;
}

export function updatePowerups(state) {
  state.powerupTimer -= 1;
  if (state.powerupTimer <= 0) {
    state.powerupTimer = POWERUP_INTERVAL;
    if (state.powerups.length < MAX_POWERUPS) spawnPowerup(state);
  }
  for (const powerup of state.powerups) powerup.ttl -= 1;
  state.powerups = state.powerups.filter((powerup) => powerup.ttl > 0);
}

export function collectPowerups(state, fighter) {
  const kept = [];
  for (const powerup of state.powerups) {
    if (overlap(fighter, powerup)) {
      applyPickup(fighter, powerup.type);
      state.events.push({ type: "pickup", playerId: fighter.id, powerup: powerup.type });
    } else {
      kept.push(powerup);
    }
  }
  state.powerups = kept;
}
