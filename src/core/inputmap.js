/** Keyboard codes and gamepad snapshots to per-player actions. No DOM. */

export const DEFAULT_BINDINGS = [
  { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD", action: "KeyF", secondary: "KeyG" },
  { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", action: "Slash", secondary: "Period" },
  { up: "KeyI", down: "KeyK", left: "KeyJ", right: "KeyL", action: "Semicolon", secondary: "Quote" },
  { up: "Numpad8", down: "Numpad5", left: "Numpad4", right: "Numpad6", action: "Numpad0", secondary: "NumpadEnter" },
];

export const BIND_ACTIONS = ["up", "down", "left", "right", "action", "secondary"];

const DEADZONE = 0.28;

const KEY_LABELS = {
  KeyW: "W", KeyA: "A", KeyS: "S", KeyD: "D", KeyF: "F", KeyG: "G",
  KeyI: "I", KeyJ: "J", KeyK: "K", KeyL: "L",
  ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right",
  Slash: "/", Period: ".", Semicolon: ";", Quote: "'",
  Numpad8: "Num 8", Numpad5: "Num 5", Numpad4: "Num 4", Numpad6: "Num 6",
  Numpad0: "Num 0", NumpadEnter: "Num Enter",
  Space: "Space", Enter: "Enter", Escape: "Esc",
};

export function keyLabel(code) {
  if (!code) return "—";
  if (KEY_LABELS[code]) return KEY_LABELS[code];
  if (code.startsWith("Key") && code.length === 4) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code;
}

export function neutralInput() {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    action: false,
    secondary: false,
    pause: false,
    source: "none",
  };
}

export function neutralInputs() {
  return [neutralInput(), neutralInput(), neutralInput(), neutralInput()];
}

function hasKey(keys, code) {
  if (!keys || !code) return false;
  if (typeof keys.has === "function") return keys.has(code);
  if (Array.isArray(keys)) return keys.includes(code);
  return !!keys[code];
}

function buttonPressed(buttons, index) {
  const button = buttons && buttons[index];
  if (!button) return false;
  if (typeof button === "boolean") return button;
  if (typeof button === "number") return button > 0.5;
  return !!(button.pressed || (button.value || 0) > 0.5);
}

export function mapGamepad(pad) {
  if (!pad || !pad.connected) return null;
  const axes = pad.axes || [];
  const buttons = pad.buttons || [];
  const lx = Number(axes[0]) || 0;
  const ly = Number(axes[1]) || 0;
  let left = buttonPressed(buttons, 14) || lx <= -DEADZONE;
  let right = buttonPressed(buttons, 15) || lx >= DEADZONE;
  let up = buttonPressed(buttons, 12) || ly <= -DEADZONE;
  let down = buttonPressed(buttons, 13) || ly >= DEADZONE;
  if (left && right) {
    left = lx < -DEADZONE;
    right = lx > DEADZONE;
  }
  if (up && down) {
    up = ly < -DEADZONE;
    down = ly > DEADZONE;
  }
  return {
    left,
    right,
    up,
    down,
    action: buttonPressed(buttons, 0),
    secondary: buttonPressed(buttons, 1),
    pause: buttonPressed(buttons, 9),
    source: "gamepad",
  };
}

export function mapKeyboard(keys, binding) {
  const bind = binding || DEFAULT_BINDINGS[0];
  return {
    left: hasKey(keys, bind.left),
    right: hasKey(keys, bind.right),
    up: hasKey(keys, bind.up),
    down: hasKey(keys, bind.down),
    action: hasKey(keys, bind.action),
    secondary: hasKey(keys, bind.secondary),
    pause: false,
    source: "keyboard",
  };
}

/**
 * Pads 0-3 map to P1-P4. A connected pad overrides that player's keyboard.
 * @param {{ keys?: Set<string>|object, gamepads?: object[], bindings?: object[] }} source
 */
export function mapPlayerInputs({ keys, gamepads, bindings } = {}) {
  const binds = bindings && bindings.length ? bindings : DEFAULT_BINDINGS;
  const pads = gamepads || [];
  return [0, 1, 2, 3].map((index) => {
    const fromPad = mapGamepad(pads[index]);
    if (fromPad) return fromPad;
    return mapKeyboard(keys, binds[index] || DEFAULT_BINDINGS[index]);
  });
}

export function anyPause(inputs, escPressed) {
  if (escPressed) return true;
  return (inputs || []).some((input) => input && input.pause);
}
