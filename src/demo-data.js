import crypto from 'node:crypto';
import { defaultData } from './app.js';
import { daysAgo } from './demo-mode.js';

export function buildDemo(demo) {
  const d = defaultData();
  const ar = demo.lang === 'ar';
  Object.assign(d.settings, { businessName: ar ? 'بين كافيه' : 'Bean Café', reward: ar ? 'لاتيه مجاناً' : 'A free latte', stampsNeeded: 8, staffPin: '1234', cooldownMinutes: 0 });
  const names = ar ? ['منى أحمد', 'كريم عادل', 'سارة محمود', 'يوسف علي', 'نور حسن', 'هدى سمير', 'عمر خالد', 'ليلى طارق', 'آدم فؤاد', 'جنى وليد'] : ['Mona', 'Karim', 'Sara', 'Youssef', 'Nour', 'Hoda', 'Omar', 'Layla', 'Adam', 'Jana'];
  names.forEach((name, i) => {
    const m = { id: crypto.randomUUID(), token: 'demo-card-' + i, name, phone: '0100' + String(2000000 + i), stamps: [3, 8, 5, 1, 6, 2, 7, 4, 0, 6][i], totalStamps: 6 + i * 3, redeemed: i % 3, createdAt: daysAgo(30 - i), lastStampAt: daysAgo(i % 5, 9 + i) };
    d.members.push(m);
    d.events.push({ type: 'join', memberId: m.id, at: m.createdAt });
    for (let k = 0; k < 14; k++) if ((i + k) % 3 === 0) d.events.push({ type: 'stamp', memberId: m.id, count: 1, at: daysAgo(k, 10 + (i % 8)), via: 'counter' });
  });
  return d;
}
