import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { createMatch, digest, step } from "../src/core/match.js";
import { BOTS, neutralInputs } from "./helpers.mjs";

test("a full bot brawl is deterministic and the pilots actually swing", () => {
  const play = () => {
    const state = createMatch({ seed: 42, skipCountdown: true, slots: BOTS });
    for (let i = 0; i < 480; i++) step(state, neutralInputs());
    return state;
  };
  const a = play();
  const b = play();
  assert.equal(digest(a), digest(b));
  const damage = a.players.reduce((sum, player) => sum + player.damage, 0);
  const kos = a.players.reduce((sum, player) => sum + (3 - player.stocks), 0);
  assert.ok(damage > 0 || kos > 0);
});

test("core modules stay free of the DOM", () => {
  const files = readdirSync(new URL("../src/core/", import.meta.url));
  assert.ok(files.length >= 6);
  for (const file of files) {
    const text = readFileSync(new URL(`../src/core/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(text, /\b(document|window|localStorage|navigator|HTMLCanvasElement)\b/);
  }
});
