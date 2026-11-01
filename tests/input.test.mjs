import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_BINDINGS,
  anyPause,
  keyLabel,
  mapPlayerInputs,
  neutralInput,
} from "../src/core/inputmap.js";

function pad(partial = {}) {
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
  const set = (index, on) => {
    if (!on) return;
    buttons[index] = { pressed: true, value: 1 };
  };
  set(0, partial.a);
  set(1, partial.b);
  set(9, partial.start);
  set(12, partial.up);
  set(13, partial.down);
  set(14, partial.left);
  set(15, partial.right);
  return {
    connected: partial.connected !== false,
    axes: [partial.lx || 0, partial.ly || 0, 0, 0],
    buttons,
  };
}

test("default keyboard bindings map all four pilots", () => {
  const keys = new Set(["KeyD", "KeyF", "ArrowUp", "Slash", "KeyJ", "Quote", "Numpad6", "NumpadEnter"]);
  const inputs = mapPlayerInputs({ keys, gamepads: [], bindings: DEFAULT_BINDINGS });
  assert.equal(inputs[0].right, true);
  assert.equal(inputs[0].action, true);
  assert.equal(inputs[0].source, "keyboard");
  assert.equal(inputs[1].up, true);
  assert.equal(inputs[1].action, true);
  assert.equal(inputs[1].left, false);
  assert.equal(inputs[2].left, true);
  assert.equal(inputs[2].secondary, true);
  assert.equal(inputs[3].right, true);
  assert.equal(inputs[3].secondary, true);
  assert.equal(inputs[3].action, false);
});

test("secondary keys for P1 and P2", () => {
  const inputs = mapPlayerInputs({
    keys: new Set(["KeyG", "Period"]),
    gamepads: [null, null, null, null],
  });
  assert.equal(inputs[0].secondary, true);
  assert.equal(inputs[1].secondary, true);
  assert.equal(inputs[2].action, false);
});

test("P3 action is semicolon", () => {
  const inputs = mapPlayerInputs({ keys: { Semicolon: true } });
  assert.equal(inputs[2].action, true);
  assert.equal(inputs[0].action, false);
});

test("custom bindings replace the defaults", () => {
  const bindings = DEFAULT_BINDINGS.map((binding) => ({ ...binding }));
  bindings[0] = { ...bindings[0], action: "KeyZ", up: "KeyQ" };
  const inputs = mapPlayerInputs({ keys: new Set(["KeyZ", "KeyQ"]), bindings });
  assert.equal(inputs[0].action, true);
  assert.equal(inputs[0].up, true);
  assert.equal(inputs[0].left, false);
});

test("a connected gamepad overrides that player's keyboard", () => {
  const inputs = mapPlayerInputs({
    keys: new Set(["KeyD", "KeyF"]),
    gamepads: [pad({ lx: -1, b: true })],
  });
  assert.equal(inputs[0].source, "gamepad");
  assert.equal(inputs[0].left, true);
  assert.equal(inputs[0].right, false);
  assert.equal(inputs[0].action, false);
  assert.equal(inputs[0].secondary, true);
});

test("disconnected and missing pads leave the keyboard in charge", () => {
  const inputs = mapPlayerInputs({
    keys: new Set(["KeyA"]),
    gamepads: [pad({ connected: false, lx: 1, a: true }), null],
  });
  assert.equal(inputs[0].source, "keyboard");
  assert.equal(inputs[0].left, true);
  assert.equal(inputs[0].action, false);
});

test("gamepad face buttons, d-pad, stick, and start", () => {
  const inputs = mapPlayerInputs({
    keys: new Set(),
    gamepads: [
      pad({ a: true, up: true, start: true }),
      pad({ ly: 0.9, b: true }),
      pad({ lx: 0.1, ly: -0.05 }),
      pad({ right: true }),
    ],
  });
  assert.equal(inputs[0].action, true);
  assert.equal(inputs[0].up, true);
  assert.equal(inputs[0].pause, true);
  assert.equal(inputs[1].down, true);
  assert.equal(inputs[1].secondary, true);
  assert.equal(inputs[2].left, false);
  assert.equal(inputs[2].right, false);
  assert.equal(inputs[2].up, false);
  assert.equal(inputs[3].right, true);
  assert.equal(anyPause(inputs, false), true);
  assert.equal(anyPause([neutralInput()], true), true);
});

test("stick inside the deadzone does not move", () => {
  const inputs = mapPlayerInputs({ gamepads: [pad({ lx: 0.12, ly: -0.2 })] });
  assert.equal(inputs[0].left, false);
  assert.equal(inputs[0].right, false);
  assert.equal(inputs[0].up, false);
});

test("key labels cover the odd keyboard keys", () => {
  assert.equal(keyLabel("Slash"), "/");
  assert.equal(keyLabel("Period"), ".");
  assert.equal(keyLabel("Semicolon"), ";");
  assert.equal(keyLabel("Quote"), "'");
  assert.equal(keyLabel("NumpadEnter"), "Num Enter");
  assert.equal(keyLabel("Numpad0"), "Num 0");
});
