// Renders the animated terminal SVGs on the profile from data/profile.json plus
// live numbers from the GitHub GraphQL API. No dependencies: Node 20+.
//
//   GITHUB_TOKEN=… node scripts/render.mjs
//
// Without a token it falls back to `gh auth token`, and failing that to the
// cached data/stats.json, so a local render always produces something.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), "utf8"));
const write = (p, s) => writeFileSync(new URL(p, root), s);

const profile = read("data/profile.json");
const avatar = read("data/avatar.json");

// ---------------------------------------------------------------- live stats

async function fetchStats(login) {
  let token = process.env.GITHUB_TOKEN;
  if (!token) {
    try {
      token = execSync("gh auth token", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    } catch {
      /* no gh */
    }
  }
  if (!token) return null;

  const year = new Date().getUTCFullYear();
  const years = [];
  for (let y = 2019; y <= year; y++) years.push(y);
  const perYear = years
    .map(
      (y) =>
        `y${y}: user(login: $login) { contributionsCollection(from: "${y}-01-01T00:00:00Z", to: "${y}-12-31T23:59:59Z") { contributionCalendar { totalContributions } } }`,
    )
    .join("\n");
  const query = `query($login: String!, $merged: String!, $reviews: String!) {
    user(login: $login) { createdAt followers { totalCount } }
    merged: search(query: $merged, type: ISSUE) { issueCount }
    reviews: search(query: $reviews, type: ISSUE) { issueCount }
    ${perYear}
  }`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { authorization: `bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      query,
      variables: {
        login,
        merged: `is:pr author:${login} is:merged`,
        reviews: `is:pr reviewed-by:${login}`,
      },
    }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  const d = json.data;
  const contributions = years.reduce((n, y) => n + d[`y${y}`].contributionsCollection.contributionCalendar.totalContributions, 0);
  return {
    createdAt: d.user.createdAt,
    followers: d.user.followers.totalCount,
    merged: d.merged.issueCount,
    reviews: d.reviews.issueCount,
    contributions,
  };
}

let stats;
try {
  stats = await fetchStats(profile.login);
  if (stats) write("data/stats.json", JSON.stringify(stats, null, 2) + "\n");
} catch (err) {
  console.warn(`stats fetch failed, using cache: ${err.message}`);
}
stats ??= read("data/stats.json");

function uptime(from, to = new Date()) {
  const a = new Date(from);
  let months = (to.getUTCFullYear() - a.getUTCFullYear()) * 12 + (to.getUTCMonth() - a.getUTCMonth());
  if (to.getUTCDate() < a.getUTCDate()) months -= 1;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${y} year${y === 1 ? "" : "s"}, ${m} month${m === 1 ? "" : "s"}`;
}

const fmt = (n) => n.toLocaleString("en-US");
const vars = {
  uptime: uptime(stats.createdAt),
  since: stats.createdAt.slice(0, 4),
  merged: fmt(stats.merged),
  reviews: fmt(stats.reviews),
  contributions: fmt(stats.contributions),
  followers: fmt(stats.followers),
};
const fill = (s) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);

// ------------------------------------------------------------------- themes

const THEMES = {
  dark: {
    bg: "#0b0f14",
    chrome: "#161b22",
    line: "#30363d",
    fg: "#c9d1d9",
    muted: "#8b949e",
    dim: "#484f58",
    green: "#7ee787",
    blue: "#79c0ff",
    purple: "#d2a8ff",
    orange: "#ffa657",
    red: "#ff7b72",
    yellow: "#e3b341",
    cyan: "#56d4dd",
    pink: "#ff9bce",
    // Avatar art: colours are lifted so hair and shadow still read on dark.
    artGain: [0.9, 70],
  },
  light: {
    bg: "#ffffff",
    chrome: "#f6f8fa",
    line: "#d0d7de",
    fg: "#1f2328",
    muted: "#57606a",
    dim: "#8c959f",
    green: "#1a7f37",
    blue: "#0550ae",
    purple: "#8250df",
    orange: "#953800",
    red: "#cf222e",
    yellow: "#9a6700",
    cyan: "#1b7c83",
    pink: "#bf3989",
    artGain: [0.8, 0],
  },
};

const FONT = `ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "DejaVu Sans Mono", "Liberation Mono", monospace`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// A <tspan> whose font-size jumps from 0 to `size` at `at` seconds — the
// cheapest way to type a character in an <img>: hidden glyphs take no space,
// so the cursor after them sits in the right place without measuring text.
const typed = (str, at, step, size) =>
  [...str]
    .map((ch, i) => `<tspan class="ty" style="animation-delay:${(at + i * step).toFixed(2)}s">${esc(ch)}</tspan>`)
    .join("");

function window_(t, w, h, title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family='${FONT}' font-size="13">
<style>
  text { white-space: pre; }
  .ty { font-size: 0; animation: ty .001s linear forwards; }
  .in { opacity: 0; animation: in .28s ease-out forwards; }
  .bar { transform: scaleX(0); transform-origin: left; animation: bar .9s cubic-bezier(.2,.7,.2,1) forwards; }
  .cur { animation: blink 1.1s step-end infinite; }
  .cur-off { animation: blink 1.1s step-end infinite, off .001s linear forwards; }
  .halo { stroke-width: 3px; paint-order: stroke; stroke-linejoin: round; }
  @keyframes ty { to { font-size: 13px; } }
  @keyframes in { to { opacity: 1; } }
  @keyframes bar { to { transform: scaleX(1); } }
  @keyframes blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
  @keyframes off { to { opacity: 0; } }
</style>
<rect width="${w}" height="${h}" rx="12" fill="${t.bg}"/>
<path d="M12 0h${w - 24}a12 12 0 0 1 12 12v24H0V12A12 12 0 0 1 12 0z" fill="${t.chrome}"/>
<rect x="0" y="36" width="${w}" height="1" fill="${t.line}"/>
<circle cx="20" cy="18" r="6" fill="${t.red}"/><circle cx="40" cy="18" r="6" fill="${t.yellow}"/><circle cx="60" cy="18" r="6" fill="${t.green}"/>
<text x="${w / 2}" y="22.5" text-anchor="middle" fill="${t.muted}" font-size="12">${esc(title)}</text>
<rect x="0" y="0" width="${w}" height="${h}" rx="12" fill="none" stroke="${t.line}"/>
${body}
</svg>
`;
}

const prompt = (t) =>
  `<tspan fill="${t.green}" font-weight="700">abhishek@github</tspan><tspan fill="${t.fg}">:</tspan><tspan fill="${t.blue}" font-weight="700">~</tspan><tspan fill="${t.fg}">$ </tspan>`;

// ----------------------------------------------------------------- neofetch

function neofetch(t) {
  const W = 900;
  const PAD = 28;
  let y = 64;
  const parts = [];

  // $ neofetch — typed, with the cursor riding along until Enter.
  const T0 = 0.5;
  const STEP = 0.085;
  const cmd = "neofetch";
  const enter = T0 + cmd.length * STEP + 0.25;
  parts.push(
    `<text x="${PAD}" y="${y}" fill="${t.fg}">${prompt(t)}${typed(cmd, T0, STEP, 13)}<tspan class="cur-off" fill="${t.fg}" style="animation-delay:0s,${enter.toFixed(2)}s">▍</tspan></text>`,
  );
  y += 30;

  // Avatar as coloured ASCII, row by row like a slow tty.
  const ART_SIZE = 12;
  const ART_LH = 14.2;
  const ramp = " .'-:;=+*#%@";
  const [gain, lift] = t.artGain;
  const artTop = y;
  avatar.cells.forEach((row, r) => {
    const runs = [];
    for (const [R, G, B] of row) {
      const lum = (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255;
      const ch = ramp[Math.min(ramp.length - 1, Math.floor((1 - lum) * ramp.length))];
      const q = (v) => Math.max(0, Math.min(255, Math.round((v * gain + lift) / 17) * 17));
      const color = `#${[q(R), q(G), q(B)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
      const last = runs[runs.length - 1];
      if (last && last.color === color) last.text += ch;
      else runs.push({ color, text: ch });
    }
    const spans = runs.map((s) => `<tspan fill="${s.color}">${esc(s.text)}</tspan>`).join("");
    parts.push(
      `<text class="in" x="${PAD}" y="${(artTop + r * ART_LH).toFixed(1)}" font-size="${ART_SIZE}" style="animation-delay:${(enter + 0.15 + r * 0.045).toFixed(2)}s">${spans}</text>`,
    );
  });

  // Fields, in the classic two-column layout.
  const X = 356;
  const LH = 20;
  let fy = y;
  let i = 0;
  const line = (inner) => {
    parts.push(`<text class="in" x="${X}" y="${fy}" style="animation-delay:${(enter + 0.25 + i * 0.1).toFixed(2)}s">${inner}</text>`);
    fy += LH;
    i += 1;
  };
  line(`<tspan fill="${t.green}" font-weight="700">abhishek</tspan><tspan fill="${t.fg}">@</tspan><tspan fill="${t.green}" font-weight="700">github</tspan>`);
  line(`<tspan fill="${t.muted}">${"-".repeat(profile.host.length)}</tspan>`);
  for (const [k, v] of profile.neofetch) {
    line(`<tspan fill="${t.green}" font-weight="700">${esc(k)}</tspan><tspan fill="${t.fg}">: ${esc(fill(v))}</tspan>`);
  }
  fy += 6;
  const sw = [t.dim, t.red, t.green, t.yellow, t.blue, t.purple, t.cyan, t.fg];
  sw.forEach((c, j) => {
    parts.push(
      `<rect class="in" x="${X + j * 34}" y="${fy}" width="30" height="14" rx="2" fill="${c}" style="animation-delay:${(enter + 0.25 + i * 0.1 + j * 0.04).toFixed(2)}s"/>`,
    );
  });
  fy += 14;

  // New prompt, blinking, waiting for the reader.
  const artBottom = artTop + (avatar.rows - 1) * ART_LH;
  y = Math.max(fy, artBottom) + 34;
  const done = enter + 0.25 + (i + 2) * 0.1;
  parts.push(
    `<text class="in" x="${PAD}" y="${y}" fill="${t.fg}" style="animation-delay:${done.toFixed(2)}s">${prompt(t)}<tspan class="cur">▍</tspan></text>`,
  );
  const H = y + 26;
  return window_(t, W, H, "abhishek@github: ~ — neofetch", parts.join("\n"));
}

// --------------------------------------------------------------------- htop

function htop(t) {
  const W = 900;
  const PAD = 28;
  const LH = 20;
  const { cores, mem, swp, meta, procs } = profile.htop;
  const parts = [];
  let y = 62;

  // Meters: `1 [|||||||   42.0%]` drawn as a clipped rect so the fill animates.
  const METER_X = PAD + 44;
  const METER_W = 356;
  const meter = (label, pct, text, color, delay) => {
    const fillW = Math.round((METER_W - 8) * (pct / 100));
    parts.push(
      `<text x="${PAD}" y="${y}" fill="${t.cyan}" font-weight="700">${esc(label)}</text>`,
      `<text x="${METER_X - 8}" y="${y}" fill="${t.fg}">[</text>`,
      `<rect class="bar" x="${METER_X}" y="${y - 12}" width="${fillW}" height="14" fill="${color}" style="animation-delay:${delay}s"/>`,
      `<text x="${METER_X + METER_W}" y="${y}" fill="${t.fg}">]</text>`,
      `<text class="halo" x="${METER_X + METER_W - 6}" y="${y}" text-anchor="end" fill="${t.fg}" stroke="${t.bg}" font-size="12">${esc(text)}</text>`,
    );
  };
  const META_X = PAD + 448;
  cores.forEach(([n, pct, tag], idx) => {
    meter(n.padStart(3), pct, `${pct.toFixed(1)}% ${tag}`, [t.green, t.blue, t.purple, t.orange][idx % 4], (0.2 + idx * 0.12).toFixed(2));
    parts.push(`<text class="in" x="${META_X}" y="${y}" fill="${t.fg}" style="animation-delay:${(0.4 + idx * 0.12).toFixed(2)}s">${esc(fill(meta[idx] ?? ""))}</text>`);
    y += LH;
  });
  meter("Mem", mem.pct, mem.label, t.yellow, "0.7");
  y += LH;
  meter("Swp", swp.pct, swp.label, t.red, "0.8");
  y += LH + 14;

  // Header bar, inverted like htop's.
  // [label, anchor x, anchor]
  const cols = [
    ["PID", PAD + 40, "end"],
    ["USER", PAD + 58, "start"],
    ["PRI", PAD + 172, "end"],
    ["NI", PAD + 212, "end"],
    ["S", PAD + 232, "start"],
    ["CPU%", PAD + 306, "end"],
    ["MEM%", PAD + 368, "end"],
    ["SINCE", PAD + 440, "end"],
    ["Command", PAD + 462, "start"],
  ];
  parts.push(`<rect x="${PAD - 8}" y="${y - 14}" width="${W - PAD * 2 + 16}" height="${LH}" fill="${t.green}"/>`);
  for (const [name, x, anchor] of cols) {
    parts.push(`<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${t.bg}" font-weight="700">${esc(name)}</text>`);
  }
  y += LH;
  procs.forEach(([pid, s, cpu, memp, since, cmd], idx) => {
    const delay = (0.9 + idx * 0.07).toFixed(2);
    const cpuColor = cpu >= 90 ? t.red : cpu >= 80 ? t.orange : t.fg;
    parts.push(`<g class="in" style="animation-delay:${delay}s">
  <text x="${cols[0][1]}" y="${y}" text-anchor="end" fill="${t.cyan}">${esc(pid)}</text>
  <text x="${cols[1][1]}" y="${y}" fill="${t.fg}">abhishek</text>
  <text x="${cols[2][1]}" y="${y}" text-anchor="end" fill="${t.fg}">20</text>
  <text x="${cols[3][1]}" y="${y}" text-anchor="end" fill="${t.fg}">0</text>
  <text x="${cols[4][1]}" y="${y}" fill="${s === "R" ? t.green : t.muted}">${esc(s)}</text>
  <text x="${cols[5][1]}" y="${y}" text-anchor="end" fill="${cpuColor}">${cpu.toFixed(1)}</text>
  <text x="${cols[6][1]}" y="${y}" text-anchor="end" fill="${t.fg}">${memp.toFixed(1)}</text>
  <text x="${cols[7][1]}" y="${y}" text-anchor="end" fill="${t.muted}">${esc(since)}</text>
  <text x="${cols[8][1]}" y="${y}" fill="${t.fg}">${esc(cmd)}</text>
</g>`);
    y += LH;
  });

  // Function-key strip.
  y += 10;
  const keys = [
    ["F1", "Help"],
    ["F2", "Setup"],
    ["F3", "Search"],
    ["F4", "Filter"],
    ["F5", "Tree"],
    ["F6", "SortBy"],
    ["F9", "Kill"],
    ["F10", "Quit"],
  ];
  let kx = PAD - 8;
  const keyW = (W - PAD * 2 + 16) / keys.length;
  for (const [k, label] of keys) {
    parts.push(
      `<text x="${kx + 2}" y="${y}" fill="${t.fg}">${k}</text>`,
      `<rect x="${kx + 28}" y="${y - 14}" width="${keyW - 30}" height="${LH}" fill="${t.cyan}"/>`,
      `<text x="${kx + 32}" y="${y}" fill="${t.bg}">${label}</text>`,
    );
    kx += keyW;
  }
  const H = y + 22;
  return window_(t, W, H, "abhishek@github: ~ — htop", parts.join("\n"));
}

// ------------------------------------------------------------------- output

// Logos in data/logos/ are monochrome `currentColor` SVGs; an <img> cannot
// inherit a colour, so each is written once per theme in that theme's ink.
const logos = readdirSync(new URL("data/logos/", root)).filter((f) => f.endsWith(".svg"));

for (const [name, t] of Object.entries(THEMES)) {
  write(`assets/neofetch-${name}.svg`, neofetch(t));
  write(`assets/htop-${name}.svg`, htop(t));
  for (const file of logos) {
    const svg = readFileSync(new URL(`data/logos/${file}`, root), "utf8");
    write(`assets/${file.replace(/\.svg$/, "")}-${name}.svg`, svg.replaceAll("currentColor", t.fg));
  }
}
console.log(`rendered with ${JSON.stringify(vars)}`);
