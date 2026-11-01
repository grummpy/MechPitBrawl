import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(path.join(root, rel), "utf8");
}

test("arcade.json matches the cabinet manifest and points at real files", () => {
  const manifest = JSON.parse(read("arcade.json"));
  assert.equal(manifest.name, "Mech Pit Brawl");
  assert.equal(manifest.id, "mechpitbrawl");
  assert.equal(manifest.icon, "assets/icon.jpg");
  assert.equal(manifest.cover, "assets/cover.jpg");
  assert.equal(manifest.players, 4);
  assert.equal(manifest.minPlayers, 1);
  assert.equal(manifest.port, 8804);
  assert.equal(manifest.version, "1.0.0");
  assert.deepEqual(manifest.input, ["keyboard", "gamepad"]);
  assert.equal(manifest.launch.mac, "./launch-mac.command");
  assert.equal(manifest.launch.windows, "launch-windows.bat");
  assert.equal(manifest.launch.linux, "./launch-linux.sh");
  assert.equal(manifest.launch.web, "index.html");

  for (const rel of [manifest.icon, manifest.cover, manifest.launch.web, "server.py", "docs/BUILD.md"]) {
    assert.equal(existsSync(path.join(root, rel)), true, rel);
  }
  for (const rel of [manifest.launch.mac, manifest.launch.windows, manifest.launch.linux]) {
    const file = path.join(root, rel);
    assert.equal(existsSync(file), true, rel);
    assert.ok(statSync(file).size > 0);
    assert.match(readFileSync(file, "utf8"), /server\.py/);
    assert.match(readFileSync(file, "utf8"), /Python 3/);
  }
});

test("the page is a module canvas game with no external network assets", () => {
  const html = read("index.html");
  assert.match(html, /<canvas id="game"/);
  assert.match(html, /src="src\/ui\/main\.js"/);
  assert.match(html, /assets\/icon\.jpg/);
  assert.doesNotMatch(html, /https?:\/\//);
  const uiFiles = ["src/ui/main.js", "src/ui/render.js", "src/ui/audio.js", "src/ui/input.js", "src/ui/storage.js"];
  for (const rel of uiFiles) {
    const text = read(rel);
    assert.doesNotMatch(text, /https?:\/\//);
    assert.equal(existsSync(path.join(root, rel)), true);
  }
});
