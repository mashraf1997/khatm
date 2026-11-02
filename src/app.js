// Khatm server: customer cards, counter QR codes, stamping, rewards, owner dashboard.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { hashPassword, verifyPassword, createSession, checkSession, parseCookies, RateLimiter } from './auth.js';
import { send, readJson, clientIp, originOf, serveStatic, cookie, VERSION } from './http.js';

const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const randCode = (n) => [...crypto.randomBytes(n)].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');

export function defaultData() {
  return {
    version: 1,
    meta: { secret: crypto.randomBytes(32).toString('hex'), createdAt: new Date().toISOString() },
    admin: null,
    settings: {
      businessName: '',
      color: '#7C2D12',
      emoji: '☕',
      stampsNeeded: 8,
      reward: '',
      welcomeStamps: 1,
      cooldownMinutes: 30,
      staffPin: String(crypto.randomInt(1000, 10000)),
      codeTtlSeconds: 90,
      terms: '',
      hookKey: crypto.randomBytes(12).toString('hex'), // secret for /hooks/order (Wakeel, Dukkan)
    },
    processedOrders: [], // order references already stamped
    members: [], // { id, token, name, phone, stamps, totalStamps, redeemed, createdAt, lastStampAt }
    events: [], // { type: join|stamp|redeem|adjust, memberId, count, at, via }
    codes: [], // counter codes: { code, expiresAt, usedBy: [memberId] }
  };
}

export const normPhone = (p) => String(p || '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d+]/g, '').replace(/^00/, '+');

export function createApp({ dataDir, setupToken = process.env.SETUP_TOKEN || '' } = {}) {
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, 'khatm.json');
  const data = fs.existsSync(file) ? { ...defaultData(), ...JSON.parse(fs.readFileSync(file, 'utf8')) } : defaultData();
  data.settings = { ...defaultData().settings, ...data.settings };
  let timer;
  const flush = () => { clearTimeout(timer); fs.writeFileSync(file + '.tmp', JSON.stringify(data)); fs.renameSync(file + '.tmp', file); };
  const save = () => { clearTimeout(timer); timer = setTimeout(flush, 200); };
  flush(); // persists defaults added by upgrades (for example the order hook key)

  const loginLimiter = new RateLimiter(10, 15 * 60_000);
  const joinLimiter = new RateLimiter(20, 60 * 60_000);
  const pinLimiter = new RateLimiter(8, 15 * 60_000);

  const hashFor = (uid) => (uid === 'owner' ? data.admin?.hash : null);
  const isAuthed = (req) => Boolean(checkSession(data.meta.secret, parseCookies(req.headers.cookie).khatm_session, hashFor));
  const cardFromCookie = (req) => {
    const token = parseCookies(req.headers.cookie).khatm_card;
    return token ? data.members.find((m) => m.token === token) || null : null;
  };
  const cardCookie = (req, token) => cookie(req, 'khatm_card', token, 400 * 86400);

  const publicSettings = () => {
    const s = data.settings;
    return { businessName: s.businessName, color: s.color, emoji: s.emoji, stampsNeeded: s.stampsNeeded, reward: s.reward, terms: s.terms, cooldownMinutes: s.cooldownMinutes };
  };
  const cardView = (m) => ({
    name: m.name,
    code: m.id.slice(0, 6).toUpperCase(),
    stamps: m.stamps,
    totalStamps: m.totalStamps,
    redeemed: m.redeemed,
    rewardReady: m.stamps >= data.settings.stampsNeeded,
    lastStampAt: m.lastStampAt,
    url: `/c/${m.token}`,
  });
  const log = (type, member, extra = {}) => {
    data.events.push({ type, memberId: member.id, at: new Date().toISOString(), ...extra });
    if (data.events.length > 50_000) data.events.splice(0, data.events.length - 50_000);
  };

  function addStamps(member, count, via) {
    member.stamps += count;
    member.totalStamps += count;
    member.lastStampAt = new Date().toISOString();
    log('stamp', member, { count, via });
    save();
  }

  function redeem(member, via) {
    const need = data.settings.stampsNeeded;
    if (member.stamps < need) return false;
    member.stamps -= need;
    member.redeemed += 1;
    log('redeem', member, { via });
    save();
    return true;
  }

  function newCounterCode() {
    const now = Date.now();
    data.codes = data.codes.filter((c) => c.expiresAt > now);
    const c = { code: randCode(6), expiresAt: now + data.settings.codeTtlSeconds * 1000, usedBy: [] };
    data.codes.push(c);
    save();
    return c;
  }

  // Stamp via the rotating counter QR, with a per-card cooldown.
  function stampWithCode(member, code) {
    const now = Date.now();
    const c = data.codes.find((x) => x.code === String(code || '').toUpperCase());
    if (!c || c.expiresAt < now) return { ok: false, error: 'expired' };
    if (c.usedBy.includes(member.id)) return { ok: false, error: 'already_used' };
    const cool = data.settings.cooldownMinutes * 60_000;
    if (member.lastStampAt && now - Date.parse(member.lastStampAt) < cool) {
      return { ok: false, error: 'cooldown', minutesLeft: Math.ceil((cool - (now - Date.parse(member.lastStampAt))) / 60_000) };
    }
    c.usedBy.push(member.id);
    addStamps(member, 1, 'counter');
    return { ok: true };
  }

  function stats() {
    const today = new Date().toISOString().slice(0, 10);
    const since30 = Date.now() - 30 * 864e5;
    const ev = data.events;
    const days = [...Array(14)].map((_, i) => new Date(Date.now() - (13 - i) * 864e5).toISOString().slice(0, 10));
    const perDay = Object.fromEntries(days.map((d) => [d, 0]));
    for (const e of ev) if (e.type === 'stamp' && e.at.slice(0, 10) in perDay) perDay[e.at.slice(0, 10)] += e.count || 1;
    const visitors30 = new Set(ev.filter((e) => e.type === 'stamp' && Date.parse(e.at) >= since30).map((e) => e.memberId));
    const returning = data.members.filter((m) => m.totalStamps >= 2).length;
    return {
      members: data.members.length,
      newToday: ev.filter((e) => e.type === 'join' && e.at.startsWith(today)).length,
      stampsToday: ev.filter((e) => e.type === 'stamp' && e.at.startsWith(today)).reduce((s, e) => s + (e.count || 1), 0),
      redeemed30: ev.filter((e) => e.type === 'redeem' && Date.parse(e.at) >= since30).length,
      active30: visitors30.size,
      returningRate: data.members.length ? Math.round((returning / data.members.length) * 100) : 0,
      rewardsReady: data.members.filter((m) => m.stamps >= data.settings.stampsNeeded).length,
      perDay: days.map((d) => ({ day: d, count: perDay[d] })),
    };
  }

  async function route(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    const method = req.method;
    let m;

    if (p === '/health') return send(res, 200, { ok: true, version: VERSION });

    // Orders from Wakeel or Dukkan give the customer a stamp automatically.
    if (p === '/hooks/order' && method === 'POST') {
      const key = url.searchParams.get('key') || '';
      const a = Buffer.from(key);
      const b = Buffer.from(data.settings.hookKey);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return send(res, 403, { error: 'bad_key' });
      const body = await readJson(req);
      const order = body.request || body.order || body;
      if (body.event && !/order/.test(body.event)) return send(res, 200, { stamped: false, reason: 'not_an_order' });
      const ref = String(order.id || order.no || order.reference || '');
      const phone = normPhone(order.phone || order.customer?.phone || '');
      if (ref && data.processedOrders.includes(ref)) return send(res, 200, { stamped: false, reason: 'duplicate' });
      const tail = phone.replace(/\D/g, '').slice(-9);
      const member = tail.length >= 7 ? data.members.find((m) => m.phone.replace(/\D/g, '').slice(-9) === tail) : null;
      if (!member) return send(res, 200, { stamped: false, reason: 'no_card' });
      if (ref) {
        data.processedOrders.push(ref);
        if (data.processedOrders.length > 5000) data.processedOrders.splice(0, 1000);
      }
      addStamps(member, 1, 'order');
      return send(res, 200, { stamped: true, stamps: member.stamps });
    }

    // ---------- customer pages ----------
    if (method === 'GET' && (p === '/join' || /^\/c\/[\w-]+$/.test(p) || /^\/s\/[A-Z0-9]+$/i.test(p))) return serveStatic(res, 'card.html');
    if (method === 'GET' && p === '/counter') return serveStatic(res, 'counter.html');
    if (method === 'GET' && p === '/manifest.webmanifest') {
      const s = data.settings;
      return send(res, 200, JSON.stringify({ name: `${s.businessName || 'Khatm'} card`, short_name: s.businessName || 'Khatm', start_url: '/join', display: 'standalone', background_color: '#ffffff', theme_color: s.color, icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }] }), { 'content-type': 'application/manifest+json' });
    }
    if (method === 'GET' && p === '/qr.svg') {
      // QR for any path on this site (join poster, card code). Only same-site links.
      const target = String(url.searchParams.get('path') || '/join');
      if (!/^\/[\w\-/?=&.]*$/.test(target)) return send(res, 400, 'Bad path');
      const svg = await QRCode.toString(originOf(req) + target, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#ffffff' } });
      return send(res, 200, svg, { 'content-type': 'image/svg+xml', 'cache-control': 'no-store' });
    }

    // ---------- public API ----------
    if (p === '/api/public/info' && method === 'GET') {
      const me = cardFromCookie(req);
      return send(res, 200, { settings: publicSettings(), card: me ? cardView(me) : null, ready: Boolean(data.admin) });
    }
    if (p === '/api/public/join' && method === 'POST') {
      if (!data.admin) return send(res, 409, { error: 'not_ready' });
      if (!joinLimiter.allow(clientIp(req))) return send(res, 429, { error: 'Too many sign-ups from this network, try later' });
      const body = await readJson(req);
      const name = String(body.name || '').trim().slice(0, 60);
      const phone = normPhone(body.phone);
      if (!name || phone.replace(/\D/g, '').length < 7) return send(res, 400, { error: 'name_phone_required' });
      let member = data.members.find((x) => x.phone === phone);
      if (!member) {
        member = { id: crypto.randomUUID(), token: crypto.randomBytes(18).toString('base64url'), name, phone, stamps: 0, totalStamps: 0, redeemed: 0, createdAt: new Date().toISOString(), lastStampAt: null };
        data.members.push(member);
        log('join', member);
        if (data.settings.welcomeStamps > 0) {
          member.stamps = member.totalStamps = Number(data.settings.welcomeStamps);
          log('stamp', member, { count: member.stamps, via: 'welcome' });
        }
        save();
      } else if (member.token !== parseCookies(req.headers.cookie).khatm_card) {
        // Same phone on a new device: do not hand over someone's card by phone number alone.
        return send(res, 409, { error: 'phone_exists' });
      }
      return send(res, 200, { card: cardView(member) }, { 'set-cookie': cardCookie(req, member.token) });
    }
    if ((m = p.match(/^\/api\/public\/card\/([\w-]+)$/)) && method === 'GET') {
      const member = data.members.find((x) => x.token === m[1]);
      if (!member) return send(res, 404, { error: 'not_found' });
      // Opening your card link on a new phone remembers it there too.
      return send(res, 200, { settings: publicSettings(), card: cardView(member) }, { 'set-cookie': cardCookie(req, member.token) });
    }
    if (p === '/api/public/stamp' && method === 'POST') {
      const member = cardFromCookie(req);
      if (!member) return send(res, 401, { error: 'no_card' });
      const body = await readJson(req);
      const r = stampWithCode(member, body.code);
      return send(res, r.ok ? 200 : 400, { ...r, card: cardView(member) });
    }
    if (p === '/api/public/redeem' && method === 'POST') {
      const member = cardFromCookie(req);
      if (!member) return send(res, 401, { error: 'no_card' });
      if (!pinLimiter.allow(member.id + clientIp(req))) return send(res, 429, { error: 'too_many' });
      const body = await readJson(req);
      if (String(body.pin || '') !== data.settings.staffPin) return send(res, 403, { error: 'wrong_pin' });
      if (!redeem(member, 'pin')) return send(res, 400, { error: 'not_enough' });
      return send(res, 200, { ok: true, card: cardView(member) });
    }

    // ---------- owner auth ----------
    if (p === '/api/session' && method === 'GET') return send(res, 200, { needsSetup: !data.admin, authed: isAuthed(req), setupTokenRequired: Boolean(setupToken), version: VERSION });
    if (p === '/api/setup' && method === 'POST') {
      if (data.admin) return send(res, 409, { error: 'Already set up' });
      const body = await readJson(req);
      if (setupToken && body.setupToken !== setupToken) return send(res, 403, { error: 'Wrong setup token' });
      if (String(body.password || '').length < 8) return send(res, 400, { error: 'Password must be at least 8 characters' });
      data.admin = hashPassword(String(body.password));
      Object.assign(data.settings, {
        businessName: String(body.businessName || '').slice(0, 80),
        reward: String(body.reward || (body.lang === 'en' ? 'A free drink' : 'مشروب مجاني')).slice(0, 120),
        stampsNeeded: Math.min(20, Math.max(3, Number(body.stampsNeeded) || 8)),
      });
      flush();
      return send(res, 200, { ok: true }, { 'set-cookie': cookie(req, 'khatm_session', createSession(data.meta.secret, data.admin.hash), 30 * 86400) });
    }
    if (p === '/api/login' && method === 'POST') {
      if (!loginLimiter.allow(clientIp(req))) return send(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
      const body = await readJson(req);
      if (!verifyPassword(String(body.password || ''), data.admin)) return send(res, 401, { error: 'Wrong password' });
      return send(res, 200, { ok: true }, { 'set-cookie': cookie(req, 'khatm_session', createSession(data.meta.secret, data.admin.hash), 30 * 86400) });
    }
    if (p === '/api/logout' && method === 'POST') return send(res, 200, { ok: true }, { 'set-cookie': cookie(req, 'khatm_session', '', 0) });

    // ---------- owner API ----------
    if (p.startsWith('/api/')) {
      if (!isAuthed(req)) return send(res, 401, { error: 'Not signed in' });
      if (method !== 'GET' && !(req.headers['content-type'] || '').includes('application/json')) return send(res, 415, { error: 'Send JSON' });

      if (p === '/api/stats' && method === 'GET') return send(res, 200, stats());
      if (p === '/api/counter/code' && method === 'POST') {
        const c = newCounterCode();
        return send(res, 200, { code: c.code, url: `${originOf(req)}/s/${c.code}`, expiresAt: new Date(c.expiresAt).toISOString(), svg: await QRCode.toString(`${originOf(req)}/s/${c.code}`, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }) });
      }
      if (p === '/api/members' && method === 'GET') {
        const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
        const qPhone = normPhone(q);
        let list = data.members;
        if (q) list = list.filter((x) => x.name.toLowerCase().includes(q) || (qPhone.length >= 3 && x.phone.includes(qPhone)) || x.id.slice(0, 6).toLowerCase() === q);
        list = [...list].sort((a, b) => String(b.lastStampAt || b.createdAt).localeCompare(String(a.lastStampAt || a.createdAt)));
        return send(res, 200, { members: list.slice(0, 200).map((x) => ({ id: x.id, name: x.name, phone: x.phone, ...cardView(x), createdAt: x.createdAt })), total: list.length });
      }
      if ((m = p.match(/^\/api\/members\/([\w-]+)\/(stamp|redeem)$/)) && method === 'POST') {
        const member = data.members.find((x) => x.id === m[1]);
        if (!member) return send(res, 404, { error: 'Member not found' });
        const body = await readJson(req);
        if (m[2] === 'stamp') {
          const n = Math.trunc(Number(body.count) || 1);
          if (n === 0 || Math.abs(n) > 20) return send(res, 400, { error: 'Use a number from -20 to 20' });
          if (n > 0) addStamps(member, n, 'staff');
          else {
            member.stamps = Math.max(0, member.stamps + n);
            log('adjust', member, { count: n });
            save();
          }
        } else if (!redeem(member, 'staff')) return send(res, 400, { error: 'Not enough stamps yet' });
        return send(res, 200, { member: { id: member.id, name: member.name, phone: member.phone, ...cardView(member) } });
      }
      if ((m = p.match(/^\/api\/members\/([\w-]+)$/)) && method === 'DELETE') {
        data.members = data.members.filter((x) => x.id !== m[1]);
        save();
        return send(res, 200, { ok: true });
      }
      if (p === '/api/members.csv' && method === 'GET') {
        const rows = [['name', 'phone', 'stamps', 'total_stamps', 'rewards_redeemed', 'joined', 'last_visit']].concat(
          data.members.map((x) => [x.name, x.phone, x.stamps, x.totalStamps, x.redeemed, x.createdAt, x.lastStampAt || '']),
        );
        const csv = '﻿' + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        return send(res, 200, csv, { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="khatm-members.csv"' });
      }
      if (p === '/api/settings' && method === 'GET') return send(res, 200, { settings: data.settings });
      if (p === '/api/settings' && method === 'PUT') {
        const body = await readJson(req);
        const s = data.settings;
        const b = body.settings || {};
        if (typeof b.businessName === 'string') s.businessName = b.businessName.slice(0, 80);
        if (typeof b.reward === 'string') s.reward = b.reward.slice(0, 120);
        if (typeof b.terms === 'string') s.terms = b.terms.slice(0, 500);
        if (/^#[0-9a-f]{6}$/i.test(b.color || '')) s.color = b.color;
        if (typeof b.emoji === 'string' && b.emoji.trim()) s.emoji = [...b.emoji.trim()].slice(0, 2).join('');
        if (b.stampsNeeded != null) s.stampsNeeded = Math.min(20, Math.max(3, Number(b.stampsNeeded) || 8));
        if (b.welcomeStamps != null) s.welcomeStamps = Math.min(5, Math.max(0, Number(b.welcomeStamps) || 0));
        if (b.cooldownMinutes != null) s.cooldownMinutes = Math.min(1440, Math.max(0, Number(b.cooldownMinutes) || 0));
        if (/^\d{4,6}$/.test(String(b.staffPin || ''))) s.staffPin = String(b.staffPin);
        save();
        return send(res, 200, { settings: s });
      }
      if (p === '/api/password' && method === 'POST') {
        const body = await readJson(req);
        if (!verifyPassword(String(body.current || ''), data.admin)) return send(res, 401, { error: 'Current password is wrong' });
        if (String(body.next || '').length < 8) return send(res, 400, { error: 'New password must be at least 8 characters' });
        data.admin = hashPassword(String(body.next));
        flush();
        return send(res, 200, { ok: true }, { 'set-cookie': cookie(req, 'khatm_session', createSession(data.meta.secret, data.admin.hash), 30 * 86400) });
      }
      return send(res, 404, { error: 'Not found' });
    }

    if (method === 'GET') {
      if (p === '/' || p === '/index.html') return serveStatic(res, 'index.html');
      if (/^\/[\w.-]+\.(js|css|svg|png|ico)$/.test(p)) return serveStatic(res, p.slice(1));
    }
    return send(res, 404, 'Not found');
  }

  const server = http.createServer((req, res) => {
    route(req, res).catch((err) => {
      const status = err.status || 500;
      if (status === 500) console.error('[http]', err);
      if (!res.headersSent) send(res, status, { error: status === 500 ? 'Internal error' : err.message });
    });
  });

  return {
    server,
    data,
    async start(port) {
      await new Promise((r) => server.listen(port, r));
      return server.address().port;
    },
    async stop() {
      flush();
      await new Promise((r) => server.close(r));
    },
  };
}
