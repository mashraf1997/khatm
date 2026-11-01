import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp, normPhone } from '../src/app.js';

let app, base, owner, dataDir;

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'khatm-'));
  app = createApp({ dataDir });
  base = `http://127.0.0.1:${await app.start(0)}`;
});
after(async () => {
  await app.stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

async function call(p, { method = 'GET', body, jar = '' } = {}) {
  const res = await fetch(base + p, { method, headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(jar ? { cookie: jar } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json, headers: res.headers, cookie: (res.headers.get('set-cookie') || '').split(';')[0] };
}
const counterCode = async () => (await call('/api/counter/code', { method: 'POST', body: {}, jar: owner })).body;

test('phone numbers are normalized, including Arabic digits', () => {
  assert.equal(normPhone('٠١٠٠ ١٢٣ ٤٥٦٧'), '01001234567');
  assert.equal(normPhone('00 20 100-123-4567'), '+201001234567');
});

test('customers cannot join before the owner sets up', async () => {
  const r = await call('/api/public/join', { method: 'POST', body: { name: 'A', phone: '01000000000' } });
  assert.equal(r.status, 409);
});

test('owner setup and the counter code needs the owner', async () => {
  let r = await call('/api/setup', { method: 'POST', body: { businessName: 'Bean', reward: 'Free latte', stampsNeeded: 5, password: 'owner-pass-1' } });
  owner = r.cookie;
  assert.equal(app.data.settings.stampsNeeded, 5);
  r = await call('/api/counter/code', { method: 'POST', body: {} });
  assert.equal(r.status, 401);
  const c = await counterCode();
  assert.match(c.code, /^[A-Z0-9]{6}$/);
  assert.match(c.svg, /^<svg/);
  assert.equal(c.url, `${base}/s/${c.code}`);
});

let mona;
test('join gives a card with welcome stamp; stamping via the counter QR', async () => {
  let r = await call('/api/public/join', { method: 'POST', body: { name: 'Mona', phone: '0100 123 4567' } });
  assert.equal(r.status, 200);
  mona = r.cookie;
  assert.equal(r.body.card.stamps, 1, 'welcome stamp');
  const code = (await counterCode()).code;
  r = await call('/api/public/stamp', { method: 'POST', body: { code }, jar: mona });
  assert.equal(r.status, 200);
  assert.equal(r.body.card.stamps, 2);
  // same code twice: refused
  r = await call('/api/public/stamp', { method: 'POST', body: { code }, jar: mona });
  assert.equal(r.body.error, 'already_used');
  // new code within the cooldown: refused
  r = await call('/api/public/stamp', { method: 'POST', body: { code: (await counterCode()).code }, jar: mona });
  assert.equal(r.body.error, 'cooldown');
  assert.equal(r.body.minutesLeft, 30);
  // no card cookie
  r = await call('/api/public/stamp', { method: 'POST', body: { code } });
  assert.equal(r.status, 401);
});

test('expired codes do not work', async () => {
  const c = await counterCode();
  app.data.codes.find((x) => x.code === c.code).expiresAt = Date.now() - 1;
  app.data.settings.cooldownMinutes = 0;
  const r = await call('/api/public/stamp', { method: 'POST', body: { code: c.code }, jar: mona });
  assert.equal(r.body.error, 'expired');
});

test("another phone cannot take over someone's card by phone number", async () => {
  const r = await call('/api/public/join', { method: 'POST', body: { name: 'Thief', phone: '01001234567' } });
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'phone_exists');
});

test('full card: wrong PIN refused, staff PIN redeems and keeps the remainder', async () => {
  for (let i = 0; i < 4; i++) await call('/api/public/stamp', { method: 'POST', body: { code: (await counterCode()).code }, jar: mona });
  let r = await call('/api/public/info', { jar: mona });
  assert.equal(r.body.card.stamps, 6);
  assert.equal(r.body.card.rewardReady, true);
  r = await call('/api/public/redeem', { method: 'POST', body: { pin: '0000' }, jar: mona });
  assert.equal(r.status, 403);
  r = await call('/api/public/redeem', { method: 'POST', body: { pin: app.data.settings.staffPin }, jar: mona });
  assert.equal(r.status, 200);
  assert.equal(r.body.card.stamps, 1);
  assert.equal(r.body.card.redeemed, 1);
});

test('PIN guessing is rate limited', async () => {
  let last;
  for (let i = 0; i < 9; i++) last = await call('/api/public/redeem', { method: 'POST', body: { pin: '1' }, jar: mona });
  assert.equal(last.status, 429);
});

test('card link restores the card on a new phone', async () => {
  const token = app.data.members[0].token;
  const r = await call('/api/public/card/' + token);
  assert.equal(r.body.card.name, 'Mona');
  assert.match(r.headers.get('set-cookie'), /khatm_card=/);
});

test('owner: search, stamp by hand, stats, CSV', async () => {
  let r = await call('/api/members?q=' + encodeURIComponent('٠١٠٠١٢'), { jar: owner });
  assert.equal(r.body.members.length, 1);
  const id = r.body.members[0].id;
  r = await call(`/api/members/${id}/stamp`, { method: 'POST', body: { count: 3 }, jar: owner });
  assert.equal(r.body.member.stamps, 4);
  r = await call(`/api/members/${id}/stamp`, { method: 'POST', body: { count: -10 }, jar: owner });
  assert.equal(r.body.member.stamps, 0);
  r = await call('/api/stats', { jar: owner });
  assert.equal(r.body.members, 1);
  assert.ok(r.body.stampsToday >= 9);
  assert.equal(r.body.redeemed30, 1);
  const csv = await fetch(base + '/api/members.csv', { headers: { cookie: owner } }).then((x) => x.text());
  assert.match(csv, /"Mona","01001234567"/);
});

test('customer pages and QR images are served', async () => {
  for (const p of ['/join', '/c/abc', '/s/ABC123', '/counter']) assert.equal((await fetch(base + p)).status, 200, p);
  const svg = await fetch(base + '/qr.svg?path=/join').then((x) => x.text());
  assert.match(svg, /^<svg/);
  assert.equal((await fetch(base + '/qr.svg?path=https://evil.test')).status, 400);
});
