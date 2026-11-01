import { TILE_PANIC, WORLD_W } from "./constants.js";
import { neutralInput } from "./inputmap.js";

function nearest(origin, list) {
  let best = null;
  let bestD = Infinity;
  for (const item of list) {
    const dx = item.x - origin.x;
    const dy = item.y - origin.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = item;
    }
  }
  return best;
}

function gapAhead(state, me, dir) {
  if (!dir || !me.onGround) return false;
  const probeX = me.x + me.w / 2 + dir * 38;
  const foot = me.y + me.h + 6;
  return !state.tiles.some((tile) => {
    if (tile.falling || tile.gone) return false;
    const cx = probeX >= tile.x && probeX <= tile.x + tile.w;
    return cx && Math.abs(tile.y - foot) < 36;
  });
}

/**
 * One frame of intentions for a CPU slot. Pulsed buttons so edge detection
 * in the match loop fires punches, jumps, and dashes.
 */
export function decideBot(state, me) {
  const input = neutralInput();
  input.source = "bot";
  const foes = state.players.filter((p) => p !== me && p.kind !== "off" && p.alive && p.stocks > 0);
  const foe = nearest(me, foes);
  const pickup = nearest(me, state.powerups);
  const ground = me.groundTile == null ? null : state.tiles.find((tile) => tile.id === me.groundTile);
  const panic = ground && !ground.falling && ground.life < TILE_PANIC;

  if (!me.onGround && me.y > 430) {
    input.up = true;
    if (me.x < WORLD_W / 2) input.right = true;
    else input.left = true;
    input.secondary = me.dashCooldown <= 0 && state.tick % 12 === me.id;
    return input;
  }

  if (panic) {
    input.up = state.tick % 14 === me.id;
    if (me.x < WORLD_W / 2) input.right = true;
    else input.left = true;
  }

  const wantPickup = pickup && (me.damage > 45 || pickup.type === "overclock")
    && Math.abs(pickup.x - me.x) < 170
    && Math.abs(pickup.y - me.y) < 90;

  if (wantPickup) {
    if (pickup.x < me.x - 6) input.left = true;
    else if (pickup.x > me.x + me.w + 6) input.right = true;
    if (pickup.y < me.y - 24) input.up = true;
  } else if (foe) {
    const dx = (foe.x + foe.w / 2) - (me.x + me.w / 2);
    const dy = foe.y - me.y;
    const reach = Math.abs(dx);
    const facingRight = me.facing >= 0;
    const aligned = Math.abs(dy) < 42;
    if (reach < 46 && aligned) {
      if (dx < 0 && facingRight) input.left = true;
      else if (dx > 0 && !facingRight) input.right = true;
      input.action = me.attackCooldown <= 0 && me.attackTime <= 0 && state.tick % 8 === me.id;
    } else {
      if (dx < 0) input.left = true;
      else input.right = true;
      if (dy < -30) input.up = true;
      const nearLeftEdge = me.x < 200;
      const nearRightEdge = me.x > WORLD_W - 230;
      const dashOff = (nearLeftEdge && dx < 0) || (nearRightEdge && dx > 0);
      if (!dashOff && reach > 170 && me.onGround && me.dashCooldown <= 0 && state.tick % 45 === me.id) {
        input.secondary = true;
      }
    }
  } else if (me.x > WORLD_W / 2 + 20) {
    input.left = true;
  } else if (me.x < WORLD_W / 2 - 20) {
    input.right = true;
  }

  const dir = input.right ? 1 : input.left ? -1 : 0;
  if (gapAhead(state, me, dir)) input.up = true;
  return input;
}
