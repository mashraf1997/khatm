// Demo-mode helper: when the server runs with DEMO_MODE=true it fills the password
// on the sign-in screen and shows a small note that the data resets. No-op otherwise.
(function () {
  fetch('api/session', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (s) {
    var d = s && s.demo;
    if (!d) return;
    var ar = function () { return (document.documentElement.lang || 'ar').indexOf('ar') === 0; };
    var css = document.createElement('style');
    css.textContent = '.demo-note{position:fixed;z-index:60;inset-inline-start:12px;bottom:12px;max-width:min(380px,calc(100vw - 24px));background:#B45309;color:#fff;border:0;border-radius:10px;padding:8px 12px;font:inherit;font-size:.85rem;line-height:1.4;text-align:start;box-shadow:0 4px 16px rgba(0,0,0,.2);cursor:pointer}' +
      '@media (max-width:720px){.demo-note{bottom:76px}}' +
      '.demo-pw{display:block;margin:0 0 10px;padding:8px 12px;border-radius:10px;background:#FEF3C7;color:#78350F;font-size:.9rem}.demo-pw b{font-family:ui-monospace,monospace;direction:ltr;unicode-bidi:isolate}';
    document.head.appendChild(css);
    var note = document.createElement('button');
    note.type = 'button';
    note.className = 'demo-note';
    var paint = function () {
      // Only touch the DOM when the text changes: this runs inside a MutationObserver.
      var text = ar() ? 'نسخة تجريبية: البيانات بترجع لأولها كل ' + d.resetMinutes + ' دقيقة، والإعدادات اللي بتتصل ببرّه مقفولة. (اضغط للإخفاء)' : 'Demo: data resets every ' + d.resetMinutes + ' minutes and settings that reach outside are locked. (Click to hide)';
      if (note.textContent !== text) note.textContent = text;
    };
    paint();
    note.onclick = function () { note.remove(); };
    document.body.appendChild(note);
    var fill = function () {
      paint();
      var pw = document.querySelector('#pw, #f-pw');
      if (!pw || pw.dataset.demo) return;
      pw.dataset.demo = '1';
      if (pw.autocomplete === 'new-password') return;
      pw.value = d.password;
      var hint = document.createElement('span');
      hint.className = 'demo-pw';
      hint.innerHTML = (ar() ? 'نسخة تجريبية. كلمة السر: ' : 'Demo. Password: ') + '<b></b>';
      hint.querySelector('b').textContent = d.password;
      var host = pw.closest('label') || pw;
      host.parentNode.insertBefore(hint, host);
    };
    fill();
    new MutationObserver(fill).observe(document.body, { childList: true, subtree: true });
  }).catch(function () {});
})();
