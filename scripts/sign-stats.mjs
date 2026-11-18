// Prints how many passes were signed: in total, by day and by country, plus
// rate-limited attempts. Reads the Worker's Analytics Engine counter.
//
// Usage: node scripts/sign-stats.mjs [days] [dataset]
//   days     how far back, default 90 (Analytics Engine keeps about 3 months)
//   dataset  colinha_signs (production, default) or colinha_signs_preview
//
// Credentials: uses Wrangler's login (`pnpm wrangler login`) by default.
// CLOUDFLARE_API_TOKEN (Account Analytics: Read) and CLOUDFLARE_ACCOUNT_ID
// override it, for CI or another machine.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const days = Number(process.argv[2] ?? 90);
const dataset = process.argv[3] ?? 'colinha_signs';
if (!Number.isInteger(days) || days < 1 || !/^[a-z_]+$/.test(dataset)) {
  console.error('usage: node scripts/sign-stats.mjs [days] [dataset]');
  process.exit(2);
}

/** Wrangler's OAuth token, refreshed by running `wrangler whoami` first. */
function wranglerToken() {
  try {
    execFileSync('pnpm', ['-s', 'wrangler', 'whoami'], { stdio: 'ignore' });
  } catch {
    // whoami fails when logged out; the read below then finds no token.
  }
  const dirs = [
    join(homedir(), 'Library/Preferences/.wrangler/config/default.toml'),
    join(homedir(), '.config/.wrangler/config/default.toml'),
    join(homedir(), '.wrangler/config/default.toml'),
  ];
  for (const f of dirs) {
    try {
      const m = readFileSync(f, 'utf8').match(/^oauth_token = "([^"]+)"/m);
      if (m) return m[1];
    } catch {
      // try the next location
    }
  }
  return undefined;
}

const token = process.env.CLOUDFLARE_API_TOKEN ?? wranglerToken();
if (!token) {
  console.error('Not logged in: run `pnpm wrangler login`, or set CLOUDFLARE_API_TOKEN.');
  process.exit(2);
}
const api = (path, init) =>
  fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });

let account = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!account) {
  const res = await api('/accounts');
  const list = (await res.json()).result ?? [];
  if (list.length !== 1) {
    console.error(`Found ${list.length} accounts; set CLOUDFLARE_ACCOUNT_ID.`);
    process.exit(2);
  }
  account = list[0].id;
}

async function sql(query) {
  const res = await api(`/accounts/${account}/analytics_engine/sql`, { method: 'POST', body: query });
  const text = await res.text();
  if (!res.ok) throw new Error(`Analytics Engine answered ${res.status}: ${text}`);
  return JSON.parse(text).data;
}

// Data points may be sampled at high volume; _sample_interval scales them back.
const since = `timestamp > NOW() - INTERVAL '${days}' DAY`;
const [totals, byDay, byCountry] = await Promise.all([
  sql(`SELECT blob1 AS outcome, SUM(_sample_interval) AS n FROM ${dataset} WHERE ${since} GROUP BY outcome`),
  sql(`SELECT toStartOfInterval(timestamp, INTERVAL '1' DAY) AS day, SUM(_sample_interval) AS n
       FROM ${dataset} WHERE ${since} AND blob1 = 'signed' GROUP BY day ORDER BY day`),
  sql(`SELECT blob2 AS country, SUM(_sample_interval) AS n
       FROM ${dataset} WHERE ${since} AND blob1 = 'signed' GROUP BY country ORDER BY n DESC`),
]);

const total = (o) => Number(totals.find((r) => r.outcome === o)?.n ?? 0);
console.log(`Last ${days} days (${dataset})`);
console.log(`  Passes signed:          ${total('signed')}`);
console.log(`  Rate-limited attempts:  ${total('rate_limited')}`);
if (byDay.length) {
  console.log('\nSigned by day');
  for (const r of byDay) console.log(`  ${String(r.day).slice(0, 10)}  ${Number(r.n)}`);
}
if (byCountry.length) {
  console.log('\nSigned by country');
  for (const r of byCountry) console.log(`  ${r.country}  ${Number(r.n)}`);
}
