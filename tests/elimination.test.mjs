import assert from "node:assert/strict";
import test from "node:test";
import { LAVA_Y, STOCKS } from "../src/core/constants.js";
import { createMatch, step } from "../src/core/match.js";
import { HUMANS, neutralInputs } from "./helpers.mjs";

function match() {
  return createMatch({ seed: 5, skipCountdown: true, stocks: STOCKS, slots: HUMANS });
}

test("falling into lava spends a stock and respawns with a clean chassis", () => {
  const state = match();
  const victim = state.players[1];
  victim.damage = 80;
  victim.invuln = 0;
  victim.y = LAVA_Y;
  step(state, neutralInputs());
  assert.equal(victim.stocks, STOCKS - 1);
  assert.equal(victim.alive, true);
  assert.equal(victim.damage, 0);
  assert.ok(victim.y + victim.h < LAVA_Y);
  assert.ok(victim.invuln > 0);
});

test("respawn invulnerability ignores the lava", () => {
  const state = match();
  const victim = state.players[1];
  victim.invuln = 0;
  victim.y = LAVA_Y;
  step(state, neutralInputs());
  const stocks = victim.stocks;
  victim.y = LAVA_Y;
  step(state, neutralInputs());
  assert.equal(victim.stocks, stocks);
  assert.equal(victim.alive, true);
});

test("the last stock eliminates a mech", () => {
  const state = match();
  const victim = state.players[1];
  victim.stocks = 1;
  victim.invuln = 0;
  victim.y = LAVA_Y + 30;
  step(state, neutralInputs());
  assert.equal(victim.stocks, 0);
  assert.equal(victim.alive, false);
  assert.equal(state.phase, "roundEnd");
  assert.equal(state.roundWinner, 0);
});
