/* NBL-AquaTwin Studio, view-only copy.
   Every call the studio makes to its local server (/api/...) is answered from a recording of the real v1.17.8 studio
   (run SID-20261019-104700, default inputs). Nothing is calculated here. */
(function () {
  'use strict';
  var REC = {};
  try { var x = new XMLHttpRequest(); x.open('GET', 'data/rec.json', false); x.send(null); if (x.status === 200) REC = JSON.parse(x.responseText); } catch (e) { console.warn('replay: recording not loaded', e); }

  /* md5 of a UTF-8 string, same as the recorder used to key POST bodies */
  function md5(str) {
    var b = new TextEncoder().encode(str), n = b.length, w = [], i;
    function R(v, s) { return (v << s) | (v >>> (32 - s)); }
    var K = [], S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    for (i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
    var pad = new Uint8Array(((n + 8) >> 6 << 6) + 64); pad.set(b); pad[n] = 0x80;
    var bits = n * 8, L = pad.length; pad[L - 8] = bits & 255; pad[L - 7] = (bits >>> 8) & 255; pad[L - 6] = (bits >>> 16) & 255; pad[L - 5] = (bits >>> 24) & 255;
    pad[L - 4] = Math.floor(n / 536870912) & 255;
    var a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
    for (var o = 0; o < L; o += 64) {
      for (i = 0; i < 16; i++) w[i] = pad[o + i * 4] | (pad[o + i * 4 + 1] << 8) | (pad[o + i * 4 + 2] << 16) | (pad[o + i * 4 + 3] << 24);
      var A = a0, B = b0, C = c0, D = d0, F, g;
      for (i = 0; i < 64; i++) {
        if (i < 16) { F = (B & C) | (~B & D); g = i; }
        else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
        else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
        else { F = C ^ (B | ~D); g = (7 * i) % 16; }
        F = (F + A + K[i] + w[g]) | 0; A = D; D = C; C = B;
        B = (B + R(F, S[(i >> 4) * 4 + (i % 4)])) | 0;
      }
      a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
    }
    function hex(v) { var s = ''; for (var j = 0; j < 4; j++) s += ('0' + ((v >>> (j * 8)) & 255).toString(16)).slice(-2); return s; }
    return hex(a0) + hex(b0) + hex(c0) + hex(d0);
  }

  var NOTE = 'This is the view-only copy of the studio. It shows the results recorded from the real studio with its default inputs, so this combination of inputs cannot be calculated here. Use the studio on the PC to change inputs, run calculations or download files.';

  function lookup(method, u, body) {
    var k = method + ' ' + u.pathname + u.search;
    if (method === 'POST') k += '#' + md5(body || '');
    if (REC[k]) return REC[k];
    var k2 = k.replace(/([?&])v=\d+(&|$)/, function (m, a, b) { return b ? a : ''; }).replace(/[?&]$/, '');
    if (REC[k2]) return REC[k2];
    if (method === 'GET' && u.pathname === '/api/model3d') {           /* the time slider: use the nearest recorded step */
      var want = +u.searchParams.get('t'), best = null, bd = 1e9;
      Object.keys(REC).forEach(function (kk) {
        if (kk.indexOf('GET /api/model3d?') !== 0) return;
        var q = new URL(kk.slice(4), 'http://x').searchParams;
        if (q.get('reading') !== u.searchParams.get('reading') || q.get('scen') !== u.searchParams.get('scen')) return;
        var d = Math.abs(+q.get('t') - want); if (d < bd) { bd = d; best = REC[kk]; }
      });
      return best;
    }
    return null;
  }

  var origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || String(input), u;
    try { u = new URL(url, location.href); } catch (e) { return origFetch(input, init); }
    if (u.pathname.indexOf('/api/') !== 0 && u.pathname.indexOf('/site/') !== 0) return origFetch(input, init);
    var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    var body = init && typeof init.body === 'string' ? init.body : '';
    var r = lookup(method, u, body);
    if (!r) { console.warn('REPLAY-MISS ' + method + ' ' + u.pathname + u.search + (body ? ' #' + body.slice(0, 4000) : '')); }
    if (!r) return Promise.resolve(new Response(JSON.stringify({ error: NOTE }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
    return origFetch(r.f).then(function (res) { return res.blob(); }).then(function (blob) {
      return new Response(blob, { status: r.s, headers: { 'Content-Type': r.t } });
    });
  };

  /* images, frames and links that point straight at /api/... */
  function mapUrl(v) {
    if (typeof v !== 'string' || (v.indexOf('/api/') !== 0 && v.indexOf('/site/') !== 0)) return v;
    var r = lookup('GET', new URL(v, location.href), '');
    return r ? r.f : v;
  }
  function fixEl(el) {
    if (!el || el.nodeType !== 1) return;
    ['src', 'href', 'data'].forEach(function (a) {
      var v = el.getAttribute(a); if (v && (v.indexOf('/api/') === 0 || v.indexOf('/site/') === 0)) { var m = mapUrl(v); if (m !== v) el.setAttribute(a, m); }
    });
    if (el.querySelectorAll) el.querySelectorAll('[src^="/api/"],[href^="/api/"],[src^="/site/"]').forEach(fixEl);
  }
  new MutationObserver(function (list) {
    list.forEach(function (m) {
      if (m.type === 'attributes') fixEl(m.target);
      else m.addedNodes.forEach(fixEl);
    });
  }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'href'] });
  var sa = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (n, v) { if (n === 'src' || n === 'href' || n === 'data') v = mapUrl(v); return sa.call(this, n, v); };
  [[HTMLImageElement, 'src'], [HTMLIFrameElement, 'src'], [HTMLAnchorElement, 'href']].forEach(function (p) {
    var d = Object.getOwnPropertyDescriptor(p[0].prototype, p[1]); if (!d || !d.set) return;
    Object.defineProperty(p[0].prototype, p[1], { get: d.get, set: function (v) { d.set.call(this, mapUrl(v)); }, configurable: true });
  });
  var wo = window.open; window.open = function (u) { var a = [].slice.call(arguments); a[0] = mapUrl(u); return wo.apply(window, a); };

  /* small notice, bottom left */
  document.addEventListener('DOMContentLoaded', function () {
    var d = document.createElement('div');
    d.setAttribute('style', 'position:fixed;left:max(12px,env(safe-area-inset-left,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));z-index:99999;background:#093a3f;color:#d9ecea;font:600 12px/1.4 "Plus Jakarta Sans",system-ui,sans-serif;padding:8px 10px 8px 12px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.25);display:flex;gap:10px;align-items:center;max-width:min(430px,calc(100vw - 24px))');
    d.innerHTML = '<span>View-only copy of NBL-AquaTwin v1.17.8 · recorded from the PC on 7 Nov 2026 · inputs do not recalculate</span><button type="button" aria-label="Hide notice" style="all:unset;cursor:pointer;color:#8fb4b1;font-size:16px;line-height:1;padding:2px 4px">×</button>';
    d.querySelector('button').onclick = function () { d.remove(); };
    document.body.appendChild(d);
  });

  /* ---- view-only behaviour: hide what cannot work, lock the inputs, run the recorded result when an option changes ---- */
  var css = document.createElement('style');
  css.textContent = [
    '#t6 button[data-v="run"],#t7 button[data-v="prep"],#spGo,#spXl,#spEditBtn,#spSaveBtn,#runStart,#runStop,#rzGo,#rlGo,#rlStop,#prGo,#chkBtn,#regEditBtn,#cbEditBtn,#nzStAdd,#ssAdd,#drawer,.fab,#aiOpen{display:none!important}',
    'button[onclick*="askAI"],button[onclick*="openAI"],button[onclick*="runCheck"],button[onclick*="saveRegister"],button[onclick*="saveCb"],button[onclick*="approveReadings"],button[onclick*="openClassic"],button[onclick*="cbRunNow"],button[onclick*="startRun"],button[onclick*="wiReset"],button[onclick*="openNewSite"],button[onclick*="wz"]{display:none!important}',
    'input[disabled],select[disabled]{opacity:.7;cursor:not-allowed}','input[readonly]{background:#f4f7f6!important;cursor:default;color:#3b5654}'
  ].join('\n');
  document.head.appendChild(css);
  var FREE = /^(catQ|qcSt|psMask|psZones|dsDepth|iso3d|dm3d|cx3d|cy3d|vz3d|regQ|[a-zA-Z0-9]*Q)$/;
  function lockEl(el) {
    if (!el || el.nodeType !== 1) return;
    var list = el.matches && el.matches('input,select,textarea') ? [el] : [];
    if (el.querySelectorAll) list = list.concat([].slice.call(el.querySelectorAll('input,select,textarea')));
    list.forEach(function (i) {
      if (i.dataset.vo) return; i.dataset.vo = '1';
      if (FREE.test(i.id || '')) return;
      var t = (i.type || '').toLowerCase();
      if (t === 'text' && /search|filter/i.test((i.placeholder || '') + (i.id || ''))) return;
      if (i.tagName === 'SELECT' || t === 'range' || t === 'checkbox' || t === 'radio' || t === 'date') i.disabled = true;
      else i.readOnly = true;
    });
  }
  function lockAll() { lockEl(document.body); }
  new MutationObserver(function (list) { list.forEach(function (m) { m.addedNodes.forEach(lockEl); }); }).observe(document, { subtree: true, childList: true });
  document.addEventListener('DOMContentLoaded', lockAll);
  function autoCalc(n) {
    n = n || 0; var g = document.getElementById('spGo'); if (g) g.click();
    setTimeout(function () { var m = document.getElementById('spMsg'); if (m && /view-only|Cannot read|undefined|Could not|not defined/.test(m.textContent) && n < 8) autoCalc(n + 1); }, 1200);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button'); if (!b) return;
    if (b.closest('#spMode,#spAmc,#spAmcS,#spSrc,#spBuf')) setTimeout(autoCalc, 900);
    else if (b.closest('#t6') && /Storm/.test(b.textContent)) setTimeout(function () { var on = document.querySelector('#spMode button.on'); if (on) on.click(); setTimeout(autoCalc, 900); }, 700);
  });
})();
