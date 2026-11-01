import { neutralInput } from "../src/core/inputmap.js";

export const HUMANS = [
  { kind: "human" },
  { kind: "human" },
  { kind: "off" },
  { kind: "off" },
];

export const SOLO = [
  { kind: "human" },
  { kind: "off" },
  { kind: "off" },
  { kind: "off" },
];

export const BOTS = [
  { kind: "bot" },
  { kind: "bot" },
  { kind: "bot" },
  { kind: "bot" },
];

export const OFF = [
  { kind: "off" },
  { kind: "off" },
  { kind: "off" },
  { kind: "off" },
];

export function neutralInputs() {
  return [neutralInput(), neutralInput(), neutralInput(), neutralInput()];
}

export function withInput(index, partial) {
  const inputs = neutralInputs();
  inputs[index] = { ...neutralInput(), ...partial, source: "test" };
  return inputs;
}

export function plant(state, index, tileIndex, xOffset = 0) {
  const player = state.players[index];
  const tile = state.tiles[tileIndex];
  player.x = tile.x + xOffset;
  player.y = tile.y - player.h;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.groundTile = tile.id;
  player.alive = true;
  player.invuln = 0;
  player.stun = 0;
  player.attackTime = 0;
  player.attackCooldown = 0;
  player.hitIds = [];
  player.dashTime = 0;
  player.dashCooldown = 0;
  player.jumpCooldown = 0;
  player.prevInput = neutralInput();
  return player;
}
