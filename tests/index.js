// `node --test tests/` loads this directory entry, then each ESM suite.
const { readdirSync } = require("node:fs");
const path = require("node:path");

const files = readdirSync(__dirname)
  .filter((name) => name.endsWith(".test.mjs"))
  .sort();

module.exports = Promise.all(files.map((file) => import(path.join(__dirname, file))));
