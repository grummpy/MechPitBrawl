import assert from "node:assert/strict";
import test from "node:test";
import { makeRng } from "../src/core/rng.js";

test("same seed produces the same sequence", () => {
  const a = makeRng(123456);
  const b = makeRng(123456);
  const seqA = Array.from({ length: 8 }, () => a.next());
  const seqB = Array.from({ length: 8 }, () => b.next());
  assert.deepEqual(seqA, seqB);
  assert.equal(new Set(seqA).size, seqA.length);
});

test("different seeds diverge", () => {
  const a = makeRng(1);
  const b = makeRng(2);
  assert.notEqual(a.next(), b.next());
});

test("state can be snapshotted and restored", () => {
  const rng = makeRng(99);
  rng.next();
  rng.next();
  const snap = rng.state();
  const expected = rng.next();
  const later = rng.next();
  rng.setState(snap);
  assert.equal(rng.next(), expected);
  assert.equal(rng.next(), later);
});

test("int stays inside the requested range", () => {
  const rng = makeRng(7);
  for (let i = 0; i < 40; i++) {
    const n = rng.int(5);
    assert.ok(n >= 0 && n < 5);
    assert.equal(n, Math.floor(n));
  }
  assert.equal(rng.int(0), 0);
});
