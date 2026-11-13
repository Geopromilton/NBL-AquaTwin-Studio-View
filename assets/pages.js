/* NBL-AquaTwin Studio - Steps 5-7 (Assumptions, Run & scenarios, Reports & decisions). Uses helpers from studio.js. */
'use strict';
const RCOL = {compart: '#4a5a58', corridor: '#8a5a2b', layered: '#7d8f8d', 'zoned_I-POS': '#1f8a54', 'zoned_I-NEU': '#2f7fe0', 'zoned_I-NEG': '#c2453c', 'I-POS': '#1f8a54', 'I-NEU': '#2f7fe0', 'I-NEG': '#c2453c'};
const RNAME = {'I-POS': 'Positive', 'I-NEU': 'Neutral', 'I-NEG': 'Negative'};
const SCN = {S0: 'S0 baseline', S6: 'S6 demand only', S1: 'S1 roof water direct use', S2: 'S2 roof to shafts', S3: 'S3 biopool', S4: 'S4 diffuse paths', S5: 'S5 combined package'};
const STN = {compart: 'Compartments (sensitivity case)', corridor: 'Fracture corridor (assumed)', layered: 'Layered (no ADMT zoning)', 'zoned_I-POS': 'Positive reading', 'zoned_I-NEU': 'Neutral reading', 'zoned_I-NEG': 'Negative reading'};
const num = (v, d = 2) => v == null || v === '' || isNaN(v) ? '–' : (Math.abs(v) >= 1000 ? fmt(Math.round(v)) : (v != 0 && Math.abs(v) < Math.pow(10, -d + 1) ? (+(+v).toPrecision(2)).toString() : (+(+v).toFixed(d)).toString()));
const nice = k => String(k).replace(/_m3$/, ' (m³)').replace(/_pct$/, ' (%)').replace(/_m$/, ' (m)').replace(/_/g, ' ');
function table(id, rows, cols, opt = {}) {
  const el = $(id); if (!el) return;
  if (!rows || !rows.length) { el.innerHTML = `<tbody><tr><td class="note">${opt.empty || 'Nothing in this run.'}</td></tr></tbody>`; return; }
  cols = cols || Object.keys(rows[0]).map(k => [k, nice(k)]);
  el.innerHTML = '<thead><tr>' + cols.map(c => `<th>${esc(c[1])}</th>`).join('') + '</tr></thead><tbody>' +
    rows.map(r => '<tr>' + cols.map(c => { const v = c[2] ? c[2](r[c[0]], r) : r[c[0]]; return `<td${typeof r[c[0]] === 'number' ? ' class="num"' : ''}>${c[2] ? v : (typeof v === 'number' ? num(v) : esc(v ?? '–'))}</td>`; }).join('') + '</tr>').join('') + '</tbody>';
}
function segOn(id, fn) {   // segmented control: click -> on + callback(value)
  const el = $(id); if (!el) return;
  el.onclick = e => { const b = e.target.closest('button'); if (!b) return; el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); fn(b.dataset.v); };
}
const segVal = id => { const b = $(id) && $(id).querySelector('button.on'); return b ? b.dataset.v : null; };
function debounce(f, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; }
function draw(id, tr, lay, cfg = CFG) { clearBox(id); $(id).querySelectorAll(':scope > .banner, :scope > p.note').forEach(n => n.remove()); return Plotly.react($(id), tr, lay, cfg); }

/* ============================================================ STEP 5 · ASSUMPTIONS */
let REG = null, REGV = null, REGEDIT = false, REGCH = {};
BUILD[5] = async function () {
  $('k5').innerHTML = '<div class="loading">Reading the assumption register…</div>';
  try { REG = await api('/api/register', Object.assign(SR(), REGV ? {version: REGV} : {})); }
  catch (e) { fail('k5', e); throw e; }
  const R = REG, ents = R.entries || [], numc = ents.filter(e => e._numeric);
  const unt = numc.filter(e => /untested/i.test(e.status || '')).length;
  const top = (R.top_drivers || [])[0];
  const pname = k => { const e = ents.find(x => x.key === k); return e ? e.parameter : k; };
  $('regBadge').textContent = `Register v${R.version}`;
  $('regBadge2').innerHTML = R.latest ? 'latest version' : 'older version<br>read-only';
  $('k5').innerHTML = kpi('k-green', 'layers', 'Assumptions with ranges', numc.length, `${ents.length - numc.length} rules, alternatives and observations`, 'list') +
    kpi('k-amber', 'alert', 'Not yet tested on site', unt, `of ${numc.length}; tested ones need a measurement`, 'flask') +
    kpi('k-blue', 'doc', 'Register in use', 'v' + R.version, `this run used ${esc(R.used_by_run || '–')}`, 'lock') +
    kpi('k-red', 'target', 'Biggest driver', top ? esc(top[0]) : '–', top ? `measure: ${esc(top[2])}` : 'needs M8 (full run)', 'bars');
  $('regVers').innerHTML = (R.versions || []).map(v => `<button class="chip sm ${String(v) === String(R.version) ? 'on' : ''}" data-v="${v}">v${v}</button>`).join('');
  $('regVers').onclick = e => { const b = e.target.closest('button'); if (!b) return; REGV = b.dataset.v; REGEDIT = false; REGCH = {}; built[5] = 1; BUILD[5](); };
  $('regEditBtn').hidden = !R.latest;
  $('regEditBtn').textContent = REGEDIT ? 'Stop editing' : 'Edit values';
  // drivers
  const td = (R.top_drivers || []).slice().reverse();
  if (td.length) {
    draw('drivers', [{type: 'bar', orientation: 'h', y: td.map(d => d[0]), x: td.map(d => d[1]), marker: {color: td.map((d, i) => i >= td.length - 3 ? '#17663f' : '#9cc9b4')},
      customdata: td.map(d => [pname(d[0]), d[2]]), hovertemplate: '<b>%{customdata[0]}</b><br>importance %{x:.3f}<br>measure: %{customdata[1]}<extra></extra>'}],
      base({margin: {l: 130, r: 20, t: 6, b: 40}, xaxis: {title: 'share of explained variation', gridcolor: '#e6eeee', zeroline: false}, yaxis: {automargin: true}}), CFG0);
    $('measureList').innerHTML = '<ol style="margin:0;padding-left:20px;line-height:1.7">' + (R.top_drivers || []).slice(0, 6).map(d =>
      `<li><b>${esc(pname(d[0]))}</b> <span class="note">(${esc(d[0])}, ${(d[1] * 100).toFixed(0)} %)</span><br><span style="color:#17663f">→ ${esc(d[2])}</span></li>`).join('') +
      '</ol><p class="note" style="margin-top:10px">Each measurement narrows the range of that assumption; save the new range here as a new version and rerun M7–M8.</p>' +
      `<div class="row" style="gap:8px;margin-top:8px"><button class="chip" onclick="askAI('Which three field measurements would narrow the uncertainty most, what do they cost roughly in effort, and in which order should we do them?')">Ask AI: which measurement first?</button></div>`;
  } else { $('drivers').innerHTML = '<p class="note">The importance ranking comes from M8. Run the full model (Step 6) to see it.</p>'; $('measureList').innerHTML = ''; }
  drawRegTable();
  const other = ents.filter(e => !e._numeric), grp = {};
  other.forEach(e => (grp[e.type] = grp[e.type] || []).push(e));
  $('regOther').innerHTML = Object.keys(grp).map(t => `<div><span class="pill p-n">${esc(t)}</span><ul style="margin:8px 0 0;padding-left:18px;line-height:1.55;font-size:12.8px">${grp[t].map(e =>
    `<li><b>${esc(e.id)} ${esc(e.parameter)}</b><br><span class="note">${esc(String(e.central ?? '').slice(0, 220))}</span></li>`).join('')}</ul></div>`).join('') || '<p class="note">None.</p>';
  $('regQ').oninput = drawRegTable;
  paintIcons($('p5'));
};
function drawRegTable() {
  const q = ($('regQ').value || '').toLowerCase();
  const rows = (REG.entries || []).filter(e => e._numeric && (!q || JSON.stringify(e).toLowerCase().includes(q)));
  const imp = e => e._importance != null && e._importance > 0.005 ? `<span class="pill ${e._importance > 0.1 ? 'p-r' : e._importance > 0.03 ? 'p-a' : 'p-n'}">${(e._importance * 100).toFixed(0)} %</span>` : '<span class="note">small</span>';
  const st = s => `<span class="pill ${/tested|measured|confirmed/i.test(s) && !/untested/i.test(s) ? 'p-g' : /derived/i.test(s) ? 'p-b' : 'p-a'}">${esc(s || '–')}</span>`;
  const cell = (e, f) => { const c = REGCH[e.key] || {}; const v = c[f] ?? e[f];
    return REGEDIT ? `<input class="reg-in num" data-k="${esc(e.key)}" data-f="${f}" value="${esc(v)}" inputmode="decimal">` : `<span class="num">${num(v, 4)}</span>`; };
  $('regT').innerHTML = '<thead><tr><th>ID</th><th>Assumption</th><th>Low</th><th>Central</th><th>High</th><th>Unit</th><th>Influence</th><th>Status</th><th>How to test it</th></tr></thead><tbody>' +
    rows.map(e => `<tr class="${REGCH[e.key] ? 'chg' : ''}"><td><b>${esc(e.id)}</b></td><td style="min-width:240px"><b>${esc(e.parameter)}</b><br><span class="note">${esc(e.key)} · ${esc(e.source || '')}</span></td>` +
      `<td>${cell(e, 'low')}</td><td>${cell(e, 'central')}</td><td>${cell(e, 'high')}</td><td>${esc(e.unit || '')}</td><td>${imp(e)}</td>` +
      `<td>${REGEDIT ? `<select class="reg-in" data-k="${esc(e.key)}" data-f="status">${['untested', 'partly tested', 'tested', 'measured on site', 'derived'].map(o => `<option ${((REGCH[e.key] || {}).status || e.status) === o ? 'selected' : ''}>${o}</option>`).join('')}${['untested', 'partly tested', 'tested', 'measured on site', 'derived'].includes(e.status) ? '' : `<option selected>${esc(e.status)}</option>`}</select>` : st(e.status)}</td>` +
      `<td class="note" style="min-width:200px">${esc(e.field_measurement_to_test || e._measure || '')}</td></tr>`).join('') + '</tbody>';
  $('regT').querySelectorAll('.reg-in').forEach(i => i.onchange = () => {
    const e = REG.entries.find(x => x.key === i.dataset.k); const f = i.dataset.f;
    const v = f === 'status' ? i.value : i.value.trim();
    REGCH[e.key] = REGCH[e.key] || {};
    if (String(v) === String(e[f])) delete REGCH[e.key][f]; else REGCH[e.key][f] = f === 'status' ? v : +v;
    if (!Object.keys(REGCH[e.key]).length) delete REGCH[e.key];
    i.closest('tr').classList.toggle('chg', !!REGCH[e.key]); regSaveBar(); });
  regSaveBar();
}
function regSaveBar() { const n = Object.keys(REGCH).length; $('regSave').hidden = !REGEDIT; $('regChg').textContent = n ? `${n} assumption${n > 1 ? 's' : ''} changed` : 'No changes yet'; }
function toggleRegEdit() { REGEDIT = !REGEDIT; if (!REGEDIT) REGCH = {}; $('regEditBtn').textContent = REGEDIT ? 'Stop editing' : 'Edit values'; drawRegTable(); }
async function saveRegister() {
  const reason = $('regReason').value.trim(), by = $('regBy').value.trim();
  if (!Object.keys(REGCH).length) { $('regMsg').textContent = 'Change at least one value first.'; return; }
  if (!reason || !by) { $('regMsg').textContent = 'A reason and an approver are required.'; return; }
  for (const k of Object.keys(REGCH)) { const e = REG.entries.find(x => x.key === k), c = Object.assign({}, e, REGCH[k]);
    if ([c.low, c.central, c.high].some(v => isNaN(+v))) { $('regMsg').textContent = `${k}: values must be numbers.`; return; }
    if (!(+c.low <= +c.central && +c.central <= +c.high)) { $('regMsg').textContent = `${k}: low ≤ central ≤ high is required.`; return; } }
  $('regMsg').textContent = 'Saving…';
  try { const r = await post('/api/register/save', {site: SITE, changes: REGCH, reason, by});
    REGCH = {}; REGEDIT = false; REGV = null; $('regReason').value = '';
    built[5] = 1; await BUILD[5]();
    $('regMsg').textContent = '';
    $('k5').insertAdjacentHTML('beforebegin', `<div class="banner" style="margin-bottom:14px"><span>${ic('checkc')}</span><span>Saved <b>${esc(r.file)}</b> (read-only) and logged as ${esc(r.decision)}. Rerun M7–M8 in Step 6 (Start a calculation → <i>Model only (into the selected saved run)</i>) so the scenarios use it.</span></div>`);
  } catch (e) { $('regMsg').textContent = 'Not saved: ' + e.message; }
}

/* ============================================================ STEP 6 · RUN & SCENARIOS */
const T6 = {};
BUILD[6] = async function () {
  segOn('t6', showT6);
  showT6(segVal('t6') || 'm3d');
};
function showT6(t) {
  document.querySelectorAll('.t6').forEach(d => d.hidden = d.dataset.t !== t);
  const f = {m3d: build3d, maps: buildMaps, run: buildRun, sto: buildSto, scn: buildScn, cb: buildCb, rl: buildRl, sp: buildSp, wi: buildWi}[t];
  if (!T6[t]) { T6[t] = 1; f().catch(e => { console.error(e); T6[t] = 0; }); }
  else document.querySelectorAll(`.t6[data-t="${t}"] .js-plotly-plot`).forEach(p => Plotly.Plots.resize(p));
}
// reset sub-tabs when the site or run changes
const _reset0 = resetData;
resetData = function (k) { _reset0(k); Object.keys(T6).forEach(x => delete T6[x]); M3C = {}; WI = null; CB = null; RL = null; SP = null; SPCH = {}; SPEDIT = false; SPR = null; CBSITE = null; CBCH = {}; CBEDIT = false; if (jobTimer) { clearInterval(jobTimer); jobTimer = null; } };

/* ---------- 3D model ---------- */
let M3C = {}, M3 = null;
const S3 = {reading: 'I-NEU', scen: 'S6', t: 19, iso: 0.3, rel: 0, vz: 1, view: 'both', dmax: 400, cx: 100, cy: 100, cam: null, show: {vol: 1, head: 1, bnd: 1, sites: 1, rz: 1}};
async function build3d() {
  segOn('r3d', v => { S3.reading = v; load3d(); });
  $('iso3d').oninput = () => { S3.iso = +$('iso3d').value; $('iso3dL').textContent = '≥ ' + S3.iso.toFixed(2); };
  $('iso3d').onchange = () => draw3d();
  segOn('v3d', v => { S3.view = v; draw3d(); });
  segOn('rel3d', v => { S3.rel = +v; draw3d(); });
  $('dm3d').oninput = () => { S3.dmax = +$('dm3d').value; $('dm3dL').textContent = S3.dmax + ' m'; }; $('dm3d').onchange = () => draw3d();
  $('cx3d').oninput = () => { S3.cx = +$('cx3d').value; }; $('cx3d').onchange = () => draw3d();
  $('cy3d').oninput = () => { S3.cy = +$('cy3d').value; }; $('cy3d').onchange = () => draw3d();
  $('vz3d').oninput = () => { S3.vz = +$('vz3d').value; $('vz3dL').textContent = S3.vz + '×'; draw3d(); };
  $('t3d').oninput = () => { S3.t = +$('t3d').value; $('t3dL').textContent = `year ${((S3.t + 1) / 2).toFixed(1)}`; };
  $('t3d').onchange = () => load3d();
  $('vz3dL').textContent = S3.vz + '×'; $('iso3dL').textContent = '≥ ' + S3.iso.toFixed(2); $('t3dL').textContent = 'year 10.0';
  const L = [['head', 'Water level (MODFLOW)'], ['bnd', 'Lease boundary'], ['sites', 'Candidate sites'], ['rz', 'Recharge zone points (RZ)']];
  $('lay3d').innerHTML = L.map(l => `<button class="chip sm on" data-v="${l[0]}">${l[1]}</button>`).join('');
  $('lay3d').onclick = e => { const b = e.target.closest('button'); if (!b) return; b.classList.toggle('on'); S3.show[b.dataset.v] = b.classList.contains('on') ? 1 : 0; draw3d(); };
  await load3d();
}
async function load3d() {
  const k = [S3.reading, S3.scen, S3.t].join('|');
  if (!M3C[k]) { if (!$('m3d')._fullLayout) $('m3d').innerHTML = '<div class="loading">Building the 3D model…</div>';
    try { M3C[k] = await api('/api/model3d', Object.assign(SR(), {reading: S3.reading, scen: S3.scen, t: S3.t})); } catch (e) { fail('m3d', e); return; } }
  M3 = M3C[k];
  const sc = M3.scenarios || [];
  if (sc.length && !$('s3d').children.length) {
    if (!sc.includes(S3.scen)) S3.scen = sc.includes('S6') ? 'S6' : sc[0];
    $('s3d').innerHTML = sc.map(s => `<button data-v="${s}" class="${s === S3.scen ? 'on' : ''}" title="${esc(SCN[s] || s)}">${s}</button>`).join('');
    segOn('s3d', v => { S3.scen = v; load3d(); });
  }
  if (M3.heads && M3.heads.nt) $('t3d').max = M3.heads.nt - 1;
  draw3d();
}
/* Solid block model: every cell inside the lease is drawn as rock; only the faces that are exposed (outer faces and the cut-away) are built. */
function blockQuads(V, top, cx, cy, dmax) {
  const nx = V.x.length, ny = V.y.length, nz = V.z.length;
  const edges = a => { const n = a.length, e = new Array(n + 1), h = n > 1 ? (a[1] - a[0]) / 2 : 5; e[0] = a[0] - h; for (let i = 1; i < n; i++) e[i] = (a[i - 1] + a[i]) / 2; e[n] = a[n - 1] + (n > 1 ? (a[n - 1] - a[n - 2]) / 2 : 5); return e; };
  const xe = edges(V.x), ye = edges(V.y);
  const zE = V.zb_depth ? V.zb_depth.map(d => top - d) : edges(V.z);
  let kmax = 0; for (let k = 0; k < nz; k++) { if ((top - zE[k + 1]) <= dmax + 1e-6) kmax = k + 1; } kmax = Math.max(1, kmax);
  const ins = (i, j) => i >= 0 && i < nx && j >= 0 && j < ny && (!V.inside || V.inside[j][i]);
  const sol = (i, j, k) => k >= 0 && k < kmax && ins(i, j) && !(V.x[i] > cx && V.y[j] > cy);
  const X = [], Y = [], Z = [], Ti = [], Tj = [], Tk = [], C = [];
  const add = (c, f) => { const b = X.length; for (const p of c) { X.push(p[0]); Y.push(p[1]); Z.push(p[2]); } Ti.push(b, b); Tj.push(b + 1, b + 2); Tk.push(b + 2, b + 3); C.push(f); };
  for (let k = 0; k < kmax; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (!sol(i, j, k)) continue;
    const x0 = xe[i], x1 = xe[i + 1], y0 = ye[j], y1 = ye[j + 1], zt = zE[k], zb = zE[k + 1], c = [i, j, k];
    if (!sol(i + 1, j, k)) add([[x1, y0, zt], [x1, y1, zt], [x1, y1, zb], [x1, y0, zb]], c);
    if (!sol(i - 1, j, k)) add([[x0, y0, zt], [x0, y1, zt], [x0, y1, zb], [x0, y0, zb]], c);
    if (!sol(i, j + 1, k)) add([[x0, y1, zt], [x1, y1, zt], [x1, y1, zb], [x0, y1, zb]], c);
    if (!sol(i, j - 1, k)) add([[x0, y0, zt], [x1, y0, zt], [x1, y0, zb], [x0, y0, zb]], c);
    if (!sol(i, j, k - 1)) add([[x0, y0, zt], [x1, y0, zt], [x1, y1, zt], [x0, y1, zt]], c);
    if (!sol(i, j, k + 1)) add([[x0, y0, zb], [x1, y0, zb], [x1, y1, zb], [x0, y1, zb]], c);
  }
  return {X, Y, Z, Ti, Tj, Tk, C, kmax, zbot: zE[kmax]};
}
function blockMesh(Q, scene, val, txt, o) {
  const nq = Q.C.length, inten = new Array(nq * 2), tx = new Array(nq * 4);
  for (let q = 0; q < nq; q++) { const c = Q.C[q], v = val(c[2], c[1], c[0]), t = txt(c[2], c[1], c[0]); inten[2 * q] = v; inten[2 * q + 1] = v; tx[4 * q] = tx[4 * q + 1] = tx[4 * q + 2] = tx[4 * q + 3] = t; }
  return Object.assign({type: 'mesh3d', scene, x: Q.X, y: Q.Y, z: Q.Z, i: Q.Ti, j: Q.Tj, k: Q.Tk, intensity: inten, intensitymode: 'cell', flatshading: true,
    lighting: {ambient: 0.82, diffuse: 0.55, specular: 0.05, roughness: 0.9, fresnel: 0.05}, lightposition: {x: 2000, y: -3000, z: 6000},
    hoverinfo: 'text', hovertext: tx, showlegend: false, opacity: 1}, o);
}
function draw3d() {
  const M = M3; if (!M) return;
  const V = M.vol, top = M.top || 918, H = M.heads;
  const clay = /clay/i.test(M.volume_kind || '');
  if (!V && !(H && H.h)) {
    if ($('m3d')._fullLayout) Plotly.purge($('m3d'));
    $('m3d').innerHTML = `<div class="banner warn" style="margin:20px"><span>${ic('alert')}</span><span>Run <b>${esc(RUN)}</b> has no 3D results yet. The ADMT volume needs M5 and the water level needs M7. Use the <b>Start a calculation</b> tab (Model only, or a Full calculation), or choose a saved run that has them in the Run box at the top right.</span></div>`;
    $('info3d').innerHTML = '<p class="note" style="margin:0">Nothing to show for this run.</p>'; return;
  }
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  if (V) { x0 = Math.min(...V.x) - 5; x1 = Math.max(...V.x) + 5; y0 = Math.min(...V.y) - 5; y1 = Math.max(...V.y) + 5; }
  if (M.boundary && M.boundary.length) M.boundary.forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
  const pad = 40; x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
  const cx = x0 + (x1 - x0) * S3.cx / 100, cy = y0 + (y1 - y0) * S3.cy / 100;
  $('cx3dL').textContent = S3.cx >= 100 ? 'none' : 'E ' + Math.round(cx) + ' m'; $('cy3dL').textContent = S3.cy >= 100 ? 'none' : 'N ' + Math.round(cy) + ' m';
  $('dm3dL').textContent = S3.dmax + ' m';
  const wantP = S3.view !== 'sto', wantS = S3.view !== 'perm', both = wantP && wantS;
  const tr = [], scP = 'scene', scS = both ? 'scene2' : 'scene';
  let zlo = top - S3.dmax - 10, haveSy = false, cbNote = '';
  if (V) {
    const Q = blockQuads(V, top, cx, cy, S3.dmax); zlo = Q.zbot - 10;
    let pmax = 0; V.p.forEach(a => a.forEach(r => r.forEach(v => { if (v != null && v > pmax) pmax = v; })));
    const cmax = Math.max(S3.iso + 0.05, pmax), t = Math.min(0.995, Math.max(0.005, S3.iso / cmax));
    const GREY = '#cdd5d3', pal = clay ? ['#ead7bf', '#b07a3c', '#6b3f12'] : ['#b9e3d2', '#3fae7f', '#0b5f43'];
    const dep = k => ((top - V.z[k] > 0) ? (top - V.z[k]) : 0).toFixed(0);
    const pos = (k, j, i) => `E ${V.x[i].toFixed(0)} m · N ${V.y[j].toFixed(0)} m<br>elevation ${V.z[k].toFixed(0)} m · depth ${dep(k)} m`;
    const inside = (j, i) => !V.inside || V.inside[j][i];
    const med = a => { if (!a.length) return 0; a.sort((u, v) => u - v); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
    const medP = V.p.map((pl, k) => { const a = []; pl.forEach((r, j) => r.forEach((v, i) => { if (v != null && inside(j, i)) a.push(v); })); return med(a); });
    if (wantP && S3.rel) {                                   // relative view: how much more (or less) probable than the typical cell at the same depth
      let am = 0.02; V.p.forEach((pl, k) => pl.forEach((r, j) => r.forEach((v, i) => { if (v != null && inside(j, i)) am = Math.max(am, Math.abs(v - medP[k])); })));
      tr.push(blockMesh(Q, scP, (k, j, i) => (V.p[k][j][i] || 0) - medP[k],
        (k, j, i) => `<b>${clay ? 'Clay / gouge' : 'Permeable rock'}</b> probability ${(V.p[k][j][i] || 0).toFixed(2)}<br>typical at this depth ${medP[k].toFixed(2)} (difference ${((V.p[k][j][i] || 0) - medP[k]) >= 0 ? '+' : ''}${((V.p[k][j][i] || 0) - medP[k]).toFixed(2)})<br>${pos(k, j, i)}`,
        {cmin: -am, cmax: am, colorscale: clay ? [[0, '#2f6f8f'], [0.5, '#f4f1ea'], [1, '#6b3f12']] : [[0, '#8c510a'], [0.5, '#f4f1ea'], [1, '#0b5f43']], name: 'Permeability',
         colorbar: {title: {text: (clay ? 'P(clay/gouge)' : 'P(permeable)') + ' − typical at depth', side: 'right'}, len: 0.5, y: 0.5, thickness: 12, x: both ? 0.495 : 0.99}}));
    } else if (wantP) tr.push(blockMesh(Q, scP, (k, j, i) => V.p[k][j][i] || 0,
      (k, j, i) => `<b>${clay ? 'Clay / gouge' : 'Permeable rock'}</b> probability ${(V.p[k][j][i] || 0).toFixed(2)}<br>${pos(k, j, i)}`,
      {cmin: 0, cmax, colorscale: [[0, GREY], [t, GREY], [t, pal[0]], [(t + 1) / 2, pal[1]], [1, pal[2]]], name: 'Permeability',
       colorbar: {title: {text: clay ? 'P(clay/gouge)' : 'P(permeable)', side: 'right'}, len: 0.5, y: 0.5, thickness: 12, x: both ? 0.495 : 0.99}}));
    if (wantS && V.sy) {
      haveSy = true; let lo = Infinity, hi = -Infinity;
      V.sy.forEach(a => a.forEach(r => r.forEach(v => { if (v > 0) { lo = Math.min(lo, v); hi = Math.max(hi, v); } })));
      const lg = v => Math.log10(Math.max(v, 1e-6)), cmin = lg(lo), cmx = lg(hi) + 1e-9;
      const tv = [0.01, 0.03, 0.1, 0.3, 1, 2, 5].filter(v => v >= lo * 0.999 && v <= hi * 1.001);
      if (S3.rel) {                                          // relative view: ratio to the typical value of the same depth layer, so depth bands drop out and only sideways change shows
        const medS = V.sy.map((pl, k) => { const a = []; pl.forEach((r, j) => r.forEach((v, i) => { if (v > 0 && inside(j, i)) a.push(v); })); return med(a); });
        let am = 0.02; V.sy.forEach((pl, k) => pl.forEach((r, j) => r.forEach((v, i) => { if (v > 0 && inside(j, i) && medS[k] > 0) am = Math.max(am, Math.abs(lg(v) - lg(medS[k]))); })));
        const rt = [0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.6, 2].filter(r => Math.abs(Math.log10(r)) <= am * 1.001);
        tr.push(blockMesh(Q, scS, (k, j, i) => V.sy[k][j][i] > 0 && medS[k] > 0 ? lg(V.sy[k][j][i]) - lg(medS[k]) : 0,
          (k, j, i) => `<b>Storability index</b> ${V.sy[k][j][i].toFixed(V.sy[k][j][i] < 0.1 ? 3 : 2)} % of rock volume<br>${(V.sy[k][j][i] / (medS[k] || 1)).toFixed(2)}× the typical value at this depth<br>${pos(k, j, i)}<br>permeable probability ${(V.p[k][j][i] || 0).toFixed(2)}`,
          {cmin: -am, cmax: am, colorscale: [[0, '#b5651d'], [0.5, '#f4f1ea'], [1, '#0f2a6b']], name: 'Storability',
           colorbar: {title: {text: 'Storability ÷ typical at depth', side: 'right'}, len: 0.5, y: 0.5, thickness: 12, x: both ? 1.0 : 0.99, tickmode: 'array', tickvals: rt.map(r => Math.log10(r)), ticktext: rt.map(r => r === 1 ? 'typical' : r + '×')}}));
      } else
      tr.push(blockMesh(Q, scS, (k, j, i) => lg(V.sy[k][j][i]),
        (k, j, i) => `<b>Storability index</b> ${V.sy[k][j][i].toFixed(V.sy[k][j][i] < 0.1 ? 3 : 2)} % of rock volume<br>${pos(k, j, i)}<br>permeable probability ${(V.p[k][j][i] || 0).toFixed(2)}`,
        {cmin, cmax: cmx, colorscale: [[0, '#eef2fb'], [0.35, '#9db9ea'], [0.7, '#3b66c4'], [1, '#0f2a6b']], name: 'Storability',
         colorbar: {title: {text: 'Storability (% drains)', side: 'right'}, len: 0.5, y: 0.5, thickness: 12, x: both ? 1.0 : 0.99, tickmode: 'array', tickvals: tv.map(lg), ticktext: tv.map(v => v + ' %')}}));
    } else if (wantS) cbNote = 'No assumption register was found for this site, so storability cannot be drawn.';
  }
  const ov = [];
  if (H && H.h && S3.show.head) {
    const ci = H.x.map((v, i) => i).filter(i => H.x[i] >= x0 && H.x[i] <= x1), ri = H.y.map((v, i) => i).filter(i => H.y[i] >= y0 && H.y[i] <= y1);
    if (ci.length > 1 && ri.length > 1) {
      const zz = ri.map(r => ci.map(c => H.h[r][c])), dd = ri.map(r => ci.map(c => H.dd ? H.dd[r][c] : null));
      const byDD = S3.scen !== 'S0' && H.dd;
      ov.push({type: 'surface', x: ci.map(c => H.x[c]), y: ri.map(r => H.y[r]), z: zz, surfacecolor: byDD ? dd : zz, opacity: 0.8,
        colorscale: byDD ? [[0, '#e7f1fb'], [0.5, '#6fa8dc'], [1, '#0b3f7a']] : 'Blues', reversescale: !byDD, cmin: byDD ? 0 : undefined,
        showscale: !both && wantP !== wantS ? true : false, colorbar: {title: {text: byDD ? 'Drawdown vs S0 (m)' : 'Water level (m)', side: 'right'}, len: 0.3, y: 0.12, thickness: 10, x: 1.08},
        name: 'Water level', customdata: dd, hovertemplate: `Water level %{z:.1f} m amsl${byDD ? '<br>drawdown vs S0 %{customdata:.2f} m' : ''}<extra>${esc(SCN[H.scen] || H.scen)} · year ${H.years}</extra>`,
        contours: {z: {show: false}}});
      zlo = Math.min(zlo, Math.min(...zz.flat().filter(v => v != null)) - 10);
    }
  }
  if (M.boundary && S3.show.bnd) {
    const b = M.boundary.concat([M.boundary[0]]);
    ov.push({type: 'scatter3d', mode: 'lines', x: b.map(p => p[0]), y: b.map(p => p[1]), z: b.map(() => top + 1), line: {color: '#17663f', width: 6}, name: 'Lease boundary (ground)', hoverinfo: 'skip'});
  }
  if (M.sites && M.sites.length && S3.show.sites) {
    const X = [], Y = [], Z = [];
    M.sites.forEach(s => { X.push(s.x, s.x, null); Y.push(s.y, s.y, null); Z.push(top + 1, top - 400, null); });
    ov.push({type: 'scatter3d', mode: 'lines', x: X, y: Y, z: Z, line: {color: '#e0453c', width: 5}, name: 'Candidate borewell (0–400 m)', hoverinfo: 'skip'});
    ov.push({type: 'scatter3d', mode: 'markers+text', x: M.sites.map(s => s.x), y: M.sites.map(s => s.y), z: M.sites.map(() => top + 12), text: M.sites.map(s => s.Site),
      textposition: 'top center', textfont: {size: 13, color: '#7a1414', family: FONT.family}, marker: {size: 5, color: '#e0453c'}, showlegend: false,
      customdata: M.sites.map(s => s.Role), hovertemplate: 'Site %{text}<br>%{customdata}<extra></extra>'});
  }
  if (M.rz && M.rz.length && S3.show.rz) {          // recharge-zone points: a diamond at the middle of every depth tier where the point was found, joined by a line
    const T = {CB1: [0, 20], CB2: [20, 60], CB3: [60, 175], CB4: [175, 250]};
    const X = [], Y = [], Z = [], px = [], py = [], pz = [], pt = [], sx = [], sy = [], st_ = [];
    M.rz.forEach(p => {
      const ts = (p.tiers || []).filter(t => T[t]); if (!ts.length) return;
      sx.push(p.x); sy.push(p.y); st_.push(`<b>${esc(p.Site)}</b> (recharge zone point)<br>found for ${esc(ts.join(', '))}<br>nearest ADMT zone ${esc(p.zone || '–')}${p.zone_dist != null ? ' at ' + num(p.zone_dist, 0) + ' m' : ''}`);
      const dmax = Math.max(...ts.map(t => T[t][1]));
      X.push(p.x, p.x, null); Y.push(p.y, p.y, null); Z.push(top + 1, top - dmax, null);
      ts.forEach(t => { px.push(p.x); py.push(p.y); pz.push(top - (T[t][0] + T[t][1]) / 2);
        pt.push(`<b>${esc(p.Site)}</b> · found for ${esc(t)} (${T[t][0]}–${T[t][1]} m)<br>nearest ADMT zone ${esc(p.zone || '–')}${p.zone_dist != null ? ' at ' + num(p.zone_dist, 0) + ' m' : ''}${p.zone_score != null ? ', score ' + p.zone_score : ''}<br>${esc(p.reaches || '')}`); });
    });
    ov.push({type: 'scatter3d', mode: 'lines', x: X, y: Y, z: Z, line: {color: '#d98a00', width: 3}, name: 'Recharge zone point (down to the deepest tier found)', hoverinfo: 'skip'});
    ov.push({type: 'scatter3d', mode: 'markers', x: sx, y: sy, z: sx.map(() => top + 12), marker: {size: 3, color: '#f2b01e', symbol: 'diamond', line: {color: '#7a4b00', width: 1}}, showlegend: false, hovertext: st_, hoverinfo: 'text'});
    ov.push({type: 'scatter3d', mode: 'markers', x: px, y: py, z: pz, marker: {size: 3, color: '#f2b01e', symbol: 'diamond', line: {color: '#7a4b00', width: 1}}, showlegend: false,
      hovertext: pt, hoverinfo: 'text'});
  }
  ov.forEach(o => tr.push(Object.assign({}, o, {scene: scP})));
  if (both) ov.forEach(o => tr.push(Object.assign({}, o, {scene: 'scene2', showscale: false, showlegend: false})));
  const xr = x1 - x0, yr = y1 - y0, zr = top + 30 - zlo;
  const mk = (dom) => ({domain: dom, uirevision: 'm3d', aspectmode: 'manual', aspectratio: {x: 1, y: yr / xr, z: Math.min(2.2, zr / xr * S3.vz)},
    xaxis: {title: 'East (m)', range: [x0, x1], backgroundcolor: '#f3f7f6', gridcolor: '#dfe8e6'},
    yaxis: {title: 'North (m)', range: [y0, y1], backgroundcolor: '#f3f7f6', gridcolor: '#dfe8e6'},
    zaxis: {title: 'Elevation (m amsl)', range: [zlo, top + 30], backgroundcolor: '#eef3f2', gridcolor: '#dfe8e6'},
    camera: S3.cam || {eye: {x: 1.7, y: 1.7, z: 0.95}}});
  const lay = base({margin: {l: 0, r: 0, t: 40, b: 0}, uirevision: 'm3d', showlegend: false,
    scene: mk(both ? {x: [0, 0.44], y: [0, 0.97]} : {x: [0, 0.94], y: [0, 0.97]})});
  const ann = [];
  if (both) { lay.scene2 = mk({x: [0.53, 0.97], y: [0, 0.97]}); }
  if (wantP) ann.push({xref: 'paper', yref: 'paper', x: both ? 0.22 : 0.47, y: 1.0, xanchor: 'center', yanchor: 'bottom', showarrow: false, font: {size: 14, color: '#17433f'}, text: `<b>Permeability</b> · ${esc(RNAME[S3.reading] || S3.reading)} reading${S3.rel ? ' · compared within each depth' : ''}`});
  if (wantS) ann.push({xref: 'paper', yref: 'paper', x: both ? 0.75 : 0.47, y: 1.0, xanchor: 'center', yanchor: 'bottom', showarrow: false, font: {size: 14, color: '#17433f'}, text: '<b>Storability</b> · index from the assumption register' + (S3.rel ? ' · compared within each depth' : '')});
  lay.annotations = ann;
  draw('m3d', tr, lay, Object.assign({}, CFG, {toImageButtonOptions: {format: 'png', scale: 4, filename: `AquaTwin_3D_${S3.reading}_${S3.view}`}}));
  const gd = $('m3d');                                     // keep the two panels turned together
  if (gd.removeAllListeners) gd.removeAllListeners('plotly_relayout');
  gd.on('plotly_relayout', ev => {
    const c = ev['scene.camera'] || ev['scene2.camera']; if (!c) return; S3.cam = c;
    if (!both || S3.syncing) return; S3.syncing = true;
    Plotly.relayout(gd, {'scene.camera': c, 'scene2.camera': c}).finally(() => { S3.syncing = false; });
  });
  const ms = H && H.min_series ? H.min_series : null;
  $('info3d').innerHTML = `<p style="margin:0 0 8px"><b>Solid block</b>: the whole lease volume from ground level down to ${S3.dmax} m, one 10 m cell at a time, following the lease boundary. Use the two cut-away sliders to remove the north-east corner and look inside.</p>` +
    (S3.rel ? '<p style="margin:0 0 8px"><b>Compared within each depth</b>: every cell is coloured by how far it is above or below the typical cell <i>at the same depth</i>, so the depth bands drop out. Green or blue = more permeable or storable than usual for that depth; brown = less. The flat horizontal boundaries of the model layers are still there in the geometry, but they no longer dominate the colour.</p>' : '') +
    (wantP && !S3.rel ? `<p style="margin:0 0 8px"><b>Permeability panel</b>: cells coloured ${clay ? 'brown' : 'green'} are where the ${esc(RNAME[S3.reading] || S3.reading)} reading puts ${clay ? 'clay or fault gouge (low permeability)' : 'permeable rock'} with probability ≥ ${S3.iso.toFixed(2)} across the M5 realisations; grey cells are below that. These are candidate zones for connected fractured rock inferred from passive ADMT readings, not confirmed until drilling and pumping tests.</p>` : '') +
    (wantS ? `<p style="margin:0 0 8px"><b>Storability panel</b>: ${haveSy ? 'the share of rock volume that can drain (specific yield, in %), on a log colour scale. It starts from the central Sy of each depth unit in your assumption register and rises toward the register high value where the permeable probability is high. It is a display index, not a measured value and not an input to the MODFLOW simulations, which use layer Sy. Storage falls steeply with depth, so in the absolute view most of the colour change is vertical; switch Colours to <b>Compared within each depth</b> to see only the sideways differences.' : esc(cbNote)}</p>` : '') +
    (H && S3.show.head ? `<p style="margin:0 0 8px"><b>Blue surface</b>: MODFLOW water level in layer ${H.layer} for <b>${esc(SCN[H.scen] || H.scen)}</b> after ${H.years} years (${esc(M.central_case || 'central case')}); it shows where the block is cut away or beyond the lease.${S3.scen !== 'S0' && !both ? ' Colour = drawdown compared with S0.' : ''}</p>` : '') +
    (ms ? `<p style="margin:0 0 8px">Lowest water level at the well over the 10 years: <b>${num(Math.min(...ms.filter(v => v != null)), 1)} m amsl</b>.</p>` : '') +
    '<p style="margin:0 0 8px">Red columns: candidate borewells from Step 4. ' + (M.rz && M.rz.length && S3.show.rz ? '<b>Amber diamonds</b>: recharge zone points (RZ), at ground level and at the middle of each depth tier where the point was found (the ones inside the block show when you use the cut-away sliders; hover for the nearest ADMT zone); they are candidate zones for connected fractured rock inferred from passive ADMT, not confirmed until drilling and pumping tests. ' : '') + 'Drag to rotate, scroll to zoom, double-click to reset. Scenario results are assumption-driven, not calibrated.</p>';
}

/* ---------- Outcome maps: interactive geospatial maps of the results on the site basemap ---------- */
let OMC = {};
const OM = {layer: 'perm', reading: 'I-NEU', d0: 100, d1: 250, scen: 'S6', t: -1, show: {sites: 1, rz: 1, cb: 1, bw: 1, lines: 1, bnd: 1, tr: 1}};
let RZP = null;
async function buildMaps() {
  await needSetup(); try { await needInterp(); } catch (e) {} try { await needGeo(); } catch (e) {}
  segOn('oml', v => { OM.layer = v; drawMaps(); });
  segOn('omr', v => { OM.reading = v; drawMaps(); });
  $('omd0').oninput = () => { OM.d0 = +$('omd0').value; if (OM.d1 <= OM.d0) { OM.d1 = OM.d0 + 10; $('omd1').value = OM.d1; } $('omd0L').textContent = OM.d0 + ' m'; $('omd1L').textContent = OM.d1 + ' m'; };
  $('omd1').oninput = () => { OM.d1 = +$('omd1').value; if (OM.d0 >= OM.d1) { OM.d0 = OM.d1 - 10; $('omd0').value = OM.d0; } $('omd0L').textContent = OM.d0 + ' m'; $('omd1L').textContent = OM.d1 + ' m'; };
  $('omd0').onchange = $('omd1').onchange = () => drawMaps();
  $('omt').oninput = () => { OM.t = +$('omt').value; $('omtL').textContent = `year ${((OM.t + 1) / 2).toFixed(1)}`; }; $('omt').onchange = () => drawMaps();
  const L = [['sites', 'Candidate sites'], ['rz', 'Recharge zone points (RZ)'], ['cb', 'Cloudburst injection point'], ['bw', 'Reference borewells'], ['lines', 'ADMT lines'], ['bnd', 'Lease boundary'], ['tr', 'Transformer zone']];
  $('omLay').innerHTML = L.map(l => `<button class="chip sm on" data-v="${l[0]}">${l[1]}</button>`).join('');
  $('omLay').onclick = e => { const b = e.target.closest('button'); if (!b) return; b.classList.toggle('on'); OM.show[b.dataset.v] = b.classList.contains('on') ? 1 : 0; drawMaps(); };
  await drawMaps();
}
function nearestCell(R, lat, lon) {
  let best = null; for (let r = 0; r < R.lat.length; r++) for (let c = 0; c < R.lon.length; c++) { const v = R.z[r][c]; if (v == null) continue;
    const d = dist(R.lat[r], R.lon[c], lat, lon); if (!best || d < best.d) best = {d, v, r, c}; } return best;
}
async function drawMaps() {
  const k = [OM.layer, OM.reading, OM.d0, OM.d1, OM.scen, OM.t].join('|');
  const vol = OM.layer === 'perm' || OM.layer === 'sto';
  $('omRdW').hidden = !vol; $('omDepW').hidden = !vol; $('omScW').hidden = vol;
  if (!OMC[k]) { try { OMC[k] = await api('/api/outmaps', Object.assign(SR(), {layer: OM.layer, reading: OM.reading, d0: OM.d0, d1: OM.d1, scen: OM.scen, t: OM.t})); } catch (e) { fail('omap', e); return; } }
  if (!RZP) { try { RZP = (await api('/api/rzpts', S())).points || []; } catch (e) { RZP = []; } }
  const R = OMC[k], St = D.setup, sites = (D.interp && D.interp.sites) || [];
  if (R.scenarios && !$('oms').children.length) {
    if (!R.scenarios.includes(OM.scen)) OM.scen = R.scenarios.includes('S6') ? 'S6' : R.scenarios[0];
    $('oms').innerHTML = R.scenarios.map(s => `<button data-v="${s}" class="${s === OM.scen ? 'on' : ''}" title="${esc(SCN[s] || s)}">${s}</button>`).join('');
    segOn('oms', v => { OM.scen = v; drawMaps(); });
  }
  if (R.nt) $('omt').max = R.nt - 1;
  const tr = [];
  if (R.z) {
    const cfg = {perm: [R.clay ? [[0, '#f6ecdc'], [0.5, '#b07a3c'], [1, '#5c3510']] : [[0, '#e9f6ef'], [0.45, '#4cb88a'], [1, '#08553b']], 'P(permeable)'],
      sto: [[[0, '#eef2fb'], [0.5, '#5b86d6'], [1, '#0f2a6b']], 'Storability (% drains)'],
      head: [[[0, '#fff7c2'], [0.5, '#4fb3a9'], [1, '#17325f']], 'Water level (m amsl)'],
      dd: [[[0, '#fff3d6'], [0.5, '#f0a04b'], [1, '#a1281c']], 'Drawdown vs S0 (m)']}[OM.layer];
    const zf = R.z.flat().filter(v => v != null), zmaxv = zf.length ? Math.max(...zf) : 1;
    tr.push({type: 'heatmap', x: R.lon, y: R.lat, z: R.z, colorscale: cfg[0], zmin: OM.layer === 'perm' ? 0 : (OM.layer === 'dd' ? 0 : undefined), zmax: OM.layer === 'perm' ? Math.max(0.6, zmaxv) : undefined, zsmooth: OM.layer === 'head' || OM.layer === 'dd' ? 'best' : false, opacity: 0.8, connectgaps: false, name: cfg[1],
      colorbar: {title: {text: cfg[1], side: 'right'}, len: 0.6, thickness: 12},
      hovertemplate: `${cfg[1]}: %{z:.${OM.layer === 'head' ? 1 : OM.layer === 'sto' ? 3 : 2}f}<br>%{y:.5f}°N %{x:.5f}°E<extra></extra>`});
    if (OM.layer === 'head') tr.push({type: 'contour', x: R.lon, y: R.lat, z: R.z, showscale: false, hoverinfo: 'skip', contours: {coloring: 'none', showlabels: true, labelfont: {size: 10, color: '#0b2f5c'}}, line: {color: 'rgba(11,47,92,.55)', width: 1}, name: 'Water-level contours'});
  }
  if (OM.show.bnd) tr.push(boundaryTrace());
  if (OM.show.tr) tr.push(...transformerTrace());
  if (OM.show.lines && D.geo) tr.push(...lineTraces({labels: false}).slice(0, allLines().length));
  if (OM.show.bw && St.borewells && St.borewells.length) tr.push(bwTrace());
  if (OM.show.rz && RZP && RZP.length) {            // recharge-zone points: amber diamonds numbered 1..n (hover for the name and the nearest ADMT zone)
    tr.push({type: 'scatter', mode: 'markers+text', x: RZP.map(p => p.Lon), y: RZP.map(p => p.Lat), text: RZP.map(p => String(p.Site).replace('RZ-', '')), textposition: 'middle center',
      textfont: {color: '#3d2600', size: 9, family: FONT.family}, marker: {size: 19, symbol: 'diamond', color: '#f2b01e', line: {color: '#7a4b00', width: 1.2}}, name: 'Recharge zone points (RZ)',
      customdata: RZP.map(p => [p.found || '', p.zone || '–', p.zone_dist == null ? '–' : Math.round(p.zone_dist), p.zone_score == null ? '–' : p.zone_score]),
      hovertemplate: '<b>%{text}</b> (RZ)<br>found: %{customdata[0]}<br>nearest ADMT zone %{customdata[1]} at %{customdata[2]} m, score %{customdata[3]}<extra></extra>'});
  }
  if (OM.show.sites && sites.length) {
    const val = s => { if (!R.z) return null; const n = nearestCell(R, s.Lat, s.Lon); return n && n.d < 60 ? n.v : null; };
    const fmt = v => v == null ? 'no map value here' : (OM.layer === 'sto' ? v.toFixed(3) + ' %' : OM.layer === 'perm' ? v.toFixed(2) : v.toFixed(2) + ' m');
    tr.push({type: 'scatter', mode: 'markers+text', x: sites.map(s => s.Lon), y: sites.map(s => s.Lat), text: sites.map(s => s.Site), textposition: 'middle center', textfont: {color: '#fff', size: 11, family: FONT.family},
      marker: {size: sites.map(s => 14 + 2 * (s.Best_zone_score || 0)), color: sites.map(s => ROLECOL(s.Role)), line: {color: '#fff', width: 2}}, name: 'Candidate sites',
      customdata: sites.map(s => [s.Role, s.Primary_zone || '', s.Best_zone_score, fmt(val(s))]),
      hovertemplate: '<b>Site %{text}</b> · %{customdata[0]}<br>Best zone: %{customdata[1]}<br>Zone score %{customdata[2]} of 10<br>On this map: %{customdata[3]}<extra></extra>'});
  }
  const cb = (R.cloudburst || []).filter(r => r.structure === 'layered');
  if (OM.show.cb && cb.length) {
    const bySite = {}; cb.forEach(r => (bySite[r.inj_site] = bySite[r.inj_site] || []).push(r));
    const X = [], Y = [], T = [];
    Object.entries(bySite).forEach(([cs, rows]) => { const s = sites.find(q => q.Site === cs); if (!s) return; X.push(s.Lon); Y.push(s.Lat);
      T.push(`<b>Cloudburst injection · site ${esc(cs)}</b><br>one storm day of roof water, central assumptions (suggested values), layered ground<br>` + rows.map(r => `${esc(r.label)}: ${r.to_aquifer_pct != null ? r.to_aquifer_pct.toFixed(0) : '–'} % reaches the water table, ${r.held_unsat_pct != null ? r.held_unsat_pct.toFixed(0) : '–'} % held above it, delay ${r.mean_delay_d != null ? r.mean_delay_d.toFixed(0) : '–'} d, still stored after 1 yr ${r.retained_1y_pct != null ? r.retained_1y_pct.toFixed(1) : '–'} %`).join('<br>')); });
    if (X.length) tr.push({type: 'scatter', mode: 'markers', x: X, y: Y, marker: {symbol: 'star', size: 24, color: '#ffd23f', line: {color: '#111', width: 1.6}}, name: 'Cloudburst injection point', hovertext: T, hoverinfo: 'text', hoverlabel: {align: 'left'}});
  }
  const lay = mapLayout(extentOf(St.views && St.views.site), {hovermode: 'closest', margin: {l: 10, r: 10, t: 10, b: 50}});
  lay.legend = Object.assign({}, lay.legend, {y: -0.04});
  draw('omap', tr, lay, Object.assign({}, CFG, {scrollZoom: true, toImageButtonOptions: {format: 'png', scale: 4, filename: `AquaTwin_map_${OM.layer}`}}));
  // plain-language reading of the map
  let h = '';
  const NOTE = {perm: `<b>Green = more likely permeable</b>: the share of realisations in which the ${esc(RNAME[OM.reading])} reading puts a permeable class in each 10 m cell, averaged from ${OM.d0} to ${OM.d1} m. These are candidate zones for connected fractured rock, inferred from passive ADMT readings, not confirmed until drilling and pumping tests.`,
    sto: `<b>Darker blue = more storable rock</b>: the display index of drainable storage (% of rock volume), averaged from ${OM.d0} to ${OM.d1} m. It follows the assumption register's Sy for each depth unit, raised where the permeable probability is high. It is not a measured value and not a model input.`,
    head: `<b>MODFLOW water level</b> in layer ${R.layer_no || ''} for <b>${esc(SCN[R.scen] || R.scen || '')}</b> after ${R.years || ''} years (central case H3). Lines join equal water levels. Scenario results are assumption-driven, not calibrated.`,
    dd: `<b>Drawdown</b>: how much lower the water level is than in S0, after ${R.years || ''} years, for <b>${esc(SCN[R.scen] || R.scen || '')}</b>. Darker red = bigger drawdown. ${R.scen === 'S0' ? 'S0 is the baseline, so nothing is shown; pick another scenario.' : ''}`}[OM.layer];
  h += `<p style="margin:0 0 8px">${NOTE}</p>`;
  if (!R.z) h += `<div class="banner warn" style="margin:0 0 8px"><span>${ic('alert')}</span><span>This run has no ${vol ? 'M5 (ADMT volume)' : 'M7 (MODFLOW water level)'} result yet. Use <b>Start a calculation</b>, or pick a run that has it.</span></div>`;
  else if (vol && sites.length) {
    const rows = sites.map(s => { const n = nearestCell(R, s.Lat, s.Lon); return {s, v: n && n.d < 60 ? n.v : null}; }).filter(r => r.v != null).sort((a, b) => b.v - a.v);
    if (rows.length) h += `<p style="margin:0 0 4px"><b>Candidate sites on this map</b> (highest first)</p><p style="margin:0 0 8px">` + rows.map(r => `Site ${esc(r.s.Site)} <b>${OM.layer === 'sto' ? r.v.toFixed(3) + ' %' : r.v.toFixed(2)}</b>`).join(' · ') + '</p>';
    let mx = null; R.z.forEach((row, r) => row.forEach((v, c) => { if (v != null && (!mx || v > mx.v)) mx = {v, r, c}; }));
    if (mx) h += `<p style="margin:0 0 8px">Highest value on the map: <b>${OM.layer === 'sto' ? mx.v.toFixed(3) + ' %' : mx.v.toFixed(2)}</b>.</p>`;
  } else if (R.z) {
    let mn = Infinity, mxv = -Infinity; R.z.forEach(row => row.forEach(v => { if (v != null) { mn = Math.min(mn, v); mxv = Math.max(mxv, v); } }));
    h += `<p style="margin:0 0 8px">Range on the map: <b>${mn.toFixed(OM.layer === 'head' ? 1 : 2)} to ${mxv.toFixed(OM.layer === 'head' ? 1 : 2)} m</b>.</p>`;
  }
  if (cb.length && OM.show.cb) h += '<p style="margin:0 0 8px"><b>Yellow star</b>: where the cloudburst recharge structures are placed in the cloudburst run. Hover for what happens to the water at each tier.</p>';
  h += '<p style="margin:0">Pan by dragging, zoom with the scroll wheel, double-click to reset. The camera icon saves a high-resolution picture for reports.</p>';
  $('omNote').innerHTML = h;
}
const _resetOM = resetData;
resetData = function (k) { _resetOM(k); OMC = {}; RZP = null; const o = $('oms'); if (o) o.innerHTML = ''; };

/* ---------- Start a calculation ---------- */
const ORDER = ['M0', 'E1', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M7B', 'M8', 'OUT', 'PRED', 'M7D'];
const PRESETS = [
  {id: 'quick', t: 'Quick test', d: 'All modules, 10 MODFLOW parameter sets. Checks that everything runs.', m: ORDER, n: 10, mode: 'new'},
  {id: 'full', t: 'Full calculation', d: 'All modules with the engine default number of parameter sets. Takes the longest (M7).', m: ORDER, n: '', mode: 'new'},
  {id: 'data', t: 'Data and ADMT only (M0–M6)', d: 'After new field data: audit, QC, classes, readings, storage. No MODFLOW.', m: ORDER.slice(0, 8), n: '', mode: 'new'},
  {id: 'model', t: 'Model only (into the selected saved run)', d: 'After editing the register or sites: M7 to the locked predictions, written into the selected saved run.', m: ['M7', 'M7B', 'M8', 'OUT', 'PRED'], n: '', mode: 'cont'},
  {id: 'cb', t: 'Cloudburst tiers only (into the selected saved run)', d: 'After editing the cloudburst assumptions: M7D in the selected saved run (needs M5). With 10 parameter sets it takes roughly 10–20 minutes (260 MODFLOW simulations).', m: ['M7D'], n: 10, mode: 'cont'},
];
let RUNSEL = new Set(ORDER), jobTimer = null, curJob = null;
async function buildRun() {
  $('presets').innerHTML = PRESETS.map(p => `<button class="preset" data-p="${p.id}"><b>${p.t}</b><span>${p.d}</span></button>`).join('');
  $('presets').onclick = e => { const b = e.target.closest('.preset'); if (!b) return; const p = PRESETS.find(x => x.id === b.dataset.p);
    $('presets').querySelectorAll('.preset').forEach(x => x.classList.toggle('on', x === b));
    RUNSEL = new Set(p.m); $('runNlhs').value = p.n; $('runMode').value = p.mode; drawModChips(); runNote(); };
  $('runMode').onchange = runNote;
  drawModChips(); runNote();
  await pollJobs(true);
}
function drawModChips() {
  $('modChips').innerHTML = ORDER.map(m => `<button class="chip sm ${RUNSEL.has(m) ? 'on' : ''}" data-m="${m}">${m}</button>`).join('');
  $('modChips').onclick = e => { const b = e.target.closest('button'); if (!b) return; const m = b.dataset.m; RUNSEL.has(m) ? RUNSEL.delete(m) : RUNSEL.add(m); b.classList.toggle('on');
    $('presets').querySelectorAll('.preset').forEach(x => x.classList.remove('on')); runNote(); };
}
function runNote() { const cont = $('runMode').value === 'cont';
  $('runNote').textContent = cont ? `Writes into saved run ${RUN || '(none selected)'}; modules you choose are redone there.` : 'Creates a new saved run; existing saved runs are never changed.'; }
async function startRun() {
  const mods = ORDER.filter(m => RUNSEL.has(m)); if (!mods.length) { $('runNote').textContent = 'Choose at least one module.'; return; }
  const cont = $('runMode').value === 'cont'; if (cont && !RUN) { $('runNote').textContent = 'No run selected to continue.'; return; }
  if (!cont && !mods.includes('M0')) { $('runNote').textContent = 'These modules need results from an earlier run. Set "Save the results in" to "The selected saved run" (or tick M0 and the modules before them), otherwise a new run folder holding only these results would be created.'; return; }
  $('runStart').disabled = true; $('runNote').textContent = 'Starting…';
  try { curJob = await post('/api/run/start', {site: SITE, modules: mods, run: cont ? RUN : null, n_lhs: +$('runNlhs').value || null, workers: +$('runWorkers').value || 2});
    $('runNote').textContent = 'Running. You can keep working in other steps; progress continues here.'; watchJobs(); await pollJobs(); }
  catch (e) { $('runNote').textContent = 'Could not start: ' + e.message; $('runStart').disabled = false; }
}
async function stopRun() { if (!curJob) return; try { await post('/api/run/stop', {pid: curJob.pid}); $('runNote').textContent = 'Stop requested.'; } catch (e) { $('runNote').textContent = e.message; } pollJobs(); }
async function pollJobs(first) {
  let J; try { J = (await api('/api/jobs', S())).jobs || []; } catch (e) { fail('runJob', e); return; }
  const j = J[0]; if (!j) { $('runJob').innerHTML = '<p class="note">No calculation has been started from the Studio for this site yet.</p>'; return; }
  curJob = j;
  const mods = j.modules && j.modules.length ? j.modules : ORDER, fin = new Set(j.finished_modules || []);
  const state = j.running ? '<span class="pill p-b">running</span>' : j.failed ? '<span class="pill p-r">stopped with an error</span>' : '<span class="pill p-g">finished</span>';
  $('runJob').innerHTML = `<div class="row" style="gap:8px;align-items:center;margin-bottom:10px">${state}<span class="note">started ${esc(j.started)}${j.run_folder ? ' · saved run ' + esc(j.run_folder.split(/[\\/]/).pop()) : ''}</span></div>` +
    `<div class="chips" style="margin-bottom:10px">${mods.map(m => `<span class="chip sm ${fin.has(m) ? 'on' : ''}">${fin.has(m) ? '✓ ' : ''}${m}</span>`).join('')}</div>` +
    `<pre style="background:#0f2b2c;color:#d8ecea;border-radius:10px;padding:12px;max-height:340px;overflow:auto;font:11.5px/1.45 JetBrains Mono,monospace;white-space:pre-wrap">${esc((j.tail || []).join('\n'))}</pre>` +
    (!j.running && j.run_folder ? `<button class="btn pri" style="margin-top:10px" onclick="openRun('${esc(j.run_folder.split(/[\\/]/).pop())}')">Open this saved run</button>` : '');
  $('runStop').hidden = !j.running; $('runStart').disabled = !!j.running;
  if (j.running && !jobTimer) jobTimer = setInterval(() => { if (!$('p6').classList.contains('on')) return; pollJobs(); }, 3000);
  if (!j.running && jobTimer) { clearInterval(jobTimer); jobTimer = null; if (!first) loadRuns(); }
  const pre = $('runJob').querySelector('pre'); if (pre) pre.scrollTop = 1e6;
}
async function openRun(id) { await loadRuns(); if ([...$('runSel').options].some(o => o.value === id)) { $('runSel').value = id; $('runSel').onchange(); } }

/* ---------- Storage & connectivity ---------- */
async function buildSto() {
  let G; try { G = await api('/api/storage', SR()); } catch (e) { fail('stoDist', e); return; }
  const W = G.window_dist || {}, ks = Object.keys(W);
  if (ks.length) draw('stoDist', ks.map(k => ({type: 'violin', x: W[k], y0: RNAME[k] || k, name: RNAME[k] || k, orientation: 'h', side: 'positive', width: 1.6, points: false,
    line: {color: RCOL[k]}, fillcolor: RCOL[k] + '55', meanline: {visible: true}, hoverinfo: 'x+name'})),
    base({margin: {l: 80, r: 20, t: 10, b: 50}, showlegend: false, xaxis: {title: 'water in storage, 120–250 m window (m³)', gridcolor: '#e6eeee', rangemode: 'tozero'}, violingap: 0}), CFG);
  else $('stoDist').innerHTML = '<p class="note">No storage Monte Carlo in this run (needs M6).</p>';
  const S = G.storage || [], qs = [...new Set(S.map(r => r.quantity))];
  $('stoT').innerHTML = '<thead><tr><th>Quantity</th><th>Reading</th><th>P10</th><th>P50</th><th>P90</th></tr></thead><tbody>' + qs.map(q => S.filter(r => r.quantity === q).map((r, i) =>
    `<tr>${i === 0 ? `<td rowspan="${S.filter(x => x.quantity === q).length}" style="max-width:260px"><b>${esc(nice(q))}</b>${r.definition ? `<br><span class="note">${esc(r.definition)}</span>` : ''}</td>` : ''}<td><span class="pill" style="background:${RCOL[r.interpretation]}22;color:${RCOL[r.interpretation]}">${esc(RNAME[r.interpretation] || r.interpretation)}</span></td><td class="num">${num(r.P10)}</td><td class="num"><b>${num(r.P50)}</b></td><td class="num">${num(r.P90)}</td></tr>`).join('')).join('') + '</tbody>';
  const C = G.connectivity || [], sites = [...new Set(C.map(r => r.site))], rd = [...new Set(C.map(r => r.interpretation))];
  const pk = Object.keys(C[0] || {}).find(k => /permeable_class/.test(k)), wk = Object.keys(C[0] || {}).find(k => /pathway/.test(k));
  if (C.length) draw('conPlot', rd.flatMap(r => [
    {type: 'bar', name: (RNAME[r] || r) + ': permeable at well', x: sites, y: sites.map(s => (C.find(c => c.site === s && c.interpretation === r) || {})[pk]), marker: {color: RCOL[r]}, offsetgroup: r, legendgroup: r,
      customdata: sites.map(s => (C.find(c => c.site === s && c.interpretation === r) || {}).role), hovertemplate: 'Site %{x} (%{customdata})<br>permeable class at well: %{y:.0f} %<extra>' + (RNAME[r] || r) + '</extra>'},
    {type: 'scatter', mode: 'markers', name: (RNAME[r] || r) + ': pathway from upper zone', x: sites, y: sites.map(s => (C.find(c => c.site === s && c.interpretation === r) || {})[wk]), marker: {symbol: 'diamond', size: 11, color: '#fff', line: {color: RCOL[r], width: 2.5}},
      offsetgroup: r, legendgroup: r, showlegend: true, hovertemplate: 'Site %{x}<br>pathway: %{y:.0f} %<extra>' + (RNAME[r] || r) + '</extra>'}]),
    base({barmode: 'group', scattermode: 'group', margin: {l: 56, r: 10, t: 10, b: 90}, yaxis: {title: '% of realisations', range: [0, 105], gridcolor: '#e6eeee'}, xaxis: {title: 'candidate site'}, legend: {orientation: 'h', y: -0.22, font: {size: 11}}}), CFG);
  else $('conPlot').innerHTML = '<p class="note">No connectivity table in this run (needs M6 and candidate sites).</p>';
  const P = (G.priorities || []).slice().sort((a, b) => Math.abs(b.spearman_rho) - Math.abs(a.spearman_rho));
  table('prioT', P, [['quantity', 'Quantity', v => esc(nice(v))], ['input', 'Assumption'], ['spearman_rho', 'Effect (ρ)', v => `<span class="num">${num(v, 2)}</span>`], ['field_measurement', 'Measurement that would narrow it']]);
}

/* ---------- MODFLOW scenarios ---------- */
let SC = null;
async function buildScn() {
  try { SC = await api('/api/scenarios', SR()); } catch (e) { fail('scnBox', e); return; }
  segOn('scnB', drawScn); $('scnPl').onchange = drawScn;
  const hs = (SC.head_series || []).filter(h => !h.error);
  const sts = [...new Set(hs.map(h => h.structure))], scs = [...new Set(hs.map(h => h.scenario))];
  $('hsStruct').innerHTML = sts.map(s => `<option value="${s}">${esc(STN[s] || s)}</option>`).join('');
  $('hsScen').innerHTML = '<option value="all">all scenarios (P50)</option>' + scs.map(s => `<option value="${s}">${esc(SCN[s] || s)}</option>`).join('');
  $('hsStruct').onchange = $('hsScen').onchange = drawHs;
  drawScn(); drawHs();
  table('partT', SC.particles, [['T_years', 'After (years)'], ['particles', 'Particles'], ['captured_by_well_pct', 'Captured by well (%)'], ['reached_boundary_pct', 'Reached boundary (%)'], ['still_in_domain_pct', 'Still in domain (%)']], {empty: 'No particle tracking (M7B) in this run.'});
}
function drawScn() {
  const b = segVal('scnB') || 'all', pl = $('scnPl').checked;
  const E = (SC.effects || []).filter(r => r.drawdown_well_end_m != null && (b === 'all' || r.boundary === b) && (!pl || r.plausible_vs_CGWB === true || r.plausible_vs_CGWB === 'True'));
  const order = ['S6', 'S1', 'S2', 'S3', 'S4', 'S5'].filter(s => E.some(r => r.scenario === s));
  const sts = [...new Set(E.map(r => r.structure))];
  $('scnN').textContent = `${E.length} MODFLOW simulations shown`;
  if (!E.length) { if ($('scnBox')._fullLayout) Plotly.purge($('scnBox')); $('scnBox').innerHTML = '<p class="note">No MODFLOW results for this choice (needs M7).</p>'; }
  else draw('scnBox', sts.map(s => { const R = E.filter(r => r.structure === s && order.includes(r.scenario));
    return {type: 'box', name: STN[s] || s, visible: s === 'compart' ? 'legendonly' : true, x: R.map(r => SCN[r.scenario] || r.scenario), y: R.map(r => r.drawdown_well_end_m), marker: {color: RCOL[s] || '#555', size: 3}, boxpoints: 'outliers', line: {width: 1.5},
      customdata: R.map(r => [r.set, r.boundary]), hovertemplate: '%{x}<br>drawdown %{y:.2f} m<extra>' + esc(STN[s] || s) + '</extra>'}; }),
    base({boxmode: 'group', margin: {l: 60, r: 10, t: 10, b: 70}, xaxis: {categoryorder: 'array', categoryarray: order.map(s => SCN[s])}, yaxis: {title: 'drawdown at the well after 10 years (m)', gridcolor: '#e6eeee', zeroline: false}, legend: {orientation: 'h', y: -0.18}}), CFG);
  const sum = pl ? SC.plausible_summary : SC.summary;
  table('scnT', sum, [['scenario', 'Scenario', v => `<b>${esc(SCN[v] || v)}</b>`], ['runs', 'Simulations'], ['drawdown_well_end_m', 'Drawdown (m) P50 (P10–P90)'], ['drawdown_reduction_vs_S6_m', 'Less drawdown than S6 (m)'],
    ['recharge_retained_vs_S6_pct', 'Recharge kept on site (%)'], ['abstraction_avoided_10yr_m3', 'Pumping avoided, 10 yr (m³)']]);
}
function drawHs() {
  const st = $('hsStruct').value, sc = $('hsScen').value, hs = (SC.head_series || []).filter(h => !h.error && h.structure === st);
  if (!hs.length) { $('hsPlot').innerHTML = '<p class="note">No water-level series in this run (needs M7).</p>'; return; }
  const yrs = hs[0].p50.map((v, i) => (i + 1) / 2), tr = [];
  const pal = {S0: '#7d8f8d', S6: '#c2453c', S1: '#e0a030', S2: '#2f7fe0', S3: '#7a4f9e', S4: '#3fae7f', S5: '#0b5f43'};
  if (sc === 'all') hs.forEach(h => tr.push({type: 'scatter', mode: 'lines', x: yrs, y: h.p50, name: SCN[h.scenario] || h.scenario, line: {color: pal[h.scenario], width: 2}, hovertemplate: '%{y:.1f} m<extra>' + esc(SCN[h.scenario]) + '</extra>'}));
  else { const h = hs.find(x => x.scenario === sc); if (h) { const c = pal[sc] || '#2f7fe0';
    tr.push({type: 'scatter', mode: 'lines', x: yrs, y: h.p90, line: {width: 0}, showlegend: false, hoverinfo: 'skip'},
      {type: 'scatter', mode: 'lines', x: yrs, y: h.p10, fill: 'tonexty', fillcolor: c + '33', line: {width: 0}, name: 'P10–P90', hoverinfo: 'skip'},
      {type: 'scatter', mode: 'lines', x: yrs, y: h.p50, line: {color: c, width: 2.5}, name: `P50 (${h.n} simulations)`, hovertemplate: 'year %{x}<br>%{y:.1f} m amsl<extra></extra>'}); } }
  draw('hsPlot', tr, base({margin: {l: 64, r: 10, t: 10, b: 80}, xaxis: {title: 'years (half-year steps; wet and dry season)', gridcolor: '#eef3f3'}, yaxis: {title: 'water level at the well (m amsl)', gridcolor: '#e6eeee'}, legend: {orientation: 'h', y: -0.25, font: {size: 11}}}), CFG);
}

/* ---------- What-if ---------- */
let WI = null, WIV = {};
async function buildWi() {
  try { WI = await api('/api/whatif/spec', SR()); } catch (e) { fail('wiDD', e); return; }
  if (!WI.available) { $('wiDD').innerHTML = `<p class="note">${esc(WI.reason || 'No surrogate in this run.')} Choose a saved run with M8 in the Saved run box at the top, or start a Full calculation.</p>`; $('wiDD').style.height = 'auto'; $('wiRet').closest('.card').hidden = true; return; }
  $('wiDD').style.height = ''; $('wiRet').closest('.card').hidden = false;
  WIV = {}; WI.params.forEach(p => WIV[p.key] = p.central);
  const sl = p => { const lg = p.log && p.low > 0, a = lg ? Math.log10(p.low) : p.low, b = lg ? Math.log10(p.high) : p.high, v = lg ? Math.log10(p.central) : p.central;
    return `<div class="ctl"><label title="${esc(p.label)}">${esc(p.label.length > 58 ? p.label.slice(0, 56) + '…' : p.label)} <span class="note">(${esc(p.unit || '-')})</span></label>
      <input type="range" data-k="${p.key}" data-log="${lg ? 1 : 0}" min="${a}" max="${b}" step="${(b - a) / 100}" value="${v}"><span class="num note" id="wv_${p.key}">${num(p.central, 3)} <span style="color:#9aa">(${num(p.low, 3)}–${num(p.high, 3)})</span></span></div>`; };
  $('wiSliders').innerHTML = WI.params.filter(p => p.primary).map(sl).join('');
  $('wiMore').innerHTML = WI.params.filter(p => !p.primary).map(sl).join('');
  const go_ = debounce(wiRun, 180);
  document.querySelectorAll('#wiSliders input, #wiMore input').forEach(i => i.oninput = () => {
    const p = WI.params.find(x => x.key === i.dataset.k), v = i.dataset.log === '1' ? Math.pow(10, +i.value) : +i.value;
    WIV[p.key] = v; $('wv_' + p.key).innerHTML = `${num(v, 3)} <span style="color:#9aa">(${num(p.low, 3)}–${num(p.high, 3)})</span>`; go_(); });
  segOn('wiB', () => wiRun()); segOn('wiBase', () => wiRun());
  try {   // say so when the surrogate learned no effect of a switch (its trees never split on it)
    const q = (bd, mb) => post('/api/whatif/predict', {site: SITE, run: RUN, vals: WIV, boundary: bd, model_base: mb});
    const [a, b2, c] = await Promise.all([q('B1_GHB', 600), q('B1_GHB', 400), q('B2_closed', 600)]);
    const same = (x, y) => JSON.stringify(x.drawdown_well_end_m) === JSON.stringify(y.drawdown_well_end_m);
    [['wiBase', same(a, b2)], ['wiB', same(a, c)]].forEach(([id, s_]) => { const n = $(id).nextElementSibling;
      if (s_ && !(n && n.classList.contains('wi-none'))) $(id).insertAdjacentHTML('afterend', '<p class="note wi-none" style="margin:4px 0 0">No effect in this run: the surrogate learned nothing from this switch (the MODFLOW runs did not differ enough).</p>'); });
  } catch (e) { console.error(e); }
  await wiRun();
}
function wiReset() { if (!WI || !WI.available) return; T6.wi = 0; showT6('wi'); }
async function wiRun() {
  let R; try { R = await post('/api/whatif/predict', {site: SITE, run: RUN, vals: WIV, boundary: segVal('wiB') || 'B1_GHB', model_base: +(segVal('wiBase') || 600)}); } catch (e) { fail('wiDD', e); return; }
  $('wiWarn').hidden = (R.inside || []).every(Boolean);
  const sts = [...new Set(R.structure)], scs = ['S6', 'S1', 'S2', 'S3', 'S4', 'S5'];
  const pick = (k, s) => scs.map(sc => { const i = R.structure.findIndex((x, j) => x === s && R.scenario[j] === sc); return i < 0 || !R[k] ? null : R[k][i]; });
  draw('wiDD', sts.map(s => { const y = pick('drawdown_well_end_m', s), lo = pick('drawdown_well_end_m_p10', s), hi = pick('drawdown_well_end_m_p90', s);
    return {type: 'bar', name: STN[s] || s, x: scs.map(c => SCN[c]), y, marker: {color: RCOL[s]}, error_y: {type: 'data', symmetric: false, array: hi.map((v, i) => v - y[i]), arrayminus: y.map((v, i) => v - lo[i]), color: '#33504e', thickness: 1.2, width: 3},
      customdata: lo.map((v, i) => [v, hi[i]]), hovertemplate: '%{x}<br>%{y:.2f} m (P10 %{customdata[0]:.2f} – P90 %{customdata[1]:.2f})<extra>' + esc(STN[s] || s) + '</extra>'}; }),
    base({barmode: 'group', margin: {l: 60, r: 10, t: 10, b: 80}, yaxis: {title: 'drawdown at the well (m)', gridcolor: '#e6eeee', rangemode: 'tozero'}, legend: {orientation: 'h', y: -0.2}}), CFG);
  const s5 = scs.slice(1);
  draw('wiRet', sts.flatMap(s => [{type: 'bar', name: (STN[s] || s), x: s5.map(c => SCN[c]), y: s5.map(c => { const i = R.structure.findIndex((x, j) => x === s && R.scenario[j] === c); return i < 0 || !R.recharge_retained_vs_S6_pct ? null : R.recharge_retained_vs_S6_pct[i]; }),
    marker: {color: RCOL[s]}, hovertemplate: '%{x}<br>%{y:.2f} % of the added recharge stays on site<extra>' + esc(STN[s] || s) + '</extra>'}]),
    base({barmode: 'group', margin: {l: 60, r: 10, t: 10, b: 70}, yaxis: {title: 'added recharge kept on site (%)', gridcolor: '#e6eeee', rangemode: 'tozero'}, legend: {orientation: 'h', y: -0.25}}), CFG);
}

/* ============================================================ STEP 7 · REPORTS & DECISIONS */
let RP = null;
BUILD[7] = async function () {
  $('outCards').innerHTML = '<div class="loading">Reading the run\'s reports…</div>';
  try { RP = await api('/api/reports', SR()); } catch (e) { fail('outCards', e); throw e; }
  prepInit();
  segOn('t7', t => { document.querySelectorAll('.t7').forEach(d => d.hidden = d.dataset.t !== t); document.querySelectorAll(`.t7[data-t="${t}"] .js-plotly-plot`).forEach(p => Plotly.Plots.resize(p)); });
  $('stamp7').textContent = `Saved run ${RUN} · scenario results are assumption-driven and not calibrated · ADMT readings are hypotheses until the first borehole`;
  const P = RP.predictions;
  $('predBadge').textContent = P ? (P.verified ? 'Predictions locked ✓' : 'Lock check FAILED') : 'No locked predictions';
  $('predBadge2').innerHTML = P ? `${esc(P.locked || '')}<br>${P.records.length} items` : 'run PRED (Step 6)';
  // outcomes
  const M = RP.matrix || [], mean = RP.meaning || [];
  $('outCards').innerHTML = mean.map(m => { const rows = M.filter(r => r.case === m.case), o = rows.find(r => r.boundary === 'B1_GHB') || rows[0] || {}, c = rows.find(r => r.boundary === 'B2_closed') || {};
    return `<div class="card outcard" style="border-top:4px solid ${RCOL[m.case] || '#888'}"><span class="pill" style="background:${RCOL[m.case]}22;color:${RCOL[m.case]}">${esc(m.case)}</span>
      <h4 style="margin-top:8px">${esc(m.reading)} reading</h4><div class="big num">${num(o.storage_window_P50_m3)} m³</div><div class="note">water held in 120–250 m (P50; P10 ${num(o.storage_window_P10_m3)} – P90 ${num(o.storage_window_P90_m3)})</div>
      <dl><dt>Permeable at well</dt><dd>${num(o.permeable_at_well_pct, 0)} %</dd><dt>Pathway to well</dt><dd>${num(o.pathway_at_well_pct, 0)} %</dd>
      <dt>S6 drawdown (open)</dt><dd>${num(o.S6_drawdown_P50_m, 1)} m · ${esc(o.S6_drawdown_class || '')}</dd><dt>S6 drawdown (closed)</dt><dd>${num(c.S6_drawdown_P50_m, 1)} m</dd></dl>
      <p style="font-size:13px;line-height:1.55;margin:6px 0"><b>Means:</b> ${esc(m.what_it_means)}</p><p style="font-size:13px;line-height:1.55;margin:6px 0"><b>Do:</b> ${esc(m.what_to_do)}</p>
      <p class="note" style="margin:6px 0 0"><b>Confirmed if:</b> ${esc(m.borehole_evidence_that_confirms_it || '')}</p></div>`; }).join('') || '<p class="note">No outcome matrix in this run (needs OUT).</p>';
  table('outT', M, [['reading', 'Reading', (v, r) => `<b style="color:${RCOL[r.case]}">${esc(v)}</b>`], ['boundary', 'Boundary', v => v === 'B1_GHB' ? 'open' : v === 'B2_closed' ? 'closed' : esc(v)],
    ['storage_window_P50_m3', 'Storage P50 (m³)'], ['permeable_at_well_pct', 'Permeable at well (%)'], ['pathway_range_all_sites_pct', 'Pathway, all sites (%)'],
    ['S6_drawdown_P50_m', 'S6 drawdown P50 (m)'], ['S5_drawdown_reduction_P50_m', 'S5 reduction (m)'], ['S5_recharge_retained_P50_pct', 'S5 recharge kept (%)'], ['plausible_vs_CGWB_pct', 'Plausible vs CGWB (%)'], ['parameter_sets', 'Sets']]);
  // predictions
  if (P) {
    $('predPill').innerHTML = P.verified ? '<span class="pill p-g">fingerprint verified</span>' : '<span class="pill p-r">file changed after locking</span>';
    $('predSub').innerHTML = `File <b>${esc(P.file)}</b>, locked ${esc(P.locked || '')}. SHA-256 <span class="num" style="font-size:11px">${esc(P.sha256.slice(0, 16))}…</span>. These are compared with the first borehole log; they are not changed afterwards.` +
      (P.rules ? '<br>Comparison rules: ' + Object.entries(P.rules).map(([k, v]) => `<i>${esc(nice(k))}</i>: ${esc(v)}`).join('; ') : '');
    table('predT', P.records, [['site', 'Site', (v, r) => `<b>${esc(v)}</b><br><span class="note">${esc(r.role || '')}</span>`], ['item', 'What is predicted'], ['predicted', 'Prediction'], ['eligibility', 'Status', v => `<span class="pill p-a">${esc(v)}</span>`],
      ['depth_confidence', 'Depth confidence'], ['observation_required', 'Borehole must show']]);
  } else { $('predSub').textContent = 'This run has no locked predictions. Run PRED from Step 6.'; table('predT', []); }
  // decisions
  segOn('decF', drawDec); $('decQ').oninput = drawDec; drawDec();
  // reports + figures
  $('repList').innerHTML = (RP.reports || []).map(r => `<button data-r="${esc(r)}">${esc(r.replace('.md', '').replace(/_/g, ' '))}</button>`).join('') || '<p class="note">No reports.</p>';
  $('repList').onclick = e => { const b = e.target.closest('button'); if (b) showRep(b.dataset.r); };
  if ((RP.reports || []).length) showRep(RP.reports.includes('OUT_report.md') ? 'OUT_report.md' : RP.reports[0]);
  const F = RP.figures || [];
  $('figN').textContent = F.length ? `${F.length} figures · click to enlarge` : '';
  $('figGrid').innerHTML = F.map(f => { const u = `/api/runfile?${new URLSearchParams({site: SITE, run: RUN, path: f.path})}`;
    return `<div class="fig" onclick="$('lbImg').src='${u}';$('lightbox').hidden=false"><img loading="lazy" src="${u}" alt="${esc(f.name)}"><div><b>${esc(f.module)}</b> · ${esc(f.name.replace(/_/g, ' '))}</div></div>`; }).join('') || '<p class="note">No figures in this run folder.</p>';
  // confidence
  $('confCards').innerHTML = (RP.confidence || []).map(c => `<div class="card"><h3><span data-i="shield"></span>${esc(c.layer)}</h3><p style="margin:0;line-height:1.6;font-size:13.5px">${esc(c.status)}</p></div>`).join('') +
    '<div class="card"><h3><span data-i="info"></span>How to read this</h3><p class="note" style="margin:0;line-height:1.6">Each layer is reported separately and never combined into one score. A strong model layer does not make up for a weak data layer.</p></div>';
  paintIcons($('p7'));
};

/* ---- prepare report (Word + PDF) ---- */
let PROPT = null;
async function prepInit() {
  try { if (!PROPT) PROPT = await api('/api/report/options'); } catch (e) { $('prSecs').innerHTML = `<div class="err">${esc(e.message)}</div>`; return; }
  if (!$('prSecs').dataset.done) {
    $('prSecs').innerHTML = PROPT.sections.map(s => `<label class="chk"><input type="checkbox" data-s="${esc(s.id)}" ${s.default ? 'checked' : ''}> ${esc(s.label)}</label>`).join('');
    $('prSecs').dataset.done = '1';
    try { $('prBy').value = localStorage.getItem('aq_by') || ''; } catch (e) {}
    $('prGo').onclick = prepGo;
  }
  $('prRunName').textContent = RUN; $('prRunN').textContent = (typeof RUNS !== 'undefined' ? RUNS.length : 1) + ' saved runs';
  prepList();
}
async function prepList() {
  try {
    const L = (await api('/api/report/list', SR())).files;
    const q_ = f => new URLSearchParams({site: SITE, run: RUN, path: f.path, v: f.made});
    $('prList').innerHTML = L.length ? '<table><tr><th>File</th><th>Made</th><th>Size</th><th></th></tr>' + L.map((f, n) => {
      return `<tr><td><b>${esc(f.kind)}</b> · ${esc(f.name)}</td><td>${esc(f.made)}</td><td>${f.kb >= 1024 ? (f.kb / 1024).toFixed(1) + ' MB' : f.kb + ' KB'}</td>` +
        `<td style="white-space:nowrap"><button class="btn ghost" style="padding:6px 12px;font-size:13px;text-decoration:none" data-open="${n}">Open</button> <a class="btn ghost" style="padding:6px 12px;font-size:13px;text-decoration:none" href="/api/runfile?${q_(f)}&dl=1">Save a copy</a></td></tr>`; }).join('') +
      '</table><p class="note" style="margin-top:8px"><b>Open</b> opens the file on this computer in Word or your PDF viewer. <b>Save a copy</b> downloads it through the browser. <button class="btn ghost" style="padding:6px 12px;font-size:13px" id="prFolder">Open the report folder</button> The files are in the run folder, under report.</p>'
      : 'No report prepared for this run yet.';
    const opn = async (name, el) => { const t = el && el.textContent; try { if (el) el.textContent = 'Opening…'; await post('/api/report/open', {site: SITE, run: RUN, name}); if (el) el.textContent = t; }
      catch (e) { if (el) el.textContent = t; aqToast ? aqToast('Could not open it: ' + e.message + '. Use Save a copy, or open the report folder.') : alert(e.message); } };
    $('prList').querySelectorAll('button[data-open]').forEach(b => b.onclick = () => opn(L[+b.dataset.open].name, b));
    if ($('prFolder')) $('prFolder').onclick = () => opn(null, $('prFolder'));
  } catch (e) { fail('prList', e); }
}
async function prepGo() {
  const secs = [...document.querySelectorAll('#prSecs input:checked')].map(i => i.dataset.s);
  const fm = [$('prDocx').checked ? 'docx' : null, $('prPdf').checked ? 'pdf' : null].filter(Boolean);
  if (!secs.length || !fm.length) { $('prMsg').textContent = 'Choose at least one section and one format.'; return; }
  const all = document.querySelector('input[name=prScope]:checked').value === 'all';
  const runs = all ? RUNS.map(r => r.id) : [RUN];
  const by = $('prBy').value.trim(); try { localStorage.setItem('aq_by', by); } catch (e) {}
  $('prGo').disabled = true; $('prMsg').textContent = `Preparing ${runs.length} report${runs.length > 1 ? 's' : ''}… please keep this page open.`;
  const t0 = Date.now();
  try {
    const R = (await post('/api/report/build', {site: SITE, runs, formats: fm, sections: secs, by})).results;
    const ok = R.filter(r => r.ok), bad = R.filter(r => !r.ok);
    $('prMsg').innerHTML = `Done in ${Math.round((Date.now() - t0) / 1000)} s: ${ok.length} report${ok.length === 1 ? '' : 's'} written` + (ok[0] ? ` (${ok[0].tables} tables, ${ok[0].figures} figures in the first)` : '') + '.' +
      (bad.length ? `<br><span style="color:#8a1f12">Not written: ${bad.map(b => esc(b.run) + ' (' + esc(b.error) + ')').join('; ')}</span>` : '') +
      (ok.some(r => (r.warnings || []).length) ? '<br>Notes: ' + esc(ok.flatMap(r => r.warnings).join('; ')) : '');
    prepList();
  } catch (e) { $('prMsg').innerHTML = `<span style="color:#8a1f12">${esc(e.message)}</span>`; }
  $('prGo').disabled = false;
}
function drawDec() {
  const f = segVal('decF') || 'all', q = ($('decQ').value || '').toLowerCase();
  const R = (RP.decisions || []).filter(d => (f === 'all' || (d.status || '').toLowerCase().includes(f)) && (!q || JSON.stringify(d).toLowerCase().includes(q)));
  table('decT', R, [['id', 'ID', v => `<b>${esc(v)}</b>`], ['date', 'Date'], ['decision', 'Decision'], ['reason', 'Reason'], ['by', 'By'], ['status', 'Status', v => `<span class="pill ${/adopt/i.test(v) ? 'p-g' : /review/i.test(v) ? 'p-a' : 'p-n'}">${esc(v || '–')}</span>`]], {empty: 'No decisions match.'});
}
async function showRep(name) {
  $('repList').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.r === name));
  $('repView').innerHTML = '<div class="loading">Loading…</div>';
  try { const r = await fetch('/api/runfile?' + new URLSearchParams({site: SITE, run: RUN, path: 'report/' + name})); if (!r.ok) throw new Error('HTTP ' + r.status);
    $('repView').innerHTML = mdFull(await r.text()); } catch (e) { fail('repView', e); }
}
function mdFull(t) {   // headings, tables, lists, bold, code - enough for the engine reports
  const L = t.replace(/\r/g, '').split('\n'); let o = '', i = 0;
  const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/(^|\s)\*(\S[^*]*?)\*(?=\s|$|[.,;])/g, '$1<i>$2</i>');
  while (i < L.length) {
    const l = L[i];
    if (/^\s*\|/.test(l) && i + 1 < L.length && /^\s*\|?\s*:?-{2,}/.test(L[i + 1])) {
      const row = s => s.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      o += '<div class="tw" style="margin:8px 0"><table><thead><tr>' + row(l).map(c => `<th>${inl(c)}</th>`).join('') + '</tr></thead><tbody>'; i += 2;
      while (i < L.length && /^\s*\|/.test(L[i])) { o += '<tr>' + row(L[i]).map(c => `<td>${inl(c)}</td>`).join('') + '</tr>'; i++; }
      o += '</tbody></table></div>'; continue;
    }
    let m;
    if ((m = l.match(/^(#{1,4})\s+(.*)/))) o += `<h${Math.min(m[1].length + 1, 4)}>${inl(m[2])}</h${Math.min(m[1].length + 1, 4)}>`;
    else if (/^\s*([-*]|\d+\.)\s+/.test(l)) { o += '<ul>'; while (i < L.length && /^\s*([-*]|\d+\.)\s+/.test(L[i])) { o += `<li>${inl(L[i].replace(/^\s*([-*]|\d+\.)\s+/, ''))}</li>`; i++; } o += '</ul>'; continue; }
    else if (/^```/.test(l)) { let c = ''; i++; while (i < L.length && !/^```/.test(L[i])) { c += L[i] + '\n'; i++; } o += `<pre style="background:#f5f8f8;padding:10px;border-radius:8px;overflow:auto;font-size:12px">${esc(c)}</pre>`; }
    else if (/^---+\s*$/.test(l)) o += '<hr style="border:0;border-top:1px solid var(--line2)">';
    else if (l.trim()) o += `<p>${inl(l)}</p>`;
    i++;
  }
  return o;
}

/* ============================================================ classic pages (fallback) */
function openClassic(n) {
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('on', p.id === 'pclassic'));
  $('main').scrollTop = 0; buildClassic(n);
}

/* ============================================================ AI: suggestions for steps 5-7 and connection test */
Object.assign(SUGS, {
  5: ['Which assumption should we measure first, and how?', 'Is any range in the register too narrow for hard-rock gneiss?'],
  6: ['Explain the drawdown difference between the three readings', 'Is the recharge package worth it if the boundary is open?', 'Which scenario results can we already trust, and which not?'],
  7: ['Write a one-page summary of this run for the Managing Director', 'What must the first borehole log record to test the locked predictions?'],
});
async function aiTest() {
  openAI();
  const box = addMsg('a', '<span class="note">Asking every model for one word (up to 30 s)…</span>');
  try { const r = await post('/api/ai/test', {});
    if (!r.ok) { box.innerHTML = esc(r.error || 'The test could not run.') + '. Click the gear icon to paste the key.'; return; }
    const rows = r.results || [];
    box.innerHTML = '<b>Connection test</b><table class="aitest" style="margin-top:6px">' + rows.map(x => `<tr><td>${x.ok ? '✅' : '❌'}</td><td>${esc(String(x.model || '').split('/').pop())}${x.model === r.selected ? ' <span class="note">(in use)</span>' : ''}</td><td class="num">${x.seconds != null ? x.seconds + ' s' : ''}</td><td class="note">${x.ok ? '' : esc(x.error || '')}</td><td>${x.ok && x.model !== r.selected ? `<button class="chip sm" data-m="${esc(x.model)}">Use</button>` : ''}</td></tr>`).join('') + '</table>' +
      (rows.some(x => x.ok) ? '<p class="note">If the model in use is ❌, press <b>Use</b> next to a ✅ model.</p>' : '<p class="note">No model answered. Check the key (gear icon) and the internet connection; the free NVIDIA service is sometimes overloaded, so try again in a few minutes.</p>');
    box.querySelectorAll('button[data-m]').forEach(b => b.onclick = async () => { try { await post('/api/ai/model', {model: b.dataset.m}); b.textContent = 'In use'; b.disabled = true; aiStatus(); } catch (e) { b.textContent = e.message; } });
  } catch (e) { box.innerHTML = 'The test could not run: ' + esc(e.message); }
}


/* ---------- Cloudburst tiers (M7d) ---------- */
let CB = null, CBCH = {}, CBEDIT = false, CBST = null, CBBD = 'B1_GHB';
const CBCOL = {CB1: '#b8a93a', CB2: '#2f9e8f', CB3: '#2b7bba', CB4: '#b8333b', CBALL: '#3b2a8f'};
const CBLAB = {CB1: 'CB1 shallow', CB2: 'CB2 medium', CB3: 'CB3 medium to deep', CB4: 'CB4 deeper (experimental)', CBALL: 'CB-ALL cascade'};
const CBHELP = [
  ['What it is', 'A test of what could happen to a sudden cloudburst if the roof water were put underground at one of four depth tiers: shallow (0–20 m), medium (20–60 m), medium to deep (60–175 m) and deeper (175–250 m). The model then keeps pumping for demand for 10 years and compares with the same case without the cloudburst water.'],
  ['Why it is built this way', 'In hard rock, interconnected open fractures decide how fast water can enter and move (permeability); porosity and empty space decide how much can stay (storage). A tier needs both. The recharge points are candidate zones for connected fractured rock, inferred from passive geophysical prospecting (ADMT), not confirmed until drilling and pumping tests. The three ADMT readings are always shown side by side.'],
  ['How to use it', '1. Set or confirm the cloudburst assumptions in the table below (they start as “suggested, not yours yet”). 2. Start a calculation → choose “Cloudburst tiers only (into the selected saved run)” (or calculate everything). 3. Come back here and compare the tiers for each reading. 4. Change one assumption at a time, give a reason, save, and run again to see what it changes.'],
  ['What to look at first', 'The coloured bars: how much of the roof runoff is lost as overflow (the tier cannot take it fast enough), how much stays held in dry rock above the water table, and how much reaches the aquifer. Then ask: does it stay near the site, or leave through the boundary?'],
  ['The boundary matters most', 'The model is run with an open boundary (water can leave the area) and a closed boundary (it cannot). With the open boundary the cloudburst water mostly drains away within months; with the closed boundary it stays but the water level climbs, even without the cloudburst. The real site is probably between the two, and only drilling, pumping tests and water-level monitoring can show where.'],
  ['Words used here', 'Storm: one spell of rain lasting from an hour to a few days, e.g. 100 mm in 6 h. Cloudburst: a very intense burst of rain, usually taken as about 100 mm or more in one hour over a small area; type 100 mm with 1 h to test it. Season of storms: several storms one after another, so that the second storm finds what the first left behind. Buffer: any place that holds water until the wells can take it. Ground wetness: dry, average or wet soil before the rain; wet soil sheds more rain as runoff. Fill of a tier: the share of the pore space around the wells that the injected water occupies.'],
  ['What none of it can tell you', 'It is not calibrated: there is no borehole or pumping-test data yet. It is not a yield or a safe-abstraction figure. Water quality is not considered. Clogging, a full unsaturated-zone model and hourly storm intensity are left out. The deeper tier is experimental.'],
  ['What would replace the assumptions', 'Static water level in the boreholes; an infiltration or falling-head test at each tier; a local rain gauge; the site plan (roof area, hard surfaces, tank or pond). The “How to test it” column says which measurement matches each assumption.']
];
let CBSITE = null;
async function buildCb() {
  $('cbHelp').innerHTML = CBHELP.map(h => `<div><b>${esc(h[0])}</b><p class="note" style="margin:6px 0 0;line-height:1.6">${esc(h[1])}</p></div>`).join('');
  let D; try { D = await api('/api/cloudburst', Object.assign(SR(), CBSITE ? {site_code: CBSITE} : {})); } catch (e) { fail('cbRegT', e); throw e; }
  CB = D;
  drawCbReg();
  $('cbVers').innerHTML = (D.register.versions || []).map(v => `<span class="chip sm ${v === D.register.version ? 'on' : ''}">v${esc(v)}</span>`).join('');
  $('cbRegNote').innerHTML = D.register.saved
    ? `File <b>${esc(D.register.file)}</b> · ${esc(D.register.status)}${D.register.approval ? ' · ' + esc(D.register.approval) : ''}. Each save makes a new read-only version and a decision-log entry.`
    : 'These are the suggested starting values. The file is created the first time you run M7D or save a change. Nothing here is measured on site.';
  if (!D.have_run) {
    $('cbRes').hidden = true; $('cbNoRun').hidden = false;
    $('cbNoRun').innerHTML = `<span>${ic('alert')}</span><span>No cloudburst result in ${RUN ? 'run <b>' + esc(RUN) + '</b>' : 'this selection'} yet. Go to <i>Start a calculation</i> and choose <b>Cloudburst tiers only (into the selected saved run)</b> (the saved run must already contain M5).</span>`;
    return;
  }
  $('cbNoRun').hidden = true; $('cbRes').hidden = false;
  const cbs = D.sites || [];
  $('cbSiteW').hidden = cbs.length < 2;
  if (cbs.length > 1) { $('cbSite').innerHTML = cbs.map(x => `<button data-v="${x}" class="${x === D.site_code ? 'on' : ''}">${esc(x)}</button>`).join('');
    segOn('cbSite', v => { CBSITE = v; T6.cb = 0; showT6('cb'); }); }
  const sts = [...new Set(D.ensemble.map(r => r.structure))].sort((a, b) => ['layered', 'zoned_I-POS', 'zoned_I-NEU', 'zoned_I-NEG', 'corridor'].indexOf(a) - ['layered', 'zoned_I-POS', 'zoned_I-NEU', 'zoned_I-NEG', 'corridor'].indexOf(b));
  if (!CBST || !sts.includes(CBST)) CBST = sts.includes('zoned_I-NEU') ? 'zoned_I-NEU' : sts[0];
  $('cbSt').innerHTML = sts.map(x => `<button data-v="${x}" class="${x === CBST ? 'on' : ''}">${esc(STN[x] || x)}</button>`).join('');
  segOn('cbSt', v => { CBST = v; drawCb(); });
  $('cbLayNote').hidden = !(sts.length === 1 && sts[0] === 'layered');
  if (sts.length === 1 && sts[0] === 'layered') { $('cbLayNote').innerHTML = `<span>${ic('alert')}</span><span><b>Layered structure only.</b> This run has no M5 result, so the three passive-geophysics readings (I-POS, I-NEU, I-NEG) were not run. Continue a run that contains M0 to M5 to get them.</span>`; }
  const bds = [...new Set(D.ensemble.map(r => r.boundary))];
  if (!bds.includes(CBBD)) CBBD = bds[0];
  $('cbBd').innerHTML = bds.map(x => `<button data-v="${x}" class="${x === CBBD ? 'on' : ''}">${x === 'B1_GHB' ? 'Open (B1)' : x === 'B2_closed' ? 'Closed (B2)' : esc(x)}</button>`).join('');
  segOn('cbBd', v => { CBBD = v; drawCb(); });
  drawCb();
  $('cbFigs').innerHTML = '<h3><span data-i="chart"></span>Figures saved with the run</h3><div class="grid g2">' + (D.figures || []).map(f => `<img alt="${esc(f)}" style="width:100%;border-radius:10px;border:1px solid var(--line)" src="/api/runfile?${new URLSearchParams({site: SITE, run: RUN, path: 'figures/M7d/' + f})}">`).join('') + '</div>';
  paintIcons($('p6'));
}
function drawCb() {
  const E = CB.ensemble.filter(r => r.structure === CBST && r.boundary === CBBD), by = {}; E.forEach(r => by[r.scenario] = r);
  const fills = E.length ? Math.max(...E.map(r => r.base_fills_up || 0)) : 0;
  $('cbBdNote').hidden = CBBD !== 'B2_closed' && fills <= 0;
  $('cbBdNote').innerHTML = CBBD === 'B2_closed' ? `<span>${ic('alert')}</span><span><b>Closed boundary.</b> Water cannot leave the model, so almost everything injected stays and the water level keeps climbing, ${fills > 0 ? 'above ground level in ' + Math.round(fills * 100) + ' % of the parameter sets even without any cloudburst water' : 'in wetter parameter sets possibly above ground level'}. Treat these results as the optimistic limit, not as a prediction. Whether the real site behaves like the open or the closed case is not known before drilling and pumping tests.</span>` : `<span>${ic('alert')}</span><span>The model fills up even without cloudburst water in this selection; read with care.</span>`;
  const T = ['CB1', 'CB2', 'CB3', 'CB4', 'CBALL'].filter(t => by[t]);
  const m = (k, t) => { const v = by[t][k]; return v ? Math.max(v[0], 0) : 0; };
  const parts = [['overflow', 'Lost: overflow or not drained', '#9aa0a6'], ['held', 'Held in dry rock above the water table', '#c9c46a'],
    ['boundary_1', 'Left the model by the boundary (after 1 yr)', '#e0884a'], ['retained_1', 'Still in aquifer storage (after 1 yr)', '#2b7bba']];
  draw('cbFate', parts.map(([k, n, c]) => ({type: 'bar', name: n, x: T.map(t => CBLAB[t]), y: T.map(t => m(k, t)), marker: {color: c}, hovertemplate: '%{x}<br>' + n + ': %{y:.1f} %<extra></extra>'})),
    base({barmode: 'stack', margin: {l: 56, r: 10, t: 10, b: 120}, yaxis: {title: '% of roof runoff', gridcolor: '#e6eeee', rangemode: 'tozero'}, xaxis: {tickangle: -20}, legend: {orientation: 'h', y: -0.42, font: {size: 11}}}), CFG);
  const Y = CB.years;
  const line = (id, pre, ytitle, suf) => draw(id, T.flatMap(t => {
    const v = Y.map(y => by[t][pre + '_' + y]);
    const lo = v.map(a => a ? a[1] : null), hi = v.map(a => a ? a[2] : null), md = v.map(a => a ? a[0] : null), c = CBCOL[t];
    return [{type: 'scatter', mode: 'lines', x: Y, y: hi, line: {width: 0}, hoverinfo: 'skip', showlegend: false, legendgroup: t},
      {type: 'scatter', mode: 'lines', x: Y, y: lo, line: {width: 0}, fill: 'tonexty', fillcolor: c + '22', hoverinfo: 'skip', showlegend: false, legendgroup: t},
      {type: 'scatter', mode: 'lines+markers', name: CBLAB[t], x: Y, y: md, line: {color: c, width: 2}, marker: {size: 6}, legendgroup: t, hovertemplate: CBLAB[t] + '<br>year %{x}: %{y:.2f}' + suf + '<extra></extra>'}];
  }), base({margin: {l: 56, r: 10, t: 10, b: 110}, yaxis: {title: ytitle, gridcolor: '#e6eeee', zeroline: true, zerolinecolor: '#9aa8a6'}, xaxis: {title: 'years after the cloudburst (log scale)', type: 'log', tickvals: Y, ticktext: Y.map(String)}, legend: {orientation: 'h', y: -0.4, font: {size: 11}}}), CFG);
  line('cbKeep', 'retained', '% of roof runoff', ' %'); line('cbHead', 'head', 'water-level benefit (m)', ' m');
  const f1 = v => v ? `${v[0].toFixed(1)} <span class="note">(${v[1].toFixed(1)} to ${v[2].toFixed(1)})</span>` : '–';
  const rows = T.map(t => by[t]);
  if (!rows.length || rows.some(r => !r)) { $('cbSumT').innerHTML = '<tbody><tr><td class="note">No simulations for this reading and boundary.</td></tr></tbody>'; return; }
  $('cbSumT').innerHTML = '<thead><tr><th>Tier</th><th>Lost: overflow (%)</th><th>Held in dry rock (%)</th><th>Reaches aquifer (%)</th><th>Best retained in aquifer (%)</th><th>Best head benefit at well (m)</th><th>Intake limit (m³/d)</th><th>Delay (d)</th><th>Head above ground (share of runs)</th></tr></thead><tbody>' +
    rows.map(r => `<tr><td><span class="pill" style="background:${CBCOL[r.scenario]}22;color:${CBCOL[r.scenario]}">${esc(CBLAB[r.scenario])}</span></td><td class="num">${f1(r.overflow)}</td><td class="num">${f1(r.held)}</td><td class="num">${f1(r.to_aquifer)}</td><td class="num">${f1(r.peak_retained)}</td><td class="num">${f1(r.peak_head)}</td><td class="num">${f1(r.intake)}</td><td class="num">${f1(r.delay)}</td><td class="num">${r.head_above_ground > 0 ? `<span class="pill ${r.head_above_ground > 0.25 ? 'p-r' : 'p-a'}">${Math.round(r.head_above_ground * 100)} %</span>` : '0 %'}</td></tr>`).join('') + '</tbody>';
  $('cbSumNote').textContent = (CB.screening_only ? 'Quick screening: one central parameter set per boundary, so there is no spread. ' : '') + `Median (P10 to P90) over ${rows[0] ? rows[0].n : 0} parameter sets. “Head above ground” means the model water level at the recharge point would be pushed above the ground, so that intake rate is not feasible.`;
  const C = CB.central.filter(r => r.structure === CBST && (!r.boundary || r.boundary === CBBD));
  table('cbCenT', C, [['label', 'Tier'], ['V_runoff_m3', 'Runoff (m³)'], ['intake_limit_m3_per_d', 'Intake limit (m³/d)'], ['mean_delay_d', 'Delay (d)'], ['overflow_pct', 'Overflow (%)'], ['held_unsat_pct', 'Held (%)'],
    ['to_aquifer_pct', 'To aquifer (%)'], ['retained_0.5y_pct', 'Retained 0.5 yr (%)'], ['retained_1y_pct', 'Retained 1 yr (%)'], ['retained_10y_pct', 'Retained 10 yr (%)'], ['peak_head_benefit_m', 'Best head benefit (m)']], {empty: 'No central-case rows for this reading.'});
}
function drawCbReg() {
  const ents = CB.register.entries || [];
  const cell = (e, f) => { const c = CBCH[e.key] || {}; const v = c[f] ?? e[f];
    return CBEDIT ? `<input class="reg-in num" data-k="${esc(e.key)}" data-f="${f}" value="${esc(v)}" inputmode="decimal">` : `<span class="num">${num(v, 4)}</span>`; };
  $('cbRegT').innerHTML = '<thead><tr><th>ID</th><th>Assumption</th><th>Low</th><th>Central</th><th>High</th><th>Unit</th><th>Status</th><th>How to test it</th></tr></thead><tbody>' +
    ents.map(e => `<tr class="${CBCH[e.key] ? 'chg' : ''}"><td><b>${esc(e.id)}</b></td><td style="min-width:240px"><b>${esc(e.parameter)}</b><br><span class="note">${esc(e.key)} · ${esc(e.basis || '')}</span></td>` +
      `<td>${cell(e, 'low')}</td><td>${cell(e, 'central')}</td><td>${cell(e, 'high')}</td><td>${esc(e.unit || '')}</td>` +
      `<td><span class="pill ${/placeholder/i.test(e.status) ? 'p-r' : /suggested/i.test(e.status) ? 'p-a' : 'p-g'}">${esc(e.status || '–')}</span></td><td class="note" style="min-width:200px">${esc(e.field_measurement_to_test || '')}</td></tr>`).join('') + '</tbody>';
  $('cbRegT').querySelectorAll('.reg-in').forEach(i => i.onchange = () => {
    const e = CB.register.entries.find(x => x.key === i.dataset.k), f = i.dataset.f, v = i.value.trim();
    CBCH[e.key] = CBCH[e.key] || {};
    if (String(v) === String(e[f])) delete CBCH[e.key][f]; else CBCH[e.key][f] = +v;
    if (!Object.keys(CBCH[e.key]).length) delete CBCH[e.key];
    i.closest('tr').classList.toggle('chg', !!CBCH[e.key]); cbSaveBar(); });
  cbSaveBar();
}
function cbSaveBar() { const n = Object.keys(CBCH).length; $('cbSave').hidden = !CBEDIT; $('cbChg').textContent = n ? `${n} assumption${n > 1 ? 's' : ''} changed` : 'No changes yet'; }
function toggleCbEdit() { CBEDIT = !CBEDIT; if (!CBEDIT) CBCH = {}; $('cbEditBtn').textContent = CBEDIT ? 'Stop editing' : 'Edit values'; drawCbReg(); }
async function saveCb() {
  const reason = $('cbReason').value.trim(), by = $('cbBy').value.trim();
  if (!Object.keys(CBCH).length) { $('cbMsg').textContent = 'Change at least one value first.'; return; }
  if (!reason || !by) { $('cbMsg').textContent = 'A reason and an approver are required.'; return; }
  for (const k of Object.keys(CBCH)) { const e = CB.register.entries.find(x => x.key === k), c = Object.assign({}, e, CBCH[k]);
    if ([c.low, c.central, c.high].some(v => v === '' || isNaN(+v))) { $('cbMsg').textContent = `${k}: values must be numbers.`; return; }
    if (!(+c.low <= +c.central && +c.central <= +c.high)) { $('cbMsg').textContent = `${k}: low ≤ central ≤ high is required.`; return; } }
  $('cbMsg').textContent = 'Saving…';
  try { const r = await post('/api/cloudburst/save', {site: SITE, changes: CBCH, reason, by});
    CBCH = {}; CBEDIT = false; $('cbEditBtn').textContent = 'Edit values'; $('cbReason').value = '';
    T6.cb = 0; await buildCb(); T6.cb = 1; $('cbMsg').textContent = '';
    $('cbRegNote').insertAdjacentHTML('afterbegin', `<span class="pill p-g">Saved ${esc(r.file)} (read-only) and logged as ${esc(r.decision)}. Start “Cloudburst tiers only” to use it.</span> `);
  } catch (e) { $('cbMsg').textContent = 'Not saved: ' + e.message; }
}
function cbRunNow() { const b = document.querySelector('#t6 button[data-v="run"]'); if (b) b.click(); }

/* ============================================================ RECHARGE LOCATIONS */
let RL = null, rlTimer = null;
const RLS = {st: 'zoned_I-NEU', bd: 'B2_closed', met: 'ret1', tier: 'CB3', pick: null};
const RLMET = {ret1: ['Still stored after 1 yr', '% of roof runoff'], ret10: ['Still stored after 10 yr', '% of roof runoff'], reach: ['Reaches the water table', '% of roof runoff'],
  held: ['Held in dry rock above the water table', '% of roof runoff'], delay: ['Delay before it arrives', 'days'], head: ['Best head benefit at the pumping well', 'm']};
const RLTIERS = ['CB1', 'CB2', 'CB3', 'CB4', 'CBALL'];
const rlRd = st => (st === 'layered' || st === 'corridor') ? null : st.replace('zoned_', '');
const rlF = (v, d = 1) => v == null ? '–' : (+v).toFixed(d);
function rlV(site, tier, st = RLS.st, bd = RLS.bd, met = RLS.met) { const c = RL.cloudburst[`${st}|${bd}|${tier}`]; return c && c[site] ? c[site][met] : null; }   // [median, p10, p90]
async function buildRl() {
  await needSetup();
  $('rzGo').onclick = rzStart; $('rlGo').onclick = rlStart; $('rlStop').onclick = async () => { try { await post('/api/run/stop', {pid: (await api('/api/jobs', S())).jobs[0].pid}); } catch (e) {} rlPoll(); };
  document.querySelectorAll('input[name=rlMode]').forEach(x => x.onchange = rlEst); $('rlN').onchange = rlEst; $('rlCorr').onchange = rlEst;
  await loadRl(); rlPoll(true);
}
async function loadRl() {
  try { RL = await api('/api/recharge', SR()); } catch (e) { fail('rlRes', e); return; }
  const all = RL.sites || [];
  // every candidate point inside the model area is ticked, including the "not for drilling" ones: they are run so that every point becomes test data
  const chipH = s => `<label class="chip sm ${s.inside === false ? '' : 'on'}" style="cursor:pointer"><input type="checkbox" data-s="${esc(s.code)}" ${s.inside === false ? '' : 'checked'} style="margin-right:4px"> <b>${esc(s.code)}</b> · ${esc(s.role || '')}${s.inside === false ? ' (outside the model area)' : ''}</label>`;
  const bw = all.filter(s => s.kind !== 'RZ'), rzs = all.filter(s => s.kind === 'RZ');
  $('rlSites').innerHTML = (bw.length ? '<div class="note" style="width:100%;font-weight:700">Borewell candidates (priority and reserve)</div>' + bw.map(chipH).join('') : '') +
    (rzs.length ? '<div class="note" style="width:100%;font-weight:700;margin-top:6px">Recharge zone points (RZ), found from storability</div>' + rzs.map(chipH).join('') : '') || '<span class="note">No candidate sites are defined for this site.</span>';
  rzDraw();
  $('rlSites').onchange = rlEst; rlEst();
  const have = RL.have && RL.have.cloudburst;
  $('rlNo').hidden = have; $('rlRes').hidden = !have;
  if (!have) { $('rlNo').innerHTML = `<span>${ic('alert')}</span><span>No cloudburst result in ${RUN ? 'run <b>' + esc(RUN) + '</b>' : 'this selection'} yet. Tick the sites above and press <b>Start the cloudburst simulations at these sites</b>. ${RL.have && RL.have.storability ? 'Meanwhile the storability and connectivity layers are ready:' : ''}</span>`; }
  if (!have) { if (RL.have && RL.have.storability) { $('rlRes').hidden = false; } else return; }
  const sts = RL.structures && RL.structures.length ? RL.structures : ['zoned_I-NEU'];
  if (!sts.includes(RLS.st)) RLS.st = sts.includes('zoned_I-NEU') ? 'zoned_I-NEU' : sts[0];
  const bds = RL.boundaries && RL.boundaries.length ? RL.boundaries : ['B1_GHB', 'B2_closed']; if (!bds.includes(RLS.bd)) RLS.bd = bds[0];
  $('rlSt').innerHTML = sts.map(x => `<button data-v="${x}" class="${x === RLS.st ? 'on' : ''}">${esc(STN[x] || x)}</button>`).join('');
  $('rlBd').innerHTML = bds.map(x => `<button data-v="${x}" class="${x === RLS.bd ? 'on' : ''}">${x === 'B1_GHB' ? 'Open (B1)' : 'Closed (B2)'}</button>`).join('');
  $('rlTier').innerHTML = RLTIERS.map(t => `<button data-v="${t}" class="${t === RLS.tier ? 'on' : ''}" title="${esc(CBLAB[t])}">${t === 'CBALL' ? 'All' : t}</button>`).join('');
  $('rlMet').innerHTML = Object.entries(RLMET).map(([k, v]) => `<button data-v="${k}" class="${k === RLS.met ? 'on' : ''}">${esc(v[0])}</button>`).join('');
  segOn('rlSt', v => { RLS.st = v; drawRl(); }); segOn('rlBd', v => { RLS.bd = v; drawRl(); }); segOn('rlTier', v => { RLS.tier = v; drawRl(); }); segOn('rlMet', v => { RLS.met = v; drawRl(); });
  if (RL.cb_sites && RL.cb_sites.length) { const f = (RL.cb_sites.length > 1 ? 'F7d-8_sites_compared.png' : null); $('rlFigC').hidden = !f; if (f) $('rlFig').src = '/api/runfile?' + new URLSearchParams({site: SITE, run: RUN, path: 'figures/M7d/' + f, v: Date.now()}); }
  drawRl(); paintIcons($('p6'));
}
function rzZoneTxt(z) {
  if (!z) return '';
  const a = [];
  if (z.Zone) a.push(`nearest ADMT zone ${esc(z.Zone)} at ${rlF(z.Zone_dist, 0)} m (score ${z.Zone_score == null ? '–' : rlF(z.Zone_score, 0)}${z.Reaches ? '; reaches the tier: ' + esc(z.Reaches) : ''})`);
  if (z.Strong_zone && z.Strong_zone !== z.Zone) a.push(`nearest zone scored 7 or more: ${esc(z.Strong_zone)} at ${rlF(z.Strong_dist, 0)} m`);
  return a.join('; ');
}
function rzDraw() {
  const R = (RL.sites || []).filter(s => s.kind === 'RZ');
  if (!R.length) { $('rzTab').innerHTML = '<tbody><tr><td class="note" style="white-space:normal;padding:10px">No RZ points yet. Press <b>Find RZ points from this run</b>.</td></tr></tbody>'; return; }
  $('rzTab').innerHTML = '<thead><tr><th>RZ point</th><th>Found in (tier, reading, rank)</th><th>Nearest ADMT zone</th><th>Same place as a borewell site</th><th>Position (lat, lon)</th></tr></thead><tbody>' +
    R.map(s => { const z = s.rz || {}; return `<tr><td><b>${esc(s.code)}</b></td><td style="white-space:normal">${esc(z.Found_in || '')}</td><td style="white-space:normal">${rzZoneTxt(z)}</td><td>${esc(z.Same_as || '–')}</td><td class="num">${rlF(s.lat, 6)}, ${rlF(s.lon, 6)}</td></tr>`; }).join('') + '</tbody>';
}
async function rzStart() {
  if (!RUN) { $('rzMsg').textContent = 'No run selected.'; return; }
  $('rzGo').disabled = true; $('rzMsg').textContent = 'Working…';
  try { const r = await post('/api/rz/make', {site: SITE, run: RUN, per_tier: +$('rzK').value, min_sep: +$('rzSep').value});
    $('rzMsg').textContent = `${r.points} RZ points found and saved (decision ${r.decision}).`; await loadRl(); }
  catch (e) { $('rzMsg').textContent = 'Could not find RZ points: ' + e.message; }
  $('rzGo').disabled = false;
}
function rlSel() { return [...document.querySelectorAll('#rlSites input:checked')].map(x => x.dataset.s); }
function rlEst() {
  const n = rlSel().length, quick = document.querySelector('input[name=rlMode]:checked').value === '0', sets = quick ? 0 : +$('rlN').value;
  const nst = (RL && RL.structures && RL.structures.length ? RL.structures.filter(x => x !== 'corridor').length : 4) + ($('rlCorr') && $('rlCorr').checked ? 1 : 0), runs = n * (sets + 2) * nst * 6, w = +(($('runWorkers') && $('runWorkers').value) || 2);
  const mins = Math.max(1, Math.round(runs * 4.8 / 60 * 2 / Math.max(w, 1)));
  $('rlEst').innerHTML = n ? `<b>${n} site${n > 1 ? 's' : ''}</b> × ${quick ? 'the central case' : sets + ' parameter sets + the central case'} (open and closed boundary) × ${nst} rock structures${$('rlCorr') && $('rlCorr').checked ? ' (including the fracture corridor)' : ''} × 6 scenarios = <b>${fmt(runs)} MODFLOW simulations</b>, roughly <b>${mins < 90 ? mins + ' min' : (mins / 60).toFixed(1) + ' h'}</b> on this computer (${w} workers; a rough guide). ${quick ? 'A screening gives one value per boundary and no spread: use it to choose which sites deserve the longer run.' : ''}` : 'Tick at least one site.';
  $('rlGo').disabled = !n;
}
async function rlStart() {
  const cs = rlSel(); if (!cs.length) return; if (!RUN) { $('rlMsg').textContent = 'No run selected.'; return; }
  const quick = document.querySelector('input[name=rlMode]:checked').value === '0';
  $('rlGo').disabled = true; $('rlMsg').textContent = 'Starting…';
  try { const r = await post('/api/run/start', {site: SITE, modules: ['M7D'], run: RUN, workers: +(($('runWorkers') && $('runWorkers').value) || 2), cb_sites: cs, n_lhs_cb: quick ? 0 : +$('rlN').value, cb_corridor: !!($('rlCorr') && $('rlCorr').checked)});
    const got = (r && r.cb_sites) || null;
    if (got && got.length !== cs.length) { $('rlMsg').innerHTML = `<b style="color:#8a1f12">Only ${got.length} of the ${cs.length} ticked sites were sent to the calculation.</b> Stop it and tell the developer.`; rlPoll(); return; }
    $('rlMsg').textContent = `Started for ${cs.length} site${cs.length === 1 ? '' : 's'} (${cs.join(', ')}). You can keep working in other steps; progress shows here.`; watchJobs(); rlPoll(); }
  catch (e) { $('rlMsg').textContent = 'Could not start: ' + e.message; $('rlGo').disabled = false; }
}
async function rlPoll(first) {
  let J; try { J = (await api('/api/jobs', S())).jobs || []; } catch (e) { return; }
  const j = J[0]; if (!j || !(j.modules || []).map(String).includes('M7D')) { $('rlJob').innerHTML = ''; return; }
  if (!j.running && first) { $('rlJob').innerHTML = ''; return; }
  const last = (j.tail || []).filter(l => l.trim()).slice(-2).join(' · ');
  $('rlJob').innerHTML = `<div class="row" style="gap:8px;align-items:center">${j.running ? '<span class="pill p-b">running</span>' : j.failed ? '<span class="pill p-r">stopped with an error</span>' : '<span class="pill p-g">finished</span>'}<span class="note">${esc(last).slice(0, 220)}</span></div>`;
  $('rlStop').hidden = !j.running; $('rlGo').disabled = !!j.running || !rlSel().length;
  if (j.running && !rlTimer) rlTimer = setInterval(() => { if (!$('p6').classList.contains('on')) return; rlPoll(); }, 4000);
  if (!j.running && rlTimer) { clearInterval(rlTimer); rlTimer = null; if (!first && !j.failed) { CB = null; delete T6.cb; await loadRl(); } }
}
function rlRows() {
  const tier = RLS.tier, rd = rlRd(RLS.st), T = tier === 'CBALL' ? null : tier;
  return (RL.sites || []).map(s => {
    const stor = rd && s.storability && s.storability[rd] && T ? s.storability[rd][T] : null, con = rd && s.connectivity ? s.connectivity[rd] : null;
    return {code: s.code, role: s.role, kind: s.kind, rz: s.rz, inside: s.inside, lat: s.lat, lon: s.lon, p: stor ? stor.p : null, sy: stor ? stor.sy : null, clay: rd && s.storability && s.storability[rd] ? s.storability[rd].clay : false,
      path: con ? con.pathway : null, vol: con ? con.volume : null, note: con ? con.note : '', v: rlV(s.code, tier), n: ((RL.cloudburst[`${RLS.st}|${RLS.bd}|${tier}`] || {})[s.code] || {}).n,
      del: rlV(s.code, tier, RLS.st, RLS.bd, 'delay'), held: rlV(s.code, tier, RLS.st, RLS.bd, 'held'), ret10: rlV(s.code, tier, RLS.st, RLS.bd, 'ret10')};
  });
}
function drawRl() {
  const tier = RLS.tier, key = `${RLS.st}|${RLS.bd}|${tier}`, C = RL.cloudburst[key] || {}, wins = C._wins || {}, nsets = C._sets || 0, M = RLMET[RLS.met];
  const rows = rlRows(), withCb = rows.filter(r => r.v), hl = !!({ret1: 1, ret10: 1, reach: 1, head: 1})[RLS.met];
  const med = r => r.v ? r.v[0] : null, mx = withCb.length ? Math.max(...withCb.map(med)) : null, mn = withCb.length ? Math.min(...withCb.map(med)) : null;
  const hiSy = Math.max(...rows.map(r => r.sy == null ? -1 : r.sy));
  // chart
  if (withCb.length) {
    draw('rlChart', [{type: 'bar', x: withCb.map(r => r.code), y: withCb.map(med), marker: {color: withCb.map(r => hl && med(r) === mx ? '#17663f' : '#8fb7a6'), line: {color: '#fff', width: 1}},
      error_y: {type: 'data', symmetric: false, array: withCb.map(r => r.v[2] - r.v[0]), arrayminus: withCb.map(r => r.v[0] - r.v[1]), color: '#33504e', thickness: 1.2, width: 4, visible: nsets > 2},
      customdata: withCb.map(r => [r.role, r.v[1], r.v[2], wins[r.code] != null ? Math.round(wins[r.code] * 100) : null]),
      hovertemplate: '<b>Site %{x}</b> · %{customdata[0]}<br>%{y:.2f} ' + M[1] + '<br>P10 %{customdata[1]:.2f} – P90 %{customdata[2]:.2f}<br>best in %{customdata[3]} % of parameter sets<extra></extra>'}],
      base({margin: {l: 60, r: 10, t: 10, b: 50}, xaxis: {title: 'candidate site'}, yaxis: {title: M[1], gridcolor: '#e6eeee', rangemode: 'tozero'}, showlegend: false}), CFG);
    $('rlChT').textContent = `${M[0]}: ${CBLAB[tier]}`;
    $('rlChS').textContent = `${STN[RLS.st] || RLS.st}, ${RLS.bd === 'B1_GHB' ? 'open' : 'closed'} boundary. Bar = median${nsets > 2 ? ', whiskers P10 to P90' : ' (single central case: no spread)'} over ${nsets || 1} parameter set${nsets > 1 ? 's' : ''}. ${hl ? ' Dark bar = the site with the highest value.' : ''}`;
  } else { $('rlChart').innerHTML = '<p class="note">No cloudburst result for this selection yet.</p>'; $('rlChT').textContent = 'Sites compared'; $('rlChS').textContent = ''; }
  // map
  const St = D.setup, tr = [boundaryTrace()];
  const sz = rows.map(r => r.v && mx > 0 ? 16 + 22 * Math.max(med(r), 0) / mx : 16);
  tr.push({type: 'scatter', mode: 'markers+text', x: rows.map(r => r.lon), y: rows.map(r => r.lat), text: rows.map(r => r.code), textposition: 'middle center', textfont: {color: '#fff', size: rows.map(r => r.kind === 'RZ' ? 8 : 11), family: FONT.family},
    marker: {size: sz.map((v, i) => rows[i].kind === 'RZ' ? Math.max(v, 22) : v), symbol: rows.map(r => r.kind === 'RZ' ? 'diamond' : 'circle'), color: rows.map(r => r.v ? (hl && med(r) === mx ? '#17663f' : '#6aa58f') : '#9aa8a6'), line: {color: '#fff', width: 2}}, customdata: rows.map(r => [r.role, r.v ? rlF(r.v[0], 2) + ' ' + M[1] : 'not run yet']),
    hovertemplate: '<b>Site %{text}</b> · %{customdata[0]}<br>%{customdata[1]}<extra></extra>', name: 'Candidate sites'});
  draw('rlMap', tr, mapLayout(extentOf(St.views && St.views.site), {hovermode: 'closest', margin: {l: 10, r: 10, t: 10, b: 10}, showlegend: false}), Object.assign({}, CFG, {scrollZoom: true}));
  // table
  const chip = (t, c) => `<span class="pill" style="background:${c}22;color:${c}">${t}</span>`;
  $('rlTab').innerHTML = '<thead><tr><th>Site</th><th>Storability<br><span class="note">Sy, % of rock volume (' + esc(CBLAB[tier] || '') + ')</span></th><th>Permeable<br><span class="note">probability, same window</span></th><th>Connectivity (M6)<br><span class="note">pathway to target · connected volume</span></th><th>Cloudburst: ' + esc(M[0].toLowerCase()) + '<br><span class="note">' + esc(M[1]) + '; median (P10 to P90)</span></th><th>Delay (d)</th><th>Best in ... % of sets</th><th></th></tr></thead><tbody>' +
    rows.map(r => `<tr><td><b>${esc(r.code)}</b><br><span class="note">${esc(r.role || '')}</span>${r.kind === 'RZ' ? '<br><span class="note">' + rzZoneTxt(r.rz) + '</span>' : ''}</td><td class="num">${r.sy == null ? '–' : rlF(r.sy, 2)}${r.sy != null && r.sy === hiSy ? ' ' + chip('highest', '#17663f') : ''}${r.clay ? '<br><span class="note">clay reading: low-storage</span>' : ''}</td><td class="num">${r.p == null ? '–' : rlF(r.p, 2)}${r.clay ? '<br><span class="note">clay probability</span>' : ''}</td>` +
    `<td class="num">${r.path == null ? (r.note ? '<span class="note">' + esc(r.note) + '</span>' : '–') : rlF(r.path, 0) + ' % · ' + fmt(Math.round(r.vol || 0)) + ' m³'}</td><td class="num">${r.v ? rlF(r.v[0], 2) + (nsets > 2 ? ` <span class="note">(${rlF(r.v[1], 2)} to ${rlF(r.v[2], 2)})</span>` : '') + (hl && med(r) === mx && withCb.length > 1 ? ' ' + chip('highest', '#17663f') : '') : '<span class="note">not run</span>'}</td>` +
    `<td class="num">${r.del ? rlF(r.del[0], 0) : '–'}</td><td class="num">${wins[r.code] != null ? Math.round(wins[r.code] * 100) + ' %' : '–'}</td><td>${r.inside === false ? chip('outside model area', '#8a1f12') : ''}</td></tr>`).join('') + '</tbody>';
  $('rlTabN').innerHTML = `Storability is a display index from the assumption register (not measured and not an input to MODFLOW). Connectivity is the share of ${rlRd(RLS.st) ? esc(RNAME[rlRd(RLS.st)]) + '-reading' : 'ADMT-reading (shown blank for this structure, which does not use an ADMT reading)'} realisations with a continuous pathway from the upper zone to the target. "Best in ... % of sets" counts the parameter sets in which a site keeps within 0.5 percentage points of the best site (${nsets || 0} set${nsets === 1 ? '' : 's'} with all sites). Recharge points are candidate zones for connected fractured rock inferred from passive ADMT readings, not confirmed until drilling and pumping tests.`;
  // tier matrix
  const tiers = RLTIERS, cell = (code, t) => rlV(code, t);
  const best = {}; tiers.forEach(t => { const v = rows.map(r => cell(r.code, t)).filter(Boolean).map(x => x[0]); best[t] = v.length ? Math.max(...v) : null; });
  $('rlMatS').textContent = `${M[0]} (${M[1]}), ${STN[RLS.st] || RLS.st}, ${RLS.bd === 'B1_GHB' ? 'open' : 'closed'} boundary. ${hl ? 'Green = the highest value in that tier.' : ''}`;
  const anyCell = rows.some(r => tiers.some(t => cell(r.code, t)));
  if (!anyCell) {
    const have = Object.keys(RL.cloudburst || {}).map(k => k.split('|')).filter(a => a.length === 3).map(a => (STN[a[0]] || a[0]) + ', ' + (a[1] === 'B1_GHB' ? 'open' : 'closed') + ' boundary');
    const uniq = [...new Set(have)], sitesRun = [...new Set(Object.values(RL.cloudburst || {}).flatMap(o => Object.keys(o).filter(k => k[0] !== '_')))];
    $('rlMat').innerHTML = '<tbody><tr><td style="white-space:normal;line-height:1.6;padding:12px">' + (uniq.length
      ? `No cloudburst result exists for <b>${esc(STN[RLS.st] || RLS.st)}, ${RLS.bd === 'B1_GHB' ? 'open' : 'closed'} boundary</b> in this run. Results exist for: ${esc(uniq.join('; '))}${sitesRun.length ? ' (sites run: <b>' + esc(sitesRun.join(', ')) + '</b>)' : ''}. Pick one of those above, or run the cloudburst at more sites.`
      : 'The cloudburst water simulation has not been run in this run yet. Tick the sites above and press <b>Start the cloudburst simulations at these sites</b>; this table then fills.') + '</td></tr></tbody>';
  } else
  $('rlMat').innerHTML = '<thead><tr><th>Site</th>' + tiers.map(t => `<th>${esc(CBLAB[t])}</th>`).join('') + '</tr></thead><tbody>' +
    rows.map(r => `<tr><td><b>${esc(r.code)}</b> <span class="note">${esc(r.role || '')}</span></td>` + tiers.map(t => { const v = cell(r.code, t); const b = hl && v && best[t] != null && v[0] === best[t] && rows.filter(q => cell(q.code, t)).length > 1;
      return `<td class="num" style="${b ? 'background:#e1f3e9;font-weight:700' : ''}">${v ? rlF(v[0], 2) : '–'}</td>`; }).join('') + '</tr>').join('') + '</tbody>';
  // plain-language reading
  const msgs = [];
  if (!withCb.length) msgs.push('The cloudburst water simulation has not been run for this selection, so only storability and connectivity are shown.');
  else {
    const spread = mx - mn, bestSites = withCb.filter(r => med(r) >= mx - 0.5).map(r => r.code);
    if (!nsets || nsets < 3) msgs.push(`<b>Few parameter sets.</b> This boundary has only ${nsets || 1} parameter set${nsets > 1 ? 's' : ''} behind it (including the central case), so the numbers show direction, not certainty. Run with uncertainty at the sites that look best.`);
    if (withCb.length === 1) msgs.push(`Only site <b>${esc(withCb[0].code)}</b> has a cloudburst result. Run the other sites to compare.`);
    else if (!hl) msgs.push(`<b>${esc(M[0])}</b> describes how the water behaves, not how much is kept, so no site is called better on it. Read it together with <i>Still stored after 1 yr</i>: a site that keeps a lot but delivers late (a long delay) behaves differently from one that delivers at once.`);
    else if (spread < (RLS.met === 'delay' ? 5 : RLS.met === 'head' ? 0.005 : 1)) msgs.push(`<b>The sites cannot be told apart here.</b> The difference between the best and the worst site is ${rlF(spread, 2)} ${M[1].startsWith('%') ? 'percentage points' : M[1]}, which is within the model's noise. ${RLS.bd === 'B1_GHB' && (RLS.met === 'ret1' || RLS.met === 'ret10' || RLS.met === 'head') ? 'With an open boundary the water leaves the model area within months wherever it is placed, so the choice of site matters little for storage; it matters for how soon the water arrives and for what can be recovered near the recharge point.' : 'Choose the site on practical grounds and on the other layers.'}`);
    else msgs.push(`In <b>${esc(CBLAB[tier])}</b>, ${bestSites.length === 1 ? 'site <b>' + esc(bestSites[0]) + '</b> has the highest value' : 'sites <b>' + esc(bestSites.join(', ')) + '</b> have the highest value'} for <i>${esc(M[0].toLowerCase())}</i> (${rlF(mx, 1)} ${M[1]}), against ${rlF(mn, 1)} at the lowest site.${nsets > 2 && wins[bestSites[0]] != null ? ` It is the best in ${Math.round(wins[bestSites[0]] * 100)} % of the ${nsets} parameter sets${wins[bestSites[0]] < 0.7 ? ', so the ranking is not firm' : ''}.` : ''}`);
    const sy = rows.filter(r => r.sy != null); if (sy.length > 1 && RLS.tier !== 'CBALL' && (RLS.met === 'ret1' || RLS.met === 'ret10')) { const hs = sy.filter(r => r.sy === hiSy)[0]; if (hs && withCb.length > 1 && !bestSites.includes(hs.code)) msgs.push(`Storability and the water simulation disagree: site <b>${esc(hs.code)}</b> has the highest storability in this tier, but <b>${esc(bestSites[0])}</b> keeps more of the cloudburst water. The simulation also includes delay, water held in dry rock and loss through the boundary, so it is the more complete layer for this question; storability is only a display index.`); }
    if (RLS.st === 'zoned_I-NEG') msgs.push('In the negative reading no ADMT class is treated as permeable (the high-probability class is clay or gouge), so no site is a favourable recharge zone in this reading.');
    const out = withCb.filter(r => r.inside === false).map(r => r.code); if (out.length) msgs.push(`Site ${esc(out.join(', '))} lies outside the model area, so its numbers are less reliable.`);
  }
  $('rlRead').innerHTML = '<h3 style="margin:0 0 8px"><span data-i="spark"></span>Reading of this selection</h3>' + msgs.map(m => `<p style="margin:0 0 8px;line-height:1.6;font-size:13.5px">${m}</p>`).join('') +
    '<p class="note" style="margin:0">Scenario results are assumption-driven and not calibrated; the ADMT readings are hypotheses until the first borehole.</p>';
  paintIcons($('rlRead'));
}

/* ============================================================ REFRESH (v1.8.4)
   Reloads what is on screen from the files of the selected saved run. The server re-reads a file whenever it changes,
   so this only has to clear the page's own copy and draw the page again. Nothing is calculated and no file is written. */
let refBusy = false, watchJob = false, watchTimer = null;
function aqToast(t, ms) { const e = $('aqToast'); if (!e) return; e.textContent = t; e.hidden = false; clearTimeout(aqToast._t); aqToast._t = setTimeout(() => { e.hidden = true; }, ms || 5000); }
function refStale(on) { const b = $('refAll'); if (b) { b.classList.toggle('new', !!on); $('refTxt').textContent = on ? 'Refresh: new results' : 'Refresh'; } }
async function refreshAll() {
  if (refBusy) return;
  const unsaved = Object.keys(REGCH || {}).length + Object.keys(CBCH || {}).length;
  if (unsaved) { aqToast('Not refreshed: you have ' + unsaved + ' unsaved assumption change' + (unsaved > 1 ? 's' : '') + '. Save them (with a reason) or press "Stop editing" first.', 7000); return; }
  refBusy = true; const b = $('refAll'); b.classList.add('spin');
  const t6 = (typeof segVal === 'function' ? segVal('t6') : null), keepStep = cur;
  try {
    const before = RUNS.length;
    await loadRuns();                 // re-reads the saved-run list; keeps the saved run you had selected
    resetData(true);                  // clears the page's own copy of every table, chart and map
    go(keepStep);
    if (keepStep === 6 && t6) { const btn = document.querySelector(`#t6 button[data-v="${t6}"]`); if (btn && !btn.classList.contains('on')) btn.click(); }
    refStale(false);
    const now = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'});
    const added = RUNS.length - before;
    aqToast('Refreshed at ' + now + ' · saved run ' + (RUN || 'none') + (added > 0 ? ' · ' + added + ' new saved run' + (added > 1 ? 's' : '') + ' in the list' : ''));
  } catch (e) { aqToast('Could not refresh: ' + e.message, 7000); }
  finally { refBusy = false; b.classList.remove('spin'); }
}
// tell the user when a calculation they started has finished, from any step
function watchJobs() {
  watchJob = true; if (watchTimer) return;
  watchTimer = setInterval(async () => {
    let J; try { J = (await api('/api/jobs', S())).jobs || []; } catch (e) { return; }
    const j = J[0]; if (j && j.running) return;
    clearInterval(watchTimer); watchTimer = null;
    if (watchJob) { watchJob = false; refStale(true); aqToast('A calculation has finished. Press Refresh (top bar) to see the new results.', 9000); }
  }, 5000);
}

/* ============================================================ STORM & STORAGE PLAN (M7e) */
let SP = null, SPCH = {}, SPEDIT = false, SPR = null, SPseq = 0;
const SPS = {source: 'storm', mode: 'nz', intake: {}, storms: [{day: 0, rain_mm: 100, duration_h: 6, amc: 'auto'}, {day: 5, rain_mm: 60, duration_h: 6, amc: 'auto'}, {day: 12, rain_mm: 80, duration_h: 6, amc: 'auto'}, {day: 20, rain_mm: 50, duration_h: 12, amc: 'auto'}]};
const SSPRE = [['A wet spell: 4 storms in 20 days (example)', [[0, 100, 6], [5, 60, 6], [12, 80, 6], [20, 50, 12]]], ['Three heavy days in a row (example)', [[0, 100, 6], [1, 90, 6], [2, 80, 6]]], ['Two storms 2 days apart (example)', [[0, 125, 6], [2, 125, 6]]]];
const SPCOL = {shallow: '#4fb3a6', moderate: '#2f7fe0', deep: '#0f2a6b', buffer: '#d98a00', spill: '#e0453c', used: '#8a8f94'};
const SPT = {shallow: 'Shallow', moderate: 'Moderate', deep: 'Deep'};
const SPHELP = [
  ['Net zero plan (opens first)', 'Every cubic metre of rain on the lease is accounted for: how much runs off the roofs, the tar road and the green ground, how much stays on site (wets surfaces, soaks in, evaporates), how much the reservoir must hold, and whether the reservoir alone holds it. There is no overflow basin, so the reservoir is sized for the design storm and larger storms are shown as stress cases. The check is simple: does anything leave the lease, for each storm from Heavy (90 mm) to Extremely heavy (250 mm), on average and on wet ground?'],
  ['Closed loop and NEWater', 'Takes the treated wastewater of the flats through ultrafiltration, reverse osmosis and UV so that it can replace borewell and outside water for every use, and runs the same 125 years of rainfall. It shows how much water still has to come from borewells or an outside supply, whether the borewell pumping capacity is enough, how big the membrane plant and the treated-water tank must be, what happens to the reverse osmosis concentrate, and which measures (better recovery, less planted area, lower use) cut the borewell draft further. Borewell capacity and the recharge share are placeholders until a pumping test.'],
  ['Risk calendar and drought', 'Runs the 125-year IMD daily rainfall record through the lease day by day. The risk calendar shows, month by month, how heavy the largest storms have been and how much of the reservoir to keep empty. The drought balance shows how much of the drinking-quality water comes from rain on the lease and how much has to come from wells or an outside supply, in an average year, a dry year and the driest year, for 2 to 6 persons per flat, with and without roof tanks.'],
  ['How to use the net zero plan', '1) Check the land (roof, road, curve number) and the storm list. 2) Set the reservoir size. 3) Check the recharge well sets. 4) Press Calculate (about 30 to 60 seconds). 5) Read the verdict, then the storm check, the water budget of one storm, how long the reservoir takes to empty, and what changes the reservoir size. Download as Excel for the record. The two detail views (one storm, a season of storms) are still here.'],
  ['Detail tools: what they answer', 'Fresh water arrives (storm runoff, or a volume you type). How fast can the recharge wells at each depth tier take it, how long does it take to place all of it underground, how much space is there around the wells, how much stays near them, and when can they take the next batch? A buffer (pond, tank or large well) is optional.'],
  ['Detail tools: how to use them', '1) Choose the water that arrives: an IMD rain class or your own mm and duration, or a volume. 2) Choose a buffer, or none. 3) Set the number of wells at each tier and, if you have measured it, the intake of each well. 4) Read the numbers and the timeline. Every change recalculates. Download the result as Excel.'],
  ['Detail tools: how the wells are limited', 'Each well takes water at a limit set by rock permeability × contact area × gradient (the same rule as the cloudburst tiers). Water that arrives faster than the wells can take goes to the buffer, and anything beyond the buffer overflows. The tier table also shows the pore space around the wells and what the earlier MODFLOW results say happens to injected water.'],
  ['What it cannot tell you', 'It is not calibrated: there is no borehole or injection-test data yet, and the catchment, buffer and runoff numbers are placeholders until the site plan is ready. Rainfall comes from the daily IMD record, so the hourly shape is assumed. Water quality, clogging and first-flush diversion are not included. Recharge locations are candidate zones for connected fractured rock, inferred from passive ADMT readings, not confirmed until drilling and pumping tests.']
];
async function buildSp() {
  $('spHelp').innerHTML = SPHELP.map(h => `<div><b>${esc(h[0])}</b><p class="note" style="margin:6px 0 0;line-height:1.6">${esc(h[1])}</p></div>`).join('');
  try { SP = await api('/api/storm/defaults', SR()); NZD = await api('/api/storm/netzero/defaults', SR()); DRD = await api('/api/storm/drought/defaults', SR()); } catch (e) { fail('spRes', e); throw e; }
  const v = SP.values;
  $('spCls').innerHTML = SP.classes.map(c => `<button class="chip sm" data-mm="${c.mm}" title="${esc(c.label)}">${esc(c.label.replace(/\s*\(.*\)/, ''))} · ${c.mm} mm</button>`).join('');
  $('spCls').onclick = e => { const b = e.target.closest('button'); if (!b) return; $('spRain').value = b.dataset.mm; spMarkCls(); spCalc(); };
  $('spCap').value = v.sr_capture_frac; $('spBv').value = v.sr_pond_m3; $('spDem').value = Math.round(v.sr_demand_m3d);
  $('spPol').innerHTML = Object.keys(SP.policies).map(k => `<option value="${k}">${esc(SP.policies[k].label)}</option>`).join(''); $('spPol').value = 'all';
  const upd = () => { $('spCapL').textContent = Math.round($('spCap').value * 100) + ' %'; $('spBsL').textContent = $('spBs').value + ' %';
    $('spPolT').textContent = SP.policies[$('spPol').value].text; $('spCust').hidden = $('spPol').value !== 'custom'; $('spBufF').hidden = segVal('spBuf') !== 'finite'; };
  segOn('spSrc', s => { SPS.source = s; spLayout(); spCalc(); });
  segOn('spMode', m => { SPS.mode = m; spLayout(); spCalc(); });
  segOn('spAmcS', () => spCalc());
  $('ssAfter').onchange = () => spCalc();
  $('ssAdd').onclick = () => { const l = SPS.storms[SPS.storms.length - 1]; if (SPS.storms.length >= 12) return; SPS.storms.push({day: l ? +l.day + 7 : 0, rain_mm: 60, duration_h: 6, amc: 'auto'}); drawSs(); spCalc(); };
  $('ssPre').innerHTML = SSPRE.map((p, i) => `<button class="chip sm" data-i="${i}">${esc(p[0])}</button>`).join('');
  $('ssPre').onclick = e => { const b = e.target.closest('button'); if (!b) return; SPS.storms = SSPRE[+b.dataset.i][1].map(r => ({day: r[0], rain_mm: r[1], duration_h: r[2], amc: 'auto'})); drawSs(); spCalc(); };
  segOn('spAmc', () => spCalc()); segOn('spBuf', () => { upd(); spCalc(); });
  ['spRain', 'spDur', 'spVm', 'spVd', 'spBv', 'spNs', 'spNm', 'spNd', 'spMc', 'spDc', 'spPol', 'spOs', 'spOm', 'spOd', 'spDon', 'spDem'].forEach(id => $(id).onchange = () => { if (id === 'spRain') spMarkCls(); upd(); spCalc(); });
  ['spCap', 'spBs'].forEach(id => { $(id).oninput = upd; $(id).onchange = () => spCalc(); });
  $('spGo').onclick = () => spCalc(true);
  $('spXl').onclick = spExport;
  $('spEditBtn').onclick = () => { SPEDIT = !SPEDIT; if (!SPEDIT) SPCH = {}; $('spEditBtn').textContent = SPEDIT ? 'Stop editing' : 'Edit values'; drawSpReg(); };
  $('spSaveBtn').onclick = saveSp;
  upd(); spMarkCls(); drawSpReg(); drawSpWells(SP.wells); drawSs(); nzInit(); drInit(); clInit(); wdInit(); spLayout();
  await spCalc(true);
}
function spLayout() {
  const nz = SPS.mode === 'nz', se = SPS.mode === 'season', dr = SPS.mode === 'dr', cl = SPS.mode === 'cl';
  $('spNZ').hidden = !nz; $('spWD').hidden = dr || cl; $('spDR').hidden = !(dr || cl); $('spCL').hidden = !cl; $('spOld').hidden = nz || dr || cl;
  $('spModeT').textContent = cl ? 'Treated wastewater taken through ultrafiltration, reverse osmosis and UV so that it can be used for every purpose, with borewells as the back-up source. Compared with the open case, over the 125-year rainfall record.' : dr ? 'Which months are risky, how empty to keep the reservoir, and how much water must come from outside, over the 125-year rainfall record.' : nz ? 'Accounts for all the rain on the lease and checks that nothing leaves it, storm by storm.' : se ? 'Several storms in a row through one reservoir and one set of wells (detail tool).' : 'One storm through a buffer and the wells (detail tool).';
  $('spSave') && 0;
  $('spSrcC').hidden = se; $('spStorm').hidden = se || SPS.source !== 'storm'; $('spVol').hidden = se || SPS.source !== 'volume'; $('spSeason').hidden = !se;
  $('spCapC').hidden = !se && SPS.source === 'volume';
}
function drawSs() {
  const A = {auto: 'Auto', I: 'Dry', II: 'Avg', III: 'Wet'};
  $('ssTab').innerHTML = '<thead><tr><th>#</th><th>Day</th><th>Rain mm</th><th>Hours</th><th>Wetness</th><th></th></tr></thead><tbody>' + SPS.storms.map((x, i) =>
    `<tr><td><b>${i + 1}</b></td><td><input class="reg-in num ssI" data-i="${i}" data-k="day" value="${x.day}" inputmode="decimal" style="width:44px"></td><td><input class="reg-in num ssI" data-i="${i}" data-k="rain_mm" value="${x.rain_mm}" inputmode="decimal" style="width:48px"></td>` +
    `<td><input class="reg-in num ssI" data-i="${i}" data-k="duration_h" value="${x.duration_h}" inputmode="decimal" style="width:40px"></td><td><select class="selbox ssA" data-i="${i}" style="padding:4px 2px;min-width:0;width:62px">${Object.keys(A).map(k => `<option value="${k}"${x.amc === k ? ' selected' : ''}>${A[k]}</option>`).join('')}</select></td>` +
    `<td>${SPS.storms.length > 1 ? `<button class="chip sm ssDel" data-i="${i}" title="Remove this storm" style="padding:2px 8px">×</button>` : ''}</td></tr>`).join('') + '</tbody>';
  $('ssTab').querySelectorAll('.ssI').forEach(i => i.onchange = () => { SPS.storms[+i.dataset.i][i.dataset.k] = +i.value; spCalc(); });
  $('ssTab').querySelectorAll('.ssA').forEach(i => i.onchange = () => { SPS.storms[+i.dataset.i].amc = i.value; spCalc(); });
  $('ssTab').querySelectorAll('.ssDel').forEach(b => b.onclick = () => { SPS.storms.splice(+b.dataset.i, 1); drawSs(); spCalc(); });
}
function spMarkCls() { const r = +$('spRain').value; $('spCls').querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.mm === r)); }
function spBody(full) {
  const vol = SPS.source === 'volume';
  const ev = {source: SPS.source, volume_m3: +$('spVm').value, rain_mm: +$('spRain').value, duration_h: vol ? +$('spVd').value : +$('spDur').value, amc: segVal('spAmc') || 'II',
    buffer_mode: segVal('spBuf') || 'ample', pond_start_frac: (+$('spBs').value) / 100, policy: $('spPol').value, demand_on: $('spDon').checked, moderate_cb: $('spMc').value, deep_cb: $('spDc').value};
  if (ev.policy === 'custom') ev.open_at = {shallow: +$('spOs').value / 100, moderate: +$('spOm').value / 100, deep: +$('spOd').value / 100};
  const wd = WD();
  return Object.assign(SR(), {event: ev, design: wd.design, assumptions: Object.assign({sr_capture_frac: +$('spCap').value, sr_pond_m3: +$('spBv').value, sr_demand_m3d: +$('spDem').value}, wd.assumptions),
    phase: +($('spPh') && $('spPh').value) || 1, counts: {shallow: +$('spNs').value, moderate: +$('spNm').value, deep: +$('spNd').value}, intake: SPS.intake, current_frac: 0.8, lead_h: 24, include: {sweep: true, rules: true, compare: true}});
}
function ssBody() { const b = spBody(); b.event.amc = segVal('spAmcS') || 'II'; b.event.source = 'storm'; b.after_days = +$('ssAfter').value || 30;
  b.storms = SPS.storms.map(x => ({day: +x.day, rain_mm: +x.rain_mm, duration_h: +x.duration_h, amc: x.amc})); return b; }
let spTimer = null;
function spCalc(now) { clearTimeout(spTimer); return new Promise(res => { spTimer = setTimeout(async () => {
  const my = ++SPseq; $('spMsg').textContent = 'Calculating…';
  try { if (SPS.mode === 'cl') { if (!now && CLR && !CLdirty) { drawCL(CLR); $('spMsg').textContent = ''; return res(); }
      $('spRes').innerHTML = '<div class="loading">Running 125 years day by day with the closed loop (about 30 seconds)…</div>'; $('spMsg').textContent = 'Calculating (about 30 seconds)…';
      const R = await post('/api/storm/loop', clBody()); if (my !== SPseq) return res(); CLR = R; CLdirty = false; $('spMsg').textContent = ''; drawCL(R); }
    else if (SPS.mode === 'dr') { if (!now && DRR && !DRdirty) { drawDR(DRR); $('spMsg').textContent = ''; return res(); }
      $('spRes').innerHTML = '<div class="loading">Running 125 years day by day (about 20 seconds)…</div>'; $('spMsg').textContent = 'Calculating (about 20 seconds)…';
      const R = await post('/api/storm/drought', drBody()); if (my !== SPseq) return res(); DRR = R; DRdirty = false; $('spMsg').textContent = ''; drawDR(R); }
    else if (SPS.mode === 'nz') { if (!now && NZR && !NZdirty) { drawNZ(NZR); $('spMsg').textContent = ''; return res(); }
      $('spRes').innerHTML = '<div class="loading">Checking every storm (about 30 to 60 seconds)…</div>'; $('spMsg').textContent = 'Calculating (about 30 to 60 seconds)…';
      const R = await post('/api/storm/netzero', nzBody()); if (my !== SPseq) return res(); NZR = R; NZdirty = false; $('spMsg').textContent = ''; if (R.inputs && R.inputs.intakes) { NZIT = R.inputs.intakes.map(x => ({...x})); nzTables(); } drawNZ(R); }
    else if (SPS.mode === 'season') { const R = await post('/api/storm/season', ssBody()); if (my !== SPseq) return res(); SPR = R; $('spMsg').textContent = ''; if (R.result && R.result.inputs) { drawSpWells(R.result.inputs.wells); wdDraw(R.result.inputs.wells); } drawSeason(R); }
    else { const R = await post('/api/storm/plan', spBody()); if (my !== SPseq) return res(); SPR = R; $('spMsg').textContent = ''; if (R.result && R.result.inputs) { drawSpWells(R.result.inputs.wells); wdDraw(R.result.inputs.wells); } drawSp(R); } }
  catch (e) { if (my === SPseq) { $('spMsg').innerHTML = `<span style="color:#8a1f12">${esc(e.message)}</span>`; } }
  res(); }, now ? 0 : 350); }); }
async function spExport() {
  $('spMsg').textContent = 'Preparing the Excel file…';
  try { const r = SPS.mode === 'cl' ? await post('/api/storm/loop/export', clBody()) : SPS.mode === 'dr' ? await post('/api/storm/drought/export', drBody()) : SPS.mode === 'nz' ? await post('/api/storm/netzero/export', nzBody()) : SPS.mode === 'season' ? await post('/api/storm/season/export', ssBody()) : await post('/api/storm/export', spBody()); $('spMsg').textContent = 'Saved ' + r.name + ' in the run folder, under report.';
    const a = document.createElement('a'); a.href = '/api/runfile?' + new URLSearchParams({site: SITE, run: RUN, path: r.path, dl: 1}); a.download = r.name; document.body.appendChild(a); a.click(); a.remove();
  } catch (e) { $('spMsg').innerHTML = `<span style="color:#8a1f12">${esc(e.message)}</span>`; }
}
function drawSpWells(W) {
  $('spWells').innerHTML = '<thead><tr><th>Well</th><th>Tier</th><th>Depth</th><th>Contact</th><th>Intake (m³/d)</th></tr></thead><tbody>' + W.map(w => {
    const typed = SPS.intake[w.id] != null;
    return `<tr><td><b>${esc(w.id)}</b></td><td>${esc(SPT[w.tier])}</td><td>${esc(({CB1: '0–20 m', CB2: '20–60 m', CB3: '60–175 m', CB4: '175–250 m'})[w.cb] || '')}</td><td>${w.area_m2 != null ? num(w.area_m2, 1) + ' m²' : '–'}</td>` +
      `<td><input class="reg-in num spI" data-id="${esc(w.id)}" value="${num(w.intake_m3d, 1)}" inputmode="decimal" style="width:70px${typed ? ';background:#fff7e0' : ''}"></td></tr>`; }).join('') + '</tbody>';
  $('spWells').querySelectorAll('.spI').forEach(i => i.onchange = () => { const v = i.value.trim(); if (v === '') delete SPS.intake[i.dataset.id]; else SPS.intake[i.dataset.id] = +v; spCalc(); });
}


/* ---------- v1.15.1 digest of the Storm & Storage results, sent to the AI assistant ---------- */
function stormDigest() {
  const r1 = v => (typeof v === 'number' && isFinite(v)) ? (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10) : v;
  const rnd = o => Array.isArray(o) ? o.map(rnd) : (o && typeof o === 'object') ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, rnd(v)])) : r1(o);
  const sc = o => { const q = {}; Object.entries(o || {}).forEach(([k, v]) => { if (v == null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') q[k] = v; else if (v && typeof v === 'object' && !Array.isArray(v)) { const w = {}; Object.entries(v).forEach(([a, b]) => { if (b == null || typeof b !== 'object') w[a] = b; }); q[k] = w; } }); return rnd(q); };
  const wet = {I: 'dry', II: 'average', III: 'wet'};
  const L = [];
  try {
    const mode = {nz: 'Net zero plan', dr: 'Risk calendar and drought', cl: 'Closed loop and NEWater', one: 'One storm (detail)', season: 'A season of storms (detail)'}[SPS.mode] || SPS.mode;
    L.push('View open now: ' + mode + '. Status: pre-drilling, assumption-driven scenario, not calibrated.');
    if (NZR) {
      const I = NZR.inputs, La = NZR.land, rows = NZR.rows, dmm = I.design_mm || 125;
      L.push(`NET ZERO PLAN${NZdirty ? ' (inputs changed since this was calculated; may be stale)' : ''}: reservoir ${r1(La.reservoir_m3)} m3 (${r1(La.reservoir_area_m2)} m2 of water, ${r1(La.reservoir_pct_of_lease)} % of the lease); lease ${r1(La.lease_m2)} m2, roof ${r1(La.roof_m2)}, tar road ${r1(La.road_m2)}, green ${r1(La.open_m2)}; roof/road coefficients ${I.roof_c}/${I.paved_c}; open-ground curve number ${I.open_cn}; share of land runoff led to reservoir ${I.capture_frac}; volume storm length ${I.dur_vol_h} h, peak storm length ${I.dur_peak_h} h; design storm ${dmm} mm (GEV 100-year).`);
      L.push('Storm check (storm | mm | return period GEV yr | ground | rain m3 | held on site m3 | led to reservoir m3 | reservoir needed m3 | beyond reservoir m3 | leaves lease m3 | verdict):\n' + rows.map(r => [r.label, r.rain_mm, r.return_period_yr == null ? '-' : r1(r.return_period_yr), wet[r.amc] || r.amc, r1(r.rain_m3), r1(r.held_on_site_m3), r1(r.captured_m3), r1(r.reservoir_needed_m3), r1(r.beyond_reservoir_m3), r1(r.discharge_m3), r.holds ? 'holds' : (r.rain_mm > dmm ? 'exceeds (stress)' : 'FAILS')].join(' | ')).join('\n'));
      const d = rows.find(r => r.rain_mm === dmm && r.amc === 'III') || rows[0];
      L.push(`Design storm on wet ground: surfaces ` + d.surfaces.map(x => `${x.surface} ${r1(x.area_m2)} m2 rain ${r1(x.rain_m3)} runoff ${r1(x.runoff_m3)} held ${r1(x.held_on_site_m3)}`).join('; ') + `; reservoir content after storm ${r1(d.reservoir_content_m3)} m3. Days to empty: ` + d.clearing.map(c => `${c.label} ${r1(c.intake_m3d)} m3/d = ${c.days == null ? '-' : r1(c.days)} d`).join('; ') + '.');
      L.push('Levers on the design storm (change | value | ground | reservoir needed m3 | leaves lease m3): ' + NZR.levers.map(l => [l.lever, l.value, wet[l.amc], r1(l.reservoir_needed_m3), l.leaves_lease_m3 == null ? '-' : r1(l.leaves_lease_m3)].join(' | ')).join('; '));
      if (NZR.wells) L.push('Recharge wells in use (id | tier | open depth | contact m2 | intake m3/d): ' + NZR.wells.map(w => [w.id, w.tier, w.cb, w.area_m2 != null ? r1(w.area_m2) : '-', r1(w.intake_m3d)].join(' | ')).join('; '));
    }
    if (DRR) {
      const C = DRR.central, Dm = DRR.demand, pol = $('drPol') ? $('drPol').value : '';
      L.push(`RISK CALENDAR AND DROUGHT${DRdirty ? ' (inputs changed since; may be stale)' : ''}: level rule ${pol}; ${r1(Dm.people)} people; potable demand ${r1(Dm.potable_m3y)} m3/yr; years counted ${C.years_counted}, years with water leaving the lease ${C.years_with_spill} (mean ${r1(C.spill_in_spill_years)} m3 in those years); outside supply average ${r1(C.sup_pot)} m3/yr, dry-10 % year ${r1(C.sup_pot_p90)}, driest ${r1(C.sup_pot_max)} (${C.sup_pot_max_year}); met by rain ${Math.round(100 * C.share_met_by_rain)} %; longest stretch on outside water ${C.longest_supplement_run_d} d; treated wastewater not used ${r1(C.surplus)} m3/yr.`);
      L.push('Risk calendar (month | largest day mm | risk | free space m3 | highest level m3 | draw-down before next month m3 | lead days):\n' + DRR.calendar.map(c => [c.month, r1(c.max_day_mm), c.risk, r1(c.free_space_m3), r1(c.highest_level_m3), r1(c.drop_to_next_m3), c.lead_days_for_next].join(' | ')).join('\n'));
      L.push('Level rules compared (rule | outside supply m3/yr | met by rain % | years water leaves | mean leaving m3/yr | drawn down to wells m3/yr): ' + DRR.policies.map(p => [p.policy, r1(p.sup_mean), Math.round(100 * p.share_met), p.years_with_spill + ' of ' + p.years, r1(p.spill_mean), r1(p.rech_mean)].join(' | ')).join('; '));
      if (DRR.triggers) L.push('Forecast triggers (class | mm | return period yr | free space m3 | beyond reservoir m3 | 48 h release m3): ' + DRR.triggers.map(t => [t.class, r1(t.rain_mm), r1(t.return_period_yr), r1(t.free_space_m3), r1(t.short_m3), r1(t.released_48h_m3)].join(' | ')).join('; '));
    }
    if (CLR) L.push('CLOSED LOOP AND NEWATER' + (CLdirty ? ' (inputs changed since; may be stale)' : '') + ': ' + JSON.stringify(rnd(CLR.central || {})).slice(0, 1400) + (CLR.scenarios ? ' Scenarios: ' + JSON.stringify(rnd(CLR.scenarios.map(x => sc(x)))).slice(0, 1400) : ''));
    if (typeof SPR !== 'undefined' && SPR && (SPS.mode === 'one' || SPS.mode === 'season')) L.push(`${SPS.mode === 'one' ? 'ONE STORM' : 'SEASON OF STORMS'} result (scalar fields): ` + JSON.stringify(sc(SPR.result || SPR)).slice(0, 1500));
  } catch (e) { L.push('(digest incomplete: ' + e.message + ')'); }
  return L.join('\n\n').slice(0, 6500);
}

/* ---------- v1.15.0 recharge well design (shared by net zero, one storm, season) ---------- */
let WDT = null;
function WD() { return {design: {shallow_type: $('wdTyp').value, bore_method: $('wdM').value},
  assumptions: {sr_shaft_d_m: +$('wdSd').value, sr_shaft_depth_m: +$('wdSh').value, sr_bore_d_m: +$('wdBd').value, sr_inj_head_m: +$('wdH').value}}; }
function wdInit() {
  const d = SP.design || {};
  $('wdTyp').value = d.shallow_type || 'shaft'; $('wdSd').value = d.sr_shaft_d_m ?? 1; $('wdSh').value = d.sr_shaft_depth_m ?? 15; $('wdBd').value = d.sr_bore_d_m ?? 0.165;
  $('wdM').value = d.bore_method || 'darcy'; $('wdH').value = d.sr_inj_head_m ?? 10;
  ['wdTyp', 'wdSd', 'wdSh', 'wdBd', 'wdM', 'wdH'].forEach(id => $(id).onchange = wdChanged);
  wdDraw(SP.wells);
}
function wdDraw(W) {
  $('wdHc').hidden = $('wdM').value !== 'injection';
  const seen = {}, rows = (W || []).filter(w => !seen[w.tier] && (seen[w.tier] = 1));
  $('wdTab').innerHTML = '<thead><tr><th>Well</th><th>Structure</th><th>Open</th><th>Contact</th><th>K</th><th>Intake each</th></tr></thead><tbody>' + rows.map(w =>
    `<tr><td>${esc(SPT[w.tier])}</td><td>${esc(w.structure === 'borewell' ? 'borewell' : w.structure)} Ø ${num(w.d_m, 3)} m</td><td>${spN(w.open_from_m)}–${spN(w.open_to_m)} m</td><td>${num(w.area_m2, 1)} m²</td><td>${num(w.K, 3)} m/d</td><td><b>${num(w.intake_m3d, 1)}</b> m³/d</td></tr>`).join('') + '</tbody>';
  $('wdNote').innerHTML = $('wdM').value === 'injection' ? 'Injection-well rule for borewells: intake = 2π × K × open length × head ÷ ln(R ÷ r), with R = the storage radius of each well and r = half the diameter. It assumes the open section lies below the water table; above it, the K × area × gradient rule is the safer choice.' :
    'K × area × gradient, the same rule as the cloudburst model (gradient from the cloudburst register). Contact area = π × diameter × open length (+ floor for a shaft or pit).';
}
async function wdChanged() {
  $('spMsg').textContent = 'Updating the wells…';
  try { const r = await post('/api/storm/wells', Object.assign(SR(), WD()));
    SP.wells = r.wells; SP.design = r.design; wdDraw(r.wells); drawSpWells(r.wells);
    const typed = {}; NZIT.forEach(x => { if (x.typed) typed[x.label] = x; });
    NZIT = r.intakes.map(x => typed[x.label] || {...x}); nzTables();
    const sel = $('drWell').value; $('drWell').innerHTML = NZIT.map((s, i) => `<option value="${i}">${esc(s.label)} · ${spN(s.m3d)} m³/d</option>`).join(''); $('drWell').value = sel || '0';
    NZdirty = true; DRdirty = true; CLdirty = true;
    if (SPS.mode === 'one' || SPS.mode === 'season') spCalc(); else $('spMsg').textContent = 'Well design changed. Press Calculate.';
  } catch (e) { $('spMsg').innerHTML = `<span style="color:#8a1f12">${esc(e.message)}</span>`; }
}
const spN = (v, d = 0) => v == null || isNaN(v) ? '–' : fmt(+(+v).toFixed(d));
function spDays(d) { return d == null ? 'more than 60 days' : (d < 1 ? 'less than a day' : d.toFixed(1) + ' days'); }
function drawSp(R) {
  const S = R.result.summary, I = R.result.inputs, ev = I.event, mode = R.buffer_mode, vol = ev.source === 'volume';
  drawSpWells(R.result.wells);
  const kp = (t, v, s) => `<div style="border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:#fff"><div class="note" style="margin:0">${esc(t)}</div><div style="font-size:21px;font-weight:800;color:#17433f">${v}</div><div class="note" style="margin:0">${s || ''}</div></div>`;
  const bufNeed = R.pond_needed_m3;
  const minDays = S.intake_total_m3d > 0 ? S.to_pond_m3 / S.intake_total_m3d : null;
  let h = `<div class="banner warn" style="margin:0 0 12px"><span>${ic('alert')}</span><span><b>Pre-drilling, assumption-driven scenario, not calibrated.</b> Catchment, buffer and runoff values are placeholders until the site plan is ready (storm register v${esc(R.register_version)}).</span></div>`;
  h += `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px">` +
    kp(vol ? 'Water delivered' : 'Runoff that reaches the wells side', spN(S.to_pond_m3) + ' m³', vol ? `over ${ev.duration_h} h` : `of ${spN(S.runoff_generated_m3)} m³ generated on the lease; ${spN(S.land_not_captured_m3)} m³ cannot be led here`) +
    (vol ? '' : kp('Peak inflow', spN(S.peak_inflow_m3h) + ' m³/h', `at hour ${num(S.time_peak_h, 1)}; worst hour of rain ${num(S.peak_1h_mm, 0)} mm`)) +
    kp('Intake of all wells', spN(S.intake_total_m3d) + ' m³/d', minDays ? `at least ${num(minDays, 1)} days to place this volume` : '') +
    kp(mode === 'none' ? 'Taken at once, no buffer' : 'Buffer needed to hold it', mode === 'none' ? spN(S.wells_m3 + S.used_m3) + ' m³' : spN(bufNeed) + ' m³', mode === 'finite' ? `your buffer ${spN(S.pond_m3)} m³` : mode === 'ample' ? 'peak level of the buffer' : 'the rest overflows') +
    kp('Overflow', spN(S.spill_m3) + ' m³', num(S.spill_pct, 1) + ' % of the water that arrived') +
    kp('All placed underground by', S.pond_empty_day == null ? 'more than 60 days' : num(S.pond_empty_day, 1) + ' days', 'buffer back to empty (wells + use)') + `</div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="info"></span>What this means</h3><div id="spStory" class="note" style="line-height:1.7"></div></div>`;
  h += `<div class="grid g2" style="margin-top:14px"><div class="card"><h3><span data-i="wave"></span>${vol ? 'Water arriving' : 'Rain and inflow'}</h3><div id="spP1" style="height:300px"></div></div>` +
       `<div class="card"><h3><span data-i="bars"></span>Where the water goes, over time</h3><p class="sub">Cumulative water in each tier, the buffer level, use and overflow.</p><div id="spP2" style="height:300px"></div></div></div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="layers"></span>Each tier: how much it takes, what is stored, when it can take more</h3><div class="tw"><table id="spTier"></table></div><p class="note" id="spTierN" style="margin-top:8px"></p></div>`;
  if (R.rules) h += `<div class="card" style="margin-top:14px"><h3><span data-i="list"></span>By rain class (same catchment, wells and buffer setting)</h3><div class="tw"><table id="spRules"></table></div><p class="note" style="margin-top:8px">“Buffer needed” is the smallest buffer with at most 1 % overflow when it starts empty. ${mode === 'finite' ? '“Highest start fill” is how full the buffer may be when this storm begins without more than 0.5 % overflow; “lead time” is how long the wells and use need to empty a full buffer down to that level.' : ''}</p></div>`;
  if (R.compare) h += `<div class="card" style="margin-top:14px"><h3><span data-i="repeat"></span>How the wells are opened: the same water, four operating rules</h3><div class="tw"><table id="spCmp"></table></div><p class="note" style="margin-top:8px">The rule changes which tier receives the water. With a large buffer the totals barely differ; the split between tiers and the underground fate do.</p></div>`;
  if (R.sweep) h += `<div class="grid g2" style="margin-top:14px"><div class="card"><h3><span data-i="chart"></span>Overflow against buffer size</h3><div id="spP3" style="height:280px"></div></div><div class="card" id="spPre"></div></div>`;
  $('spRes').innerHTML = h;
  paintIcons($('spRes'));
  spStory(R, minDays); spPlots(R); spTierTable(R);
  if (R.rules) table('spRules', R.rules, [['label', 'Rain class'], ['rain_mm', 'mm'], ['return_period_yr', 'Return period (GEV)', (v, r) => rpTxt(v) + `<br><span class="note" style="margin:0">Gumbel: ${rpTxt(r.return_period_gumbel_yr).replace(' †', '')}</span>`], ['to_pond_m3', 'Arrives (m³)', v => spN(v)], ['peak_inflow_m3h', 'Peak (m³/h)', v => spN(v)],
    ['pond_needed_m3', 'Buffer needed (m³)', v => spN(v)], ...(mode === 'finite' ? [['spill_empty_pct', 'Overflow, empty start (%)', v => num(v, 1)], ['max_start_frac', 'Highest start fill', v => v == null ? 'cannot hold it' : Math.round(v * 100) + ' %'],
    ['lead_from_full_h', 'Lead time from full (h)', v => v == null ? '–' : spN(v)]] : []), ['days_to_empty', 'Days until the buffer is empty', v => v == null ? 'more than 60' : num(v, 1)]]);
  if (R.compare) table('spCmp', R.compare, [['label', 'Operating rule'], ['spill_m3', 'Overflow (m³)', v => spN(v)], ['shallow_m3', 'Shallow (m³)', v => spN(v)], ['moderate_m3', 'Moderate (m³)', v => spN(v)], ['deep_m3', 'Deep (m³)', v => spN(v)],
    ['used_m3', 'Used (m³)', v => spN(v)], ['empty_day', 'Days to empty', v => v == null ? '–' : num(v, 1)], ['to_water_table_m3', 'Reaches water table (m³)', v => v == null ? '–' : spN(v)], ['stored_open_1y_m3', 'Stored after 1 yr, open boundary (m³)', v => v == null ? '–' : num(v, 1)]]);
}
function drawSeason(R) {
  const S = R.result.summary, I = R.result.inputs, mode = R.buffer_mode, ST = R.result.storms, U = R.underground || [];
  drawSpWells(I.wells);
  const kp = (t, v, s) => `<div style="border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:#fff"><div class="note" style="margin:0">${esc(t)}</div><div style="font-size:21px;font-weight:800;color:#17433f">${v}</div><div class="note" style="margin:0">${s || ''}</div></div>`;
  let h = `<div class="banner warn" style="margin:0 0 12px"><span>${ic('alert')}</span><span><b>Pre-drilling, assumption-driven scenario, not calibrated.</b> The storms are examples until you type the IMD record or forecast; catchment, buffer and runoff values are placeholders (storm register v${esc(R.register_version)}).</span></div>`;
  h += `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px">` +
    kp('Storms in the sequence', ST.length, `over ${num(S.last_storm_end_day, 1)} days, then ${num(I.horizon_days - S.last_storm_end_day, 0)} days followed`) +
    kp('Reaches the buffer / wells', spN(S.to_buffer_m3) + ' m³', `intake of all wells ${spN(S.intake_total_m3d)} m³/d`) +
    kp('Highest buffer level', spN(S.buffer_peak_m3) + ' m³', mode === 'finite' ? `your buffer ${spN(I.pond_m3)} m³` : mode === 'none' ? 'no buffer' : 'buffer sized to hold the whole sequence') +
    kp('Buffer to hold the whole sequence', spN(R.buffer_needed_m3) + ' m³', 'no overflow at any storm') +
    kp('Overflow', spN(S.spill_m3) + ' m³', num(S.spill_pct, 1) + ' % of the water that arrived') +
    kp('Buffer empty again on day', S.empty_day == null ? 'not within the period' : num(S.empty_day, 1), 'after the last storm') + `</div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="info"></span>What this means</h3><div id="spStory" class="note" style="line-height:1.7"></div></div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="list"></span>Storm by storm</h3><div class="tw"><table id="ssRes"></table></div><p class="note" style="margin-top:8px">Each row runs from that storm's start to the start of the next one. “Buffer at start” is the water still held from earlier storms; “Fill of tiers” is the share of pore space around the wells that is occupied at the end of the row, no recovery / with drainage (see below).</p></div>`;
  h += `<div class="grid g2" style="margin-top:14px"><div class="card"><h3><span data-i="wave"></span>Buffer level and inflow</h3><div id="ssP1" style="height:320px"></div></div>` +
       `<div class="card"><h3><span data-i="bars"></span>Where the water goes, over time</h3><div id="ssP2" style="height:320px"></div></div></div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="layers"></span>How full each tier gets, and how much space comes back between storms</h3><div id="ssP3" style="height:340px"></div><div class="tw" style="margin-top:8px"><table id="ssTier"></table></div>` +
       `<p class="note" style="margin-top:8px;line-height:1.6">Two bounds are drawn because the saved MODFLOW results first read out at 3 months and so cannot show recovery over days to weeks. <b>No recovery</b> (solid): every cubic metre injected stays in the pore space within ${R.radius_m} m of the wells. <b>With drainage</b> (dashed): the share that reaches the water table leaves the space with a first-order delay equal to the MODFLOW mean delay of that tier; the share held in dry rock stays. The real behaviour lies between the two, and only water-level records and injection tests will show where.</p></div>`;
  $('spRes').innerHTML = h; paintIcons($('spRes'));
  // story
  const L = [], prb = ST.filter(r => r.k > 1 && r.buffer_at_start_m3 > 0.05 * Math.max(R.buffer_needed_m3, 1));
  L.push(`<b>${ST.length} storms</b> put <b>${spN(S.to_buffer_m3)} m³</b> into the buffer and wells, while all ${I.wells.length} wells together can take only <b>${spN(S.intake_total_m3d)} m³/d</b>. Placing everything underground needs at least ${num(S.to_buffer_m3 / Math.max(S.intake_total_m3d, 1e-9), 1)} days of wells working, so the storms ${S.to_buffer_m3 / Math.max(S.intake_total_m3d, 1e-9) > S.last_storm_end_day ? '<b>arrive faster than the wells can clear them</b>' : 'are cleared by the wells between them'}.`);
  if (prb.length) L.push(`Storm${prb.length > 1 ? 's' : ''} ${prb.map(r => r.k).join(', ')} arrive${prb.length > 1 ? '' : 's'} while the buffer still holds ${prb.map(r => spN(r.buffer_at_start_m3) + ' m³').join(', ')} from the storm before — so the buffer is <b>not empty</b> when the next one comes.`);
  else L.push('Each storm finds the buffer (almost) empty again.');
  if (mode === 'none') L.push(`With <b>no buffer</b>, only what the wells take as it arrives goes underground (<b>${spN(S.wells_m3)} m³</b>); <b>${spN(S.spill_m3)} m³ (${num(S.spill_pct, 0)} %) overflows</b>.`);
  else if (S.spill_m3 > 1) { const w = ST.filter(r => r.spill_m3 > 1); L.push(`Your buffer of ${spN(I.pond_m3)} m³ <b>overflows ${spN(S.spill_m3)} m³ (${num(S.spill_pct, 0)} %)</b>, in storm${w.length > 1 ? 's' : ''} ${w.map(r => r.k).join(', ')}. To catch the whole sequence you would need about <b>${spN(R.buffer_needed_m3)} m³</b>, or to use or release water between storms.`); }
  else L.push(mode === 'ample' ? `A buffer of about <b>${spN(R.buffer_needed_m3)} m³</b> holds the whole sequence without overflow.` : `Your buffer of ${spN(I.pond_m3)} m³ holds the whole sequence without overflow (highest level ${spN(S.buffer_peak_m3)} m³).`);
  if (S.used_m3 > 1) L.push(`<b>${spN(S.used_m3)} m³</b> is used from the buffer after the first storm (use set at ${spN(I.demand_m3d)} m³/d).`);
  const hi = U.filter(u => u.fill_none_peak_pct != null).sort((a, b) => b.fill_none_peak_pct - a.fill_none_peak_pct)[0];
  if (hi) L.push(hi.fill_none_peak_pct < 50 ? `The pore space around the wells is <b>not the limit</b> for this sequence: the busiest tier (${SPT[hi.tier].toLowerCase()}) reaches ${num(hi.fill_none_peak_pct, 0)} % if nothing drains${hi.fill_drain_peak_pct != null ? ` (${num(hi.fill_drain_peak_pct, 0)} % if the MODFLOW delay applies)` : ''}.` :
    `The <b>${SPT[hi.tier].toLowerCase()}</b> tier reaches <b>${num(hi.fill_none_peak_pct, 0)} %</b> of its pore space if nothing drains${hi.fill_drain_peak_pct != null ? ` and ${num(hi.fill_drain_peak_pct, 0)} % if the MODFLOW delay applies` : ''}. ${hi.fill_none_peak_pct >= 100 ? 'That is more than the space there: this tier cannot take the water; send it to another tier or wait.' : 'Space starts to matter here; spread the water over the other tiers.'}`);
  L.push(`<b>What next:</b> (1) type the real storms of a wet spell from the IMD record, or the forecast; (2) check whether a bigger intake (more wells, a higher gradient or a larger contact area) or a buffer is the cheaper way to stop overflow; (3) measure infiltration in the first well of each tier and record water levels for weeks after the first storm to see how fast the space comes back.`);
  $('spStory').innerHTML = '<ul style="margin:0;padding-left:18px">' + L.map(x => `<li style="margin-bottom:6px">${x}</li>`).join('') + '</ul>';
  // storm table
  const pf = v => v == null ? '–' : num(v, 0) + ' %';
  const pn = v => num(v, v < 10 ? 1 : 0);
  const fill = r => ['shallow', 'moderate', 'deep'].filter(t => r.tier_fill && r.tier_fill[t] && r.tier_fill[t].none != null).map(t => `${SPT[t]} ${pn(r.tier_fill[t].none)}${r.tier_fill[t].drain != null ? ' / ' + pn(r.tier_fill[t].drain) : ''}`).join('<br>') || '–';
  table('ssRes', ST.map(r => Object.assign({}, r, {fill: fill(r)})), [['k', '#'], ['day', 'Day', v => num(v, 1)], ['rain_mm', 'Rain (mm)', v => num(v, 0)], ['return_period_yr', 'Return period (GEV)', v => v == null ? '–' : rpTxt(v)], ['amc', 'Wetness', (v, r) => ({I: 'Dry', II: 'Average', III: 'Wet'})[v] + (r.prior5_mm > 0 ? ` (${num(r.prior5_mm, 0)} mm before)` : '')],
    ['arrives_m3', 'Arrives (m³)', v => spN(v)], ['buffer_at_start_m3', 'Buffer at start (m³)', v => spN(v)], ['buffer_peak_m3', 'Highest buffer (m³)', v => spN(v)], ['spill_m3', 'Overflow (m³)', v => spN(v)],
    ['shallow_m3', 'Shallow (m³)', v => spN(v)], ['moderate_m3', 'Moderate (m³)', v => spN(v)], ['deep_m3', 'Deep (m³)', v => spN(v)], ['fill', 'Tier fill, % (no recovery / with drainage)', v => v]]);
  // plots
  const s = R.result.series, x = s.t_day, shapes = ST.map(r => ({type: 'line', x0: r.day, x1: r.day, y0: 0, y1: 1, yref: 'paper', line: {color: '#9aa7a5', width: 1, dash: 'dot'}}));
  const ann = ST.map(r => ({x: r.day, y: 1, yref: 'paper', text: 'S' + r.k, showarrow: false, yanchor: 'bottom', font: {size: 11, color: '#4a5a58'}}));
  draw('ssP1', [{type: 'scatter', mode: 'lines', x, y: s.inflow_m3_h, name: 'Inflow (m³/h)', yaxis: 'y2', fill: 'tozeroy', line: {color: 'rgba(47,127,224,.7)', width: 1}, fillcolor: 'rgba(47,127,224,.18)'},
    {type: 'scatter', mode: 'lines', x, y: s.pond_m3, name: 'Buffer level (m³)', line: {color: SPCOL.buffer, width: 2.4}}],
    base({margin: {l: 56, r: 56, t: 24, b: 66}, xaxis: {title: 'Days from the first storm'}, yaxis: {title: 'Buffer level (m³)', rangemode: 'tozero'}, yaxis2: {title: 'Inflow (m³/h)', overlaying: 'y', side: 'right', showgrid: false, rangemode: 'tozero'},
      legend: {orientation: 'h', y: -0.26}, shapes, annotations: ann}), CFG);
  const tr2 = []; ['deep', 'moderate', 'shallow'].forEach(k => tr2.push({type: 'scatter', mode: 'lines', x, y: s.wells_cum_m3[k], name: SPT[k] + ' wells (cumulative m³)', stackgroup: 'w', line: {width: 0.5, color: SPCOL[k]}, fillcolor: SPCOL[k] + 'cc'}));
  if (S.spill_m3 > 1) tr2.push({type: 'scatter', mode: 'lines', x, y: s.spill_cum_m3, name: 'Overflow (cumulative)', line: {color: SPCOL.spill, width: 2, dash: 'dash'}});
  if (S.used_m3 > 1) tr2.push({type: 'scatter', mode: 'lines', x, y: s.used_cum_m3, name: 'Used (cumulative)', line: {color: SPCOL.used, width: 2, dash: 'dot'}});
  draw('ssP2', tr2, base({margin: {l: 56, r: 20, t: 24, b: 66}, xaxis: {title: 'Days from the first storm'}, yaxis: {title: 'Cumulative water (m³)', rangemode: 'tozero'}, legend: {orientation: 'h', y: -0.26}, shapes, annotations: ann}), CFG);
  const tr3 = []; U.forEach(u => { if (!u.fill_none_pct) return;
    tr3.push({type: 'scatter', mode: 'lines', x: u.t_day, y: u.fill_none_pct, name: SPT[u.tier] + ': no recovery', line: {color: SPCOL[u.tier], width: 2.4}});
    if (u.fill_drain_pct) tr3.push({type: 'scatter', mode: 'lines', x: u.t_day, y: u.fill_drain_pct, name: SPT[u.tier] + ': with drainage', line: {color: SPCOL[u.tier], width: 2, dash: 'dash'}}); });
  if (tr3.length) draw('ssP3', tr3, base({margin: {l: 56, r: 20, t: 24, b: 80}, xaxis: {title: 'Days from the first storm'}, yaxis: {title: 'Pore space occupied (%)', rangemode: 'tozero'}, legend: {orientation: 'h', y: -0.3}, shapes: shapes.concat([{type: 'line', x0: 0, x1: 1, xref: 'paper', y0: 100, y1: 100, line: {color: SPCOL.spill, width: 1.5, dash: 'dot'}}]), annotations: ann}), CFG);
  else $('ssP3').innerHTML = '<p class="note">The pore space needs the main assumption register (specific yield) — not available.</p>';
  table('ssTier', U.map(u => Object.assign({}, u)), [['tier', 'Tier', v => SPT[v]], ['n_wells', 'Wells'], ['depth', 'Depth'], ['injected_m3', 'Injected (m³)', v => spN(v)], ['space_m3', 'Pore space within ' + R.radius_m + ' m (m³)', v => spN(v)],
    ['fill_none_peak_pct', 'Highest fill, no recovery (%)', v => v == null ? '–' : num(v, 0)], ['fill_drain_peak_pct', 'Highest fill, with drainage (%)', v => v == null ? 'not in saved run' : num(v, 0)],
    ['delay_d', 'MODFLOW mean delay (d)', v => v == null ? '–' : num(v, 0)], ['to_aquifer_pct', 'Reaches water table (%)', v => v == null ? '–' : num(v, 0)]]);
}
function spStory(R, minDays) {
  const S = R.result.summary, I = R.result.inputs, ev = I.event, mode = R.buffer_mode, U = R.underground || [], L = [];
  L.push(ev.source === 'volume' ? `<b>${spN(S.to_pond_m3)} m³</b> is delivered over ${ev.duration_h} h.` :
    `A <b>${ev.rain_mm} mm</b> storm over ${ev.duration_h} h${S.return_period_yr != null ? ` (as a 1-day rain about a ${rpTxt(S.return_period_yr).replace('about ', '').replace(' †', '')} event, GEV)` : ''} puts about <b>${spN(S.rain_on_lease_m3)} m³</b> of rain on the ${num(I.areas_m2.lease / 10000, 2)} ha lease; the runoff model gives <b>${spN(S.runoff_generated_m3)} m³</b>, of which <b>${spN(S.to_pond_m3)} m³</b> can be led to the wells (roof ${spN(S.roof_runoff_m3)} m³). The peak arrives about hour ${num(S.time_peak_h, 1)} at ${spN(S.peak_inflow_m3h)} m³/h.`);
  L.push(`The ${I.wells.length} wells together can take <b>${spN(S.intake_total_m3d)} m³/d</b> (shallow ${spN(I.wells.filter(w => w.tier === 'shallow').reduce((a, w) => a + w.intake_m3d, 0))}, moderate ${spN(I.wells.filter(w => w.tier === 'moderate').reduce((a, w) => a + w.intake_m3d, 0))}, deep ${spN(I.wells.filter(w => w.tier === 'deep').reduce((a, w) => a + w.intake_m3d, 0))}). ` +
    (minDays ? `So placing the whole volume takes <b>at least ${num(minDays, 1)} days</b> — the speed of the wells, not the storm, sets the pace.` : ''));
  if (mode === 'none') L.push(`With <b>no buffer</b> only what the wells can take as it arrives goes underground: <b>${spN(S.wells_m3)} m³</b>. About <b>${spN(S.spill_m3)} m³ (${num(S.spill_pct, 0)} %) overflows</b>.`);
  else if (mode === 'ample') L.push(`To catch all of it you need a buffer of about <b>${spN(R.pond_needed_m3)} m³</b> (pond, tank, large well or a combination). It then empties in about <b>${spDays(S.pond_empty_day)}</b>.`);
  else L.push(`Your buffer of <b>${spN(S.pond_m3)} m³</b> ${S.spill_m3 > 1 ? `overflows <b>${spN(S.spill_m3)} m³ (${num(S.spill_pct, 0)} %)</b>${S.time_full_h != null ? ` from about hour ${num(S.spill_start_h, 1)}` : ''}; you would need about <b>${spN(R.pond_needed_m3)} m³</b> to hold it all` : `holds all of it (peak ${spN(S.pond_peak_m3)} m³) and empties in about <b>${spDays(S.pond_empty_day)}</b>`}.`);
  if (S.used_m3 > 1) L.push(`<b>${spN(S.used_m3)} m³</b> is used from the buffer instead of being recharged (use set at ${spN(I.demand_m3d)} m³/d after the storm); set the use to 0 to send everything underground.`);
  if (U.length) {
    const hi = U.filter(u => u.space_used_pct != null).sort((a, b) => b.space_used_pct - a.space_used_pct)[0];
    if (hi) L.push(hi.space_used_pct < 50 ? `The pore space in the rock around the wells (within ${R.radius_m} m of each) is <b>not the limit</b> for this volume: the busiest tier (${SPT[hi.tier].toLowerCase()}) would use about ${num(hi.space_used_pct, 0)} % of it.` :
      `The <b>${SPT[hi.tier].toLowerCase()}</b> tier would use about <b>${num(hi.space_used_pct, 0)} %</b> of the pore space within ${R.radius_m} m of its wells — space starts to matter there; spread the water over other tiers or wait before the next batch.`);
    const A = U.filter(u => u.available);
    if (A.length) {
      const inj = A.reduce((a, u) => a + u.injected_m3, 0), st1 = A.reduce((a, u) => a + (u.stored_open_1y_m3 || 0), 0), wt = A.reduce((a, u) => a + u.injected_m3 * (u.to_aquifer_pct || 0) / 100, 0);
      const cl = A.some(u => u.stored_closed_1y_m3 != null);
      L.push(`Underground (cloudburst MODFLOW, ${esc((R.fate_structure || '').replace('zoned_', ''))} structure, central case): about ${num(100 * wt / Math.max(inj, 1), 0)} % reaches the water table after the dry-rock delay, but with an <b>open boundary</b> only about <b>${num(st1, 1)} m³</b> of the ${spN(inj)} m³ is still stored after a year — the rest drifts out of the model area. ` +
        (cl ? `With a closed boundary, ${spN(A.reduce((a, u) => a + (u.stored_closed_1y_m3 || 0), 0))} m³ remains.` : `The closed-boundary result is not in this saved run.`) + ` The real site lies between the two; only water-level monitoring and a pumping-back test will show where.`);
    }
  }
  L.push(`<b>What next:</b> (1) measure the infiltration or falling-head rate in the first well of each tier and type it in the intake table; (2) record the water level in the nearest borewell for weeks after the first storm to see when the water arrives and leaves; (3) once the site plan exists, replace the catchment placeholders in the assumptions table; (4) a pumping-back test shows how much of the stored water can be recovered.`);
  $('spStory').innerHTML = '<ul style="margin:0;padding-left:18px">' + L.map(x => `<li style="margin-bottom:6px">${x}</li>`).join('') + '</ul>';
}
function spPlots(R) {
  const s = R.result.series, I = R.result.inputs, T = I.event.duration_h, vol = I.event.source === 'volume';
  const lim = Math.min(Math.max(T + 12, 12), 96), ix = s.t_h.map((t, i) => i).filter(i => s.t_h[i] <= lim);
  const t1 = ix.map(i => s.t_h[i]);
  const tr1 = [{type: 'scatter', mode: 'lines', x: t1, y: ix.map(i => s.inflow_m3_h[i]), name: 'Inflow (m³/h)', fill: 'tozeroy', line: {color: SPCOL.buffer, width: 2}, fillcolor: 'rgba(217,138,0,.18)'}];
  if (!vol) tr1.push({type: 'bar', x: t1, y: ix.map(i => s.rain_mm_h[i]), name: 'Rain (mm/h)', yaxis: 'y2', marker: {color: 'rgba(47,127,224,.45)'}, width: 0.22});
  draw('spP1', tr1, base({margin: {l: 56, r: 56, t: 10, b: 66}, xaxis: {title: 'Hours from the start of the storm', range: [0, lim]}, yaxis: {title: 'Inflow (m³/h)', rangemode: 'tozero'},
    yaxis2: {title: 'Rain (mm/h)', overlaying: 'y', side: 'right', autorange: 'reversed', showgrid: false, rangemode: 'tozero', visible: !vol}, legend: {orientation: 'h', y: -0.28}, barmode: 'overlay'}), CFG);
  const x = s.t_h.map(t => t / 24), tr2 = [];
  ['deep', 'moderate', 'shallow'].forEach(k => tr2.push({type: 'scatter', mode: 'lines', x, y: s.wells_cum_m3[k], name: SPT[k] + ' wells (cumulative m³)', stackgroup: 'w', line: {width: 0.5, color: SPCOL[k]}, fillcolor: SPCOL[k] + 'cc'}));
  tr2.push({type: 'scatter', mode: 'lines', x, y: s.pond_m3, name: 'Buffer level (m³)', line: {color: SPCOL.buffer, width: 2.4}});
  if (R.result.summary.used_m3 > 1) tr2.push({type: 'scatter', mode: 'lines', x, y: s.used_cum_m3, name: 'Used from buffer (cumulative)', line: {color: SPCOL.used, width: 2, dash: 'dot'}});
  if (R.result.summary.spill_m3 > 1) tr2.push({type: 'scatter', mode: 'lines', x, y: s.spill_cum_m3, name: 'Overflow (cumulative)', line: {color: SPCOL.spill, width: 2, dash: 'dash'}});
  draw('spP2', tr2, base({margin: {l: 62, r: 16, t: 10, b: 86}, xaxis: {title: 'Days from the start of the storm', range: [0, Math.min(Math.max(10, (R.result.summary.pond_empty_day || 30) * 1.15), s.t_h[s.t_h.length - 1] / 24)]}, yaxis: {title: 'Water (m³)', rangemode: 'tozero'}, legend: {orientation: 'h', y: -0.36}}), CFG);
  if (R.sweep) {
    const sw = R.sweep;
    draw('spP3', [{type: 'scatter', mode: 'lines+markers', x: sw.map(r => r.pond_m3), y: sw.map(r => r.spill_pct), line: {color: SPCOL.spill, width: 2.4}, marker: {size: 5}, name: 'Overflow (%)'}],
      base({margin: {l: 56, r: 16, t: 10, b: 50}, xaxis: {title: 'Buffer volume (m³)'}, yaxis: {title: 'Overflow (% of the water that arrives)', rangemode: 'tozero'},
        shapes: [{type: 'line', x0: I.pond.pond_m3, x1: I.pond.pond_m3, y0: 0, y1: 1, yref: 'paper', line: {color: SPCOL.buffer, width: 2, dash: 'dot'}}],
        annotations: [{x: I.pond.pond_m3, y: 1, yref: 'paper', text: 'your buffer', showarrow: false, yanchor: 'bottom', font: {size: 11, color: '#7a4b00'}}]}), CFG);
  }
  if (R.pre) drawSpPre(R);
}
function drawSpPre(R) {
  const P = R.pre, Vp = R.result.summary.pond_m3, el = $('spPre');
  el.innerHTML = `<h3><span data-i="alert"></span>A storm is forecast: how much to empty first?</h3>
    <div class="ctl"><label>Buffer fill now (%)</label><input type="range" id="spCur" min="0" max="100" step="5" value="80"><span class="num" id="spCurL"></span></div>
    <div class="ctl"><label>Hours until the storm (IMD alert lead time)</label><input type="number" id="spLead" min="0" max="240" step="1" value="24"></div><div id="spPreOut" class="note" style="line-height:1.7"></div>`;
  const go = async () => {
    $('spCurL').textContent = $('spCur').value + ' %';
    try { const b = spBody(); b.current_frac = $('spCur').value / 100; b.lead_h = +$('spLead').value; b.include = {sweep: false, rules: false, compare: false};
      const r = await post('/api/storm/plan', b), p = r.pre; if (!p) return;
      $('spPreOut').innerHTML = p.max_start_frac == null ? `<b>Even an empty buffer would overflow</b> under this storm: ${esc(p.note)}` :
        `The buffer may hold at most <b>${spN(p.max_start_frac * Vp)} m³ (${Math.round(p.max_start_frac * 100)} %)</b> when the storm begins. You have ${spN(p.current_m3)} m³, so release <b>${spN(p.need_release_m3)} m³</b> first. With every well${$('spDon').checked ? ' and the use' : ''} working (${spN(p.release_rate_m3d)} m³/d) that takes about <b>${p.lead_needed_h == null ? '–' : spN(p.lead_needed_h)} h</b>. ` +
        `With ${$('spLead').value} h of warning the buffer reaches ${spN(p.at_storm_m3)} m³ (${Math.round(p.at_storm_frac * 100)} %) and then overflows about <b>${spN(p.spill_m3)} m³ (${num(p.spill_pct, 1)} %)</b>.`;
    } catch (e) { $('spPreOut').textContent = e.message; } };
  paintIcons(el);
  $('spCur').oninput = () => { $('spCurL').textContent = $('spCur').value + ' %'; }; $('spCur').onchange = go; $('spLead').onchange = go; go();
}
function spTierTable(R) {
  const U = R.underground || [], hasC = U.some(u => u.stored_closed_1y_m3 != null);
  const rows = R.result.inputs.wells.length ? TIERS_SP.map(t => { const u = U.find(x => x.tier === t) || {}; const ws = R.result.wells.filter(w => w.tier === t);
    return Object.assign({tier: t, n: ws.length, intake: ws.reduce((a, w) => a + w.intake_m3d, 0), per: ws.length ? ws[0].intake_m3d : 0, takes: ws.reduce((a, w) => a + w.taken_m3, 0)}, u); }).filter(r => r.n) : [];
  const f = (v, d) => v == null ? '–' : num(v, d);
  table('spTier', rows, [['tier', 'Tier', (v, r) => `<b>${SPT[v]}</b><br><span class="note">${r.n} well${r.n > 1 ? 's' : ''}${r.depth ? ' · ' + esc(r.depth) : ''}</span>`], ['intake', 'Intake (m³/d)', (v, r) => spN(v, 1) + `<br><span class="note">${spN(r.per, 1)} per well</span>`],
    ['takes', 'Takes (m³)', v => spN(v)], ['space_m3', 'Pore space near wells (m³)', (v, r) => v == null ? '–' : spN(v) + `<br><span class="note">${f(r.space_used_pct, 0)} % used</span>`],
    ['held_pct', 'Held in dry rock (%)', v => f(v, 0)], ['delay_d', 'To water table after (d)', v => f(v, 0)],
    ['stored_open_1y_m3', 'Stored after 1 yr, open (m³)', (v, r) => v == null ? '–' : num(v, 1) + `<br><span class="note">${f(r.stored_open_1y_pct, 2)} % of injected</span>`],
    ...(hasC ? [['stored_closed_1y_m3', 'Stored after 1 yr, closed (m³)', (v, r) => v == null ? '–' : num(v, 1) + `<br><span class="note">${f(r.stored_closed_1y_pct, 1)} %</span>`]] : []),
    ['reuse_open_y', 'Next batch after (open)', v => v == null ? 'more than 10 yr' : (v === 0 ? 'at once' : v < 1 ? Math.round(v * 12) + ' months' : v + ' yr')]], {empty: 'No wells.'});
  $('spTierN').innerHTML = (U.some(u => u.available) ? `Underground columns come from the saved cloudburst MODFLOW results (central case, ${esc((R.fate_structure || '').replace('zoned_', ''))} structure, a roof-sized volume of about 160 m³) and are scaled to this volume; larger volumes have not been simulated. ` : 'No cloudburst results (M7d) in this saved run, so only intake and pore space are shown. ') +
    `“Next batch” is when the water that stays near the well has fallen to half of its highest value. ` + (hasC ? '' : 'The closed-boundary result is not in this saved run.');
}
const TIERS_SP = ['shallow', 'moderate', 'deep'];
function drawSpReg() {
  const ents = SP.register.entries || [], R = SP.register;
  $('spVers').innerHTML = (R.versions || []).map(v => `<span class="chip sm ${v === R.version ? 'on' : ''}">v${esc(v)}</span>`).join('');
  $('spRegNote').innerHTML = `<b>${esc(R.file)}</b> · ${esc(R.status || '')}. Each saved edit becomes a new read-only version and is logged in the decision log. Changes made with the sliders and boxes on the left are only for this session.`;
  const cell = (e, f) => { const c = SPCH[e.key] || {}; const v = c[f] ?? e[f]; return SPEDIT ? `<input class="reg-in num" data-k="${esc(e.key)}" data-f="${f}" value="${esc(v)}" inputmode="decimal">` : `<span class="num">${num(v, 4)}</span>`; };
  $('spRegT').innerHTML = '<thead><tr><th>ID</th><th>Assumption</th><th>Low</th><th>Central</th><th>High</th><th>Unit</th><th>Status</th><th>How to test it</th></tr></thead><tbody>' +
    ents.map(e => `<tr class="${SPCH[e.key] ? 'chg' : ''}"><td><b>${esc(e.id)}</b></td><td style="min-width:240px"><b>${esc(e.parameter)}</b><br><span class="note">${esc(e.key)} · ${esc(e.basis || '')}</span></td><td>${cell(e, 'low')}</td><td>${cell(e, 'central')}</td><td>${cell(e, 'high')}</td><td>${esc(e.unit || '')}</td>` +
      `<td><span class="pill ${/placeholder/i.test(e.status) ? 'p-r' : /suggested/i.test(e.status) ? 'p-a' : 'p-g'}">${esc(e.status || '–')}</span></td><td class="note" style="min-width:200px">${esc(e.field_measurement_to_test || '')}</td></tr>`).join('') + '</tbody>';
  $('spRegT').querySelectorAll('.reg-in').forEach(i => i.onchange = () => { const e = ents.find(x => x.key === i.dataset.k), f = i.dataset.f, v = i.value.trim();
    SPCH[e.key] = SPCH[e.key] || {}; if (String(v) === String(e[f])) delete SPCH[e.key][f]; else SPCH[e.key][f] = +v; if (!Object.keys(SPCH[e.key]).length) delete SPCH[e.key];
    i.closest('tr').classList.toggle('chg', !!SPCH[e.key]); spSaveBar(); });
  spSaveBar();
}
function spSaveBar() { const n = Object.keys(SPCH).length; $('spSave').hidden = !SPEDIT; $('spChg').textContent = n ? `${n} assumption${n > 1 ? 's' : ''} changed` : 'No changes yet'; }
async function saveSp() {
  const reason = $('spReason').value.trim(), by = $('spBy').value.trim(), M = $('spSMsg');
  if (!Object.keys(SPCH).length) { M.textContent = 'Change at least one value first.'; return; }
  if (!reason || !by) { M.textContent = 'A reason and an approver are required.'; return; }
  for (const k of Object.keys(SPCH)) { const e = SP.register.entries.find(x => x.key === k), c = Object.assign({}, e, SPCH[k]);
    if ([c.low, c.central, c.high].some(v => v === '' || isNaN(+v))) { M.textContent = `${k}: values must be numbers.`; return; }
    if (!(+c.low <= +c.central && +c.central <= +c.high)) { M.textContent = `${k}: low ≤ central ≤ high is required.`; return; } }
  M.textContent = 'Saving…';
  try { const r = await post('/api/storm/save', {site: SITE, changes: SPCH, reason, by});
    SPCH = {}; SPEDIT = false; $('spEditBtn').textContent = 'Edit values'; $('spReason').value = ''; M.textContent = '';
    SP = await api('/api/storm/defaults', SR()); const v = SP.values; $('spCap').value = v.sr_capture_frac; $('spBv').value = v.sr_pond_m3; $('spDem').value = Math.round(v.sr_demand_m3d); $('spCapL').textContent = Math.round(v.sr_capture_frac * 100) + ' %';
    drawSpReg(); $('spRegNote').insertAdjacentHTML('afterbegin', `<span class="pill p-g">Saved ${esc(r.file)} (read-only) and logged as ${esc(r.decision)}.</span> `); spCalc(true);
  } catch (e) { M.textContent = 'Not saved: ' + e.message; }
}

/* ============================================================ NET ZERO PLAN (v1.11.0) */
let NZD = null, NZR = null, NZdirty = true, NZST = [], NZIT = [], NZSEL = 1;
const NZC = {held: '#8fb7a8', res: '#2f7fe0', ovf: '#d98a00', out: '#e0453c', tank: '#6fcf97'};
function nzInit() {
  const v = NZD.inputs;
  $('nzLease').value = Math.round(v.lease_m2); $('nzRoof').value = v.roof_m2; $('nzRw').value = v.road_w_m; $('nzRl').value = v.road_len_m; $('nzCn').value = v.open_cn; $('nzRc').value = v.roof_c; $('nzPc').value = v.paved_c;
  $('nzCap').value = v.capture_frac; $('nzDv').value = v.dur_vol_h; $('nzDp').value = v.dur_peak_h;
  $('nzRv').value = v.reservoir_m3; $('nzRd').value = v.reservoir_depth_m; $('nzUse').value = v.demand_m3d;
  $('nzRnb').value = v.rt_nb; $('nzRa').value = v.rt_a_m3; $('nzRb').value = v.rt_b_m3; $('nzRf').value = v.rt_f_m3; $('nzRsf').value = String(v.rt_storm_from); $('nzRst').value = String(v.rt_storm_to); $('nzRup').value = String(v.rt_topup >= 0.5 ? 1 : 0); $('nzRtA').value = v.rt_amen_m3; $('nzRfA').value = v.rt_flats_roof_m2; $('nzRtOn').value = String(v.rt_amen_on >= 0.5 ? 1 : 0); $('nzRtFree').value = v.rt_free_pct;
  NZST = NZD.storms.map(s => ({...s})); NZIT = NZD.intakes.map(s => ({...s}));
  const dirty = () => { NZdirty = true; DRdirty = true; CLdirty = true; $('spMsg').textContent = 'Inputs changed. Press Calculate.'; nzAreas(); if (typeof drNote === 'function') drNote(); };
  ['nzRoof', 'nzRw', 'nzRl', 'nzCn', 'nzRc', 'nzPc', 'nzDv', 'nzDp', 'nzRv', 'nzRd', 'nzUse', 'nzRnb', 'nzRa', 'nzRb', 'nzRf', 'nzRsf', 'nzRst', 'nzRup', 'nzRtA', 'nzRfA', 'nzRtOn', 'nzRtFree'].forEach(id => $(id).onchange = dirty);
  $('nzCap').oninput = () => { $('nzCapL').textContent = Math.round($('nzCap').value * 100) + ' %'; }; $('nzCap').onchange = dirty; $('nzCapL').textContent = Math.round($('nzCap').value * 100) + ' %';
  $('nzStAdd').onclick = () => { if (NZST.length >= 8) return; NZST.push({label: 'My storm', rain_mm: 100}); nzTables(); dirty(); };
  nzTables(); nzAreas();
}
function nzAreas() {
  const L = +$('nzLease').value, roof = +$('nzRoof').value, road = Math.min(+$('nzRw').value * +$('nzRl').value, Math.max(L - roof, 0)), open = Math.max(L - roof - road, 0);
  $('nzAreas').innerHTML = `Roof ${spN(roof)} m² (${num(100 * roof / L, 1)} %) · tar road ${spN(road)} m² (${num(100 * road / L, 1)} %) · green ground and permeable paths ${spN(open)} m² (${num(100 * open / L, 1)} %)`;
  nzRtNote();
}
const MONN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function nzRt() {
  const roof = +$('nzRoof').value, nb = Math.max(Math.round(+$('nzRnb').value || 0), 0), a = +$('nzRa').value || 0, b = +$('nzRb').value || 0, f = +$('nzRf').value || 0, va = +$('nzRtA').value || 0,
    af = Math.min(Math.max(+$('nzRfA').value || 0, 0), roof), aa = Math.max(roof - af, 0), on = $('nzRtOn').value === '1', fr = Math.min(Math.max(+$('nzRtFree').value || 0, 0), 100),
    sf = +$('nzRsf').value, st = +$('nzRst').value, up = $('nzRup').value === '1';
  const vf = nb * (a + b), free = nb * b * fr / 100;
  return {roof, nb, a, b, f, va, af, aa, on, fr, sf, st, up, vf, free, flush: nb * f, tot: vf + (on ? va : 0)};
}
function nzRtNote() {
  const t = nzRt(), built = v => v / 0.9;
  $('nzRtN').innerHTML = `${t.nb} flat building${t.nb === 1 ? '' : 's'} × (A ${spN(t.a)} + B ${spN(t.b)}) = ${spN(t.vf)} m³ of pure-water chambers under ${spN(t.af)} m² of flat roof (${num(t.af > 0 ? 1000 * t.vf / t.af : 0, 0)} L per m² of roof); built size about ${spN(built(t.a))} m³ per chamber (for example 6 × 15 × 4 m with 3.6 m of working depth), flush chamber ${spN(t.flush)} m³ in all (about ${spN(built(t.f))} m³ built per building). ` +
    `Amenity roof ${spN(t.aa)} m² (the rest of the roof) drains to ${t.on ? spN(t.va) + ' m³ of tank (' + num(t.aa > 0 ? 1000 * t.va / t.aa : 0, 0) + ' L per m²)' : 'the reservoir (tank not joined)'}. ` +
    `Storm season ${MONN[t.sf - 1]} to ${MONN[t.st - 1]}: ${num(t.fr, 0)} % of chamber B kept empty = <b>${spN(t.free)} m³</b> of relief for a storm in that season; top-up ${t.up ? 'on' : 'off'}.`;
}
function nzTables() {
  $('nzSt').innerHTML = '<thead><tr><th>Storm</th><th>Rain mm</th><th title="Leave empty for a 1-day storm (the storm length of the volume check). Give 72 for a three-day total.">Hours</th><th></th></tr></thead><tbody>' + NZST.map((s, i) => `<tr><td><input class="reg-in nzL" data-i="${i}" value="${esc(s.label)}" style="width:100%;min-width:0;box-sizing:border-box"></td>` +
    `<td><input class="reg-in nzM" type="number" min="1" max="1500" data-i="${i}" value="${s.rain_mm}" style="width:62px"></td><td><input class="reg-in nzH" type="number" min="1" max="96" placeholder="1 day" data-i="${i}" value="${s.dur_h || ''}" style="width:58px"></td><td>${NZST.length > 1 ? `<button class="chip sm nzDel" data-i="${i}" style="padding:2px 8px" title="Remove">×</button>` : ''}</td></tr>`).join('') + '</tbody>';
  $('nzSt').querySelectorAll('.nzL').forEach(i => i.onchange = () => { NZST[+i.dataset.i].label = i.value; NZdirty = true; });
  $('nzSt').querySelectorAll('.nzM').forEach(i => i.onchange = () => { NZST[+i.dataset.i].rain_mm = +i.value; NZdirty = true; $('spMsg').textContent = 'Inputs changed. Press Calculate.'; });
  $('nzSt').querySelectorAll('.nzH').forEach(i => i.onchange = () => { NZST[+i.dataset.i].dur_h = i.value === '' ? null : +i.value; NZdirty = true; $('spMsg').textContent = 'Inputs changed. Press Calculate.'; });
  $('nzSt').querySelectorAll('.nzDel').forEach(b => b.onclick = () => { NZST.splice(+b.dataset.i, 1); nzTables(); NZdirty = true; $('spMsg').textContent = 'Inputs changed. Press Calculate.'; });
  $('nzIt').innerHTML = '<thead><tr><th>Well set</th><th>Intake m³/d</th></tr></thead><tbody>' + NZIT.map((s, i) => `<tr><td>${esc(s.label)}${s.note ? `<br><span class="note" style="margin:0">${esc(s.note)}</span>` : ''}</td><td><input class="reg-in nzI" type="number" min="0" data-i="${i}" value="${s.m3d}" style="width:70px${s.typed ? ';background:#fff7e0' : ''}"></td></tr>`).join('') + '</tbody>';
  $('nzIt').querySelectorAll('.nzI').forEach(i => i.onchange = () => { NZIT[+i.dataset.i].m3d = +i.value; NZIT[+i.dataset.i].typed = true; i.style.background = '#fff7e0'; NZdirty = true; $('spMsg').textContent = 'Inputs changed. Press Calculate.'; });
}
function nzBody() {
  return {site: SITE, run: RUN, phase: +($('spPh') && $('spPh').value) || 1, inputs: {roof_m2: +$('nzRoof').value, road_w_m: +$('nzRw').value, road_len_m: +$('nzRl').value, open_cn: +$('nzCn').value, roof_c: +$('nzRc').value, paved_c: +$('nzPc').value, capture_frac: +$('nzCap').value,
    dur_vol_h: +$('nzDv').value, dur_peak_h: +$('nzDp').value, reservoir_m3: +$('nzRv').value, reservoir_depth_m: +$('nzRd').value,
    demand_m3d: +$('nzUse').value, rt_nb: +$('nzRnb').value || 0, rt_a_m3: +$('nzRa').value || 0, rt_b_m3: +$('nzRb').value || 0, rt_f_m3: +$('nzRf').value || 0, rt_storm_from: +$('nzRsf').value, rt_storm_to: +$('nzRst').value, rt_topup: +$('nzRup').value, rt_amen_m3: +$('nzRtA').value || 0, rt_flats_roof_m2: +$('nzRfA').value || 0, rt_amen_on: +$('nzRtOn').value, rt_free_pct: +$('nzRtFree').value || 0}, storms: NZST.map(s => ({label: s.label, rain_mm: +s.rain_mm, dur_h: s.dur_h ? +s.dur_h : null})), intakes: NZIT.map(s => ({label: s.label, m3d: +s.m3d, typed: !!s.typed})), ...WD()};
}
function rpTxt(T) {
  if (T == null || !isFinite(T)) return 'beyond any fit';
  const t = T < 100 ? Math.round(T) : T < 1000 ? Math.round(T / 10) * 10 : T < 100000 ? Math.round(T / 100) * 100 : Math.round(T / 10000) * 10000;
  return (T > 125 ? 'about ' + fmt(t) + ' yr †' : t + ' yr');
}
function nzRP(r) {
  if (r.multi_day) return `${num(r.dur_h / 24, 0)}-day event, not on the 1-day curve`;
  const g = r.return_period_gumbel_yr;
  return rpTxt(r.return_period_yr) + (g != null ? `<br><span class="note" style="margin:0" title="Gumbel, comparison only (rejected for this record)">Gumbel: ${rpTxt(g).replace(' †', '')}</span>` : '');
}
function drawNZ(R) {
  const L = R.land, rows = R.rows, I = R.inputs, dmm = I.design_mm || 125, inDes = rows.filter(r => r.rain_mm <= dmm), over = rows.filter(r => r.rain_mm > dmm), bad = inDes.filter(r => !r.holds), overBad = over.filter(r => !r.holds);
  const overTxt = overBad.length ? ' Storms above the design exceed the reservoir (stress cases): ' + overBad.slice(0, 3).map(r => `${spN(r.rain_mm)} mm on ${r.amc === 'III' ? 'wet' : 'average'} ground, ${spN(r.discharge_m3)} m³ beyond it`).join('; ') + (overBad.length > 3 ? `; and ${overBad.length - 3} more` : '') + '.' : '';
  const kp = (t, v, s) => `<div style="border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:#fff"><div class="note" style="margin:0">${esc(t)}</div><div style="font-size:21px;font-weight:800;color:#17433f">${v}</div><div class="note" style="margin:2px 0 0">${s}</div></div>`;
  const ok = !bad.length;
  let h = `<div class="banner warn" style="margin:0 0 12px"><span>${ic('alert')}</span><span><b>Pre-drilling, assumption-driven scenario, not calibrated.</b> Road length and the open-ground curve number are placeholders (storm register v${esc(R.register_version)}). Recharge points are candidate zones for connected fractured rock inferred from passive ADMT, not confirmed until drilling and pumping tests.</span></div>`;
  h += `<div class="banner ${ok ? 'ok' : 'bad'}" style="margin:0 0 12px"><span>${ic(ok ? 'filecheck' : 'alert')}</span><span><b>${ok ? `Net zero discharge holds for every storm up to the ${spN(dmm)} mm design storm, on average and on wet ground.` : `Water leaves the lease in ${bad.length} of ${inDes.length} design cases.`}</b> ` +
    (ok ? (() => { const mx = Math.max(0, ...inDes.map(r => r.beyond_reservoir_m3 || 0)); return mx > 0.5 ? `The reservoir holds the runoff; at most ${spN(mx)} m³ goes beyond it in the wettest design case, within the 1 % tolerance used for “holds”.` : 'The reservoir alone holds the runoff, so nothing leaves the lease.'; })() + overTxt :
    bad.slice(0, 3).map(r => `${spN(r.rain_mm)} mm on ${r.amc === 'III' ? 'wet' : 'average'} ground: ${spN(r.discharge_m3)} m³ leaves`).join('; ') + (bad.length > 3 ? `; and ${bad.length - 3} more (see the table)` : '') + '. Enlarge the reservoir, put roof water in separate tanks, lower the curve number, or lead more of the land runoff to the reservoir.') + `</span></div>`;
  h += `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px">` +
    kp('Reservoir', spN(L.reservoir_m3) + ' m³', `${spN(L.reservoir_area_m2)} m² of water, ${num(L.reservoir_pct_of_lease, 1)} % of the lease`) +
    kp('Runoff coefficients', `${(+I.roof_c).toFixed(2)} / ${(+I.paved_c).toFixed(2)}`, `roof / tar road; green ground by curve number ${spN(I.open_cn)}`) +
    kp('Land cover', `${num(L.roof_pct, 0)} % roof`, `${num(L.road_pct, 1)} % tar road, ${num(L.open_pct, 0)} % green and permeable`) +
    kp('Roof tanks', spN((+I.rt_nb || 0) * ((+I.rt_a_m3 || 0) + (+I.rt_b_m3 || 0)) + (I.rt_amen_on >= 0.5 ? (+I.rt_amen_m3 || 0) : 0)) + ' m³', `${num(I.rt_free_pct || 0, 0)} % of chamber B kept empty in ${MONN[(I.rt_storm_from || 9) - 1]} to ${MONN[(I.rt_storm_to || 11) - 1]}: ${spN((+I.rt_nb || 0) * (+I.rt_b_m3 || 0) * (I.rt_free_pct || 0) / 100)} m³ of relief` + ((I.rt_free_pct || 0) > 0 ? ', storms in the season only' : ' (no credit taken)')) +
    kp('Reservoir for the design storm', spN((rows.find(r => r.rain_mm === (I.design_mm || 125) && r.amc === 'III') || rows[0]).reservoir_needed_m3) + ' m³', `${spN((rows.find(r => r.rain_mm === (I.design_mm || 125) && r.amc === 'III') || rows[0]).rain_mm)} mm on wet ground, 1 % spill`) + `</div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="list"></span>Storm check: where every cubic metre goes</h3><div class="tw"><table id="nzTab"></table></div>` +
    `<p class="note" style="margin-top:8px">“Held on site” wets the roof, road and ground, is used by plants, soaks in or evaporates; none of it leaves the lease. Return periods are from the GEV fit (L-moments) of the 125 annual maximum days; Gumbel, rejected for this record, is shown in small type for comparison. † Beyond the 125-year record, the return period is an extrapolation and only a guide; the record day is ${num(R.gev.record_mm, 1)} mm (${R.gev.record_year}). Reservoir needed is for the ${spN(I.dur_vol_h)} h storm with a spill of 1 % or less (the tolerance for “holds”); storms above the ${spN(dmm)} mm design are stress cases; peak inflow is for the ${spN(I.dur_peak_h)} h storm (a storm given as several days is spread over its own length, and its peak is for that length; size drains on the 1-day rows).</p></div>`;
  if (R.extremes) h += `<div class="card" style="margin-top:14px"><h3><span data-i="chart"></span>Design storms from the 125-year record (1-day rain)</h3><div class="tw"><table id="nzExt"></table></div>` +
    `<p class="note" style="margin-top:8px">GEV fitted by L-moments to the annual maximum days ${R.gev.first_year}–${R.gev.last_year} (shape ξ = ${num(R.gev.xi, 2)}, a heavier tail than Gumbel). Gumbel (Extreme Value Type I, shape fixed at 0) was tested and rejected for this record (likelihood-ratio p = 0.03; L-skewness 0.26 against 0.17 for Gumbel); it under-predicts the rare storms. The design storm is the GEV ${spN(R.design_T)}-year day, ${spN(I.design_mm)} mm. Above about 125 years the values are extrapolations; the daily grid also understates point rain.</p></div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="bars"></span>Where the rain goes, storm by storm</h3><div id="nzP1" style="height:340px"></div></div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="layers"></span>One storm in detail</h3><div class="ctl"><select id="nzSel" class="selbox">${rows.map((r, i) => `<option value="${i}">${esc(r.label)} · ${spN(r.rain_mm)} mm · ${r.amc === 'III' ? 'wet ground' : 'average ground'}</option>`).join('')}</select></div>` +
    `<div class="grid g2" style="gap:14px;margin-top:8px"><div><b>Water budget (m³)</b><div class="tw"><table id="nzBud"></table></div></div><div><b>How long the reservoir takes to empty</b><div class="tw"><table id="nzClr"></table></div><p class="note" id="nzClrN" style="margin-top:8px"></p></div></div></div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="repeat"></span>What changes the reservoir size (${spN(I.design_mm || 125)} mm storm)</h3><div class="tw"><table id="nzLev"></table></div><p class="note" style="margin-top:8px">The open-ground curve number is not measured; a double-ring infiltration test on the green ground fixes it. Leading less land runoff to the reservoir makes it smaller on paper, but that water then leaves the lease. The roof tank rows show what the reservoir needs if that share of every roof tank is kept empty when the storm starts; the Risk calendar and drought view shows how empty the tanks are on heavy-rain days in the 125-year record.</p></div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="info"></span>Notes</h3><ul class="note" style="line-height:1.7;margin:0;padding-left:18px">${R.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>`;
  $('spRes').innerHTML = h; paintIcons($('spRes'));
  const idx = rows.map((r, i) => i);
  table('nzTab', rows, [['label', 'Storm', (v, r) => `${esc(v)}<br><span class="note" style="margin:0">${spN(r.rain_mm)} mm · ${esc(r.imd_class)}</span>`], ['rain_mm', 'Return period', (v, r) => nzRP(r)], ['amc', 'Ground', v => v === 'III' ? 'wet' : 'average'],
    ['rain_m3', 'Rain (m³)', v => spN(v)], ['held_on_site_m3', 'Held on site (m³)', v => spN(v)], ['roof_tank_held_m3', 'Held in roof tanks (m³)', v => spN(v)], ['captured_m3', 'Led to reservoir (m³)', v => spN(v)], ['reservoir_needed_m3', 'Reservoir needed (m³)', v => spN(v)],
    ['peak_inflow_m3h', 'Peak inflow (m³/h)', v => spN(v)], ['beyond_reservoir_m3', 'Beyond the reservoir (m³)', v => spN(v)], ['discharge_m3', 'Leaves lease (m³)', v => spN(v)],
    ['holds', 'Net zero', (v, r) => v ? '<b style="color:#1f7a4d">holds</b>' : (r.rain_mm > dmm ? '<b style="color:#d98a00">exceeds (stress)</b>' : '<b style="color:#c2453c">fails</b>')]]);
  if (R.extremes) table('nzExt', R.extremes, [['T_yr', 'Return period (yr)', v => fmt(v)], ['gev_mm', 'GEV, adopted (mm)', v => `<b>${num(v, 1)}</b>`], ['gumbel_mm', 'Gumbel, comparison (mm)', v => num(v, 1)], ['gev_mm', 'Difference (mm)', (v, r) => num(v - r.gumbel_mm, 1)]]);
  const lab = r => `${spN(r.rain_mm)} mm ${r.amc === 'III' ? 'wet' : 'avg'}`;
  const xs = rows.map(lab);
  draw('nzP1', [{type: 'bar', name: 'Held on site', x: xs, y: rows.map(r => r.held_on_site_m3), marker: {color: NZC.held}}, {type: 'bar', name: 'Held in roof tanks', x: xs, y: rows.map(r => r.roof_tank_held_m3 || 0), marker: {color: NZC.tank}}, {type: 'bar', name: 'In the reservoir', x: xs, y: rows.map(r => Math.max(r.captured_m3 - r.beyond_reservoir_m3, 0)), marker: {color: NZC.res}},
    {type: 'bar', name: 'Leaves the lease', x: xs, y: rows.map(r => Math.max(r.discharge_m3, 0)), marker: {color: NZC.out}}],
    base({barmode: 'stack', margin: {l: 62, r: 16, t: 10, b: 96}, xaxis: {title: 'Storm and ground wetness'}, yaxis: {title: 'Rain on the lease (m³)', rangemode: 'tozero'}, legend: {orientation: 'h', y: -0.32}}), CFG);
  const sel = () => {
    const r = rows[+$('nzSel').value];
    table('nzBud', [...r.surfaces.map(s => ({surface: s.surface, area: s.area_m2, rain: s.rain_m3, run: s.runoff_m3, held: s.held_on_site_m3, pct: s.runoff_pct})), {surface: 'Whole lease', area: L.lease_m2, rain: r.rain_m3, run: r.runoff_m3, held: r.held_on_site_m3, pct: 100 * r.runoff_coeff}],
      [['surface', 'Surface'], ['area', 'm²', v => spN(v)], ['rain', 'Rain', v => spN(v)], ['run', 'Runs off', v => spN(v)], ['pct', 'Runs off (%)', v => num(v, 0)], ['held', 'Held on site', v => spN(v)]]);
    table('nzClr', r.clearing, [['label', 'Well set'], ['intake_m3d', 'Intake m³/d', v => spN(v)], ['days', 'Days to empty', v => v == null ? '–' : (v < 1 ? '< 1' : num(v, 1))]]);
    $('nzClrN').textContent = `Reservoir content after the storm about ${spN(r.reservoir_content_m3)} m³` + (I.demand_m3d > 0 ? `, with ${spN(I.demand_m3d)} m³/d also used.` : '.') +
      (r.beyond_reservoir_m3 > 0 ? ` The reservoir is exceeded by about ${spN(r.beyond_reservoir_m3)} m³ in this storm.` : '') +
      ` Days are the reservoir volume divided by intake (wells working alone, no use unless entered).`;
  };
  $('nzSel').value = Math.max(rows.findIndex(r => r.rain_mm === (I.design_mm || 125) && r.amc === 'III'), 0); $('nzSel').onchange = sel; sel();
  table('nzLev', R.levers, [['lever', 'Change'], ['value', 'Value', (v, r) => r.lever.startsWith('share') ? Math.round(v * 100) + ' %' : v], ['amc', 'Ground', v => v === 'III' ? 'wet' : 'average'], ['reservoir_needed_m3', 'Reservoir needed (m³)', v => spN(v)],
    ['roof_tank_held_m3', 'Held in roof tanks (m³)', v => v == null ? '–' : spN(v)], ['leaves_lease_m3', 'Leaves the lease (m³)', v => v == null ? '–' : spN(v)]]);
}

/* ============================================================ RISK CALENDAR AND DROUGHT (v1.12.0) */
let DRD = null, DRR = null, DRdirty = true;
const DRC = {rain: '#2f7fe0', sup: '#e0453c', free: '#c9d3d1', lvl: '#2f7fe0', rec: '#8fb7a8'};
const DRPOL = {strict: 'The reservoir is drawn down ahead of each month so that it can take the largest one-day storm on record for that month. Safe, but the reservoir is empty from September to November.',
  moderate: 'Space is kept for a storm that a month has exceeded about once in ten years. More water in store, but water leaves the lease in more years.',
  none: 'No seasonal limit. The most water in store, and the most years in which water leaves the lease.'};
function drInit() {
  const p = DRD.par, set = (id, v) => { $(id).value = v; };
  set('drFlats', p.flats); set('drPers', p.persons); set('drLpcd', p.lpcd); set('drFl', p.flush_lpcd); set('drRec', Math.round(p.recover * 100)); set('drPl', p.planted_m2); set('drKc', p.kc);
  set('drFm', p.fountain_m2); set('drFd', p.fountain_mm_d); set('drPol', p.policy);
  $('drWell').innerHTML = NZIT.map((s, i) => `<option value="${i}">${esc(s.label)} · ${spN(s.m3d)} m³/d</option>`).join(''); $('drWell').value = '0';
  $('drEt').innerHTML = DRD.months.map((m, i) => `<div class="ctl"><label>${m}</label><input type="number" class="drEt" data-i="${i}" min="0" max="15" step="0.1" value="${p.et0[i]}"></div>`).join('');
  const dirty = () => { DRdirty = true; CLdirty = true; $('spMsg').textContent = 'Inputs changed. Press Calculate.'; drNote(); };
  ['drFlats', 'drPers', 'drLpcd', 'drFl', 'drRec', 'drPl', 'drKc', 'drFm', 'drFd', 'drWell', 'drPol'].forEach(id => $(id).onchange = dirty);
  $('drEt').querySelectorAll('.drEt').forEach(i => i.onchange = dirty);
  drNote();
}
function drNote() {
  $('drPolT').textContent = DRPOL[$('drPol').value];
  const rv = +$('nzRv').value, rd = +$('nzRd').value;
  const t = nzRt();
  $('drTankN').innerHTML = `<b>Roof tanks</b> (set in the Net zero plan view, card 3): ${t.nb} flat buildings with chambers A ${spN(t.a)} + B ${spN(t.b)} m³ each (${spN(t.vf)} m³) on ${spN(t.af)} m² of roof, amenity building ${t.on ? spN(t.va) + ' m³ on ' + spN(t.aa) + ' m²' : 'not joined (its roof water goes to the reservoir)'}; ${num(t.fr, 0)} % of chamber B kept empty from ${MONN[t.sf - 1]} to ${MONN[t.st - 1]}; pure-water top-up ${t.up ? 'on' : 'off'}.`;
  $('drResN').textContent = `Reservoir ${spN(rv)} m³ (${spN(rv / rd)} m² of water at ${num(rd, 1)} m deep), runoff coefficients and curve number as set in the Net zero plan view.`;
}
function drBody() {
  const b = nzBody(), w = NZIT[+$('drWell').value] || NZIT[0];
  b.dr = {flats: +$('drFlats').value, persons: +$('drPers').value, lpcd: +$('drLpcd').value, flush_lpcd: +$('drFl').value, recover: +$('drRec').value / 100, planted_m2: +$('drPl').value, kc: +$('drKc').value,
    fountain_m2: +$('drFm').value, fountain_mm_d: +$('drFd').value, wells_m3d: +w.m3d, policy: $('drPol').value, et0: [...$('drEt').querySelectorAll('.drEt')].map(i => +i.value)};
  return b;
}
function drawDR(R) {
  const C = R.central, Dm = R.demand, S = R.supply, I = R.inputs, ST = R.stats, cal = R.calendar, res = R.reservoir_m3;
  const kp = (t, v, s) => `<div style="border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:#fff"><div class="note" style="margin:0">${esc(t)}</div><div style="font-size:21px;font-weight:800;color:#17433f">${v}</div><div class="note" style="margin:2px 0 0">${s}</div></div>`;
  const ok = C.years_with_spill === 0;
  let h = `<div class="banner warn" style="margin:0 0 12px"><span>${ic('alert')}</span><span><b>Pre-drilling, assumption-driven scenario, not calibrated.</b> Persons per flat, planted area, fountain size, monthly evaporation, road length and the curve number are assumptions. Well yield is not tested, so the outside supply below is a requirement, not a promise that the wells can deliver it. Rain record: ${esc(R.rain_file)}, ${ST.first_year}–${ST.last_year}.</span></div>`;
  if (R.empty_months_note) h += `<div class="banner warn" style="margin:0 0 12px"><span>${ic('alert')}</span><span><b>Level rule — open decision.</b> ${esc(R.empty_months_note)}</span></div>`;
  h += `<div class="banner ${ok ? 'ok' : 'bad'}" style="margin:0 0 12px"><span>${ic(ok ? 'filecheck' : 'alert')}</span><span><b>${ok ? `Net zero holds in all ${C.years_counted} years of the record (day-by-day check).` : `Water leaves the lease in ${C.years_with_spill} of ${C.years_counted} years.`}</b> ` +
    (ok ? `Every year needs outside water for drinking-quality use: about ${spN(C.sup_pot)} m³ a year on average (${spN(C.sup_pot / 365)} m³/d).` : `In those years about ${spN(C.spill_in_spill_years)} m³ is more than the reservoir can hold. Add tank space, a faster draw-down or a larger reservoir (see the tables). Every year also needs about ${spN(C.sup_pot)} m³ of outside water.`) + `</span></div>`;
  h += `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px">` +
    kp('Outside supply, average year', spN(C.sup_pot) + ' m³/yr', `${spN(C.sup_pot / 365)} m³/d of ${spN(Dm.potable_m3y)} m³/yr drinking-quality demand`) +
    kp('Dry-10 % year / driest year', `${spN(C.sup_pot_p90)} / ${spN(C.sup_pot_max)}`, `m³/yr; driest supply year ${C.sup_pot_max_year}`) +
    kp('Met by rain on the lease', Math.round(100 * C.share_met_by_rain) + ' %', `runoff ${spN(S.mean)} m³/yr of ${spN(S.rain_on_lease)} m³ rain`) +
    kp('Longest stretch on outside water', C.longest_supplement_run_d + ' days', `${spN(C.supplement_days_per_year)} days a year on average`) +
    kp('Treated wastewater not used', spN(C.surplus) + ' m³/yr', `${spN(C.surplus_wet)} m³ of it in June to November`) +
    kp('People and demand', `${spN(Dm.people)} people`, `${spN(Dm.domestic_m3d)} m³/d at ${spN(I.lpcd)} L/person/d; irrigation ${spN(C.irr)} m³/yr`) +
    kp('Roof tanks', spN(R.roof_tank.usable_m3) + ' m³ usable', R.roof_tank.override ? 'one tank on the whole roof (typed)' : `chambers A + B ${spN(R.roof_tank.a_total_m3 + R.roof_tank.b_total_m3)} + amenity ${R.roof_tank.amen_on ? spN(R.roof_tank.amen_m3) : '0 (not joined)'} m³`) + `</div>`;
  { const RT = R.roof_tank, hd = RT.heavy_days['ge64.5'], h9 = RT.heavy_days.ge90, sfrom = MONN[RT.storm_from - 1], sto = MONN[RT.storm_to - 1];
    h += `<div class="card" style="margin-top:14px"><h3><span data-i="layers"></span>Roof tanks: size, and how empty they are when a heavy storm starts</h3>` + (RT.usable_m3 > 0 ? `<div class="tw"><table id="drRt"></table></div>` +
      `<p class="note" style="margin:8px 0 0">When a day of 64.5 mm or more begins (${hd.n} such days after the two start-up years), the tanks have on average <b>${num(hd.mean_free_pct, 0)} %</b> of their space free (${spN(hd.mean_free_m3)} m³), and on 9 in 10 of those days at least ${num(hd.p10_free_pct, 0)} % is free. For days of 90 mm or more (${h9.n} days): on average ${num(h9.mean_free_pct, 0)} % free, and at least ${num(h9.p10_free_pct, 0)} % on 9 days in 10. These figures come from the daily run with the storm-season rule as set (chamber B ${num(RT.free_pct, 0)} % empty ${sfrom} to ${sto}). The Net zero storm check takes credit only for that rule (${spN(RT.storm_free_m3)} m³ of chamber B), and only for storms inside the season; a storm outside it meets chambers that may be full.</p>` : `<p class="note" style="margin:0">No roof tank is set. Roof water goes straight to the reservoir. Set the tanks in the Net zero plan view, card 3.</p>`) + `</div>`; }
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="list"></span>Risk calendar: month by month (${ST.years} years)</h3><div class="tw"><table id="drCal"></table></div>` +
    `<p class="note" style="margin:8px 0 0">Free space needed is the reservoir volume for the largest one-day storm on record in that month, on wet ground. Highest level to hold is the reservoir volume minus that space. Draw-down needed shows what must be released before the next month's lower limit, and the days it takes at the chosen well intake of ${spN(R.wells_m3d)} m³/d. Risk: high = a day of 90 mm or more on record; moderate = 50 mm or more.</p></div>`;
  h += `<div class="grid g2" style="gap:14px;margin-top:14px"><div class="card"><h3><span data-i="bars"></span>Level to hold and space to keep free</h3><div id="drP1" style="height:300px"></div></div>` +
    `<div class="card"><h3><span data-i="chart"></span>Mean rain by month</h3><div id="drP2" style="height:300px"></div></div></div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="alert"></span>What a forecast can still do</h3><div class="tw"><table id="drTrig"></table></div>` +
    `<p class="note" style="margin:8px 0 0">A warning 48 hours ahead lets the wells release only about ${spN(2 * R.wells_m3d)} m³. The seasonal level limit, not the forecast, is the real control; use the forecast to open every well, clear the drains and stop topping up.</p></div>`;
  h += `<div class="grid g2" style="gap:14px;margin-top:14px"><div class="card"><h3><span data-i="bars"></span>Outside supply, year by year</h3><div id="drP3" style="height:300px"></div></div>` +
    `<div class="card"><h3><span data-i="bars"></span>Where the drinking-quality water comes from, by month</h3><div id="drP4" style="height:300px"></div></div></div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="layers"></span>How many people and how much roof tank</h3><div class="tw"><table id="drSens"></table></div>` +
    `<p class="note" style="margin:8px 0 0">Outside supply for the drinking-quality use, in m³ per year, on the level rule and wells chosen. Roof tanks fill from the roofs first; the planned flat and amenity tanks are scaled to each total shown (the planned total is one of the rows). Beyond about 5,000 m³ extra tank storage adds little, because the roofs only yield about ${spN(S.roof)} m³ a year.</p></div>`;
  h += `<div class="grid g2" style="gap:14px;margin-top:14px"><div class="card" style="grid-column:1 / -1"><h3><span data-i="repeat"></span>Level rules compared</h3><div class="tw"><table id="drPol2"></table></div></div>` +
    `<div class="card" style="grid-column:1 / -1"><h3><span data-i="alert"></span>Driest years and dry spells</h3><div class="tw"><table id="drDry"></table></div><div class="tw" style="margin-top:10px"><table id="drSpell"></table></div><p class="note" style="margin:8px 0 0">Outside supply is for the drinking-quality use, per year. The first row is the dry spell that matters for tanks and the reservoir: the dry season runs about December to April, so the spell is followed across 31 December and counted in the year it ends (the longest on record is ${ST.spells['Whole year'].max} days). The other three rows look only at part of the rainy season and show breaks in the rains, which matter for irrigation, not for storage.</p></div></div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="info"></span>Notes</h3><ul class="note" style="line-height:1.7;margin:0;padding-left:18px">${R.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>`;
  $('spRes').innerHTML = h; paintIcons($('spRes'));
  const rk = {high: '#c2453c', moderate: '#d98a00', low: '#1f7a4d'};
  table('drCal', cal, [['month', 'Month'], ['mean_mm', 'Mean rain (mm)', v => spN(v)], ['max_day_mm', 'Largest day (mm)', (v, r) => `${spN(v)} <span class="note" style="margin:0">${r.max_day_year}</span>`], ['days_ge645', 'Days ≥ 64.5 mm', v => spN(v)],
    ['yrs_ge50', 'Years with a day ≥ 50 mm', v => `${v} of ${ST.years}`], ['risk', 'Risk', v => `<b style="color:${rk[v]}">${v}</b>`], ['free_space_m3', 'Free space needed (m³)', v => spN(v)], ['highest_level_m3', 'Highest level to hold (m³)', v => spN(v)],
    ['drop_to_next_m3', 'Draw-down needed before next month (m³)', (v, r) => v > 0 ? `${spN(v)} <span class="note" style="margin:0">${r.lead_days_for_next} d</span>` : '–']]);
  if (R.roof_tank.usable_m3 > 0) { const RT = R.roof_tank, ff = 1 - RT.free_pct / 100;
    const rows = RT.override ? [{n: 'One tank on the whole roof (typed volume)', v: RT.usable_m3, a: RT.roof_m2, f: 0}] : [
      {n: `Chamber A, pure-water reserve (${RT.nb} × ${spN(RT.a_m3)} m³)`, v: RT.a_total_m3, a: RT.flats_roof_m2, f: 0},
      {n: `Chamber B, swing (${RT.nb} × ${spN(RT.b_m3)} m³): ${num(RT.free_pct, 0)} % empty ${MONN[RT.storm_from - 1]} to ${MONN[RT.storm_to - 1]}`, v: RT.b_total_m3, a: 0, f: RT.storm_free_m3},
      {n: 'Amenity building' + (RT.amen_on ? '' : ' (not joined: roof water goes to the reservoir)'), v: RT.amen_on ? RT.amen_m3 : 0, a: RT.amen_roof_m2, f: 0},
      {n: `Flush chambers (${RT.nb} × ${spN(RT.f_m3)} m³), about ${num(RT.flush_days, 0)} days of flushing, no effect on the balance`, v: RT.flush_total_m3, a: 0, f: 0}];
    table('drRt', rows, [['n', 'Chamber / tank'], ['v', 'Usable (m³)', v => spN(v)], ['f', 'Kept empty in the storm season (m³)', v => v > 0 ? spN(v) : '–'], ['a', 'Roof draining to it first (m²)', v => v > 0 ? spN(v) : '–']]); }
  const mon = cal.map(r => r.month);
  draw('drP1', [{type: 'bar', name: 'Highest level to hold', x: mon, y: cal.map(r => r.highest_level_m3), marker: {color: DRC.lvl}}, {type: 'bar', name: 'Free space to keep', x: mon, y: cal.map(r => r.free_space_m3), marker: {color: DRC.free}}],
    base({barmode: 'stack', margin: {l: 62, r: 16, t: 10, b: 70}, yaxis: {title: 'Reservoir volume (m³)', range: [0, res]}, legend: {orientation: 'h', y: -0.22}}), CFG);
  draw('drP2', [{type: 'bar', name: 'Mean rain', x: mon, y: cal.map(r => r.mean_mm), marker: {color: DRC.rain}}],
    base({margin: {l: 56, r: 16, t: 10, b: 50}, yaxis: {title: 'Mean rain (mm)', rangemode: 'tozero'}, showlegend: false}), CFG);
  table('drTrig', R.triggers, [['class', 'Forecast one-day rain'], ['rain_mm', 'mm', v => spN(v, 1)], ['return_period_yr', 'Return period (GEV)', v => rpTxt(v)], ['free_space_m3', 'Free space needed (m³)', v => spN(v)], ['short_m3', 'Beyond the reservoir (m³)', v => v > 0 ? `<b style="color:#c2453c">${spN(v)}</b>` : '–'],
    ['highest_level_m3', 'Level must be at or below (m³)', v => spN(v)], ['level_ok_with_48h_m3', 'Level a 48 h warning can still fix (m³)', v => spN(v)], ['action', 'What to do', v => `<div style="min-width:280px">${esc(v)}</div>`]]);
  const an = R.annual.filter((a, i) => i >= 2), yrs = an.map(a => a.year);
  draw('drP3', [{type: 'bar', name: 'Outside supply', x: yrs, y: an.map(a => a.sup_pot), marker: {color: DRC.sup}}],
    base({margin: {l: 62, r: 16, t: 10, b: 50}, xaxis: {title: 'Year'}, yaxis: {title: 'Outside supply (m³/yr)', rangemode: 'tozero'}, showlegend: false,
      shapes: [{type: 'line', xref: 'paper', x0: 0, x1: 1, y0: C.sup_pot, y1: C.sup_pot, line: {color: '#17433f', width: 1.5, dash: 'dash'}}, {type: 'line', xref: 'paper', x0: 0, x1: 1, y0: C.sup_pot_p90, y1: C.sup_pot_p90, line: {color: '#8a1f12', width: 1.5, dash: 'dot'}}],
      annotations: [{xref: 'paper', x: 0.01, y: C.sup_pot, yanchor: 'bottom', xanchor: 'left', showarrow: false, text: 'average', font: {size: 11}}, {xref: 'paper', x: 0.01, y: C.sup_pot_p90, yanchor: 'bottom', xanchor: 'left', showarrow: false, text: 'dry-10 % year', font: {size: 11}}]}), CFG);
  const mm = R.monthly;
  draw('drP4', [{type: 'bar', name: 'From rain (roof tank and reservoir)', x: mon, y: mm.map(m => m.from_rain), marker: {color: DRC.rain}}, {type: 'bar', name: 'Outside supply', x: mon, y: mm.map(m => m.sup_pot), marker: {color: DRC.sup}}],
    base({barmode: 'stack', margin: {l: 62, r: 16, t: 10, b: 80}, yaxis: {title: 'Mean per month (m³)', rangemode: 'tozero'}, legend: {orientation: 'h', y: -0.25}}), CFG);
  table('drSens', R.sensitivity, [['persons', 'Persons per flat', v => num(v, 1)], ['people', 'People', v => spN(v)], ['tank_m3', 'Roof tanks, total usable (m³)', v => spN(v)], ['potable_demand', 'Drinking-quality demand (m³/yr)', v => spN(v)], ['sup_mean', 'Outside supply, average (m³/yr)', v => spN(v)],
    ['sup_p90', 'Dry-10 % year', v => spN(v)], ['sup_max', 'Driest year', v => spN(v)], ['share_met', 'Met by rain', v => Math.round(100 * v) + ' %'], ['years_with_spill', 'Years water leaves', v => v], ['surplus_mean', 'Treated water not used (m³/yr)', v => spN(v)]]);
  const pn = {strict: 'Strict', moderate: 'Moderate', none: 'No rule'};
  table('drPol2', R.policies, [['policy', 'Level rule', v => pn[v]], ['sup_mean', 'Outside supply (m³/yr)', v => spN(v)], ['share_met', 'Met by rain', v => Math.round(100 * v) + ' %'], ['years_with_spill', 'Years water leaves the lease', (v, r) => `${v} of ${r.years}`], ['spill_mean', 'Water leaving, mean (m³/yr)', v => spN(v)], ['rech_mean', 'Drawn down to the wells (m³/yr)', v => spN(v)]]);
  table('drDry', R.driest, [['year', 'Driest years', v => String(v)], ['rain_mm', 'Rain (mm)', v => spN(v)], ['runoff_m3', 'Caught on roof, road, green (m³)', v => spN(v)], ['sup_pot', 'Outside supply (m³)', v => spN(v)]]);
  const spLab = {'Whole year': 'Whole year (across 31 Dec)', 'Jun-Nov': 'Jun–Nov only', 'Jun-Sep': 'Jun–Sep only', 'Oct-Dec': 'Oct–Dec only'};
  table('drSpell', Object.keys(ST.spells).map(k => ({season: spLab[k] || k, ...ST.spells[k]})), [['season', 'Longest dry spell (days under 2.5 mm)'], ['median', 'Median', v => v], ['p90', '1 year in 10', v => v], ['max', 'Longest', v => v], ['ge30_pct', 'Years ≥ 30 days', v => Math.round(v) + ' %'], ['ge45_pct', '≥ 45', v => Math.round(v) + ' %'], ['ge60_pct', '≥ 60', v => Math.round(v) + ' %'], ['ge90_pct', '≥ 90', v => Math.round(v) + ' %']]);
}

/* ============================================================ CLOSED LOOP AND NEWATER (v1.13.0) */
let CLR = null, CLdirty = true;
let CLph = [];
function clPhDraw() {
  const row = (r, i) => `<tr><td>${i + 1}</td><td><input type="number" class="clPh" data-i="${i}" data-k="occ" min="0" max="100" step="5" value="${Math.round(r.occ * 100)}" style="width:80px"></td><td><input type="number" class="clPh" data-i="${i}" data-k="planted" min="0" max="100" step="5" value="${Math.round(r.planted * 100)}" style="width:80px"></td></tr>`;
  $('clPhE').innerHTML = '<thead><tr><th>Year</th><th>Occupied (% of the full project)</th><th>Planted (% of the full planting)</th></tr></thead><tbody>' + CLph.map(row).join('') + '</tbody>';
  $('clPhE').querySelectorAll('.clPh').forEach(el => el.onchange = () => { const r = CLph[+el.dataset.i]; r[el.dataset.k] = Math.min(Math.max(+el.value || 0, 0), 100) / 100; if (el.dataset.k === 'occ') { r.built = r.occ; } CLdirty = true; $('spMsg').textContent = 'Inputs changed. Press Calculate.'; spPhOpts(); });
  spPhOpts();
}
function spPhOpts() {
  const s = $('spPh'); if (!s) return; const cur = s.value;
  s.innerHTML = '<option value="1">Full occupancy</option>' + CLph.map(r => `<option value="${r.occ}">Year ${r.year}: ${Math.round(r.occ * 100)} % occupied</option>`).join('');
  s.value = [...s.options].some(o => o.value === cur) ? cur : '1';
}
function clInit() {
  const l = DRD.loop, set = (id, v) => { $(id).value = v; };
  set('clDc', l.dc_lpcd); set('clRo', Math.round(l.ro_recovery * 100)); set('clTt', l.treated_tank_m3); set('clNb', l.n_bw); set('clBy', l.bw_yield_m3h); set('clBh', l.bw_hours); set('clPd', l.pure_drink ? '1' : '0'); set('clRf', Math.round(l.rch_frac * 100));
  set('clBr', l.bw_ro ? '1' : '0'); set('clTk', l.tanker_m3); set('clHd', l.hold_days); set('clTc', l.trip_cost); set('clSl', l.sludge_lpcd);
  CLph = (l.phases || []).map(r => ({...r})); clPhDraw();
  const cap = () => { $('clBw').value = Math.round(10 * (+$('clNb').value) * (+$('clBy').value) * (+$('clBh').value)) / 10; }; cap();
  ['clDc', 'clRo', 'clTt', 'clNb', 'clBy', 'clBh', 'clPd', 'clRf', 'clBr', 'clTk', 'clHd', 'clTc', 'clSl'].forEach(id => $(id).onchange = () => { cap(); CLdirty = true; $('spMsg').textContent = 'Inputs changed. Press Calculate.'; });
}
function clBody() {
  const b = drBody(); delete b.phase;
  b.cl = {dc_lpcd: +$('clDc').value, ro_recovery: +$('clRo').value / 100, treated_tank_m3: +$('clTt').value, bw_m3d: +$('clBw').value, n_bw: +$('clNb').value, bw_yield_m3h: +$('clBy').value, bw_hours: +$('clBh').value, hq_all: true, bw_ro: $('clBr').value === '1', pure_drink: $('clPd').value === '1',
    rch_frac: +$('clRf').value / 100, tanker_m3: +$('clTk').value, hold_days: +$('clHd').value, trip_cost: +$('clTc').value, sludge_lpcd: +$('clSl').value, phases: CLph.map(r => ({year: r.year, occ: r.occ, built: r.occ, planted: r.planted}))};
  return b;
}
function drawCL(R) {
  const C = R.central, I = R.inputs, L = R.loop_inputs, Pl = R.plants, G = R.groundwater, sc = R.scenarios, op = sc[0];
  const kp = (t, v, s) => `<div style="border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:#fff"><div class="note" style="margin:0">${esc(t)}</div><div style="font-size:21px;font-weight:800;color:#17433f">${v}</div><div class="note" style="margin:2px 0 0">${s}</div></div>`;
  const cut = op.ext_tot > 0 ? Math.round(100 * (1 - C.ext_tot / op.ext_tot)) : 0;
  const outOk = C.out_tot < 1, ccOk = C.conc_extra < 1;
  let h = `<div class="banner warn" style="margin:0 0 12px"><span>${ic('alert')}</span><span><b>Pre-drilling, assumption-driven scenario, not calibrated.</b> Borewell capacity, reverse osmosis recovery, the share of domestic use that reaches the membranes, drinking-water share, persons per flat, planted area and the recharge share are assumptions. Rain record: ${esc(R.rain_file)}.</span></div>`;
  if (R.empty_months_note) h += `<div class="banner warn" style="margin:0 0 12px"><span>${ic('alert')}</span><span><b>Level rule — open decision.</b> ${esc(R.empty_months_note)}</span></div>`;
  h += `<div class="banner ${outOk ? 'ok' : 'bad'}" style="margin:0 0 12px"><span>${ic(outOk ? 'filecheck' : 'alert')}</span><span><b>${Pl.hq_all ? `All water at high quality: the borewells must supply ${spN(C.ext_tot)} m³ a year on average (${spN(C.ext_tot / 365)} m³/d), ${spN(C.ext_p90)} in a dry-10 % year and ${spN(C.ext_max)} in the driest year.` : `The closed loop cuts the borewell and outside water needed from ${spN(op.ext_tot)} to ${spN(C.ext_tot)} m³ a year (${cut} % less).`}</b> ` +
    (outOk ? `Borewells of ${spN(L.bw_m3d)} m³/d can meet all of it; no outside supply is needed in any of the ${C.years_counted} years.` : `Borewells of ${spN(L.bw_m3d)} m³/d leave ${spN(C.out_tot)} m³ a year to come from outside (longest stretch ${C.longest_out_run_d} days).`) +
    (ccOk ? '' : ` The concentrate (${spN(C.conc_extra)} m³ a year), the treated wastewater with no use (${spN(C.tert_over)}) and the sludge leave by tanker: about ${spN(R.tanker.mean_m3d)} m³ a day, ${num(R.tanker.trips_mean_d, 1)} trips a day with a ${num(R.tanker.tanker_m3, 0)} m³ tanker.`) + `</span></div>`;
  h += `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px">` +
    kp('Demand of the whole lease', spN(Pl.demand_mean_m3d * 365.25) + ' m³/yr', `${spN(Pl.demand_mean_m3d)} m³/d on average; ${spN(Pl.demand_wet_m3d)} in wet months; up to ${spN(Pl.demand_max_m3d)} on a dry day`) +
    kp('Pumped from the aquifer, average year (before reverse osmosis)', spN(C.ext_tot) + ' m³/yr', `${spN(C.ext_tot / 365)} m³/d on average; open loop would need ${spN(op.ext_tot)} m³/yr`) +
    kp('Same pumping, dry-10 % year / driest year', `${spN(C.ext_p90)} / ${spN(C.ext_max)}`, `m³/yr; the driest year is ${C.ext_max_year}`) +
    kp('Pure water made (after reverse osmosis)', spN(C.pure) + ' m³/yr', `${spN(Pl.pure_mean_m3d)} m³/d on average; rain is used as it falls and is not counted here`) +
    kp('Borewell pumping, days and peak', `${Math.round(G.bw_days_pct)} % of days`, `peak pumping day ${spN(G.bw_max_m3d)} m³/d (before reverse osmosis)`) +
    kp('Pumping against what the lease puts back', G.draft_to_recharge_total ? num(G.draft_to_recharge_total, 1) + ' ×' : '–', `puts back ${spN(G.recharge_total_m3y)} m³/yr = ${spN(G.recharge_m3y)} soaking in from open ground (${Math.round(G.rch_frac * 100)} % of rain) + ${spN(G.recharge_wells_m3y)} down the recharge wells; open ground alone ${G.draft_to_recharge ? num(G.draft_to_recharge, 1) + ' ×' : '–'}`) +
    kp('Waste leaving by tanker (concentrate + unused treated water + sludge)', spN(R.tanker.total_m3y) + ' m³/yr', `${num(R.tanker.mean_m3d, 1)} m³/d on average, ${num(R.tanker.max_m3d, 1)} on the peak day; of which unused treated wastewater ${spN(R.tanker.tert_m3y)} m³/yr`) + `</div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="repeat"></span>Waste stream by tanker: concentrate, unused treated wastewater and sludge, with the lease at full occupancy</h3><div class="tw"><table id="clTkT"></table></div><div class="tw" style="margin-top:10px"><table id="clTkS"></table></div><div class="note" id="clTkN" style="margin:8px 0 0;line-height:1.6"></div></div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="trend"></span>Build-up years: what changes as the flats fill (same rain record, roofs, roads, reservoir and roof tanks at full build)</h3><div class="tw"><table id="clPhT"></table></div><div class="grid g2" style="gap:14px;margin-top:10px"><div><div id="clP3" style="height:300px"></div></div><div><div id="clP4" style="height:300px"></div></div></div><div class="note" id="clPhN" style="margin:8px 0 0;line-height:1.6"></div></div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="info"></span>How to read these numbers</h3><ul class="note" style="line-height:1.7;margin:0;padding-left:18px">` +
    `<li><b>Per year or per day.</b> m³/yr is a yearly total. m³/d is that total ÷ 365, unless it says peak day or names a month.</li>` +
    `<li><b>Average, dry or peak.</b> Average is the mean of ${C.years_counted} years of rain. Dry-10 % year is a year drier than 9 in 10. Driest year is the driest in the record. Peak day is the highest single day.</li>` +
    `<li><b>Before or after reverse osmosis.</b> Pumped is taken from the aquifer, before reverse osmosis. Pure water is what comes out. Borewell water pumped = pure water ÷ ${num(L.ro_recovery, 2)}; the rest is concentrate.</li>` +
    `<li><b>Demand is not the same every day.</b> The flats and fountain use ${spN(Pl.demand_wet_m3d)} m³/d all year. Only the garden changes, so the whole lease uses ${spN(Pl.demand_wet_m3d)} m³/d in wet months, ${spN(Pl.demand_mean_m3d)} on average and up to ${spN(Pl.demand_max_m3d)} on a dry day. Pumping changes even more, as the monthly table below shows.</li></ul></div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="list"></span>Through the year: demand and pumping by month (average of ${C.years_counted} years)</h3><div class="tw"><table id="clMo"></table></div><p class="note" style="margin:8px 0 0">Rain and recycled wastewater cover most of the demand in the wet months; the borewells carry the dry months. Per-day figures are the month's total ÷ its days. One typical year with a start on 1 January is a different thing from this average of many years.</p></div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="list"></span>Water ledger, average year (m³ per year): where every cubic metre comes from</h3><div class="tw"><table id="clLed"></table></div>` +
    `<p class="note" style="margin:8px 0 0">Demand is people × litres per person per day × 365, plus the fountain and the irrigation need from the soil-water bucket. Sources are used in the order: rain, pure water from the wastewater, borewell, outside supply. The check line must be zero.</p></div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="repeat"></span>Open loop and closed loop compared</h3><div class="tw"><table id="clSc"></table></div>` +
    `<p class="note" style="margin:8px 0 0">Borewell plus outside water is everything not met by rain on the lease or by the treated wastewater. In the open loop the treated wastewater serves only flushing, irrigation and the fountain, so a surplus is left over; in the closed loop it also serves drinking-quality use, so the surplus is nearly used up.</p></div>`;
  h += `<div class="grid g2" style="gap:14px;margin-top:14px"><div class="card"><h3><span data-i="bars"></span>Where the water comes from, by month</h3><div id="clP1" style="height:320px"></div></div>` +
    `<div class="card"><h3><span data-i="bars"></span>Borewell and outside water, year by year</h3><div id="clP2" style="height:320px"></div></div></div>`;
  h += `<div class="grid g2" style="gap:14px;margin-top:14px"><div class="card"><h3><span data-i="gear"></span>Plant sizes</h3><div class="tw"><table id="clPl"></table></div></div>` +
    `<div class="card"><h3><span data-i="alert"></span>Borewell and aquifer check</h3><div class="tw"><table id="clGw"></table></div><p class="note" style="margin:8px 0 0">The draft is ${G.draft_to_recharge_total ? num(G.draft_to_recharge_total, 1) + ' times' : 'a multiple of'} what the lease puts back (open-ground soak-in plus the recharge wells), and ${G.draft_to_recharge ? num(G.draft_to_recharge, 1) + ' times' : 'a multiple of'} the open-ground soak-in alone, so the supply rests on regional aquifer storage, not on the lease. Test-pump the first borewell (RZ-13) and check the CGWB category of the block before relying on it.</p></div></div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="layers"></span>Treated-water tank and people</h3><div class="tw"><table id="clS1"></table></div></div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="gear"></span>Demand and supply by household size (2 to 6 persons per flat)</h3><div class="tw"><table id="clPp"></table></div>` +
    `<p class="note" style="margin:8px 0 0">Only the number of people per flat changes; flats (${spN(R.inputs.flats)}), roof tank chambers (${spN(R.inputs.tank_total_m3)} m³ usable), treated-water tank, membrane plant and the borewells stay as set, so a small household leaves them larger than needed. Pumped = borewell water per year. Dry spell = no rain for 130 days (1 year in 10) at peak demand; the borewells needed are for that spell's peak day. The concentrate leaves by tanker.</p></div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="layers"></span>Chamber rules compared: what the storm-season rule and the pure-water top-up change</h3><div class="tw"><table id="clChc"></table></div>` +
    `<p class="note" style="margin:8px 0 0">Same lease, same wells, same chambers; only the rule changes. Each row is run day by day with its own reservoir level limits (a chamber kept empty lets the reservoir stand fuller in the storm season). “Years water leaves the lease” counts years with at least one day when the reservoir and chambers together could not hold the rain. The dry-spell columns start the roof tanks at their average content on 1 December from the daily run, not full. Top-up is pure water made from treated wastewater that would otherwise have no use; borewell water is not used to top up the chambers.</p></div>`;
  h += `<div class="grid g2" style="gap:14px;margin-top:14px"><div class="card"><h3><span data-i="layers"></span>Reverse osmosis recovery</h3><div class="tw"><table id="clS2"></table></div></div>` +
    `<div class="card"><h3><span data-i="layers"></span>Roof tanks</h3><div class="tw"><table id="clS3"></table></div><p class="note" style="margin:8px 0 0">Planned: chambers A + B ${spN(R.roof_tank.a_total_m3 + R.roof_tank.b_total_m3)} m³ in ${R.roof_tank.nb} flat buildings, amenity ${R.roof_tank.amen_on ? spN(R.roof_tank.amen_m3) : '0 (not joined)'} m³ (set in the Net zero plan view); the other rows scale them to the total shown.</p></div></div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="gear"></span>Three stages: how many borewells each stage needs, and how much concentrate goes by tanker</h3><div class="tw"><table id="clS7"></table></div><p class="note" id="clS7n" style="margin:8px 0 0"></p></div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="alert"></span>Dry-spell check: a spell with no rain at all, for ${R.spell_check.rows[0].days}, ${R.spell_check.rows[2].days} and ${R.spell_check.rows[4].days} days, pure water for every use</h3><div class="tw"><table id="clSp"></table></div><p class="note" id="clSpn" style="margin:8px 0 0"></p></div>`;
  h += `<div class="grid g2" style="gap:14px;margin-top:14px"><div class="card"><h3><span data-i="gear"></span>How many borewells</h3><div class="tw"><table id="clS4"></table></div></div>` +
    `<div class="card"><h3><span data-i="list"></span>What else cuts the borewell draft</h3><div class="tw"><table id="clLv"></table></div></div></div>`;
  h += `<div class="grid g2" style="gap:14px;margin-top:14px"><div class="card"><h3><span data-i="gear"></span>Pumping hours and yield per borewell</h3><div class="tw"><table id="clS5"></table></div></div>` +
    `<div class="card"><h3><span data-i="gear"></span>Does the borewell water need reverse osmosis?</h3><div class="tw"><table id="clS6"></table></div></div></div>`;
  h += `<div class="card" style="margin-top:14px"><h3><span data-i="info"></span>Notes</h3><ul class="note" style="line-height:1.7;margin:0;padding-left:18px">${R.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>`;
  $('spRes').innerHTML = h; paintIcons($('spRes'));
  const F = v => spN(v);
  table('clSc', sc, [['label', 'Case', v => `<div style="min-width:240px">${esc(v)}</div>`], ['ext_tot', 'Borewell plus outside water (m³/yr)', F], ['ext_p90', 'Dry-10 % year', F], ['ext_max', 'Driest year', F], ['pure', 'Pure water made', F], ['surplus', 'Treated water with no use', F], ['conc_extra', 'Concentrate with no use', F], ['years_with_spill', 'Years water leaves the lease', v => v]]);
  { const T = R.tanker, PH = R.phases.rows, F0 = v => spN(v), D1 = v => num(v, 1), rs = v => '₹ ' + spN(v);
    table('clTkT', [
      {i: 'Concentrate with no use, mean (m³/yr · m³/d)', v: `${F0(T.conc_m3y)} · ${D1(T.conc_mean_m3d)}`}, {i: 'Treated wastewater with no use (tank full; not pure, so it also goes by tanker) (m³/yr · m³/d)', v: `${F0(T.tert_m3y)} · ${D1(T.tert_mean_d)}`}, {i: 'Sludge from the wastewater plant (m³/yr · m³/d)', v: `${F0(T.sludge_m3y)} · ${num(T.sludge_m3d, 2)}`},
      {i: 'Total leaving by tanker: mean / 95 % of days / peak day (m³/d)', v: `${D1(T.mean_m3d)} / ${D1(T.p95_m3d)} / ${D1(T.max_m3d)}`}, {i: `Trips a year with a ${num(T.tanker_m3, 1)} m³ tanker, evacuated every day`, v: `${F0(T.trips_y)} (${D1(T.trips_mean_d)} a day, up to ${F0(T.trips_max_d)} on the peak day)`},
      {i: `Cost at ${rs(T.trip_cost)} a trip (placeholder)`, v: `${rs(T.cost_y)} a year · ${rs(T.cost_per_m3)} per m³`}, {i: `Holding tank ("RO Reject Water – Non-Potable"), ${D1(T.hold_days)} days of the peak day (m³)`, v: F0(T.hold_tank_m3)}], [['i', 'Item'], ['v', 'Value']]);
    table('clTkS', T.sizes, [['label', 'Tanker size (rupees per trip are mid-points of the Bengaluru range; placeholder)'], ['trips_y', 'Trips a year', F0], ['trips_mean_d', 'Trips a day', D1], ['cost_per_trip', 'Per trip (₹)', F0], ['cost_y', 'Cost a year (₹)', F0], ['cost_per_m3', 'Per m³ (₹)', F0]]);
    $('clTkN').innerHTML = `<b>Pure water for every use.</b> Wastewater from the flats goes through the treatment plant, ultrafiltration, reverse osmosis and UV, and all of the lease (flats, flushing, fountain, irrigation) uses only that pure water, rain treated to the same standard, and borewell water that has been through reverse osmosis. The waste is the reverse osmosis concentrate, the sludge, and any treated wastewater that cannot be used because the treated-water tank is full: none of it is <b>used on the lease</b> and all of it leaves every day by tanker. ` +
      `<b>Disposal (information, may change):</b> no dumping on land, in drains or in water bodies; reuse on site first (CPCB). Reject from fresh water or borewell water under about 2,100 mg/L TDS goes by tanker to a BWSSB terminal sewage treatment plant; high-TDS or industrial reject goes to a CETP or ZLD facility in tankers authorised by KSPCB. Keep the reject in a separate tank labelled "RO Reject Water – Non-Potable". ` +
      `Tanker sizes: small 4 to 6 kL, medium 8 to 10 kL, large 12 to 20 kL. Cost per trip in Bengaluru: 5 to 6 kL ₹1,500 to 2,500; 8 to 10 kL ₹2,500 to 4,000; 12 kL and more ₹4,500 to 8,000+. The sludge amount and the cost are placeholders. A tanker that cannot come on one day fills the holding tank; the tank above keeps ${D1(T.hold_days)} days of the peak day.`;
    table('clPhT', PH, [['year', 'Year', v => `<b>${v}</b>`], ['occ', 'Occupied', v => Math.round(100 * v) + ' %'], ['people', 'People', F0], ['wastewater_m3d', 'Wastewater to plant (m³/d)', D1], ['pumped', 'Borewell pumping (m³/yr)', F0], ['n_bw_peak', 'Borewells at peak', v => `<b>${v}</b>`], ['tanker_mean_d', 'Tanker waste (m³/d)', D1], ['trips_mean_d', 'Trips a day', D1], ['cost_y', 'Tanker cost (₹/yr)', F0],
      ['tert_over', 'Unused treated wastewater, by tanker (m³/yr)', F0], ['spill', 'Storm water leaving the lease (m³/yr)', F0], ['years_with_spill', 'Years it leaves', (v, r) => `${v} of ${r.years_counted}`], ['tank_dec1', 'Roof tanks on 1 Dec (m³)', F0]]);
    const yl = PH.map(r => `Year ${r.year} (${Math.round(100 * r.occ)} %)`);
    draw('clP3', [{type: 'bar', name: 'Tanker waste (m³/d)', x: yl, y: PH.map(r => r.tanker_mean_d), marker: {color: '#8a5a2b'}}, {type: 'bar', name: 'Borewell pumping (m³/d)', x: yl, y: PH.map(r => r.pumped / 365.25), marker: {color: '#d98a00'}}],
      base({barmode: 'group', margin: {l: 56, r: 10, t: 24, b: 70}, title: {text: 'Waste by tanker and borewell pumping', font: {size: 13}}, yaxis: {title: 'm³ per day', rangemode: 'tozero'}, legend: {orientation: 'h', y: -0.25}}), CFG);
    draw('clP4', [{type: 'bar', name: 'Years water leaves the lease', x: yl, y: PH.map(r => r.years_with_spill), marker: {color: '#2f7fe0'}}, {type: 'bar', name: 'Treated wastewater with no use (m³/yr ÷ 100)', x: yl, y: PH.map(r => r.tert_over / 100), marker: {color: '#8fb7a8'}}],
      base({barmode: 'group', margin: {l: 56, r: 10, t: 24, b: 70}, title: {text: 'Storm risk and unused treated water, by year', font: {size: 13}}, yaxis: {rangemode: 'tozero'}, legend: {orientation: 'h', y: -0.25}}), CFG);
    const f = PH[0], l = PH[PH.length - 1];
    $('clPhN').innerHTML = `<b>What the early years do.</b> With only ${Math.round(100 * f.occ)} % of the flats occupied the lease makes ${D1(f.wastewater_m3d)} m³/d of wastewater and uses little water, so the reservoir and the roof tanks stay fuller and borewell pumping is ${f.pumped < 1 ? 'zero' : F0(f.pumped) + ' m³ a year'}. Storm water leaves the lease in <b>${f.years_with_spill} of ${f.years_counted} years</b> in year ${f.year}, against ${l.years_with_spill} of ${l.years_counted} at full occupancy: the storage plan has to be judged on the early years, not on the full-occupancy design alone. ` +
      `Tanker waste grows from ${D1(f.tanker_mean_d)} m³/d to ${D1(l.tanker_mean_d)} m³/d. ${R.phases.note} Planted area follows the planted share in the table. The borewell and membrane plants are sized for full occupancy; the MODFLOW run (M7) still assumes full demand from year 1, which is the safe side for the aquifer.`; }
  const mm = R.monthly, mon = mm.map(m => m.month);
  const ser = (nm, fn, col) => ({type: 'bar', name: nm, x: mon, y: mm.map(fn), marker: {color: col}});
  draw('clP1', [ser('Rain (roof tank, reservoir)', m => m.from_rain + m.c_rain, '#2f7fe0'), ser('Pure water', m => m.from_pure, '#1f9d8a'), ser('Treated water and concentrate (flushing, irrigation)', m => m.c_tert + m.c_conc, '#8fb7a8'),
    ser('Borewell', m => m.from_bw + m.c_bw, '#d98a00'), ser('Outside supply', m => m.from_out + m.c_out, '#e0453c')],
    base({barmode: 'stack', margin: {l: 62, r: 16, t: 10, b: 110}, yaxis: {title: 'Mean per month (m³)', rangemode: 'tozero'}, legend: {orientation: 'h', y: -0.3}}), CFG);
  const an = R.annual.filter((a, i) => i >= 2), yrs = an.map(a => a.year);
  draw('clP2', [{type: 'bar', name: 'Borewell', x: yrs, y: an.map(a => a.bw_tot), marker: {color: '#d98a00'}}, {type: 'bar', name: 'Outside supply', x: yrs, y: an.map(a => a.out_tot), marker: {color: '#e0453c'}}],
    base({barmode: 'stack', margin: {l: 62, r: 16, t: 10, b: 80}, xaxis: {title: 'Year'}, yaxis: {title: 'm³ per year', rangemode: 'tozero'}, legend: {orientation: 'h', y: -0.3},
      shapes: [{type: 'line', xref: 'paper', x0: 0, x1: 1, y0: C.ext_tot, y1: C.ext_tot, line: {color: '#17433f', width: 1.5, dash: 'dash'}}],
      annotations: [{xref: 'paper', x: 0.01, y: C.ext_tot, yanchor: 'bottom', xanchor: 'left', showarrow: false, text: 'average', font: {size: 11}}]}), CFG);
  table('clPl', [
    {i: 'People', v: spN(Pl.people), u: ''}, {i: 'Flats\' indoor use (same every day)', v: spN(Pl.domestic_m3d), u: 'm³/d'}, {i: 'Wastewater to the treatment plant (80 %)', v: spN(Pl.stp_inflow_m3d), u: 'm³/d'},
    {i: 'Treated water reaching the membrane plant', v: spN(Pl.tertiary_m3d), u: 'm³/d'}, {i: 'Membrane feed, average', v: spN(Pl.ro_feed_mean_m3d), u: 'm³/d'}, {i: 'Membrane feed, peak', v: spN(Pl.ro_feed_max_m3d), u: 'm³/d'},
    {i: 'Pure water made, average (after reverse osmosis)', v: spN(Pl.pure_mean_m3d), u: 'm³/d'}, {i: 'Whole-lease demand: wet months / average / dry day', v: `${spN(Pl.demand_wet_m3d)} / ${spN(Pl.demand_mean_m3d)} / ${spN(Pl.demand_max_m3d)}`, u: 'm³/d'}, {i: 'Concentrate, average', v: spN(Pl.conc_mean_m3d), u: 'm³/d'}, {i: 'Treated-water tank', v: spN(L.treated_tank_m3), u: 'm³'}],
    [['i', 'Item'], ['v', 'Value'], ['u', 'Unit']]);
  table('clGw', [
    {i: 'Borewell draft, average', v: spN(G.draft_mean_m3y)}, {i: 'Borewell draft, dry-10 % year', v: spN(G.draft_p90_m3y)}, {i: 'Borewell draft, driest year', v: spN(G.draft_max_m3y)},
    {i: 'Peak pumping day (m³/d)', v: spN(G.bw_max_m3d)}, {i: 'Open ground (m²)', v: spN(G.pervious_m2)}, {i: `Soaks in from open ground (${Math.round(G.rch_frac * 100)} % of rain, assumed)`, v: spN(G.recharge_m3y)}, {i: 'Sent down the recharge wells (collected rain)', v: spN(G.recharge_wells_m3y)}, {i: 'Total put back by the lease', v: spN(G.recharge_total_m3y)}, {i: 'Net draw on the aquifer (pumped minus put back)', v: spN(G.net_draw_m3y)}, {i: 'Draft divided by total put back', v: G.draft_to_recharge_total ? num(G.draft_to_recharge_total, 1) + ' ×' : '–'}, {i: 'Draft divided by open-ground soak-in alone', v: G.draft_to_recharge ? num(G.draft_to_recharge, 1) + ' ×' : '–'}],
    [['i', 'Item (m³/yr unless stated)'], ['v', 'Value']]);
  const gr = g => R.sensitivity.filter(s => s.group === g);
  table('clS1', gr('people_treated_tank'), [['persons', 'Persons per flat', v => num(v, 1)], ['people', 'People', F], ['treated_tank_m3', 'Treated-water tank (m³)', F], ['ext_tot', 'Borewell plus outside (m³/yr)', F], ['ext_p90', 'Dry-10 % year', F], ['ext_max', 'Driest year', F], ['pure', 'Pure water made', F], ['tert_over', 'Treated water with no use', F], ['ro_feed_max', 'Membrane feed peak (m³/d)', F]]);
  table('clPp', R.by_persons, [['persons', 'Persons per flat', v => num(v, 1)], ['people', 'People', F], ['drinking_m3d', 'Drinking-quality use (m³/d)', v => num(v, 1)], ['flush_m3d', 'Flushing (m³/d)', v => num(v, 1)], ['wastewater_m3d', 'Wastewater to plant (m³/d)', v => num(v, 1)],
    ['one', 'Pumped, average year (m³/yr)', v => F(v.pumped)], ['one', 'Driest year', v => F(v.pumped_max)], ['one', 'Peak day (m³/d) · borewells', v => `${num(v.peak_day, 1)} · <b>${v.n_bw_peak}</b>`], ['one', 'Net draw (m³/yr)', v => F(v.net_draw)], ['one', '130-day dry spell: pumped (m³) · borewells', v => `${F(v.spell130_total)} · ${v.spell130_nbw}`],
    ['one', 'Concentrate by tanker (m³/yr)', v => F(v.conc_made)]]);
  table('clChc', R.chamber_cmp, [['label', 'Rule'], ['storm_free_m3', 'Chamber B kept empty (m³)', F], ['pumped', 'Pumped, average year (m³/yr)', F], ['pumped_max', 'Driest year', F], ['net_draw', 'Net draw (m³/yr)', F], ['topup_pure', 'Pure water by top-up (m³/yr)', F], ['reservoir_dec_m3', 'Reservoir level limit, December (m³)', F], ['years_with_spill', 'Years water leaves the lease', v => v], ['tank_dec1', 'Tanks on 1 Dec (m³)', F], ['spell130_total', '130-day dry spell: pumped (m³)', F], ['spell178_total', '178-day: pumped (m³)', F]]);
  table('clS2', gr('ro_recovery'), [['ro_recovery', 'Recovery', v => Math.round(100 * v) + ' %'], ['ext_tot', 'Borewell plus outside', F], ['pure', 'Pure water made', F], ['conc_extra', 'Concentrate with no use', F], ['ro_feed_max', 'Feed peak (m³/d)', F]]);
  table('clS3', gr('roof_tank'), [['tank_m3', 'Roof tanks, total (m³)', F], ['ext_tot', 'Borewell plus outside', F], ['ext_p90', 'Dry-10 % year', F], ['tert_over', 'Treated water with no use', F], ['years_with_spill', 'Years water leaves', v => v]]);
  table('clS7', R.stages, [['label', 'Stage'], ['bw_tot', 'Pumped (m³/yr)', F], ['bw_mean_d', 'Average day (m³/d)', F], ['bw_max_d', 'Peak day (m³/d)', F], ['bw_p90', 'Dry-10 % year', F], ['bw_max', 'Driest year', F], ['n_peak', 'Borewells needed', v => `<b>${v}</b>`], ['net_draw', 'Net draw on the aquifer (m³/yr)', F], ['draft_to_recharge', 'Pumping ÷ put back', v => v == null ? '' : num(v, 1) + ' ×'], ['conc_extra', 'Concentrate by tanker (m³/yr)', F], ['conc_extra', 'Concentrate by tanker (m³/d)', v => num(v / 365.25, 1)]]);
  $('clS7n').innerHTML = `One borewell gives ${num(R.pond.per_borewell_m3d, 1)} m³ a day (${num(L.bw_yield_m3h, 1)} m³/h × ${num(L.bw_hours, 0)} h). <b>Borewells needed = peak day ÷ ${num(R.pond.per_borewell_m3d, 1)}, rounded up.</b> The concentrate leaves by tanker, so no pond is needed. Borewell capacity is not limited in these three lines: they show what the borewells would have to supply. Stages 1 and 2 put more rain down the recharge wells only because rain is not used there; the net draw (pumped minus put back) is the fairer measure.`;
  { const SC = R.spell_check, Fz = v => spN(v), D1 = v => num(v, 1);
    const sr = R.spell_by_grade.one.rows.map(r => ({sp: `${r.spell}, ${r.days} days · ${r.level === 'average day' ? 'average' : 'peak'} demand ${spN(r.demand_m3d)} m³/d`, ...r}));
    table('clSp', sr, [['sp', 'Dry spell, demand a day'], ['before_bw', 'Stored water carries the lease for (days)', D1], ['pumped_m3d', 'Pumped at the end (m³/d)', D1], ['pumped_total_m3', 'Pumped in spell (m³)', Fz],
      ['borewells_needed', 'Borewells needed', v => `<b>${v}</b>`], ['spare_m3d', 'Spare (m³/d)', v => v >= 0 ? D1(v) : `<b>short by ${D1(-v)}</b>`], ['min_yield_m3h', 'Lowest yield (m³/h each)', D1]]);
    $('clSpn').innerHTML = `No rain at all in the spell, and the run is made day by day in the same order as the daily model. Stored water is the <b>reservoir at its December level</b> under the level rule (${Fz(SC.reservoir_dec_m3)} m³) plus the roof tanks at their <b>average content on 1 December</b> from the daily run (${Fz(SC.roof_tank_m3)} m³; the tanks hold ${Fz(SC.roof_tank_full_m3)} m³ when full, and on 1 December in a dry-10 % year only ${Fz(SC.roof_tank_dec1_p10_m3)} m³), and the <b>treated-water tank</b> is taken as full at the start (${Fz(L.treated_tank_m3)} m³); the treated wastewater then keeps coming at its daily flow. ` +
      `<b>Order of use:</b> stored rain, then pure water from the wastewater, then borewell water through reverse osmosis. ` +
      `<b>Average</b> uses the average whole-lease demand; <b>Peak</b> is a stress case that takes the demand of the driest April day for every day of the spell. The borewell capacity is ${num(SC.n_bw, 0)} × ${num(SC.yield_m3h, 1)} m³/h × ${num(SC.hours, 0)} h = ${D1(SC.bw_cap_m3d)} m³/d (placeholder; no test pumping yet), so the last column is how far the yield of each borewell can fall before the peak case fails. ` +
      `"Stored water carries the lease for" counts the days of pumping that stored water saves. Spell lengths come from the whole-year row of the dry-spell table (days under 2.5 mm: median year, 1 year in 10, longest on record). For comparison, the borewells pump ${Fz(R.groundwater.draft_max_m3y)} m³ in the whole driest year.`; }
  table('clS4', gr('borewell'), [['n_bw', 'Borewells', v => num(v, 0)], ['bw_m3d', 'Capacity (m³/d)', F], ['bw_tot', 'Borewell water pumped (m³/yr)', F], ['out_tot', 'From outside (m³/yr)', F], ['out_max', 'Outside, driest year', F], ['longest_out_run_d', 'Longest outside stretch (d)', v => v]]);
  table('clS5', [...gr('bw_hours').map(x => ({what: `${num(x.bw_hours, 0)} h a day`, ...x})), ...gr('bw_yield').map(x => ({what: `${num(x.bw_yield_m3h, 1)} m³/h per borewell`, ...x}))],
    [['what', 'Case'], ['bw_m3d', 'Capacity (m³/d)', F], ['bw_tot', 'Borewell water (m³/yr)', F], ['out_tot', 'From outside (m³/yr)', F], ['out_max', 'Outside, driest year', F], ['longest_out_run_d', 'Longest outside stretch (d)', v => v], ['bw_max_d', 'Peak pumping day (m³/d)', F]]);
  table('clS6', gr('bw_ro'), [['bw_ro', 'Borewell water through reverse osmosis', v => v ? 'Yes' : 'No'], ['bw_tot', 'Borewell water pumped (m³/yr)', F], ['conc_extra', 'Concentrate with no use (m³/yr)', F], ['ro_feed_max', 'Membrane feed, peak (m³/d)', F], ['pure', 'Pure water made (m³/yr)', F]]);
  (() => { const I2 = R.inputs, k = 365.25, flush = Pl.people * I2.flush_lpcd / 1000 * k, fount = I2.fountain_m2 * I2.fountain_mm_d / 1000 * k, tot = C.ab_dem + C.c_dem, dom = C.ab_dem + flush;
    const src = Pl.hq_all ? [['Rain (roof tank, reservoir)', C.from_rain + C.c_rain], ['Wastewater through the membranes (pure water)', C.from_pure], ['Borewell water, pure (after reverse osmosis)', C.from_bw], ['Outside supply', C.from_out + C.c_out]]
      : [['Rain (roof tank, reservoir)', C.from_rain + C.c_rain], ['Pure water from wastewater', C.from_pure], ['Concentrate used in toilet flushing', C.cc_f], ['Concentrate used in irrigation', C.cc_i], ['Treated wastewater used in flushing and irrigation', C.c_tert], ['Borewell (pure after reverse osmosis, plus raw water for flushing and irrigation)', C.from_bw + C.c_bw], ['Outside supply', C.from_out + C.c_out]];
    const ss = src.reduce((a, x) => a + x[1], 0), rows = [{i: 'DEMAND', v: null}, {i: 'Flats: all indoor use', v: dom}, {i: 'Fountain', v: fount}, {i: 'Irrigation', v: C.irr}, {i: 'Total demand', v: tot, b: 1}, {i: 'SOURCES', v: null}, ...src.map(x => ({i: x[0], v: x[1]})), {i: 'Total sources', v: ss, b: 1}, {i: 'Check: sources minus demand (must be about 0)', v: ss - tot},
      {i: 'RAW WATER BEFORE TREATMENT, AND WATER WITH NO USE', v: null}, {i: 'Borewell water pumped from the aquifer (before reverse osmosis)', v: C.bw_tot}, ...(Pl.hq_all && Pl.bw_ro ? [{i: 'of which lost as concentrate (pumped minus pure)', v: C.bw_tot - C.from_bw}] : []), {i: 'Total membrane feed (wastewater and borewell)', v: C.ro_feed}, {i: 'Concentrate with no use', v: C.conc_extra}, {i: 'Treated wastewater with no use', v: C.tert_over}];
    table('clLed', rows, [['i', 'Item', (v, r) => r.v == null || r.b ? `<b>${esc(v)}</b>` : esc(v)], ['v', 'm³ per year', v => v == null ? '' : spN(v)]]); })();
  table('clMo', [...R.monthly.map(m => ({month: m.month, rain: m.rain_mm, dem: (m.ab_dem + m.c_dem) / m.days, pd: m.bw_tot / m.days, pm: m.bw_tot, cm: m.conc})), {month: 'Year', rain: R.monthly.reduce((a, m) => a + m.rain_mm, 0), dem: R.monthly.reduce((a, m) => a + m.ab_dem + m.c_dem, 0) / 365.25, pd: R.monthly.reduce((a, m) => a + m.bw_tot, 0) / 365.25, pm: R.monthly.reduce((a, m) => a + m.bw_tot, 0), cm: R.monthly.reduce((a, m) => a + m.conc, 0), b: 1}],
    [['month', 'Month', (v, r) => r.b ? `<b>${esc(v)}</b>` : esc(v)], ['rain', 'Rain (mm)', F], ['dem', 'Demand (m³/d)', F], ['pd', 'Pumped (m³/d)', F], ['pm', 'Pumped (m³/month)', F], ['cm', 'Concentrate (m³/month)', F]]);
  table('clLv', R.levers, [['label', 'Measure', v => `<div style="min-width:220px">${esc(v)}</div>`], ['ext_tot', 'Borewell plus outside (m³/yr)', F], ['ext_p90', 'Dry-10 % year', F], ['ext_max', 'Driest year', F], ['bw_max_d', 'Peak pumping day (m³/d)', F]]);
}
