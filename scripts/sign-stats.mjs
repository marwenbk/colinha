// Prints how many passes were signed: in total, by day and by country, plus
// rate-limited attempts. Reads the Worker's Analytics Engine counter.
//
// Usage: CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... node scripts/sign-stats.mjs [days] [dataset]
//   days     how far back, default 90 (Analytics Engine keeps about 3 months)
//   dataset  colinha_signs (production, default) or colinha_signs_preview
//
// The token needs one permission: Account > Account Analytics > Read.
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const days = Number(process.argv[2] ?? 90);
const dataset = process.argv[3] ?? 'colinha_signs';

if (!account || !token) {
  console.error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (Account Analytics: Read).');
  process.exit(2);
}
if (!Number.isInteger(days) || days < 1 || !/^[a-z_]+$/.test(dataset)) {
  console.error('usage: node scripts/sign-stats.mjs [days] [dataset]');
  process.exit(2);
}

async function sql(query) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/analytics_engine/sql`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: query },
  );
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
