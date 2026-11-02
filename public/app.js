/* Khatm owner dashboard */
(function () {
  'use strict';
  const STR = {
    ar: {
      overview: 'الرئيسية', members: 'العملاء', settings: 'الإعدادات', counter: 'شاشة الكاشير ↗', logout: 'خروج', lang: 'English',
      setupTitle: 'أهلاً بيك في ختم', setupLead: 'كارت ولاء ديجيتال: العميل يمسح كود عند الكاشير ويجمّع أختام على موبايله.', biz: 'اسم المحل', reward: 'المكافأة', rewardPh: 'مثلاً: مشروب مجاني', need: 'عدد الأختام للمكافأة', password: 'كلمة السر', pwHint: '8 حروف على الأقل', start: 'ابدأ', loginTitle: 'تسجيل الدخول', login: 'دخول',
      lead: 'آخر 14 يوم.', membersN: 'عميل', newToday: 'جديد النهارده', stampsToday: 'أختام النهارده', redeemed30: 'مكافآت آخر 30 يوم', active30: 'رجعوا آخر 30 يوم', returning: 'نسبة العملاء اللي رجعوا', ready: 'مكافآت جاهزة', perDay: 'الأختام يومياً',
      howTitle: 'إزاي تبدأ', how: ['اطبع بوستر الانضمام وحطه على الكاشير أو الترابيزات', 'افتح «شاشة الكاشير» على تابلت أو موبايل جنب الكاشير', 'مع كل طلب، العميل يمسح الكود اللي على الشاشة ياخد ختم', 'لما يكمّل، يوريك الموبايل وتكتب الرقم السري بتاعك'],
      poster: 'بوستر الانضمام', print: 'اطبع', posterLine: 'امسح الكود واعمل كارتك', staffPin: 'رقم الكاشير السري',
      search: 'دوّر بالاسم أو الرقم', stamps: 'الأختام', total: 'الإجمالي', rewards: 'مكافآت', lastVisit: 'آخر زيارة', joined: 'انضم', add: '+1', remove: '-1', redeem: 'استلم مكافأة', link: 'رابط الكارت', del: 'حذف', export: 'تصدير CSV', noMembers: 'لسه مفيش عملاء. اطبع البوستر وابدأ!', cardQr: 'خلّي العميل يمسح الكود ده عشان يفتح كارته',
      program: 'برنامج الولاء', welcome: 'أختام هدية عند الانضمام', cooldown: 'أقل وقت بين ختمين (دقيقة)', look: 'شكل الكارت', color: 'اللون', emoji: 'الإيموجي', terms: 'الشروط (اختياري)', save: 'حفظ', saved: 'اتحفظ ✓', pinHint: '4 لـ 6 أرقام. الكاشير بيكتبه على موبايل العميل عشان يسلّمه المكافأة.',
      pwTitle: 'تغيير كلمة السر', current: 'الحالية', next: 'الجديدة', change: 'تغيير', close: 'إغلاق', ago: 'من',
      hookTitle: 'ختم تلقائي مع كل طلب', hookLead: 'حط الرابط ده في إشعارات Wakeel (Webhook) أو في Dukkan، وكل عميل عنده كارت هياخد ختم أول ما يطلب أونلاين.', copy: 'نسخ', copied: 'اتنسخ ✓',
    },
    en: {
      overview: 'Home', members: 'Customers', settings: 'Settings', counter: 'Counter screen ↗', logout: 'Sign out', lang: 'العربية',
      setupTitle: 'Welcome to Khatm', setupLead: 'A digital stamp card: customers scan a code at the counter and collect stamps on their phone.', biz: 'Business name', reward: 'Reward', rewardPh: 'e.g. A free drink', need: 'Stamps for the reward', password: 'Password', pwHint: 'At least 8 characters', start: 'Get started', loginTitle: 'Sign in', login: 'Sign in',
      lead: 'Last 14 days.', membersN: 'customers', newToday: 'New today', stampsToday: 'Stamps today', redeemed30: 'Rewards, last 30 days', active30: 'Came back, last 30 days', returning: 'Customers who came back', ready: 'Rewards ready', perDay: 'Stamps per day',
      howTitle: 'How to start', how: ['Print the join poster and put it at the counter or on tables', 'Open the “Counter screen” on a tablet or phone by the till', 'With each order, the customer scans the code on the screen to get a stamp', 'When the card is full, they show their phone and you enter your PIN'],
      poster: 'Join poster', print: 'Print', posterLine: 'Scan to get your card', staffPin: 'Staff PIN',
      search: 'Search name or phone', stamps: 'Stamps', total: 'Total', rewards: 'Rewards', lastVisit: 'Last visit', joined: 'Joined', add: '+1', remove: '-1', redeem: 'Redeem reward', link: 'Card link', del: 'Delete', export: 'Export CSV', noMembers: 'No customers yet. Print the poster and start!', cardQr: 'Let the customer scan this to open their card',
      program: 'Loyalty program', welcome: 'Welcome stamps on sign-up', cooldown: 'Minimum minutes between stamps', look: 'Card look', color: 'Color', emoji: 'Emoji', terms: 'Terms (optional)', save: 'Save', saved: 'Saved ✓', pinHint: '4 to 6 digits. Staff type it on the customer’s phone to hand over the reward.',
      pwTitle: 'Change password', current: 'Current', next: 'New', change: 'Change', close: 'Close', ago: 'ago',
      hookTitle: 'Automatic stamp with every order', hookLead: 'Paste this URL in Wakeel notifications (webhook) or in Dukkan. Customers with a card get a stamp when they order online.', copy: 'Copy', copied: 'Copied ✓',
    },
  };
  const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };
  let lang = get('khatm_lang') || 'ar';
  const t = (k) => STR[lang][k] ?? k;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const app = $('#app');
  let session = null, settings = null, q = '';
  async function api(p, opts = {}) {
    const res = await fetch(p, { method: opts.method || 'GET', headers: opts.body !== undefined ? { 'content-type': 'application/json' } : {}, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && p !== '/api/login' && p !== '/api/password') { boot(); throw new Error(data.error); }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }
  const toast = (m) => { const el = $('#toast'); el.textContent = m; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2400); };
  const when = (iso) => (iso ? new Date(iso).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

  async function boot() {
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    session = await api('/api/session').catch(() => ({}));
    if (session.needsSetup) return auth(true);
    if (!session.authed) return auth(false);
    settings = (await api('/api/settings')).settings;
    shell(); route();
  }
  function auth(setup) {
    app.innerHTML = `<div class="auth"><form class="card" id="f"><div class="brand"><img src="favicon.svg" alt="">Khatm <span class="muted small">ختم</span></div>
      <h1>${setup ? t('setupTitle') : t('loginTitle')}</h1>${setup ? `<p class="muted">${t('setupLead')}</p>
      <label class="field" for="b">${t('biz')}<input type="text" id="b"></label>
      <div class="grid2"><label class="field" for="r">${t('reward')}<input type="text" id="r" placeholder="${t('rewardPh')}"></label><label class="field" for="n">${t('need')}<input type="number" id="n" value="8" min="3" max="20"></label></div>` : ''}
      <label class="field" for="pw">${t('password')} ${setup ? `<span class="hint">${t('pwHint')}</span>` : ''}<input type="password" id="pw"></label>
      ${setup && session.setupTokenRequired ? `<label class="field" for="st">Setup token<input type="password" id="st" class="ltr"></label>` : ''}
      <div class="err" id="err"></div><div class="row"><button class="btn primary" type="submit">${setup ? t('start') : t('login')}</button><span class="spacer"></span><button class="btn sm" type="button" id="lb">${t('lang')}</button></div></form></div>`;
    $('#lb').onclick = () => { lang = lang === 'ar' ? 'en' : 'ar'; set('khatm_lang', lang); boot(); };
    $('#f').onsubmit = async (e) => {
      e.preventDefault();
      try {
        if (setup) await api('/api/setup', { method: 'POST', body: { businessName: $('#b').value, reward: $('#r').value, stampsNeeded: $('#n').value, password: $('#pw').value, lang, setupToken: $('#st')?.value } });
        else await api('/api/login', { method: 'POST', body: { password: $('#pw').value } });
        location.hash = '#overview'; boot();
      } catch (err) { $('#err').textContent = err.message; }
    };
  }
  const PAGES = ['overview', 'members', 'settings'];
  function shell() {
    const nav = PAGES.map((p) => `<a class="nav" href="#${p}" data-page="${p}">${t(p)}</a>`).join('') + `<a class="nav" href="/counter" target="_blank" rel="noopener">${t('counter')}</a>`;
    app.innerHTML = `<div class="shell"><nav class="rail no-print"><div class="brand"><img src="favicon.svg" alt="">Khatm</div>${nav}
      <div class="rail-foot"><button class="nav" id="lb" type="button">${t('lang')}</button><button class="nav" id="lo" type="button">${t('logout')}</button></div></nav>
      <nav class="mobile-nav no-print">${nav}</nav><main class="main" id="main"></main></div>`;
    $('#lb').onclick = () => { lang = lang === 'ar' ? 'en' : 'ar'; set('khatm_lang', lang); boot(); };
    $('#lo').onclick = async () => { await api('/api/logout', { method: 'POST', body: {} }); boot(); };
  }
  const page = () => (PAGES.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview');
  function route() {
    $$('.nav[data-page]').forEach((a) => a.setAttribute('aria-current', a.dataset.page === page() ? 'page' : 'false'));
    ({ overview: pOverview, members: pMembers, settings: pSettings }[page()])($('#main'));
  }
  window.addEventListener('hashchange', () => session?.authed && route());

  async function pOverview(main) {
    const s = await api('/api/stats');
    const max = Math.max(1, ...s.perDay.map((d) => d.count));
    main.innerHTML = `<div class="page">
      <div class="page-head"><div><h1>${esc(settings.businessName || 'Khatm')}</h1><p>${t('lead')}</p></div><a class="btn primary no-print" href="/counter" target="_blank" rel="noopener">${t('counter')}</a></div>
      <div class="grid4 no-print">
        <div class="card stat"><b>${s.members}</b><span>${t('membersN')} · +${s.newToday} ${t('newToday')}</span></div>
        <div class="card stat"><b>${s.stampsToday}</b><span>${t('stampsToday')}</span></div>
        <div class="card stat"><b>${s.active30}</b><span>${t('active30')}</span></div>
        <div class="card stat"><b>${s.returningRate}%</b><span>${t('returning')}</span></div>
      </div>
      <div class="grid2">
        <section class="card no-print"><h2>${t('perDay')}</h2>
          <div class="bars" style="grid-template-columns:repeat(14,1fr)">${s.perDay.map((d, i) => `<div class="bar ${i === 13 ? 'today' : ''}"><small>${d.count || ''}</small><i style="height:${Math.max(2, Math.round((d.count / max) * 110))}px"></i></div>`).join('')}</div>
          <div class="row small muted"><span>${t('redeemed30')}: <b>${s.redeemed30}</b></span><span>${t('ready')}: <b>${s.rewardsReady}</b></span></div>
        </section>
        <section class="card poster"><h2>${t('poster')}</h2>
          <div class="print-only" style="font-size:3rem">${esc(settings.emoji)}</div>
          <h2 class="print-only">${esc(settings.businessName)}</h2>
          <img src="/qr.svg?path=/join" alt="QR">
          <b>${t('posterLine')}</b><span class="muted">${esc(lang === 'ar' ? `جمّع ${settings.stampsNeeded} أختام وخد ${settings.reward}` : `Collect ${settings.stampsNeeded} stamps, get ${settings.reward}`)}</span>
          <button class="btn no-print" id="pr" type="button">${t('print')}</button></section>
      </div>
      <section class="card no-print"><h2>${t('howTitle')}</h2><ol class="checklist">${t('how').map((x, i) => `<li><span class="check">${i + 1}</span><span>${esc(x)}</span></li>`).join('')}</ol>
        <p class="small muted">${t('staffPin')}: <b class="mono">${esc(settings.staffPin)}</b></p></section>
    </div>`;
    $('#pr').onclick = () => window.print();
  }

  async function pMembers(main) {
    const { members, total } = await api('/api/members?q=' + encodeURIComponent(q));
    const need = settings.stampsNeeded;
    main.innerHTML = `<div class="page">
      <div class="page-head"><h1>${t('members')} <span class="muted small">(${total})</span></h1><div class="row"><input type="text" id="q" value="${esc(q)}" placeholder="${t('search')}" aria-label="${t('search')}" style="width:240px"><a class="btn" href="/api/members.csv">${t('export')}</a></div></div>
      ${members.length ? `<div class="table-wrap"><table><thead><tr><th>${t('members')}</th><th>${t('stamps')}</th><th>${t('total')}</th><th>${t('rewards')}</th><th>${t('lastVisit')}</th><th></th></tr></thead><tbody>
      ${members.map((x) => `<tr>
        <td><b>${esc(x.name)}</b><br><span class="mono small muted" dir="ltr">${esc(x.phone)}</span> <span class="mono small muted">#${esc(x.code)}</span></td>
        <td><span class="mini-stamps">${[...Array(need)].map((_, i) => `<i class="${i < x.stamps ? 'on' : ''}"></i>`).join('')}</span> <span class="small">${x.stamps}/${need}</span>${x.rewardReady ? ' <span class="pill good">🎁</span>' : ''}</td>
        <td class="num">${x.totalStamps}</td><td class="num">${x.redeemed}</td><td class="small">${when(x.lastStampAt)}</td>
        <td><div class="row" style="gap:6px"><button class="btn sm primary" data-a="stamp" data-n="1" data-id="${x.id}">${t('add')}</button><button class="btn sm" data-a="stamp" data-n="-1" data-id="${x.id}">${t('remove')}</button>
          ${x.rewardReady ? `<button class="btn sm" data-a="redeem" data-id="${x.id}">${t('redeem')}</button>` : ''}<button class="btn sm" data-qr="${esc(x.url)}">${t('link')}</button><button class="btn sm danger" data-del="${x.id}">${t('del')}</button></div></td></tr>`).join('')}
      </tbody></table></div>` : `<div class="card empty">${t('noMembers')}</div>`}</div>`;
    let tmr;
    $('#q').oninput = () => { clearTimeout(tmr); tmr = setTimeout(() => { q = $('#q').value; pMembers(main).then(() => { const i = $('#q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }); }, 300); };
    $$('[data-a]', main).forEach((b) => (b.onclick = async () => {
      try { await api(`/api/members/${b.dataset.id}/${b.dataset.a}`, { method: 'POST', body: { count: Number(b.dataset.n || 1) } }); pMembers(main); } catch (err) { toast(err.message); }
    }));
    $$('[data-del]', main).forEach((b) => (b.onclick = async () => { await api(`/api/members/${b.dataset.del}`, { method: 'DELETE', body: {} }); pMembers(main); }));
    $$('[data-qr]', main).forEach((b) => (b.onclick = () => {
      const d = document.createElement('dialog');
      d.innerHTML = `<div class="poster" style="padding:8px"><img src="/qr.svg?path=${encodeURIComponent(b.dataset.qr)}" alt="QR" style="width:240px;height:240px"><p>${t('cardQr')}</p><span class="mono small">${esc(location.origin + b.dataset.qr)}</span><button class="btn" type="button">${t('close')}</button></div>`;
      d.style.cssText = 'border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink)';
      document.body.appendChild(d); d.showModal();
      $('button', d).onclick = () => d.close(); d.addEventListener('close', () => d.remove());
    }));
  }

  function pSettings(main) {
    const s = settings;
    main.innerHTML = `<div class="page"><div class="page-head"><h1>${t('settings')}</h1></div>
      <form class="card" id="sf" style="max-width:720px"><h2>${t('program')}</h2>
        <div class="grid2"><label class="field" for="b">${t('biz')}<input type="text" id="b" value="${esc(s.businessName)}"></label><label class="field" for="r">${t('reward')}<input type="text" id="r" value="${esc(s.reward)}"></label></div>
        <div class="grid4"><label class="field" for="n">${t('need')}<input type="number" id="n" min="3" max="20" value="${s.stampsNeeded}"></label>
          <label class="field" for="w">${t('welcome')}<input type="number" id="w" min="0" max="5" value="${s.welcomeStamps}"></label>
          <label class="field" for="cd">${t('cooldown')}<input type="number" id="cd" min="0" max="1440" value="${s.cooldownMinutes}"></label>
          <label class="field" for="pin">${t('staffPin')}<input type="text" id="pin" class="ltr" inputmode="numeric" value="${esc(s.staffPin)}"></label></div>
        <p class="hint small muted">${t('pinHint')}</p>
        <h2>${t('look')}</h2>
        <div class="grid4"><label class="field" for="c">${t('color')}<input type="color" id="c" value="${esc(s.color)}" style="height:40px;width:100%"></label><label class="field" for="e">${t('emoji')}<input type="text" id="e" value="${esc(s.emoji)}" maxlength="4"></label></div>
        <label class="field" for="tm">${t('terms')}<input type="text" id="tm" value="${esc(s.terms)}"></label>
        <div class="row"><button class="btn primary" type="submit">${t('save')}</button></div></form>
      <section class="card" style="max-width:720px"><h2>${t('hookTitle')}</h2><p class="muted small">${t('hookLead')}</p>
        <div class="copy"><pre id="hk">${esc(location.origin + '/hooks/order?key=' + s.hookKey)}</pre><button class="btn sm" type="button" id="hkc">${t('copy')}</button></div></section>
      <form class="card" id="pw" style="max-width:480px"><h2>${t('pwTitle')}</h2><label class="field" for="pc">${t('current')}<input type="password" id="pc"></label><label class="field" for="pn">${t('next')}<input type="password" id="pn"></label><div class="err" id="pe"></div><div class="row"><button class="btn primary" type="submit">${t('change')}</button></div></form>
      <p class="muted small">Khatm · ${esc(session.version)} · MIT</p></div>`;
    $('#sf').onsubmit = async (e) => {
      e.preventDefault();
      try {
        settings = (await api('/api/settings', { method: 'PUT', body: { settings: { businessName: $('#b').value, reward: $('#r').value, stampsNeeded: Number($('#n').value), welcomeStamps: Number($('#w').value), cooldownMinutes: Number($('#cd').value), staffPin: $('#pin').value, color: $('#c').value, emoji: $('#e').value, terms: $('#tm').value } } })).settings;
        toast(t('saved'));
      } catch (err) { toast(err.message); }
    };
    $('#hkc').onclick = async () => { try { await navigator.clipboard.writeText($('#hk').textContent); toast(t('copied')); } catch { toast($('#hk').textContent); } };
    $('#pw').onsubmit = async (e) => { e.preventDefault(); try { await api('/api/password', { method: 'POST', body: { current: $('#pc').value, next: $('#pn').value } }); toast(t('saved')); } catch (err) { $('#pe').textContent = err.message; } };
  }
  boot();
})();
