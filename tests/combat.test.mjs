import assert from "node:assert/strict";
import test from "node:test";
import { OVERCLOCK_BONUS, PUNCH_DAMAGE } from "../src/core/constants.js";
import { hitStrength } from "../src/core/combat.js";
import { createMatch, step } from "../src/core/match.js";
import { HUMANS, neutralInputs, plant, withInput } from "./helpers.mjs";

test("knockback grows with damage percent", () => {
  const light = hitStrength(0, false);
  const heavy = hitStrength(150, false);
  const boosted = hitStrength(0, true);
  assert.ok(heavy.kb > light.kb);
  assert.equal(boosted.damage, PUNCH_DAMAGE + OVERCLOCK_BONUS);
  assert.ok(boosted.kb > light.kb);
});

function punchLaunch(damage, overclock) {
  const state = createMatch({ seed: 8, skipCountdown: true, slots: HUMANS });
  const attacker = plant(state, 0, 4, 0);
  const victim = plant(state, 1, 4, attacker.w + 2);
  attacker.facing = 1;
  attacker.overclock = overclock;
  victim.damage = damage;
  victim.facing = -1;
  const inputs = withInput(0, { action: true });
  for (let i = 0; i < 8; i++) {
    step(state, inputs);
    if (victim.damage > damage) break;
  }
  return { attacker, victim };
}

test("a punch connects, adds damage, and launches the victim", () => {
  const { attacker, victim } = punchLaunch(0, 0);
  assert.equal(victim.damage, PUNCH_DAMAGE);
  assert.ok(victim.vx > 1);
  assert.ok(victim.vy < 0);
  assert.ok(victim.stun > 0);
  assert.equal(attacker.overclock, 0);
});

test("the same punch launches a damaged mech farther", () => {
  const fresh = punchLaunch(0, 0);
  const hurt = punchLaunch(120, 0);
  assert.ok(hurt.victim.vx > fresh.victim.vx);
});

test("overclock adds damage and is spent on the hit", () => {
  const { attacker, victim } = punchLaunch(10, 1);
  assert.equal(victim.damage, 10 + PUNCH_DAMAGE + OVERCLOCK_BONUS);
  assert.equal(attacker.overclock, 0);
  const plain = punchLaunch(10, 0);
  assert.ok(victim.vx > plain.victim.vx);
});

test("a punch misses when the target is out of reach", () => {
  const state = createMatch({ seed: 8, skipCountdown: true, slots: HUMANS });
  const attacker = plant(state, 0, 2, 0);
  const victim = plant(state, 1, 12, 0);
  attacker.facing = 1;
  const inputs = withInput(0, { action: true });
  for (let i = 0; i < 8; i++) step(state, inputs);
  assert.equal(victim.damage, 0);
  assert.equal(victim.stun, 0);
});

test("held attack does not chain until the button is released", () => {
  const state = createMatch({ seed: 8, skipCountdown: true, slots: HUMANS });
  const attacker = plant(state, 0, 4, 0);
  const victim = plant(state, 1, 4, attacker.w + 2);
  attacker.facing = 1;
  const inputs = withInput(0, { action: true });
  for (let i = 0; i < 40; i++) step(state, inputs);
  assert.equal(victim.damage, PUNCH_DAMAGE);
  void neutralInputs;
});
