import assert from "node:assert/strict";
import test from "node:test";
import { DASH_SPEED, MAX_RUN } from "../src/core/constants.js";
import { createMatch, step } from "../src/core/match.js";
import { moveBody, updateTiles } from "../src/core/stage.js";
import { SOLO, neutralInputs, withInput } from "./helpers.mjs";

test("a body lands on a solid tile and does not sink through it", () => {
  const body = { x: 100, y: 40, w: 30, h: 46, vx: 0, vy: 30, onGround: false, groundTile: null };
  const tiles = [{ id: 3, x: 80, y: 100, w: 40, h: 22, falling: false, gone: false }];
  moveBody(body, tiles);
  assert.equal(body.onGround, true);
  assert.equal(body.y, 100 - 46);
  assert.equal(body.vy, 0);
  assert.equal(body.groundTile, 3);
});

test("horizontal motion stops at a tile face", () => {
  const body = { x: 40, y: 100, w: 30, h: 46, vx: 20, vy: 0, onGround: false, groundTile: null };
  const tiles = [{ id: 1, x: 70, y: 90, w: 40, h: 40, falling: false, gone: false }];
  moveBody(body, tiles);
  assert.equal(body.x, 40);
  assert.equal(body.vx, 0);
});

test("an upward body bonks the underside of a tile", () => {
  const body = { x: 100, y: 130, w: 30, h: 46, vx: 0, vy: -20, onGround: false, groundTile: null };
  const tiles = [{ id: 2, x: 90, y: 100, w: 40, h: 22, falling: false, gone: false }];
  moveBody(body, tiles);
  assert.equal(body.y, 122);
  assert.equal(body.vy, 0);
  assert.equal(body.onGround, false);
});

test("falling tiles are not solid", () => {
  const body = { x: 100, y: 70, w: 30, h: 46, vx: 0, vy: 8, onGround: false, groundTile: null };
  const tiles = [{ id: 0, x: 90, y: 100, w: 40, h: 22, falling: true, gone: false }];
  moveBody(body, tiles);
  assert.equal(body.onGround, false);
  assert.ok(body.y > 70);
});

test("tiles crack, fall, and respawn", () => {
  const tile = {
    id: 0, x: 100, y: 404, ox: 100, oy: 404, w: 40, h: 22,
    life: 1, maxLife: 100, falling: false, gone: false, vy: 0, respawn: 0, row: 0, col: 0,
  };
  updateTiles([tile]);
  assert.equal(tile.falling, true);
  for (let i = 0; i < 80; i++) updateTiles([tile]);
  assert.equal(tile.gone, true);
  tile.respawn = 1;
  updateTiles([tile]);
  assert.equal(tile.gone, false);
  assert.equal(tile.falling, false);
  assert.equal(tile.y, 404);
  assert.equal(tile.life, 100);
});

test("a pilot runs, jumps, and stays standing on the slab", () => {
  const state = createMatch({ seed: 3, skipCountdown: true, slots: SOLO });
  const player = state.players[0];
  const startX = player.x;
  const startY = player.y;
  for (let i = 0; i < 20; i++) step(state, neutralInputs());
  assert.equal(player.onGround, true);
  assert.ok(Math.abs(player.y - startY) < 0.01);

  for (let i = 0; i < 40; i++) step(state, withInput(0, { right: true }));
  assert.ok(player.x > startX + 20);
  assert.ok(player.vx <= MAX_RUN + 0.001);
  assert.equal(player.onGround, true);

  const beforeJump = player.y;
  for (let i = 0; i < 10; i++) step(state, withInput(0, { up: true }));
  assert.ok(player.y < beforeJump - 8);
});

test("dash is faster than a run", () => {
  const state = createMatch({ seed: 4, skipCountdown: true, slots: SOLO });
  const player = state.players[0];
  step(state, withInput(0, { secondary: true }));
  assert.ok(player.dashTime > 0);
  assert.ok(Math.abs(player.vx) >= DASH_SPEED - 0.001);
  assert.ok(Math.abs(player.vx) > MAX_RUN);
});
