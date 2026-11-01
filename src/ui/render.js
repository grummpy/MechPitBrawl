import { countdownNumber } from "../core/match.js";
import { WORLD_H, WORLD_W } from "../core/constants.js";
import { BIND_ACTIONS, keyLabel } from "../core/inputmap.js";

const FONT = '"Trebuchet MS", "Liberation Sans", "DejaVu Sans", sans-serif';

const COLORS = [
  { body: "#e23d3d", dark: "#8d1e24", visor: "#ffe08a", name: "MECH 1" },
  { body: "#3c7dff", dark: "#1a3f93", visor: "#c8f4ff", name: "MECH 2" },
  { body: "#3eae58", dark: "#1c6a32", visor: "#ffe38a", name: "MECH 3" },
  { body: "#f0b429", dark: "#a87410", visor: "#f3fbff", name: "MECH 4" },
];

const ACTION_NAMES = {
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
  action: "Punch",
  secondary: "Dash",
};

export class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.hotspots = [];
    this.cover = new Image();
    this.cover.src = "assets/cover.jpg";
  }

  draw(view) {
    const ctx = this.ctx;
    this.hotspots = [];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, WORLD_W, WORLD_H);
    if (view.screen === "title") this.drawTitle(view);
    else if (view.screen === "join") this.drawJoin(view);
    else if (view.screen === "settings") this.drawSettings(view);
    else if (view.screen === "controls") this.drawControls(view);
    else if (view.screen === "results") {
      this.drawFight(view, true);
      this.drawResults(view);
    } else {
      this.drawFight(view, false);
      if (view.screen === "pause") this.drawPause(view);
    }
  }

  spot(x, y, w, h, id) {
    this.hotspots.push({ x, y, w, h, id });
  }

  panel(x, y, w, h, fill, stroke) {
    const ctx = this.ctx;
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();
  }

  label(text, x, y, size, fill, align = "center") {
    const ctx = this.ctx;
    ctx.font = `800 ${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.lineWidth = Math.max(3, size / 8);
    ctx.strokeStyle = "rgba(12, 6, 4, 0.8)";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
  }

  drawTitle(view) {
    const ctx = this.ctx;
    if (this.cover.complete && this.cover.naturalWidth) {
      const scale = Math.max(WORLD_W / this.cover.naturalWidth, WORLD_H / this.cover.naturalHeight);
      const dw = this.cover.naturalWidth * scale;
      const dh = this.cover.naturalHeight * scale;
      ctx.drawImage(this.cover, (WORLD_W - dw) / 2, (WORLD_H - dh) / 2, dw, dh);
    } else {
      ctx.fillStyle = "#3a120c";
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }
    ctx.fillStyle = "rgba(12, 4, 3, 0.45)";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    const grd = ctx.createLinearGradient(0, 250, 0, WORLD_H);
    grd.addColorStop(0, "rgba(10, 4, 3, 0)");
    grd.addColorStop(1, "rgba(10, 4, 3, 0.88)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 250, WORLD_W, 290);
    this.label("MECH PIT BRAWL", WORLD_W / 2, 78, 64, "#ffb15a");
    this.label("Four mechs. One crumbling slab. The lava takes the rest.", WORLD_W / 2, 128, 18, "#ffe7c4");
    const blink = Math.floor(view.time / 450) % 2 === 0;
    if (blink) this.label("PRESS ENTER / START", WORLD_W / 2, 430, 28, "#fff4df");
    this.label("S settings    M mute", WORLD_W / 2, 478, 16, "#f0d2b0");
    if (view.muted) this.label("SOUND OFF", WORLD_W / 2, 506, 14, "#ffb15a");
    this.spot(280, 390, 400, 60, "start");
  }

  drawJoin(view) {
    this.backdrop(view.time);
    this.label("CHOOSE PILOTS", WORLD_W / 2, 48, 36, "#ffb15a");
    this.label("Punch to join. Dash toggles bot or off. Enter launches.", WORLD_W / 2, 86, 16, "#f3ddc4");
    for (let i = 0; i < 4; i++) {
      const x = 48 + i * 230;
      const slot = view.slots[i];
      const color = COLORS[i];
      this.panel(x, 120, 210, 300, "rgba(22, 12, 10, 0.88)", color.body);
      this.drawMech(dummyMech(i, slot.kind === "off" ? 0 : 1), view.time, x + 90, 210, 1.7);
      this.label(color.name, x + 105, 300, 20, color.body);
      const status = slot.kind === "human" ? "HUMAN" : slot.kind === "bot" ? "BOT" : "OFF";
      this.label(status, x + 105, 332, 22, slot.kind === "off" ? "#8d8078" : "#fff6ea");
      const bind = view.bindings[i];
      this.label(`${keyLabel(bind.action)} join`, x + 105, 366, 14, "#f0d2b0");
      this.label(`${keyLabel(bind.secondary)} toggle`, x + 105, 388, 14, "#f0d2b0");
      if (view.pads[i]) this.padIcon(x + 176, 136, color.body);
      this.spot(x, 120, 210, 300, `join-${i}`);
    }
    if (view.joinMessage) this.label(view.joinMessage, WORLD_W / 2, 450, 18, "#ffd0a8");
    this.label("ENTER start    ESC title", WORLD_W / 2, 500, 16, "#f6efe4");
  }

  drawFight(view, frozen) {
    const ctx = this.ctx;
    const match = view.match;
    ctx.save();
    if (view.shake > 0.4) {
      ctx.translate((Math.sin(view.time / 18) * view.shake), (Math.cos(view.time / 14) * view.shake) * 0.6);
    }
    this.backdrop(view.time);
    if (match) {
      for (const tile of match.tiles) this.drawTile(tile, view.time);
      for (const powerup of match.powerups) this.drawPowerup(powerup, view.time);
      for (const player of match.players) this.drawMech(player, view.time);
      this.drawHud(match, view.pads);
      if (!frozen && match.phase === "countdown") {
        this.label(String(countdownNumber(match)), WORLD_W / 2, 250, 92, "#fff6ea");
      }
      if (!frozen && match.phase === "playing" && match.goTimer > 0) {
        this.label("BRAWL", WORLD_W / 2, 250, 72, "#ffb15a");
      }
      if (!frozen && match.phase === "roundEnd") {
        ctx.fillStyle = "rgba(8, 4, 3, 0.45)";
        ctx.fillRect(0, 180, WORLD_W, 150);
        const text = match.roundWinner == null
          ? "DRAW — THE PIT TAKES EVERYONE"
          : `${COLORS[match.roundWinner].name} TAKES THE ROUND`;
        this.label(text, WORLD_W / 2, 255, 32, "#fff6ea");
      }
    }
    ctx.restore();
  }

  drawPause(view) {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(8, 4, 3, 0.62)";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    this.panel(330, 140, 300, 260, "rgba(28, 14, 11, 0.95)", "#ffb15a");
    this.label("PAUSED", WORLD_W / 2, 180, 32, "#ffb15a");
    const rows = ["Resume", "Settings", "Quit to title"];
    rows.forEach((row, index) => {
      const y = 230 + index * 48;
      const on = index === view.pauseIndex;
      this.label(row, WORLD_W / 2, y, 22, on ? "#fff6ea" : "#c8b09a");
      if (on) this.label("▸", 360, y, 22, "#ffb15a", "left");
      this.spot(350, y - 20, 260, 40, `pause-${index}`);
    });
  }

  drawSettings(view) {
    this.backdrop(view.time);
    this.panel(250, 80, 460, 380, "rgba(22, 12, 10, 0.92)", "#ffb15a");
    this.label("SETTINGS", WORLD_W / 2, 120, 32, "#ffb15a");
    const rows = [
      `Volume  ${Math.round(view.settings.volume * 100)}%`,
      `Rounds  ${view.settings.roundCount}`,
      "Controls",
      "Back",
    ];
    rows.forEach((row, index) => {
      const y = 190 + index * 58;
      const on = index === view.settingsIndex;
      this.label(row, WORLD_W / 2, y, 24, on ? "#fff6ea" : "#c8b09a");
      if (on) this.label("▸", 310, y, 22, "#ffb15a", "left");
      this.spot(300, y - 22, 360, 44, `settings-${index}`);
    });
    this.label("Left / right adjust. Enter opens. Round count applies next match.", WORLD_W / 2, 430, 14, "#f0d2b0");
  }

  drawControls(view) {
    this.backdrop(view.time);
    this.panel(40, 36, 880, 470, "rgba(22, 12, 10, 0.94)", "#ffb15a");
    this.label("CONTROLS", WORLD_W / 2, 68, 30, "#ffb15a");
    this.label("Gamepads override a slot while plugged in: stick / d-pad, A punch, B dash, Start pause.", WORLD_W / 2, 100, 14, "#f0d2b0");
    for (let p = 0; p < 4; p++) {
      const x = 70 + p * 220;
      this.label(COLORS[p].name, x + 80, 140, 18, COLORS[p].body);
      BIND_ACTIONS.forEach((action, row) => {
        const y = 180 + row * 42;
        const selected = view.remap.player === p && view.remap.action === row;
        const capturing = selected && view.remap.capturing;
        const text = capturing ? "PRESS KEY" : keyLabel(view.bindings[p][action]);
        this.panel(x, y - 16, 170, 34, selected ? "rgba(80, 32, 18, 0.95)" : "rgba(12, 8, 7, 0.65)", selected ? "#ffb15a" : "#5c463c");
        this.label(`${ACTION_NAMES[action]}  ${text}`, x + 85, y + 1, 14, "#fff6ea");
        this.spot(x, y - 16, 170, 34, `bind-${p}-${row}`);
      });
    }
    this.label(view.remap.capturing ? "ESC cancels this key" : "Arrows move · Enter rebind · ESC back", WORLD_W / 2, 470, 14, "#f0d2b0");
  }

  drawResults(view) {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(8, 4, 3, 0.72)";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    this.panel(230, 70, 500, 400, "rgba(24, 12, 10, 0.96)", "#ffb15a");
    const winner = view.match && view.match.matchWinner;
    const title = winner == null ? "MATCH OVER" : `${COLORS[winner].name} WINS`;
    this.label(title, WORLD_W / 2, 116, 34, "#ffb15a");
    const rows = view.standings || [];
    rows.forEach((row, index) => {
      const y = 180 + index * 46;
      const color = COLORS[row.id];
      this.label(`${index + 1}  ${color.name}`, 310, y, 20, color.body, "left");
      this.label(`${row.score} rounds`, 650, y, 18, "#fff6ea", "right");
    });
    const againOn = view.resultsIndex === 0;
    this.label(againOn ? "▸ Rematch" : "Rematch", WORLD_W / 2, 390, 22, againOn ? "#fff6ea" : "#c8b09a");
    this.label(view.resultsIndex === 1 ? "▸ Title" : "Title", WORLD_W / 2, 428, 22, view.resultsIndex === 1 ? "#fff6ea" : "#c8b09a");
    this.spot(360, 370, 240, 36, "results-0");
    this.spot(360, 410, 240, 36, "results-1");
  }

  backdrop(time) {
    const ctx = this.ctx;
    const sky = ctx.createLinearGradient(0, 0, 0, WORLD_H);
    sky.addColorStop(0, "#2a100e");
    sky.addColorStop(0.55, "#4a160f");
    sky.addColorStop(1, "#1a0806");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.fillStyle = "#140806";
    ctx.beginPath();
    ctx.moveTo(0, 80);
    ctx.lineTo(120, 160);
    ctx.lineTo(80, 320);
    ctx.lineTo(0, 360);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(WORLD_W, 60);
    ctx.lineTo(840, 150);
    ctx.lineTo(900, 340);
    ctx.lineTo(WORLD_W, 390);
    ctx.fill();
    for (let i = 0; i < 26; i++) {
      const x = (i * 73 + time * 0.02) % WORLD_W;
      const y = 80 + ((i * 47) % 280) + Math.sin(time / 400 + i) * 8;
      ctx.globalAlpha = 0.35 + (i % 3) * 0.15;
      ctx.fillStyle = i % 2 ? "#ffb15a" : "#ff5a2a";
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
    const lavaTop = 468;
    const glow = ctx.createLinearGradient(0, lavaTop, 0, WORLD_H);
    glow.addColorStop(0, "#ff7a18");
    glow.addColorStop(0.4, "#ff3b12");
    glow.addColorStop(1, "#7a1408");
    ctx.fillStyle = glow;
    ctx.fillRect(0, lavaTop, WORLD_W, WORLD_H - lavaTop);
    ctx.fillStyle = "rgba(255, 210, 80, 0.35)";
    for (let i = 0; i < 18; i++) {
      const x = i * 56 + Math.sin(time / 280 + i) * 10;
      const y = lavaTop + 8 + Math.sin(time / 180 + i * 1.3) * 6;
      ctx.beginPath();
      ctx.ellipse(x, y, 22, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawTile(tile, time) {
    if (tile.gone) return;
    const ctx = this.ctx;
    ctx.save();
    let x = tile.x;
    let y = tile.y;
    if (tile.falling) {
      ctx.translate(tile.x + tile.w / 2, tile.y + tile.h / 2);
      ctx.rotate(Math.max(-0.5, Math.min(0.5, tile.vy * 0.03)) * (tile.col % 2 ? 1 : -1));
      ctx.translate(-tile.w / 2, -tile.h / 2);
      x = 0;
      y = 0;
    }
    const ratio = tile.maxLife ? Math.max(0, tile.life / tile.maxLife) : 1;
    ctx.fillStyle = "#5c5148";
    ctx.fillRect(x, y, tile.w, tile.h);
    ctx.fillStyle = "#8a7b6e";
    ctx.fillRect(x, y, tile.w, 4);
    ctx.fillStyle = "#3a312b";
    ctx.fillRect(x, y + tile.h - 4, tile.w, 4);
    ctx.strokeStyle = "#2a211c";
    ctx.strokeRect(x + 0.5, y + 0.5, tile.w - 1, tile.h - 1);
    if (ratio < 0.72) {
      ctx.strokeStyle = ratio < 0.35 ? "#ff6a22" : "#c45528";
      ctx.lineWidth = ratio < 0.35 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 6);
      ctx.lineTo(x + tile.w * 0.45, y + tile.h - 5);
      ctx.moveTo(x + tile.w - 8, y + 5);
      ctx.lineTo(x + tile.w * 0.4, y + 12);
      if (ratio < 0.4) {
        ctx.moveTo(x + 10, y + tile.h - 4);
        ctx.lineTo(x + tile.w - 6, y + 8);
      }
      ctx.stroke();
    }
    if (ratio < 0.22) {
      ctx.fillStyle = `rgba(255, 120, 30, ${0.35 + Math.sin(time / 80 + tile.id) * 0.15})`;
      ctx.fillRect(x + 4, y + 8, tile.w - 8, 4);
    }
    ctx.restore();
  }

  drawPowerup(powerup, time) {
    const ctx = this.ctx;
    const bob = Math.sin(time / 180 + powerup.x) * 3;
    const x = powerup.x;
    const y = powerup.y + bob;
    ctx.save();
    if (powerup.type === "coolant") {
      ctx.fillStyle = "#7ee7ff";
      ctx.fillRect(x + 4, y + 2, 10, 14);
      ctx.fillStyle = "#dff8ff";
      ctx.fillRect(x + 6, y, 6, 4);
    } else if (powerup.type === "overclock") {
      ctx.fillStyle = "#ffb15a";
      ctx.beginPath();
      ctx.moveTo(x + 9, y);
      ctx.lineTo(x + 4, y + 10);
      ctx.lineTo(x + 9, y + 10);
      ctx.lineTo(x + 7, y + 18);
      ctx.lineTo(x + 15, y + 7);
      ctx.lineTo(x + 10, y + 7);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = "#f4f7fb";
      ctx.fillRect(x + 2, y + 8, 14, 4);
      ctx.fillRect(x + 10, y + 4, 4, 12);
    }
    ctx.restore();
  }

  drawMech(player, time, overrideX, overrideY, scale = 1) {
    if (!player || player.kind === "off") return;
    if (!player.alive && overrideX == null) return;
    if (player.invuln > 0 && Math.floor(time / 70) % 2 === 0 && overrideX == null) return;
    const color = COLORS[player.id] || COLORS[0];
    const ctx = this.ctx;
    const px = overrideX == null ? player.x + player.w / 2 : overrideX;
    const py = overrideY == null ? player.y + player.h / 2 : overrideY;
    const facing = player.facing >= 0 ? 1 : -1;
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(facing * scale, scale);
    const punching = player.attackTime >= 3 && player.attackTime <= 8;
    const leg = Math.sin(time / 90 + player.id) * (Math.abs(player.vx) > 0.4 ? 3 : 0.4);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(0, player.h / 2 - 2, 12, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color.dark;
    ctx.fillRect(-8, 6 + leg, 6, 12);
    ctx.fillRect(2, 6 - leg, 6, 12);
    ctx.fillStyle = "#2a2e33";
    ctx.fillRect(-9, 16 + leg, 8, 4);
    ctx.fillRect(1, 16 - leg, 8, 4);
    ctx.fillStyle = color.body;
    ctx.fillRect(-11, -10, 22, 20);
    ctx.fillStyle = color.dark;
    ctx.fillRect(-11, 4, 22, 5);
    ctx.fillStyle = "#2c3138";
    ctx.fillRect(6, -8, 5, 10);
    ctx.fillStyle = color.body;
    ctx.fillRect(-9, -22, 18, 14);
    ctx.fillStyle = "#1b1e22";
    ctx.fillRect(-6, -18, 12, 6);
    ctx.fillStyle = color.visor;
    ctx.fillRect(-4, -16, 8, 3);
    ctx.fillStyle = color.dark;
    const armX = punching ? 10 : 6;
    ctx.fillRect(armX, -4, punching ? 16 : 8, 6);
    ctx.fillStyle = "#d7dbe2";
    ctx.fillRect(armX + (punching ? 12 : 6), -5, 6, 8);
    if (player.stun > 0) {
      ctx.strokeStyle = "#ffe08a";
      ctx.strokeRect(-13, -24, 26, 44);
    }
    ctx.restore();
    if (overrideX == null && player.alive) {
      this.label(String(player.id + 1), player.x + player.w / 2, player.y - 10, 12, color.body);
    }
  }

  drawHud(match, pads) {
    for (let i = 0; i < 4; i++) {
      const player = match.players[i];
      if (player.kind === "off") continue;
      const x = 16 + i * 238;
      const color = COLORS[i];
      this.panel(x, 10, 224, 62, "rgba(16, 8, 7, 0.78)", color.body);
      this.label(color.name, x + 12, 28, 14, color.body, "left");
      if (player.kind === "bot") this.label("CPU", x + 78, 28, 12, "#f0d2b0", "left");
      if (pads && pads[i]) this.padIcon(x + 198, 22, color.body);
      const pct = `${Math.round(player.damage)}%`;
      this.label(pct, x + 210, 46, 18, damageColor(player.damage), "right");
      for (let s = 0; s < match.startingStocks; s++) {
        this.ctx.fillStyle = s < player.stocks ? color.body : "#3a312c";
        this.ctx.fillRect(x + 12 + s * 16, 46, 12, 12);
      }
      this.label(`R${player.score}`, x + 78, 52, 13, "#fff6ea", "left");
    }
    const roundLabel = match.round > match.roundCount ? `SUDDEN ${match.round}` : `ROUND ${match.round}/${match.roundCount}`;
    this.label(roundLabel, WORLD_W / 2, 86, 16, "#ffe7c4");
  }

  padIcon(x, y, color) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    roundRect(ctx, x - 9, y - 6, 18, 12, 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - 2, y, 1.6, 0, Math.PI * 2);
    ctx.arc(x + 3, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function damageColor(damage) {
  if (damage < 50) return "#f7f1e8";
  if (damage < 100) return "#ffb15a";
  return "#ff5a3c";
}

function dummyMech(id, aliveFlag) {
  return {
    id,
    kind: aliveFlag ? "human" : "off",
    alive: true,
    facing: 1,
    attackTime: 0,
    stun: 0,
    invuln: 0,
    vx: 0,
    x: 0,
    y: 0,
    w: 30,
    h: 46,
  };
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
