/**
 * Mulberry32. Same seed always yields the same sequence in a given JS engine.
 * `state()` / `setState()` let tests and replays resume a generator.
 */
export function makeRng(seed) {
  let a = seed >>> 0;
  return {
    next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(n) {
      if (!n || n <= 0) return 0;
      return Math.floor(this.next() * n);
    },
    state() {
      return a >>> 0;
    },
    setState(value) {
      a = value >>> 0;
    },
  };
}
