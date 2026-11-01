import {
  LAVA_Y,
  TILE_AMBIENT_WEAR,
  TILE_H,
  TILE_LIFE_GROUND,
  TILE_LIFE_UPPER,
  TILE_LIFE_VAR,
  TILE_RESPAWN,
  TILE_W,
} from "./constants.js";

function makeTile(id, x, y, life, row, col) {
  return {
    id,
    x,
    y,
    ox: x,
    oy: y,
    w: TILE_W,
    h: TILE_H,
    life,
    maxLife: life,
    falling: false,
    gone: false,
    vy: 0,
    respawn: 0,
    row,
    col,
  };
}

export function createStage(rng) {
  const tiles = [];
  const originX = 120;
  const groundY = 404;
  const cols = 18;
  for (let col = 0; col < cols; col++) {
    const life = TILE_LIFE_GROUND + rng.int(TILE_LIFE_VAR);
    tiles.push(makeTile(tiles.length, originX + col * TILE_W, groundY, life, 0, col));
  }
  const upperCol = 6;
  for (let col = 0; col < 6; col++) {
    const life = TILE_LIFE_UPPER + rng.int(TILE_LIFE_VAR);
    tiles.push(makeTile(tiles.length, originX + (upperCol + col) * TILE_W, 286, life, 1, col));
  }
  return tiles;
}

export function solidTiles(tiles) {
  return tiles.filter((tile) => !tile.falling && !tile.gone);
}

/**
 * Integrate a body's velocity against solid tiles.
 * Mutates x, y, vx, vy, onGround, groundTile.
 */
export function moveBody(body, tiles) {
  body.onGround = false;
  body.groundTile = null;
  const solids = solidTiles(tiles);

  body.x += body.vx;
  for (const tile of solids) {
    if (!overlaps(body, tile)) continue;
    if (body.vx > 0) body.x = tile.x - body.w;
    else if (body.vx < 0) body.x = tile.x + tile.w;
    else {
      const pushLeft = body.x + body.w - tile.x;
      const pushRight = tile.x + tile.w - body.x;
      body.x = pushLeft < pushRight ? tile.x - body.w : tile.x + tile.w;
    }
    body.vx = 0;
  }

  body.y += body.vy;
  for (const tile of solids) {
    if (!overlaps(body, tile)) continue;
    if (body.vy > 0) {
      body.y = tile.y - body.h;
      body.vy = 0;
      body.onGround = true;
      body.groundTile = tile.id;
    } else if (body.vy < 0) {
      body.y = tile.y + tile.h;
      body.vy = 0;
    } else {
      const fromTop = body.y + body.h - tile.y;
      const fromBottom = tile.y + tile.h - body.y;
      if (fromTop < fromBottom) {
        body.y = tile.y - body.h;
        body.onGround = true;
        body.groundTile = tile.id;
      } else {
        body.y = tile.y + tile.h;
      }
    }
  }
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function updateTiles(tiles) {
  for (const tile of tiles) {
    if (tile.gone) {
      tile.respawn -= 1;
      if (tile.respawn <= 0) {
        tile.gone = false;
        tile.falling = false;
        tile.x = tile.ox;
        tile.y = tile.oy;
        tile.vy = 0;
        tile.life = tile.maxLife;
      }
      continue;
    }
    if (tile.falling) {
      tile.vy += 0.38;
      tile.y += tile.vy;
      tile.x = tile.ox;
      if (tile.y > LAVA_Y) {
        tile.gone = true;
        tile.falling = false;
        tile.respawn = TILE_RESPAWN;
      }
      continue;
    }
    tile.life -= TILE_AMBIENT_WEAR;
    if (tile.life <= 0) {
      tile.life = 0;
      tile.falling = true;
      tile.vy = 0;
    }
  }
}
