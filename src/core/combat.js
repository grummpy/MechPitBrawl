import {
  KB_BASE,
  KB_LIFT,
  KB_OVERCLOCK,
  KB_SCALE,
  OVERCLOCK_BONUS,
  PUNCH_DAMAGE,
  PUNCH_HEIGHT,
  PUNCH_REACH,
  PUNCH_Y,
} from "./constants.js";

/** Damage and knockback after a punch connects. Damage % is the victim's percent before the hit. */
export function hitStrength(damageBefore, boosted) {
  const damage = PUNCH_DAMAGE + (boosted ? OVERCLOCK_BONUS : 0);
  const after = damageBefore + damage;
  const kb = KB_BASE + after * KB_SCALE + (boosted ? KB_OVERCLOCK : 0);
  const stun = Math.min(48, 8 + Math.floor(kb * 1.35));
  return { damage, kb, stun, after };
}

export function punchHitbox(fighter) {
  const facing = fighter.facing >= 0 ? 1 : -1;
  const w = PUNCH_REACH;
  const h = PUNCH_HEIGHT;
  const x = facing > 0 ? fighter.x + fighter.w - 6 : fighter.x - w + 6;
  const y = fighter.y + PUNCH_Y;
  return { x, y, w, h };
}

export function launchVelocity(kb, facing) {
  const dir = facing >= 0 ? 1 : -1;
  return { vx: dir * kb, vy: -Math.abs(kb) * KB_LIFT };
}
