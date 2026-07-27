// Temporary e2e: paper archive in Mongo, ID scheme 1-150, size enforcement, PDF download.
const BASE = 'http://localhost:5000';
const KEY = { 'x-admin-key': 'dev-admin-key', 'Content-Type': 'application/json' };
const post = (p, body) =>
  fetch(`${BASE}/api/admin/${p}`, { method: 'POST', headers: KEY, body: JSON.stringify(body ?? {}) });
const log = (...a) => console.log(...a);

log('=== 1. open a 5x5 game ===');
await post('open', { size: 5 });

log('\n=== 2. size enforcement ===');
const r1 = await (await post('paper', { ids: ['117'] })).json(); // 5x5 board
log('117 (5x5) into 5x5:', r1.added.join(','), '| ok:', r1.ok);
const r2 = await (await post('paper', { ids: ['7'] })).json(); // 3x3 board
log('7 (3x3) into 5x5:', JSON.stringify({ mismatched: r2.mismatched, gameSize: r2.gameSize }));
const r3 = await (await post('paper', { ids: ['999'] })).json();
log('999:', JSON.stringify({ unknown: r3.unknown }));

log('\n=== 3. new round at 3x3 -> the 5x5 sheet drops from tracking ===');
await post('reset', { size: 3 });
const reg = await (await fetch(`${BASE}/api/admin/paper`, { headers: KEY })).json();
log('registered after size switch:', JSON.stringify(reg.registered));
const r4 = await (await post('paper', { ids: ['7'] })).json();
log('7 (3x3) into 3x3:', r4.added.join(','), '| ok:', r4.ok);

log('\n=== 4. PDF download from the archive ===');
for (const size of [3, 4, 5]) {
  const res = await fetch(`${BASE}/api/admin/print/${size}`, { headers: KEY });
  const buf = Buffer.from(await res.arrayBuffer());
  log(
    `${size}x${size}: status=${res.status} type=${res.headers.get('content-type')} ` +
      `size=${Math.round(buf.length / 1024)}KB isPDF=${buf.subarray(0, 4).toString() === '%PDF'}`,
  );
}
const noAuth = await fetch(`${BASE}/api/admin/print/5`);
log('download without auth:', noAuth.status);

log('\n=== 5. archive contents in Mongo ===');
const health = await (await fetch(`${BASE}/health`)).json();
log('db state:', health.db.state);

process.exit(0);
