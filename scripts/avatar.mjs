// One-off: sample the GitHub avatar into a small colour grid for the neofetch
// art. Needs `sharp`; run it from a project that has it on NODE_PATH:
//   NODE_PATH=/path/to/node_modules node scripts/avatar.mjs
// The output (data/avatar.json) is committed, so the daily render never needs
// image libraries.
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const USER_ID = 48255244;
const COLS = 40;
const ROWS = 20; // glyph cells are ~2:1, so half as many rows as columns

const res = await fetch(`https://avatars.githubusercontent.com/u/${USER_ID}?v=4&s=256`);
const png = Buffer.from(await res.arrayBuffer());
const { data, info } = await sharp(png)
  .resize(COLS, ROWS, { fit: "fill", kernel: "lanczos3" })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const rows = [];
for (let y = 0; y < info.height; y++) {
  const row = [];
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 3;
    row.push([data[i], data[i + 1], data[i + 2]]);
  }
  rows.push(row);
}
writeFileSync(new URL("../data/avatar.json", import.meta.url), JSON.stringify({ cols: COLS, rows: ROWS, cells: rows }));
console.log(`wrote data/avatar.json (${COLS}x${ROWS})`);
