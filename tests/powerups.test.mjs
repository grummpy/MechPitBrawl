import assert from "node:assert/strict";
import test from "node:test";
import { COOLANT_AMOUNT, DASH_SPEED } from "../src/core/constants.js";
import { createMatch, step } from "../src/core/match.js";
import { applyPickup } from "../src/core/powerups.js";
import { OFF, SOLO, neutralInputs, withInput } from "./helpers.mjs";

test("coolant, overclock, and thruster change the mech", () => {
  const fighter = { damage: 90, overclock: 0, maxAirDashes: 1, airDashes: 0, dashCooldown: 20 };
  applyPickup(fighter, "coolant");
  assert.equal(fighter.damage, 90 - COOLANT_AMOUNT);
  applyPickup(fighter, "coolant");
  applyPickup(fighter, "coolant");
  assert.equal(fighter.damage, 0);
  applyPickup(fighter, "overclock");
  applyPickup(fighter, "overclock");
  assert.equal(fighter.overclock, 2);
  applyPickup(fighter, "thruster");
  assert.equal(fighter.maxAirDashes, 2);
  assert.equal(fighter.airDashes, 2);
  assert.equal(fighter.dashCooldown, 0);
});

test("walking over a coolant pickup spends it", () => {
  const state = createMatch({ seed: 11, skipCountdown: true, slots: SOLO });
  const player = state.players[0];
  player.damage = 70;
  state.powerups.push({ type: "coolant", x: player.x, y: player.y, w: 18, h: 18, ttl: 100 });
  step(state, neutralInputs());
  assert.equal(player.damage, 70 - COOLANT_AMOUNT);
  assert.equal(state.powerups.length, 0);
  assert.equal(state.events.some((event) => event.type === "pickup"), true);
});

test("thruster grants an air dash when the mech is already airborne", () => {
  const state = createMatch({ seed: 11, skipCountdown: true, slots: SOLO });
  const player = state.players[0];
  player.onGround = false;
  player.airDashes = 0;
  player.y = 180;
  player.vy = 0;
  player.dashCooldown = 0;
  step(state, withInput(0, { secondary: true }));
  assert.equal(player.dashTime, 0);

  player.prevInput = { left: false, right: false, up: false, down: false, action: false, secondary: false };
  applyPickup(player, "thruster");
  player.y = 180;
  player.onGround = false;
  step(state, withInput(0, { secondary: true }));
  assert.ok(player.dashTime > 0);
  assert.ok(Math.abs(player.vx) >= DASH_SPEED - 0.001);
});

test("powerup spawns are deterministic for a seed", () => {
  const spawn = (seed) => {
    const state = createMatch({ seed, skipCountdown: true, slots: OFF });
    state.powerupTimer = 1;
    step(state, neutralInputs());
    const powerup = state.powerups[0];
    return [powerup.type, powerup.x, powerup.y];
  };
  assert.deepEqual(spawn(21), spawn(21));
  assert.notDeepEqual(spawn(21), spawn(22));
});
