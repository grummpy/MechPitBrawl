import assert from "node:assert/strict";
import test from "node:test";
import { LAVA_Y, ROUND_END_TICKS } from "../src/core/constants.js";
import { createMatch, matchDecided, standings, step } from "../src/core/match.js";
import { HUMANS, neutralInputs } from "./helpers.mjs";

function finishBanner(state) {
  for (let i = 0; i < ROUND_END_TICKS; i++) step(state, neutralInputs());
}

test("a round win scores a point and a one-round match ends", () => {
  const state = createMatch({ seed: 2, skipCountdown: true, roundCount: 1, slots: HUMANS });
  state.players[1].stocks = 1;
  state.players[1].invuln = 0;
  state.players[1].y = LAVA_Y + 10;
  step(state, neutralInputs());
  assert.equal(state.players[0].score, 1);
  assert.equal(state.players[1].score, 0);
  assert.equal(state.roundWinner, 0);
  assert.equal(matchDecided(state), true);
  finishBanner(state);
  assert.equal(state.phase, "matchEnd");
  assert.equal(state.matchWinner, 0);
  assert.equal(standings(state)[0].id, 0);
});

test("the match continues until the configured round count", () => {
  const state = createMatch({ seed: 2, skipCountdown: true, roundCount: 2, slots: HUMANS });
  state.players[1].stocks = 1;
  state.players[1].invuln = 0;
  state.players[1].y = LAVA_Y + 10;
  step(state, neutralInputs());
  assert.equal(state.players[0].score, 1);
  assert.equal(matchDecided(state), false);
  finishBanner(state);
  assert.equal(state.phase, "countdown");
  assert.equal(state.round, 2);
  assert.equal(state.players[0].score, 1);
  assert.equal(state.players[0].stocks, state.startingStocks);
  assert.equal(state.players[1].alive, true);
});

test("a double KO is a draw and tied scores force another round", () => {
  const state = createMatch({ seed: 2, skipCountdown: true, roundCount: 1, slots: HUMANS });
  for (const player of state.players) {
    if (player.kind === "off") continue;
    player.stocks = 1;
    player.invuln = 0;
    player.y = LAVA_Y + 20;
  }
  step(state, neutralInputs());
  assert.equal(state.phase, "roundEnd");
  assert.equal(state.roundWinner, null);
  assert.equal(state.players[0].score, 0);
  assert.equal(state.players[1].score, 0);
  finishBanner(state);
  assert.equal(state.phase, "countdown");
  assert.equal(state.round, 2);
  assert.equal(state.phase === "matchEnd", false);
});
