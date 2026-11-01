const BLOCKED = new Set([
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Enter", "Escape",
  "Slash", "Quote", "Semicolon", "Period", "Backslash",
  "NumpadEnter", "Numpad0", "Numpad1", "Numpad2", "Numpad3", "Numpad4",
  "Numpad5", "Numpad6", "Numpad7", "Numpad8", "Numpad9",
  "KeyW", "KeyA", "KeyS", "KeyD", "KeyF", "KeyG",
  "KeyI", "KeyJ", "KeyK", "KeyL", "KeyM",
]);

export class Keyboard {
  constructor(target) {
    this.down = new Set();
    this.pressed = new Set();
    this.target = target;
    this._onDown = (event) => {
      if (BLOCKED.has(event.code)) event.preventDefault();
      if (!this.down.has(event.code)) this.pressed.add(event.code);
      this.down.add(event.code);
    };
    this._onUp = (event) => {
      this.down.delete(event.code);
    };
    this._onBlur = () => {
      this.down.clear();
    };
    window.addEventListener("keydown", this._onDown);
    window.addEventListener("keyup", this._onUp);
    window.addEventListener("blur", this._onBlur);
  }

  consume() {
    const pressed = this.pressed;
    this.pressed = new Set();
    return pressed;
  }
}

function buttonOn(button) {
  if (!button) return false;
  if (typeof button === "boolean") return button;
  if (typeof button === "number") return button > 0.5;
  return !!(button.pressed || (button.value || 0) > 0.5);
}

export function readGamepads() {
  const source = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
  const pads = [null, null, null, null];
  for (let i = 0; i < 4; i++) {
    const pad = source && source[i];
    if (!pad) continue;
    pads[i] = {
      connected: !!pad.connected,
      axes: [pad.axes?.[0] || 0, pad.axes?.[1] || 0, pad.axes?.[2] || 0, pad.axes?.[3] || 0],
      buttons: Array.from(pad.buttons || []).map((button) => ({
        pressed: !!button.pressed,
        value: button.value || 0,
      })),
    };
  }
  return pads;
}

export function snapshotPads(pads) {
  return pads.map((pad) => {
    if (!pad || !pad.connected) return null;
    const lx = pad.axes?.[0] || 0;
    const ly = pad.axes?.[1] || 0;
    return {
      a: buttonOn(pad.buttons?.[0]),
      b: buttonOn(pad.buttons?.[1]),
      start: buttonOn(pad.buttons?.[9]),
      up: buttonOn(pad.buttons?.[12]) || ly <= -0.55,
      down: buttonOn(pad.buttons?.[13]) || ly >= 0.55,
      left: buttonOn(pad.buttons?.[14]) || lx <= -0.55,
      right: buttonOn(pad.buttons?.[15]) || lx >= 0.55,
    };
  });
}

export function edgePads(curr, prev) {
  return [0, 1, 2, 3].map((index) => {
    const now = curr[index];
    const was = prev[index] || {};
    if (!now) {
      return { a: false, b: false, start: false, up: false, down: false, left: false, right: false, connected: false };
    }
    const rise = (key) => !!now[key] && !was[key];
    return {
      a: rise("a"),
      b: rise("b"),
      start: rise("start"),
      up: rise("up"),
      down: rise("down"),
      left: rise("left"),
      right: rise("right"),
      connected: true,
    };
  });
}

export function padsConnected(pads) {
  return [0, 1, 2, 3].map((index) => !!(pads[index] && pads[index].connected));
}
