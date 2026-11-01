/* Customer side: join, view card, collect a stamp from the counter QR, redeem with staff PIN. */
(function () {
  'use strict';
  const ar = !/^en\b/i.test(navigator.language || '') || /[؀-ۿ]/.test(document.title);
  const L = (a, e) => (ar ? a : e);
  document.documentElement.lang = ar ? 'ar' : 'en';
  document.documentElement.dir = ar ? 'rtl' : 'ltr';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const app = $('#app');
  const path = location.pathname;
  let S = null; // settings

  async function api(p, body) {
    const res = await fetch(p, { method: body ? 'POST' : 'GET', headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  const ERR = {
    expired: L('الكود ده خلص. امسح الكود اللي على الشاشة دلوقتي.', 'This code expired. Scan the one on the screen now.'),
    already_used: L('خدت الختم بتاع الكود ده خلاص 👍', 'You already got a stamp from this code 👍'),
    cooldown: L('خدت ختم من شوية. تقدر تاخد الجاي بعد {m} دقيقة.', 'You just got a stamp. Next one in {m} min.'),
    wrong_pin: L('الرقم السري غلط', 'Wrong PIN'),
    not_enough: L('لسه مكملتش الأختام', 'Not enough stamps yet'),
    too_many: L('محاولات كتير، استنى شوية', 'Too many tries, wait a bit'),
    name_phone_required: L('اكتب اسمك ورقم موبايلك', 'Enter your name and phone number'),
    phone_exists: L('الرقم ده عنده كارت بالفعل. اطلب من الكاشير يبعتلك رابط الكارت.', 'This number already has a card. Ask the staff to show you your card link.'),
  };

  function header() {
    return `<div class="head"><div class="logo">${esc(S.emoji)}</div><h1>${esc(S.businessName || L('كارت الولاء', 'Loyalty card'))}</h1>
      <div class="muted">${esc(L(`جمّع ${S.stampsNeeded} أختام وخد ${S.reward}`, `Collect ${S.stampsNeeded} stamps, get ${S.reward}`))}</div></div>`;
  }

  function renderCard(card, note) {
    document.documentElement.style.setProperty('--c', S.color);
    const need = S.stampsNeeded;
    const shown = Math.min(card.stamps, need);
    const stamps = [...Array(need)].map((_, i) => `<div class="stamp ${i < shown ? 'on' : ''} ${i === need - 1 ? 'gift' : ''}" style="animation-delay:${i * 40}ms">${i < shown ? esc(S.emoji) : i === need - 1 ? '🎁' : ''}</div>`).join('');
    app.innerHTML = `${header()}
      ${note || ''}
      <section class="card loyalty"><div class="row"><b>${esc(card.name)}</b><span class="code" dir="ltr">#${esc(card.code)}</span></div>
        <div class="stamps">${stamps}</div>
        <div class="row"><span>${card.stamps} / ${need}</span><span class="muted">${esc(L(`${card.redeemed} مكافأة قبل كده`, `${card.redeemed} rewards so far`))}</span></div></section>
      ${card.rewardReady ? `<section class="card"><div class="big">🎁</div><b style="text-align:center">${esc(L(`مبروك! ${S.reward} عليك`, `Congrats! Your ${S.reward} is ready`))}</b>
        <p class="muted" style="text-align:center;margin:0">${esc(L('ورّي الشاشة دي للكاشير عشان يكتب الرقم السري', 'Show this screen to staff to enter their PIN'))}</p>
        <form id="rf" class="card" style="padding:0;border:0;box-shadow:none"><label>${esc(L('رقم الكاشير السري', 'Staff PIN'))}<input id="pin" inputmode="numeric" autocomplete="off" maxlength="6"></label><button type="submit">${esc(L('استلم المكافأة', 'Redeem reward'))}</button></form></section>`
      : `<p class="muted" style="text-align:center">${esc(L('مع كل زيارة امسح الكود اللي عند الكاشير بكاميرا الموبايل.', 'On every visit, scan the code at the counter with your phone camera.'))}</p>`}
      <section class="card"><b>${esc(L('احفظ الكارت', 'Keep your card'))}</b>
        <span class="muted">${esc(L('ضيف الصفحة دي للشاشة الرئيسية من قائمة المتصفح، أو احفظ الرابط ده:', 'Add this page to your home screen from the browser menu, or save this link:'))}</span>
        <span class="code" style="word-break:break-all;font-size:.8rem">${esc(location.origin + card.url)}</span></section>
      ${S.terms ? `<p class="foot muted">${esc(S.terms)}</p>` : ''}
      <p class="foot"><a href="https://github.com/mashraf1997/khatm" target="_blank" rel="noopener">Khatm</a></p>`;
    if (location.pathname !== card.url) history.replaceState(null, '', card.url);
    const rf = $('#rf');
    if (rf) rf.onsubmit = async (e) => {
      e.preventDefault();
      const r = await api('/api/public/redeem', { pin: $('#pin').value });
      if (r.ok) renderCard(r.data.card, `<div class="msg good">${esc(L('تم! استمتع بالمكافأة 🎉', 'Done! Enjoy your reward 🎉'))}</div>`);
      else renderCard(card, `<div class="msg bad">${esc(ERR[r.data.error] || r.data.error)}</div>`);
    };
  }

  function renderJoin(next) {
    document.documentElement.style.setProperty('--c', S.color);
    app.innerHTML = `${header()}
      <form class="card" id="jf"><b>${esc(L('اعمل كارتك في 10 ثواني', 'Get your card in 10 seconds'))}</b>
        <label>${esc(L('الاسم', 'Name'))}<input id="nm" autocomplete="given-name" required></label>
        <label>${esc(L('رقم الموبايل', 'Phone number'))}<input id="ph" type="tel" inputmode="tel" autocomplete="tel" required dir="ltr"></label>
        <div id="err"></div>
        <button type="submit">${esc(L('ابدأ الكارت', 'Start my card'))}</button>
        ${S.welcomeStamps ? '' : ''}</form>`;
    $('#jf').onsubmit = async (e) => {
      e.preventDefault();
      const r = await api('/api/public/join', { name: $('#nm').value, phone: $('#ph').value });
      if (!r.ok) { $('#err').innerHTML = `<div class="msg bad">${esc(ERR[r.data.error] || r.data.error)}</div>`; return; }
      if (next) return collect(next);
      renderCard(r.data.card, `<div class="msg good">${esc(L('أهلاً بيك! ده كارتك 🎉', 'Welcome! Here is your card 🎉'))}</div>`);
    };
  }

  async function collect(code) {
    const r = await api('/api/public/stamp', { code });
    if (r.status === 401) return renderJoin(code);
    const note = r.ok ? `<div class="msg good">${esc(L('ختم جديد! ✅', 'New stamp! ✅'))}</div>` : `<div class="msg bad">${esc((ERR[r.data.error] || r.data.error).replace('{m}', r.data.minutesLeft))}</div>`;
    renderCard(r.data.card, note);
  }

  async function boot() {
    const info = await api('/api/public/info');
    S = info.data.settings;
    if (!info.data.ready) { app.innerHTML = `<p class="muted">${esc(L('الكارت لسه ماتجهزش.', 'The card is not set up yet.'))}</p>`; return; }
    let m;
    if ((m = path.match(/^\/c\/([\w-]+)$/))) {
      const r = await api('/api/public/card/' + m[1]);
      if (!r.ok) return renderJoin();
      S = r.data.settings;
      return renderCard(r.data.card);
    }
    if ((m = path.match(/^\/s\/([A-Za-z0-9]+)$/))) return info.data.card ? collect(m[1]) : renderJoin(m[1]);
    if (info.data.card) return renderCard(info.data.card);
    renderJoin();
  }
  boot();
})();
