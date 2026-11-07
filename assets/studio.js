/* NBL-AquaTwin Studio - interface logic. Reads everything from the local server (app\studio\server.py). */
'use strict';
const $ = id => document.getElementById(id);
const fmt = n => n == null ? '–' : Number(n).toLocaleString('en-IN');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let SITE = null, RUN = null;
let D = {};                     // data cache for the selected site/run
const built = {};
let cur = 0;

async function api(path, params = {}, opt = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(path + (q ? '?' + q : ''), opt);
  const j = await r.json().catch(() => ({error: 'bad response'}));
  if (!r.ok || j.error) throw new Error(j.error || ('HTTP ' + r.status));
  return j;
}
const post = (path, body) => api(path, {}, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
const S = () => ({site: SITE});
const SR = () => ({site: SITE, run: RUN});
function fail(el, e) { const x = typeof el === 'string' ? $(el) : el; if (x && x._fullLayout) Plotly.purge(x); if (x) x.innerHTML = `<div class="err">Could not load this part: ${esc(e.message || e)}. Check that the selected run contains the module that produces it (Run the model, Step 6).</div>`; }

/* ---------------- icons ---------------- */
const IC = {
home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
db:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
brain:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
map:'<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
chart:'<path d="M4 20h16"/><path d="M6 16l4-5 3 3 5-7"/><circle cx="18" cy="7" r="1.5"/>',
pin:'<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
leaf:'<path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15z"/><path d="M5 19c3-4 6-7 10-10"/>',
layers:'<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
drill:'<path d="M12 2v14"/><path d="M9 5h6M9 9h6"/><path d="M10 16l2 6 2-6"/><path d="M5 22h14"/>',
spark:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
checkc:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
refresh:'<path d="M20 11a8 8 0 0 0-14.9-3.9L3 9"/><path d="M3 4v5h5"/><path d="M4 13a8 8 0 0 0 14.9 3.9L21 15"/><path d="M21 20v-5h-5"/>',
play:'<path d="M7 4l13 8-13 8z" fill="currentColor"/>',
playc:'<circle cx="12" cy="12" r="10" fill="#1f8a54" stroke="none"/><path d="M10 8l6 4-6 4z" fill="#fff" stroke="none"/>',
search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
list:'<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h1M3 12h1M3 18h1"/>',
finger:'<path d="M12 11v3a8 8 0 0 0 1 4"/><path d="M8 14a4 4 0 0 1 8-1"/><path d="M5 12a7 7 0 0 1 14 0v2"/><path d="M9 20a10 10 0 0 1-1-5"/><path d="M16 17v1"/>',
filecheck:'<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/><path d="M9 14l2 2 4-4"/>',
alert:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
flask:'<path d="M9 3h6M10 3v6L4 20h16l-6-11V3"/><path d="M7 14h10"/>',
bars:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
wave:'<path d="M2 12c2.5-6 5-6 7.5 0s5 6 7.5 0 4-4 5-2"/>',
target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
repeat:'<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
scale:'<path d="M12 3v18M5 21h14"/><path d="M5 7h14"/><path d="M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
section:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10c4-2 6 2 9 0s5-2 9 0M3 15c4-2 6 2 9 0s5-2 9 0"/>',
grid:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
x:'<path d="M6 6l12 12M18 6L6 18"/>',
send:'<path d="M4 12l16-8-6 16-2-6z"/>',
doc:'<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
sync:'<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/>',
copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
};
function ic(n, s = 18) { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${IC[n] || ''}</svg>`; }
function paintIcons(root = document) { root.querySelectorAll('[data-i]').forEach(e => { if (!e.dataset.done) { e.innerHTML = ic(e.dataset.i, e.dataset.s || 18); e.dataset.done = 1; e.style.display = 'inline-flex'; } }); }

/* ---------------- landscape art ---------------- */
function pines(n, x0, x1, yb, h0, h1, col, seed) { let s = seed, r = () => ((s = (s * 9301 + 49297) % 233280) / 233280), o = '';
  for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * r(), h = h0 + (h1 - h0) * r(), w = h * .34;
    o += `<path d="M${x} ${yb - h} L${x + w} ${yb - h * .35} L${x + w * .55} ${yb - h * .35} L${x + w * 1.1} ${yb} L${x - w * 1.1} ${yb} L${x - w * .55} ${yb - h * .35} L${x - w} ${yb - h * .35}Z" fill="${col}"/>`; } return o; }
$('topArt').innerHTML = `<defs><linearGradient id="tsk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e4f2f7" stop-opacity="0"/><stop offset=".4" stop-color="#d6ecf5"/></linearGradient></defs>
<rect x="0" y="0" width="900" height="74" fill="url(#tsk)"/>
<path d="M300 74 Q420 30 520 48 T720 30 T900 26 V74Z" fill="#b9d8de" opacity=".7"/>
<path d="M380 74 Q520 44 620 56 T820 46 T900 52 V74Z" fill="#8fc0b8" opacity=".8"/>
${pines(28, 560, 900, 70, 14, 30, '#3f7e6c', 7)}
<path d="M600 74 Q700 60 760 66 T900 62 V74Z" fill="#5f9c83"/>
${pines(18, 700, 900, 76, 18, 34, '#2c6656', 3)}`;
$('sideArt').innerHTML = `<path d="M0 60 Q60 30 120 52 T236 40 V170 H0Z" fill="#1a6a68" opacity=".55"/>
<path d="M0 95 Q70 70 130 90 T236 80 V170 H0Z" fill="#1d7a6a" opacity=".7"/>
${pines(14, 0, 236, 110, 22, 44, '#0f5248', 11)}
<path d="M0 120 Q60 105 120 118 T236 112 V170 H0Z" fill="#2b8a62"/>
<path d="M150 170 C130 150 170 140 140 124 C120 114 150 108 170 112 C190 120 160 132 182 146 C196 156 182 164 196 170Z" fill="#7cc4e6" opacity=".9"/>
${pines(10, 0, 236, 168, 26, 52, '#0c4a3c', 5)}`;

/* ---------------- navigation ---------------- */
const STEPS = [
 {n:0, t:'Site setup', g:'Project pipeline'}, {n:1, t:'Data integrity'}, {n:2, t:'Quality control'},
 {n:3, t:'Pseudo-sections'}, {n:4, t:'Interpretation'},
 {n:5, t:'Assumptions', g:'Modelling'}, {n:6, t:'Run & scenarios'}, {n:7, t:'Reports & decisions'},
];
const status = {0:'', 1:'', 2:'review', 3:'', 4:'review', 5:'', 6:'', 7:''};
function drawSteps() {
  const lab = {done:'Done', review:'Review', '':''};
  $('steps').innerHTML = STEPS.map(s => (s.g ? `<div class="grp">${s.g}</div>` : '') +
    `<button class="step ${status[s.n]} ${s.n === cur ? 'on' : ''}" data-n="${s.n}" onclick="go(${s.n})"><span class="n">${status[s.n] === 'done' ? '✓' : s.n}</span>${s.t}<span class="st">${lab[status[s.n]] || ''}</span></button>`).join('');
  $('mobsteps').innerHTML = STEPS.map(s => `<button class="chip ${s.n === cur ? 'on' : ''}" data-n="${s.n}" onclick="go(${s.n})">${s.n}. ${s.t}</button>`).join('');
}
const TABS = [['home', 'Home', 0], ['db', 'Data', 1], ['brain', 'AI Model', 4], ['map', 'Explore', 3], ['chart', 'Reports', 7]];
$('tabs').innerHTML = TABS.map(t => `<button class="tab" data-n="${t[2]}" onclick="go(${t[2]})">${ic(t[0], 20)}${t[1]}</button>`).join('');

function go(n) {
  if (n === 'new') return openNewSite();
  cur = n; const pid = 'p' + n;
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('on', p.id === pid));
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', +b.dataset.n === n));
  drawSteps(); noM0Note(n);
  $('main').scrollTop = 0;
  if (!built[n]) { built[n] = 1; BUILD[n]().catch(e => { console.error(e); built[n] = 0; }); }
  else resizeAll(pid);
  try { localStorage.setItem('aq_step', n); } catch (e) {}
  if ($('drawer').classList.contains('on')) drawSugs();
}
/* Steps 2 and 3 read the M0 data; a run that holds only later modules (for example the cloudburst tiers) has none. Say so, and offer the newest run that does. */
function noM0Note(n) {
  document.querySelectorAll('.nom0').forEach(e => e.remove());
  if (n !== 2 && n !== 3) return;
  const cur_ = (RUNS || []).find(r => r.id === RUN); if (!cur_ || cur_.has_data !== false) return;
  const full = RUNS.find(r => r.has_data !== false);
  const d = document.createElement('div'); d.className = 'banner warn nom0'; d.style.margin = '12px 0';
  d.innerHTML = `<span>${ic('alert')}</span><span><b>This saved run has no M0 data.</b> Saved run <b>${esc(RUN)}</b> holds only later modules (for example the cloudburst tiers), so the figures below stay empty. ` + (full ? `<a href="#" class="nom0go">Switch to saved run ${esc(full.id)}</a>` : 'No saved run of this site holds M0 data yet; calculate M0 to M4 first (Step 6, Start a calculation).') + '</span>';
  const pg = $('p' + n); pg.insertBefore(d, pg.querySelector('.ph').nextSibling);
  const a = d.querySelector('.nom0go'); if (a) a.onclick = ev => { ev.preventDefault(); $('runSel').value = full.id; $('runSel').onchange(); };
}
function resizeAll(pid) { $(pid).querySelectorAll('.js-plotly-plot').forEach(p => Plotly.Plots.resize(p)); }
window.addEventListener('resize', () => { const p = document.querySelector('.page.on'); if (p) resizeAll(p.id); });

/* ---------------- shared plot helpers ---------------- */
const FONT = {family: 'Plus Jakarta Sans, Segoe UI, sans-serif', size: 12, color: '#2c4644'};
const CFG = {displaylogo: false, responsive: true, modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'], toImageButtonOptions: {format: 'png', scale: 4}};
const CFG0 = {displayModeBar: false, responsive: true};
const base = (o = {}) => Object.assign({font: FONT, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', margin: {l: 56, r: 16, t: 16, b: 44}, hoverlabel: {font: {family: FONT.family}}}, o);
const LINECOL = '#0f6f73';
let LAT0 = 12.9, mPerLon = 1, mPerLat = 1;
function setGeo(lat) { LAT0 = lat; const R = 6371000; mPerLon = Math.PI / 180 * R * Math.cos(lat * Math.PI / 180); mPerLat = Math.PI / 180 * R; }
const dist = (a, b, c, d) => Math.hypot((a - c) * mPerLat, (b - d) * mPerLon);
function circle(lat, lon, r) { const xs = [], ys = []; for (let i = 0; i <= 72; i++) { const t = i / 72 * 2 * Math.PI; xs.push(lon + r * Math.cos(t) / mPerLon); ys.push(lat + r * Math.sin(t) / mPerLat); } return {x: xs, y: ys}; }
function allLines() { return D.order || Object.keys(D.geo || {}); }
function extentOf(view, pad = 0.0004) {
  if (view && view.lon) return [view.lon[0], view.lon[1], view.lat[0], view.lat[1]];
  const xs = [], ys = []; (D.setup.boundary || []).forEach(p => { xs.push(p[0]); ys.push(p[1]); });
  allLines().forEach(l => { xs.push(...D.geo[l].lon); ys.push(...D.geo[l].lat); });
  return [Math.min(...xs) - pad, Math.max(...xs) + pad, Math.min(...ys) - pad, Math.max(...ys) + pad];
}
function mapLayout(ext, extra = {}) {
  const bm = D.setup.basemap;
  return base(Object.assign({margin: {l: 10, r: 10, t: 10, b: 10}, showlegend: true, legend: {orientation: 'h', y: -0.02, x: 0, font: {size: 11.5}, bgcolor: 'rgba(255,255,255,.85)'},
    xaxis: {range: [ext[0], ext[1]], visible: false}, yaxis: {range: [ext[2], ext[3]], visible: false, scaleanchor: 'x', scaleratio: 1 / Math.cos(LAT0 * Math.PI / 180)},
    plot_bgcolor: '#e8efe9', dragmode: 'pan',
    images: bm ? [{source: bm.url, xref: 'x', yref: 'y', x: bm.lon0, y: bm.lat1, sizex: bm.lon1 - bm.lon0, sizey: bm.lat1 - bm.lat0, sizing: 'stretch', layer: 'below', opacity: .95}] : []}, extra));
}
function lineTraces(opt = {}) {
  const tr = [];
  allLines().forEach((ln, i) => { const L = D.geo[ln];
    tr.push({type: 'scatter', mode: 'lines', x: L.lon, y: L.lat, line: {color: opt.hl === ln ? '#e0453c' : LINECOL, width: opt.hl === ln ? 4.5 : 2.2}, name: 'ADMT lines', legendgroup: 'lines', showlegend: i === 0, hovertemplate: `Line ${ln}<extra></extra>`, opacity: opt.hl && opt.hl !== ln ? .55 : 1});
  });
  if (opt.labels === false) return tr;
  const ends = allLines().map(ln => { const L = D.geo[ln]; let i = 0;
    if (ln[0] === 'N') { L.lat.forEach((v, k) => { if (v > L.lat[i]) i = k; }); } else { L.lon.forEach((v, k) => { if (v < L.lon[i]) i = k; }); }
    return {ln, x: L.lon[i], y: L.lat[i]}; });
  tr.push({type: 'scatter', mode: 'text', x: ends.map(e => e.x), y: ends.map(e => e.y), text: ends.map(e => e.ln), textfont: {size: 10.5, color: '#0b3f44', family: FONT.family}, textposition: ends.map(e => e.ln[0] === 'N' ? 'top center' : 'middle left'), showlegend: false, hoverinfo: 'skip'});
  return tr;
}
function boundaryTrace() { const b = D.setup.boundary || []; return {type: 'scatter', mode: 'lines', x: b.map(p => p[0]), y: b.map(p => p[1]), fill: 'toself', fillcolor: 'rgba(31,138,84,.10)', line: {color: '#17663f', width: 2.6}, name: `Lease boundary${D.setup.card && D.setup.card.area_ha ? ' (' + D.setup.card.area_ha + ' ha)' : ''}`, hoverinfo: 'skip'}; }
function transformerTrace() { const t = D.setup.transformer; if (!t) return []; const c = circle(t.lat, t.lon, t.r);
  return [{type: 'scatter', mode: 'lines', x: c.x, y: c.y, line: {color: '#e0453c', width: 1.6, dash: 'dash'}, fill: 'toself', fillcolor: 'rgba(224,69,60,.07)', name: `Transformer zone (${t.r} m)`, hoverinfo: 'skip'},
    {type: 'scatter', mode: 'markers', x: [t.lon], y: [t.lat], marker: {symbol: 'square', size: 10, color: '#e0453c', line: {color: '#fff', width: 1.5}}, name: 'Transformer', hovertemplate: 'Transformer<extra></extra>', showlegend: false}]; }
const strikeTxt = w => (w.strikes || []).map(s => s[0] === s[1] ? s[0] : s.join('–')).join(', ');
function bwTrace() { const b = D.setup.borewells; return {type: 'scatter', mode: 'markers+text', x: b.map(w => w.lon), y: b.map(w => w.lat), text: b.map(w => w.id), textposition: 'top center', textfont: {size: 12, color: '#0b2f5c', family: FONT.family},
  marker: {size: 14, color: '#2f7fe0', line: {color: '#fff', width: 2.5}}, name: 'Reference borewells',
  customdata: b.map(w => [w.depth, w.status, strikeTxt(w)]), hovertemplate: '<b>%{text}</b><br>Depth %{customdata[0]} m · %{customdata[1]}<br>Strikes %{customdata[2]} m<extra></extra>'}; }
function lineamentTrace() { const xs = [], ys = []; (D.setup.lineaments || []).forEach(l => { xs.push(l.Start_lon, l.End_lon, null); ys.push(l.Start_lat, l.End_lat, null); });
  return {type: 'scatter', mode: 'lines', x: xs, y: ys, line: {color: '#7a4f9e', width: 1.5, dash: 'dot'}, name: 'DEM lineaments (provisional)', hoverinfo: 'skip'}; }
function kpi(cls, icon, label, val, sm, docIc = 'doc') { return `<div class="kpi ${cls}"><div class="ic">${ic(icon, 20)}</div><div><div class="lab">${label}</div><div class="val num">${val}</div>${sm ? `<div class="sm">${sm}</div>` : ''}</div><div class="doc">${ic(docIc, 28)}</div></div>`; }

/* ---------------- data loaders ---------------- */
async function needSetup() { if (!D.setup) { D.setup = await api('/api/setup', S()); const c = D.setup.boundary || []; setGeo(c.length ? c.reduce((a, p) => a + p[1], 0) / c.length : 12.9); } return D.setup; }
async function needGeo() { if (!D.geo) { D.geo = await api('/api/geometry', SR()); D.order = Object.keys(D.geo).sort((a, b) => a[0] === b[0] ? (+a.replace(/\D/g, '')) - (+b.replace(/\D/g, '')) : a[0] === 'N' ? -1 : 1); } return D.geo; }
async function needQC() { if (!D.qc) D.qc = await api('/api/qc', SR()); return D.qc; }
async function needLine(l) { D.lines = D.lines || {}; if (!D.lines[l]) D.lines[l] = await api('/api/line', {...SR(), line: l}); return D.lines[l]; }
async function needInterp() { if (!D.interp) D.interp = await api('/api/interp', SR()); return D.interp; }

const BUILD = {};
/* ---------------- STEP 0 ---------------- */
BUILD[0] = async function () {
  try { await needSetup(); await needGeo(); } catch (e) { fail('map0', e); return; }
  const St = D.setup, info = St.info || {};
  $('siteTitle').textContent = (St.name || SITE) + ' site';
  const stage = {A: 'Assumption model', B: 'Borehole data', C: 'Hydraulic test data', D: 'Adaptive model', E: 'Digital twin'}[info.evidence_stage] || '';
  $('evStage').textContent = 'Evidence stage ' + (info.evidence_stage || '–'); $('evStage2').innerHTML = stage + (info.evidence_stage === 'A' ? '<br>No on-site borehole yet' : '');
  const nst = allLines().reduce((a, l) => a + D.geo[l].st.length, 0);
  const deep = St.borewells.map(b => b.depth).filter(Boolean);
  const card = St.card || {}, k = card.kpis || {};
  $('k0').innerHTML = kpi('k-green', 'leaf', 'Lease area', card.area_ha ? card.area_ha + ' ha' : '–', info.boundary_note ? 'Revised lease boundary' : '', 'map') +
    kpi('k-blue', 'section', 'ADMT survey', `${allLines().length} lines`, `${fmt(nst)} stations · ${St.survey.spacing || '–'} m spacing`, 'wave') +
    kpi('k-amber', 'drill', 'Reference borewells', St.borewells.length, deep.length ? `${Math.min(...deep)}–${Math.max(...deep)} m deep` : '', 'drill') +
    kpi('k-blue', 'cal', 'Normal rainfall', k.rainfall_mm ? fmt(k.rainfall_mm) + ' mm' : '–', k.rainfall_note || '', 'chart');
  const ext = extentOf(St.views.map, 0.004), pad = 0.0012;
  St.borewells.forEach(b => { ext[0] = Math.min(ext[0], b.lon - pad); ext[1] = Math.max(ext[1], b.lon + pad); ext[2] = Math.min(ext[2], b.lat - pad); ext[3] = Math.max(ext[3], b.lat + pad); });
  const traces = [lineamentTrace(), boundaryTrace(), ...transformerTrace(), ...lineTraces({labels: false}), bwTrace()];
  clearBox('map0');
  Plotly.newPlot('map0', traces, mapLayout(ext), CFG);
  const nT = St.transformer ? 2 : 0, li = traces.length;
  const groups = [['Lineaments', [0]], ['Boundary', [1]], ...(nT ? [['Transformer', [2, 3]]] : []), ['ADMT lines', traces.map((t, i) => i).filter(i => i >= 2 + nT && i < li - 1)], ['Borewells', [li - 1]]];
  $('layerChips').innerHTML = groups.map((g, i) => `<button class="chip sm on" data-g="${i}">${g[0]}</button>`).join('');
  $('layerChips').onclick = e => { const b = e.target.closest('button'); if (!b) return; b.classList.toggle('on'); Plotly.restyle('map0', {visible: b.classList.contains('on')}, groups[b.dataset.g][1]); };
  $('map0note').textContent = (St.basemap ? 'Base: ' + St.basemap.source + '. ' : 'No basemap yet (tools\\make_studio_basemap.py). ') + 'Station positions are computed from planned centrelines and chainage.';
  $('siteCard').innerHTML = (card.facts || []).map(f => `<dt>${esc(f[0])}</dt><dd>${f[2] === 'bad' ? `<span class="pill p-r">${esc(f[1])}</span>` : esc(f[1])}</dd>`).join('') || '<dd class="note">Add facts to sites\\' + esc(SITE) + '\\studio\\studio.yaml</dd>';
  // weathering profile
  const cols = ['#d9b27c', '#c6a77f', '#6aa8d8', '#a3a8ae', '#7d848b', '#6b7178'];
  const prof = St.profile || [], maxd = prof.length ? Math.max(...prof.map(p => p[2])) : 600;
  const H = 260, W = 420, sc = d => 10 + d / maxd * (H - 20);
  const tgt = p => p[1] >= 80 && p[2] <= 300 && /fract/i.test(p[0]);
  const strikes = St.borewells.flatMap(b => (b.strikes || []).map(s => [s[0], s[1], b.id]));
  const ticks = [...new Set([...prof.map(p => p[1]), maxd])]; const ty = spread(ticks.map(t => sc(t) + 4), 12, 10, H);
  const sy = spread(strikes.map(s => sc((s[0] + s[1]) / 2) + 4), 13, 12, H - 2);
  const ny = spread(prof.map(p => (sc(p[1]) + sc(Math.min(p[2], maxd))) / 2 + 4), 14, 14, H);
  $('geo0').innerHTML = prof.length ? `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Weathering profile">${prof.map((p, i) => `<rect x="70" y="${sc(p[1])}" width="110" height="${sc(p[2]) - sc(p[1])}" fill="${cols[i % cols.length]}" ${tgt(p) ? 'stroke="#1d5fb8" stroke-width="2"' : ''}/><text x="190" y="${ny[i]}" font-size="12" fill="#2c4644" font-weight="${tgt(p) ? 700 : 500}">${esc(p[0][0].toUpperCase() + p[0].slice(1))}${tgt(p) ? ' · target' : ''}</text>`).join('')}
    ${ticks.map((t, i) => `<text x="62" y="${ty[i]}" font-size="11" fill="#5b7270" text-anchor="end">${t} m</text>`).join('')}
    ${strikes.map((s, i) => `<rect x="172" y="${sc(s[0])}" width="8" height="${Math.max(3, sc(s[1]) - sc(s[0]))}" fill="#1d5fb8"/><text x="${W - 4}" y="${sy[i]}" font-size="10.5" fill="#1d5fb8" font-weight="700" text-anchor="end">${esc(s[2])} ${s[0]}${s[1] !== s[0] ? '–' + s[1] : ''} m</text>`).join('')}</svg>` : '<p class="note">No geology_G1 entry in the assumption register.</p>';
  const ctr = St.boundary.length ? [St.boundary.reduce((a, p) => a + p[1], 0) / St.boundary.length, St.boundary.reduce((a, p) => a + p[0], 0) / St.boundary.length] : [LAT0, 0];
  $('bwT').innerHTML = '<thead><tr><th>Well</th><th>Depth</th><th>Strikes</th><th>Status</th><th>From site</th></tr></thead><tbody>' + St.borewells.map(w => `<tr><td><b>${esc(w.id)}</b></td><td class="num">${w.depth} m</td><td class="num">${strikeTxt(w)} m</td><td><span class="pill ${String(w.status).startsWith('not') ? 'p-r' : 'p-g'}">${esc(w.status)}</span></td><td class="num">${fmt(Math.round(dist(w.lat, w.lon, ctr[0], ctr[1]) / 10) * 10)} m</td></tr>`).join('') +
    (St.other_wells || []).map(w => `<tr><td><b>${esc(w.id)}</b></td><td class="num">${w.total_depth_m || '–'} m</td><td class="num">${(w.strikes_m || []).map(s => s[0] === s[1] ? s[0] : s.join('–')).join(', ')} m</td><td><span class="pill p-n">reported</span></td><td class="note">${esc(w.note || '')}</td></tr>`).join('') + '</tbody>';
  // auto-check
  const fz = prof.find(tgt);
  const inZone = fz ? strikes.filter(s => s[0] >= fz[1] && s[1] <= fz[2]) : [];
  const sod = (card.facts || []).find(f => /stage of development/i.test(f[0]));
  const dtw = (card.facts || []).find(f => /depth to water/i.test(f[1]) || /aquifer ii/i.test(f[0]));
  $('ins0').innerHTML = `${strikes.length} water strike${strikes.length === 1 ? '' : 's'} reported in the reference borewells (${strikes.map(s => `${s[2]} ${s[0]}${s[1] !== s[0] ? '–' + s[1] : ''} m`).join('; ')}).` +
    (fz ? ` ${inZone.length} of them fall inside the ${fz[0]} (${fz[1]}–${fz[2]} m) of profile G1, so that window is where ADMT targets should be looked for.` : '') +
    (sod ? ` ${esc(sod[0])}: ${esc(sod[1])}, so a new deep borewell competes with regional pumping.` : '') +
    (dtw ? ` ${esc(dtw[0])}: ${esc(dtw[1])}. The static level, not only the strike depth, will set the pump depth.` : '');
  status[0] = 'done'; drawSteps();
  paintIcons();
};

/* ---------------- STEP 1 ---------------- */
const CATDESC = {'borewell check record|exclude': 'Anomalous record, excluded from inputs', 'borewell check record|keep': 'ADMT at known borewells, used for cross-check', 'field planning|reference': 'Survey plan and stake-out documents', 'field planning record|reference': 'Field data for validation', 'instrument backup (.tmp)|redundant': 'Temporary backup files from the instrument', 'primary line record|keep': 'Main ADMT dataset, one record per line', 'prior derived product|reference': 'Earlier processed outputs, for comparison', 'repeat record|alternate': 'Repeat lines, used for repeatability tests', 'test / other project|exclude': 'Instrument tests and other projects', 'vendor AI output|exclude': 'Third-party AI output, not used'};
const USE = {keep: ['#22a35e', 'checkc', 'Keep'], reference: ['#3b8ee8', 'doc', 'Reference'], exclude: ['#e0453c', 'x', 'Exclude'], redundant: ['#f1b23b', 'sync', 'Redundant'], alternate: ['#8a5cd6', 'repeat', 'Alternate']};
let catPage = 0;
function renderCats() {
  const q = ($('catQ').value || '').toLowerCase();
  const rows = (D.integ.summary || []).filter(r => (r.category + ' ' + r.use).toLowerCase().includes(q));
  const per = 10, pages = Math.max(1, Math.ceil(rows.length / per)); catPage = Math.min(catPage, pages - 1);
  $('catT').innerHTML = rows.slice(catPage * per, catPage * per + per).map(r => { const u = USE[r.use] || ['#999', 'doc', r.use];
    const reasons = [...new Set((D.integ.inventory || []).filter(f => f.category === r.category && f.use === r.use && f.reason).map(f => f.reason))];
    return `<tr><td><span class="dot" style="background:${u[0]}">${ic(u[1], 12)}</span>${esc(r.category)}</td><td>${esc(r.use)}</td><td class="num">${r.files}</td><td style="color:#4a6361">${esc(CATDESC[r.category + '|' + r.use] || reasons[0] || 'Supporting material')}</td></tr>`; }).join('');
  $('pgInfo').textContent = `Showing ${rows.length ? catPage * per + 1 : 0} – ${Math.min(rows.length, catPage * per + per)} of ${rows.length} categories`;
  $('pg').innerHTML = `<button aria-label="Previous" onclick="catPage=Math.max(0,catPage-1);renderCats()">‹</button>` + Array.from({length: pages}, (_, i) => `<button class="${i === catPage ? 'on' : ''}" onclick="catPage=${i};renderCats()">${i + 1}</button>`).join('') + `<button aria-label="Next" onclick="catPage=Math.min(${pages - 1},catPage+1);renderCats()">›</button>`;
}
function drawIntegrity() {
  const I = D.integ, L = I.last_check, tot = I.manifest_files;
  const ch = L ? L.changed.length : null, nm = L ? L.not_in_manifest.length : null, ms = L ? L.missing.length : 0;
  $('k1').innerHTML = kpi('k-blue', 'doc', 'Total Files', fmt(tot), `${fmt(Math.round(I.manifest_bytes / 1e6))} MB copied read-only`) +
    kpi('k-green', 'checkc', 'Unchanged', L ? fmt(L.unchanged) : '–', L ? 'SHA-256 matches manifest' : 'Run a check') +
    kpi('k-amber', 'sync', 'Changed', L ? ch + ms : '–', L ? (ms ? `${ms} missing` : 'Since intake') : 'Run a check') +
    kpi('k-red', 'alert', 'Not in Manifest', L ? nm : '–', L ? (nm ? 'Files added after intake' : 'No stray files') : 'Run a check');
  const ok = L && !ch && !nm && !ms;
  const b = $('intBanner'); b.classList.toggle('warn', !ok);
  $('intMsg').textContent = !L ? 'Fingerprints have not been checked on this computer yet. Run a check before quality control.' :
    ok ? 'All raw files with a fingerprint are unchanged. Your data is consistent and ready for quality control.' :
    `${ch} changed, ${ms} missing and ${nm} unlisted file(s). Do not continue until each one is explained.`;
  $('lastChk').textContent = L ? new Date(L.checked_at).toLocaleString('en-GB', {day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'}) + ` (${L.seconds} s)` : 'never';
  $('tiles1').innerHTML = `<div class="tile"><span>${ic('finger')}</span><div><b>SHA-256 Fingerprint</b><span>${L ? (ch ? ch + ' file(s) changed' : 'Verified for all files') : 'Not checked yet'}</span></div></div>
    <div class="tile b"><span>${ic('filecheck')}</span><div><b>Manifest Consistency</b><span>${L ? (nm || ms ? 'Differences found' : 'All files matched') : 'Not checked yet'}</span></div></div>
    <div class="tile"><span>${ic('db')}</span><div><b>Data Ready</b><span>Originals untouched</span></div></div>
    <div class="tile b" style="cursor:pointer" onclick="go(2)"><span>${ic('playc')}</span><div><b>Next Step</b><span>Proceed to quality control</span></div></div>`;
  status[1] = ok ? 'done' : (L ? 'review' : ''); drawSteps();
}
BUILD[1] = async function () {
  try { D.integ = await api('/api/integrity', S()); } catch (e) { fail('k1', e); return; }
  drawIntegrity();
  if (!D.integ.last_check) runCheck();
  $('catQ').oninput = () => { catPage = 0; renderCats(); }; renderCats();
  const by = {}; (D.integ.summary || []).forEach(r => by[r.use] = (by[r.use] || 0) + r.files);
  const tot = Object.values(by).reduce((a, b) => a + b, 0);
  const order = ['keep', 'reference', 'exclude', 'redundant', 'alternate'].filter(k => by[k]);
  Plotly.newPlot('donut', [{type: 'pie', hole: .66, values: order.map(k => by[k]), labels: order.map(k => USE[k][2]), marker: {colors: order.map(k => USE[k][0]), line: {color: '#fff', width: 2}}, textinfo: 'none', sort: false, hovertemplate: '%{label}: %{value} files<extra></extra>'}],
    base({margin: {l: 0, r: 0, t: 0, b: 0}, showlegend: false, annotations: [{text: `<b style="font-size:26px">${tot}</b><br>Files`, showarrow: false, font: {size: 13, color: '#122b2c'}}]}), CFG0);
  $('donutLeg').innerHTML = order.map(k => `<div><i style="background:${USE[k][0]}"></i>${USE[k][2]} (${by[k]} files)<span class="num">${(by[k] / tot * 100).toFixed(1)}%</span></div>`).join('');
  try { await needQC(); await needSetup(); } catch (e) { fail('timeline', e); return; }
  const L = D.qc.Lines, rd = D.setup.survey.rain_date;
  $('rainNote').textContent = 'Acquisition day and rain condition of each line.' + (rd ? ` The rain of ${new Date(rd).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})} splits the survey into pre-rain and post-rain records, which Step 2 tests.` : '');
  const ordr = D.qc.line_order.slice().reverse();
  const byl = Object.fromEntries(L.map(r => [r.line, r]));
  const rc = r => r === 'pre' ? '#f1b23b' : r === 'post' ? '#3b8ee8' : '#8a5cd6';
  Plotly.newPlot('timeline', [{type: 'scatter', mode: 'markers+text', y: ordr, x: ordr.map(l => byl[l].date_IST), text: ordr.map(l => byl[l].stations), textposition: 'middle right', textfont: {size: 10.5, color: '#5b7270'},
    marker: {color: ordr.map(l => rc(byl[l].rain)), size: ordr.map(l => 9 + byl[l].stations / 10), symbol: 'circle', line: {color: '#fff', width: 1.5}},
    customdata: ordr.map(l => [byl[l].stations, byl[l].rain, byl[l].walked]), hovertemplate: 'Line %{y} · %{x}<br>%{customdata[0]} stations · %{customdata[1]}-rain · walked %{customdata[2]}<extra></extra>', showlegend: false},
    ...[['pre', 'Pre-rain'], ['post', 'Post-rain'], ['post/pre', 'Mixed']].map(r => ({type: 'scatter', mode: 'markers', x: [null], y: [null], marker: {color: rc(r[0]), size: 10}, name: r[1]}))],
    base({margin: {l: 40, r: 10, t: 6, b: 40}, xaxis: {type: 'date', title: 'Acquisition date (label = stations)', gridcolor: '#eef3f2', dtick: 86400000, tickformat: '%d %b'}, legend: {orientation: 'h', y: 1.1, x: 0},
      shapes: rd ? [{type: 'line', x0: rd, x1: rd, yref: 'paper', y0: 0, y1: 1, line: {color: '#2f7fe0', width: 1.5, dash: 'dot'}}] : [], annotations: rd ? [{x: rd, yref: 'paper', y: 1, text: 'rain', showarrow: false, yanchor: 'bottom', font: {size: 11, color: '#2f7fe0'}}] : []}), CFG0);
  $('missT').innerHTML = '<thead><tr><th>Missing item</th><th>Affects</th><th>How to obtain</th></tr></thead><tbody>' + D.qc.Missing.map(m => `<tr><td>${esc(m.item)}</td><td><span class="pill p-n">${esc(m.affects)}</span></td><td style="color:#4a6361">${esc(m['how to obtain'])}</td></tr>`).join('') + '</tbody>';
  paintIcons();
};
async function runCheck() {
  const i = $('refIc'), b = $('chkBtn'); i.classList.add('spin'); b.disabled = true; b.lastChild.textContent = 'Checking…';
  try { D.integ = D.integ || await api('/api/integrity', S()); D.integ.last_check = await post('/api/integrity/check', S()); drawIntegrity(); }
  catch (e) { $('intMsg').textContent = 'The check failed: ' + e.message; }
  i.classList.remove('spin'); b.disabled = false; b.lastChild.textContent = 'Check all fingerprints now';
}

/* ---------------- STEP 2 ---------------- */
let qcLine = null;
BUILD[2] = async function () {
  try { await needQC(); await needGeo(); } catch (e) { fail('k2', e); return; }
  const Q = D.qc, L = Q.Lines;
  const T = L.reduce((a, r) => ({c: a.c + r.cells, k: a.k + r.keep, f: a.f + r.flag, x: a.x + r.exclude, s: a.s + (r.spikes || 0), st: a.st + r.stations}), {c: 0, k: 0, f: 0, x: 0, s: 0, st: 0});
  const nlev = L.length ? Math.round(L[0].cells / L[0].stations) : 60;
  $('k2').innerHTML = kpi('k-blue', 'grid', 'Readings screened', fmt(T.c), `${fmt(T.st)} stations × ${nlev} levels`, 'grid') + kpi('k-green', 'checkc', 'Kept', fmt(T.k), `${(T.k / T.c * 100).toFixed(0)} % of readings`) +
    kpi('k-amber', 'alert', 'Flagged', fmt(T.f), `${(T.f / T.c * 100).toFixed(1)} % · used with caution`) + kpi('k-red', 'x', 'Excluded', fmt(T.x), `${(T.x / T.c * 100).toFixed(1)} % · ${fmt(T.s)} spikes removed`);
  const ord = Q.line_order.slice().reverse(), by = Object.fromEntries(L.map(r => [r.line, r]));
  Plotly.newPlot('qcBars', [['keep', 'Kept', '#22a35e'], ['flag', 'Flagged', '#f1b23b'], ['exclude', 'Excluded', '#e0453c']].map(k => ({type: 'bar', orientation: 'h', name: k[1], y: ord, x: ord.map(l => by[l][k[0]] / by[l].cells * 100), marker: {color: k[2]}, customdata: ord.map(l => by[l][k[0]]), hovertemplate: `%{y} · ${k[1]}: %{customdata} (%{x:.0f} %)<extra></extra>`})),
    base({barmode: 'stack', margin: {l: 40, r: 10, t: 6, b: 44}, xaxis: {title: '% of readings on the line', range: [0, 100], gridcolor: '#eef3f2'}, legend: {orientation: 'h', y: 1.08, x: 0}}), CFG0);
  const rr = Object.entries(Q.reasons).slice(0, 7);
  $('reasonT').innerHTML = '<thead><tr><th>Reason</th><th style="text-align:right">Readings</th></tr></thead><tbody>' + rr.map(r => `<tr><td>${esc(r[0])}</td><td class="num" style="text-align:right">${fmt(r[1])}</td></tr>`).join('') + '</tbody>';
  const heavy = L.filter(r => r.exclude / r.cells > .5).map(r => `${r.line} (${Math.round(r.exclude / r.cells * 100)} %)`);
  const dc = Q.Depth_confidence, best = ['D1', 'D2', 'D3', 'D4', 'D5'].find(c => dc.some(r => r.depth_class === c));
  const d3 = dc.filter(r => r.depth_class === best).map(r => r.depth_m);
  const bw = Q.Borewell_strikes_15Oct || [], bwc = Q.borewell_consistency || [];
  $('ins2').innerHTML = (heavy.length ? `${heavy.length} line${heavy.length > 1 ? 's lose' : ' loses'} more than half of the readings: ${heavy.join(', ')}. Mostly: ${esc(rr[0] ? rr[0][0] : '')}. ` : 'No line loses more than half of its readings. ') +
    `The best depth-confidence class reached is <b>${best}</b>${d3.length ? ` (${Math.min(...d3)}–${Math.max(...d3)} m)` : ''}, so depths are indicative. ` +
    (bw.length ? `At the borewells, ${bw.filter(r => r.Conductive_at_strike === 'both').length} of ${bw.length} reported strikes show a low response in both directions.` :
     bwc.length ? `At the borewells, ${bwc.filter(r => /consistent/.test(r.consistency) && !/not/.test(r.consistency)).length} of ${bwc.length} record-strike checks fall in the low-response class (HP-L).` : 'No borewell checks on this site.');
  qcLine = qcLine || Q.line_order[Math.floor(Q.line_order.length / 2)];
  $('qcLineChips').innerHTML = Q.line_order.map(l => `<button class="chip sm ${l === qcLine ? 'on' : ''}" data-l="${l}">${l}</button>`).join('');
  $('qcLineChips').onclick = e => { const b = e.target.closest('button'); if (!b) return; qcLine = b.dataset.l; $('qcLineChips').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); setupQcSlider(); };
  $('qcSt').oninput = drawQc; setupQcSlider();
  const dcol = {D1: '#17663f', D2: '#4caf7a', D3: '#3b8ee8', D4: '#c5ccd0', D5: '#e0453c'};
  const present = ['D1', 'D2', 'D3', 'D4', 'D5'].filter(c => dc.some(r => r.depth_class === c));
  const lab = {D1: 'D1 confirmed', D2: 'D2 good', D3: 'D3 indicative', D4: 'D4 sensitivity only', D5: 'D5 noise row'};
  $('dconfNote').textContent = `Agreement between repeat lines and at line crossings, for every depth level. ${best} is the best class this survey reaches.`;
  Plotly.newPlot('dconf', [
    {type: 'bar', orientation: 'h', y: dc.map(r => r.depth_m), x: dc.map(() => .08), base: dc.map(() => -.6), marker: {color: dc.map(r => dcol[r.depth_class])}, width: 10, customdata: dc.map(r => [r.depth_class, r.reason]), hovertemplate: '%{y} m · <b>%{customdata[0]}</b><br>%{customdata[1]}<extra></extra>', showlegend: false},
    {type: 'scatter', mode: 'lines', y: dc.map(r => r.depth_m), x: dc.map(r => r.repeat_r_same_condition), name: 'Repeat r (same rain condition)', line: {color: '#17663f', width: 2.2}},
    {type: 'scatter', mode: 'lines', y: dc.map(r => r.depth_m), x: dc.map(r => r.repeat_r_pre_vs_post_rain), name: 'Repeat r (pre vs post rain)', line: {color: '#f1b23b', width: 2, dash: 'dot'}},
    {type: 'scatter', mode: 'lines', y: dc.map(r => r.depth_m), x: dc.map(r => r.crossing_r), name: 'Crossing r', line: {color: '#2f7fe0', width: 2.2}},
    ...present.map(k => ({type: 'scatter', mode: 'markers', x: [null], y: [null], marker: {symbol: 'square', size: 11, color: dcol[k]}, name: lab[k]}))],
    base({margin: {l: 56, r: 10, t: 6, b: 44}, yaxis: {autorange: 'reversed', title: 'Nominal depth (m)', gridcolor: '#eef3f2'}, xaxis: {title: 'Correlation r', range: [-.62, .62], zeroline: true, zerolinecolor: '#9fb3b1', gridcolor: '#eef3f2'}, legend: {orientation: 'h', y: -0.2, x: 0, font: {size: 11}}}), CFG0);
  if (!bw.length) $('bwcT').innerHTML = bwc.length ? '<thead><tr><th>Well</th><th>Record</th><th>Strike</th><th>Class</th><th>Verdict</th></tr></thead><tbody>' + bwc.map(r => `<tr><td><b>${esc(r.borewell)}</b></td><td style="font-size:12px">${esc(r.record)}</td><td class="num">${esc(r.reported_strike_m)} m</td><td>${esc(r.dominant_class)} · ${Math.round((r.dominant_share || 0) * 100)} %</td><td>${/not|inconsistent/.test(r.consistency) ? '<span class="pill p-r">Does not</span>' : '<span class="pill p-g">Supports</span>'}</td></tr>`).join('') + '</tbody>' : '<tbody><tr><td class="note">No borewell-check records on this site.</td></tr></tbody>';
  else $('bwcT').innerHTML = '<thead><tr><th>Well</th><th>Strike</th><th>z, dir 1</th><th>z, dir 2</th><th>Verdict</th></tr></thead><tbody>' + bw.map(r => { const v = r.Conductive_at_strike; return `<tr><td><b>${esc(r.Well)}</b></td><td class="num">${esc(r.Strike_m)} m</td><td class="num">${esc(r.Direction_1)} ${r.z_dir1}</td><td class="num">${esc(r.Direction_2)} ${r.z_dir2}</td><td>${v === 'both' ? '<span class="pill p-g">Supports</span>' : v === 'one' ? '<span class="pill p-a">Partly</span>' : '<span class="pill p-r">Does not</span>'}</td></tr>`; }).join('') + '</tbody>';
  $('repT').innerHTML = '<thead><tr><th>Line</th><th>Comparison</th><th>r, 120–250 m</th><th>Same sign</th><th>Verdict</th></tr></thead><tbody>' + (Q.repeat || []).map(r => `<tr><td><b>${esc(r.Line)}</b></td><td>${esc(r.Comparison)}</td><td class="num">${r.r_120_250m}</td><td class="num">${r.Same_sign_pct} %</td><td>${r.r_120_250m >= .3 ? '<span class="pill p-g">Repeatable</span>' : '<span class="pill p-r">Weak</span>'}</td></tr>`).join('') + '</tbody>';
  const sup = {'Can support': 'p-g', 'Cannot support': 'p-r', 'Weak support': 'p-a'};
  $('canT').innerHTML = Object.keys(sup).map(k => `<div><span class="pill ${sup[k]}">${k}</span><ul style="margin:8px 0 0;padding-left:18px;line-height:1.6;color:#2c4644">${Q.Can_cannot.filter(r => r.support === k).map(r => `<li>${esc(r.statement)}</li>`).join('')}</ul></div>`).join('');
  paintIcons();
};
async function setupQcSlider() { $('qcCurve').innerHTML = '<div class="loading">Loading line ' + qcLine + '…</div>';
  try { const L = await needLine(qcLine); $('qcSt').max = L.st.length - 1; $('qcSt').value = Math.floor(L.st.length / 2); clearBox('qcCurve'); drawQc(); } catch (e) { fail('qcCurve', e); } }
const col = (a, i) => a.map(r => r[i]);
function clearBox(id) {   // remove a loading / error note but never the live chart inside the box
  const el = $(id); if (!el) return;
  el.querySelectorAll(':scope > .loading, :scope > .err, :scope > .note').forEach(n => n.remove());
}
function spread(ys, gap, lo, hi) { const idx = ys.map((y, i) => [y, i]).sort((a, b) => a[0] - b[0]); const out = new Array(ys.length); let last = -1e9;
  idx.forEach(([y, i]) => { const v = Math.max(y, last + gap); out[i] = v; last = v; });
  const over = last - hi; if (over > 0) { idx.slice().reverse().forEach(([y, i], k) => { out[i] = Math.min(out[i], hi - k * gap); }); }
  return out.map(v => Math.max(lo, v)); }
function drawQc() {
  const L = D.lines[qcLine], i = +$('qcSt').value, dep = L.depths;
  const raw = col(L.raw, i), cln = col(L.cln, i), lv = col(L.lv, i), dec = col(L.dec, i);
  $('qcStLab').textContent = `${qcLine} · st ${L.st[i]}`;
  const kept = dec.filter(d => d === 0).length;
  $('qcStInfo').innerHTML = `${L.ch[i].toFixed(0)} m along line · ${fmt(L.dist_tr[i])} m from transformer · ${kept}/${dep.length} kept ${L.flags[i] ? '· flags: ' + esc(L.flags[i].replaceAll(';', ', ')) : ''}`;
  const lay = t => base({margin: {l: 56, r: 10, t: 62, b: 48}, title: {text: t, font: {size: 13}, x: 0, xanchor: 'left', y: .98, yanchor: 'top'}, yaxis: {autorange: 'reversed', title: 'Nominal depth (m)', gridcolor: '#eef3f2'}, showlegend: true, legend: {orientation: 'h', y: 1.0, yanchor: 'bottom', x: 0, font: {size: 11}}});
  Plotly.react('qcCurve', [{x: raw, y: dep, mode: 'lines+markers', name: 'Measured', line: {color: '#9aa8a7', width: 1.5}, marker: {size: 3}}, {x: cln, y: dep, mode: 'lines', name: 'Cleaned', line: {color: '#0f6f73', width: 2.4}},
    {x: raw.map((v, k) => dec[k] === 2 ? v : null), y: dep, mode: 'markers', name: 'Excluded', marker: {color: '#e0453c', size: 7, symbol: 'x'}}],
    Object.assign(lay('Measured and cleaned curve'), {xaxis: {title: 'log₁₀ dV', gridcolor: '#eef3f2'}}), CFG0);
  Plotly.react('qcLev', [{x: lv, y: dep, mode: 'lines', fill: 'tozerox', fillcolor: 'rgba(47,127,224,.12)', line: {color: '#2f7fe0', width: 2.4}, name: 'Levelled response'},
    {x: lv.map((v, k) => dec[k] === 2 ? v : null), y: dep, mode: 'markers', name: 'Excluded', marker: {color: '#e0453c', size: 7, symbol: 'x'}}],
    Object.assign(lay('Levelled response (0 = line background)'), {xaxis: {title: 'Levelled log₁₀ dV', zeroline: true, zerolinecolor: '#7f9593', gridcolor: '#eef3f2'}}), CFG0);
}

/* ---------------- STEP 3 ---------------- */
let psLine = null, psVar = 'shape';
const CLS_COL = ['#1d5fb8', '#5f9fe0', '#9cc7ee', '#e5e7e3', '#d9c49b', '#bf9a62', '#8b5a2b'];
const DIV = [[0, '#0b4f9c'], [.25, '#4f93d6'], [.45, '#cfe3f2'], [.5, '#f4f2ea'], [.55, '#f0dfbf'], [.75, '#c9935a'], [1, '#7a4310']];
BUILD[3] = async function () {
  try { await needSetup(); await needGeo(); await needQC(); await needInterp(); } catch (e) { fail('ps', e); return; }
  const lv = D.setup.survey.levels || {};
  $('psBadge').textContent = `${allLines().length} lines · ${lv.first && lv.last ? Math.round((lv.last - lv.first) / lv.step + 1) : ''} levels`;
  $('psBadge2').innerHTML = `${lv.first || ''}–${lv.last || ''} m nominal depth<br>${D.setup.survey.spacing || ''} m station spacing`;
  $('dsDepth').min = lv.first || 10; $('dsDepth').max = lv.last || 600; $('dsDepth').step = lv.step || 10;
  psLine = psLine && D.geo[psLine] ? psLine : ((D.interp.sites[0] && D.interp.sites[0].nearest.line) || (D.interp.zones[0] && D.interp.zones[0].Line) || allLines()[0]);
  $('psLines').innerHTML = allLines().map(l => `<button class="chip sm ${l === psLine ? 'on' : ''}" data-l="${l}">${l}</button>`).join('');
  $('psLines').onclick = e => { const b = e.target.closest('button'); if (!b) return; psLine = b.dataset.l; $('psLines').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); drawPS(); };
  $('psVar').onclick = e => { const b = e.target.closest('button'); if (!b) return; psVar = b.dataset.v; $('psVar').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); drawPS(); if (psVar === 'lv' || psVar === 'shape') drawSlice(); };
  $('psMask').onchange = drawPS; $('psZones').onchange = drawPS;
  let t = null; $('dsDepth').oninput = () => { $('dsLab').textContent = $('dsDepth').value + ' m'; clearTimeout(t); t = setTimeout(drawSlice, 120); };
  drawPS(); drawSlice();
};
async function drawPS() {
  let L; try { L = await needLine(psLine); } catch (e) { fail('ps', e); return; }
  const mask = $('psMask').checked;
  const z = (psVar === 'cls' ? L.cls : psVar === 'raw' ? L.raw : psVar === 'shape' ? L.shape : L.lv).map((row, k) => row.map((v, i) => mask && L.dec[k][i] === 2 ? null : v));
  let tr;
  if (psVar === 'cls') {
    const cs = []; CLS_COL.forEach((c, i) => { cs.push([i / 7, c], [(i + 1) / 7, c]); });
    tr = {type: 'heatmap', x: L.st, y: L.depths, z, zmin: .5, zmax: 7.5, colorscale: cs, colorbar: {title: {text: 'Class', side: 'right'}, tickvals: [1, 2, 3, 4, 5, 6, 7], ticktext: ['C1 low', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7 high'], thickness: 12, len: .9}, hovertemplate: 'Station %{x} · %{y} m<br>Class C%{z}<extra></extra>'};
  } else {
    const vals = z.flat().filter(v => v != null).sort((a, b) => a - b); const q = a => vals[Math.floor(a * (vals.length - 1))];
    if (!vals.length) { Plotly.purge('ps'); $('ps').innerHTML = '<div class="err">This run has no values for this view (the depth-shape view needs M3).</div>'; return; }
    const dv = psVar === 'lv' || psVar === 'shape';
    const lim = dv ? Math.max(Math.abs(q(.03)), Math.abs(q(.97))) : null;
    tr = {type: 'heatmap', x: L.st, y: L.depths, z, zsmooth: 'best', colorscale: DIV, zmin: dv ? -lim : q(.02), zmax: dv ? lim : q(.98), colorbar: {title: {text: psVar === 'shape' ? 'Shape z' : psVar === 'lv' ? 'Levelled' : 'log₁₀ dV', side: 'right'}, thickness: 12, len: .9}, hovertemplate: 'Station %{x} · %{y} m<br>%{z:.3f}<extra></extra>'};
  }
  const shapes = [], ann = [];
  const zs = D.interp.zones.filter(zz => zz.Line === psLine);
  if ($('psZones').checked) zs.forEach(zz => { shapes.push({type: 'rect', x0: zz.Station_from - .5, x1: zz.Station_to + .5, y0: zz.Top_m, y1: zz.Bottom_m, line: {color: '#0b2f5c', width: 2}, fillcolor: 'rgba(0,0,0,0)'}); ann.push({x: (zz.Station_from + zz.Station_to) / 2, y: zz.Top_m, yanchor: 'bottom', text: `<b>${zz.Zone}</b> · ${zz.Score}`, showarrow: false, font: {size: 11, color: '#0b2f5c'}, bgcolor: 'rgba(255,255,255,.8)'}); });
  const qr = D.qc.Lines.find(r => r.line === psLine) || {};
  clearBox('ps');
  Plotly.react('ps', [tr], base({margin: {l: 60, r: 10, t: 10, b: 48}, plot_bgcolor: '#dfe5e3', xaxis: {title: `Station on ${psLine} (${D.setup.survey.spacing || ''} m spacing${qr.walked ? ', walked ' + qr.walked : ''})`}, yaxis: {autorange: 'reversed', title: 'Nominal depth (m)'}, shapes, annotations: ann}), CFG);
  psSide(L, zs, qr);
}
function psSide(L, zs, qr) {
  Plotly.react('psMini', [boundaryTrace(), ...transformerTrace(), ...lineTraces({hl: psLine, labels: false})], mapLayout(extentOf(D.setup.views.site), {showlegend: false}), {displayModeBar: false, responsive: true});
  const sites = D.interp.sites.filter(s => s.nearest.line === psLine);
  $('psInfo').innerHTML = `<b style="color:#122b2c">Line ${psLine}</b> · ${qr.stations || ''} stations · ${qr.date_IST || ''} · ${qr.rain || ''}-rain<br>Kept ${fmt(qr.keep)}, flagged ${fmt(qr.flag)}, excluded ${fmt(qr.exclude)} readings.<br>${zs.length} scored zone${zs.length === 1 ? '' : 's'} on this line${sites.length ? '; candidate site' + (sites.length > 1 ? 's ' : ' ') + sites.map(s => '<b>' + esc(s.Site) + '</b>').join(', ') : ''}.`;
  const top = zs.slice().sort((a, b) => b.Score - a.Score)[0];
  $('psAiT').textContent = `Reading line ${psLine}`;
  $('psAi').innerHTML = qr.cells && qr.exclude / qr.cells > .5 ? `${Math.round(qr.exclude / qr.cells * 100)} % of the readings on ${psLine} are excluded (mostly the transformer zone). Nothing on this line should carry weight in site selection.` :
    top ? `The strongest scored feature on ${psLine} is <b>${top.Zone}</b> (score ${top.Score}/10) at stations ${top.Station_from}–${top.Station_to}, ${top.Top_m}–${top.Bottom_m} m nominal depth${top.Crossings_supporting ? `, supported by ${esc(String(top.Crossings_checked).split(';')[0].split(' (')[0])}` : ', with no crossing-line support'}. ${top.Near_transformer === 'Yes' ? 'It lies near the transformer zone; check it against the noise flags. ' : ''}${top.At_line_end === 'Yes' ? 'It touches a line end, which weakens it. ' : ''}Read the depth as indicative.` :
    `No zone on ${psLine} reached the scoring threshold. The low-response patches here are narrow or lack support from crossing lines.`;
  $('psLegend').innerHTML = psVar === 'cls' ? `<div class="legend">${CLS_COL.map((c, i) => `<div><i style="background:${c};border-radius:4px"></i>C${i + 1} <span>${(D.interp.interp.classes || {})['C' + (i + 1)] ? D.interp.interp.classes['C' + (i + 1)].hp : ''}</span></div>`).join('')}</div><p class="note">Response classes from the M3 Gaussian mixture model, ordered from lowest (C1) to highest (C7) response.</p>` :
    `<div style="height:14px;border-radius:7px;background:${AQGRAD}"></div><div class="row" style="justify-content:space-between;margin-top:6px;font-size:12px;color:var(--muted)"><span>Lower than background<br><b style="color:#1d5fb8">candidate fracture</b></span><span style="text-align:right">Higher than background<br><b style="color:#7a4310">massive rock</b></span></div><p class="note">${psVar === 'shape' ? 'Depth-shape anomaly (M3 shape z): each station\'s own level is removed, so vertical stripes from station offsets disappear and the depth pattern stands out. This is the view the zones were scored on.' : psVar === 'lv' ? 'Levelled response: includes each station\'s overall level, so vertical stripes show station-to-station offsets.' : 'Raw values before levelling.'} Grey cells were excluded by QC. Boxes mark scored zones, with their score out of 10.</p>`;
}
async function drawSlice() {
  const d = +$('dsDepth').value; $('dsLab').textContent = d + ' m';
  const sv = psVar === 'lv' ? 'lv' : 'shape';
  let P; try { P = await api('/api/slice', {...SR(), depth: d, var: sv}); } catch (e) { fail('dslice', e); return; }
  const pts = P.points, dcl = D.qc.Depth_confidence.find(r => r.depth_m === d);
  Plotly.react('dslice', [boundaryTrace(), ...transformerTrace(), {type: 'scatter', mode: 'markers', x: pts.map(p => p[0]), y: pts.map(p => p[1]), text: pts.map(p => p[3]), marker: {size: 8, color: pts.map(p => p[2]), colorscale: DIV, cmin: sv === 'lv' ? -.6 : -2, cmax: sv === 'lv' ? .6 : 2, colorbar: {title: {text: sv === 'lv' ? 'Levelled' : 'Shape z', side: 'right'}, thickness: 12, len: .8}}, name: 'Kept readings', hovertemplate: '%{text}<br>%{marker.color:.3f}<extra></extra>'},
    {type: 'scatter', mode: 'markers+text', x: D.interp.sites.map(s => s.Lon), y: D.interp.sites.map(s => s.Lat), text: D.interp.sites.map(s => s.Site), textposition: 'middle center', textfont: {color: '#fff', size: 10}, marker: {size: 18, color: 'rgba(18,43,44,.85)', line: {color: '#fff', width: 1.5}}, name: 'Candidate sites', hovertemplate: 'Site %{text}<extra></extra>'}],
    mapLayout(extentOf(D.setup.views.site), {annotations: [{xref: 'paper', yref: 'paper', x: .01, y: .99, xanchor: 'left', yanchor: 'top', text: `<b>${d} m</b>${dcl ? ' · confidence ' + dcl.depth_class : ''}`, showarrow: false, bgcolor: 'rgba(255,255,255,.9)', font: {size: 12}}]}), CFG);
}

/* ---------------- STEP 4 ---------------- */
let reading = 'I-NEU', siteSel = null;
const ROLECOL = r => /^Priority 1/.test(r) ? '#17663f' : /^Priority 2/.test(r) ? '#1f8a54' : /^Priority/.test(r) ? '#5aa77a' : /^Alternate/.test(r) ? '#2f7fe0' : '#8a9a98';
BUILD[4] = async function () {
  try { await needSetup(); await needGeo(); await needInterp(); await needQC(); } catch (e) { fail('map4', e); return; }
  const Z = D.interp;
  $('stamp4').textContent = Z.stamp;
  $('interpBadge').innerHTML = `${Z.approved ? 'Readings approved' : 'Readings proposed'}<br>${esc(Z.interp_file || '')}`;
  status[4] = Z.approved ? 'done' : 'review'; drawSteps();
  $('approveRow').hidden = Z.approved || !Z.interp_file; $('approveMsg').textContent = '';
  $('zoneSrc').textContent = Z.zones_source ? `Zones: ${Z.zones_source}.` : '';
  const avail = Object.keys(Z.interp.interpretations || {});
  $('reading').querySelectorAll('button').forEach(b => b.hidden = !avail.includes(b.dataset.v));
  if (!avail.includes(reading)) reading = avail[0];
  $('reading').onclick = e => { const b = e.target.closest('button'); if (!b) return; reading = b.dataset.v; $('reading').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); draw4(); };
  siteSel = Z.sites.some(s => s.Site === siteSel) ? siteSel : (Z.sites[0] && Z.sites[0].Site);
  const zrows = Z.zones.slice().sort((a, b) => b.Score - a.Score);
  $('zoneCount').textContent = `${zrows.length} zones · score out of 10`;
  $('zoneT').innerHTML = '<thead><tr><th>Zone</th><th>Line · stations</th><th>Depth</th><th>Score</th><th>Crossing support</th><th>Target</th><th>Flags</th></tr></thead><tbody>' + zrows.map(z => `<tr><td><b>${esc(z.Zone)}</b></td><td class="num">${esc(z.Line)} · ${z.Station_from}–${z.Station_to}</td><td class="num">${z.Top_m}–${z.Bottom_m} m</td><td style="min-width:120px"><div class="row" style="gap:8px;align-items:center;flex-wrap:nowrap"><div class="bar" style="flex:1"><i style="width:${z.Score * 10}%;background:${z.Score >= 8 ? '#17663f' : z.Score >= 7 ? '#3b8ee8' : '#9fb3b1'}"></i></div><span class="num">${z.Score}</span></div></td><td>${z.Crossings_supporting ? `<span class="pill p-g">${z.Crossings_supporting} line${z.Crossings_supporting > 1 ? 's' : ''}</span>` : '<span class="pill p-n">none</span>'}</td><td>${esc(z.Target_type)}</td><td>${[z.Transformer_affected ? '<span class="pill p-r">transformer</span>' : '', z.At_line_end === 'Yes' ? '<span class="pill p-a">line end</span>' : '', z.Shallow_zone_above === 'Yes' ? '<span class="pill p-b">shallow above</span>' : ''].join(' ')}</td></tr>`).join('') + '</tbody>';
  draw4(); siteEditor();
};
function draw4() {
  const Z = D.interp, I = (Z.interp.interpretations || {})[reading] || {};
  $('reading').querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.v === reading));
  $('readingTxt').innerHTML = `<b>${esc((I.label || '').replace(/^./, c => c.toUpperCase()))}:</b> ${esc(I.meaning || '')}. Permeable classes: ${(I.permeable || []).length ? I.permeable.join(', ') : 'none'}.`;
  $('siteList').innerHTML = Z.sites.map(s => { const z = s.zones[0], r = s.scores[reading] || {perm: 0, lowk: 0};
    const verdict = (I.permeable || []).length === 0 ? (r.lowk > 0 ? `<span class="pill p-r">${Math.round(r.lowk * 100)} % clay/gouge risk</span>` : '<span class="pill p-n">no permeable class</span>') : `<span class="pill ${r.perm >= .5 ? 'p-g' : r.perm >= .2 ? 'p-a' : 'p-n'}">${Math.round(r.perm * 100)} % permeable cells, 100–250 m</span>`;
    return `<button class="sitecard ${s.Site === siteSel ? 'on' : ''}" data-s="${esc(s.Site)}"><div class="lt" style="background:${ROLECOL(s.Role)}">${esc(s.Site)}</div><div style="flex:1;min-width:0"><div class="t">${esc(s.Role)}</div><div class="d">${esc(s.Location_on_grid)} · ${z ? `${z.z}, ${z.t}–${z.b} m` : ''} · score ${s.Best_zone_score}</div><div style="margin-top:6px">${verdict}</div></div></button>`; }).join('');
  $('siteList').onclick = e => { const b = e.target.closest('.sitecard'); if (!b) return; siteSel = b.dataset.s; draw4(); };
  const zs = Z.zones;
  clearBox('map4');
  Plotly.react('map4', [boundaryTrace(), {type: 'scatter', mode: 'markers', x: allLines().flatMap(l => D.geo[l].lon), y: allLines().flatMap(l => D.geo[l].lat), marker: {size: 8, color: 'rgba(0,0,0,0)'}, hoverinfo: 'none', name: 'stations', showlegend: false}, ...transformerTrace(), ...lineTraces(),
    {type: 'scatter', mode: 'markers', x: zs.map(z => z.Centre_lon), y: zs.map(z => z.Centre_lat), text: zs.map(z => z.Zone), customdata: zs.map(z => [z.Score, z.Top_m, z.Bottom_m, z.Line]), marker: {size: zs.map(z => 6 + z.Score * 1.6), color: zs.map(z => z.Score), colorscale: [[0, '#cfe3f2'], [1, '#0b4f9c']], cmin: 5, cmax: 9, line: {color: '#fff', width: 1}, opacity: .85}, name: 'Scored zones', hovertemplate: '<b>%{text}</b> on %{customdata[3]} · score %{customdata[0]}<br>%{customdata[1]}–%{customdata[2]} m<extra></extra>'},
    {type: 'scatter', mode: 'markers+text', x: Z.sites.map(s => s.Lon), y: Z.sites.map(s => s.Lat), text: Z.sites.map(s => s.Site), textfont: {color: '#fff', size: 12, family: FONT.family},
      marker: {size: Z.sites.map(s => s.Site === siteSel ? 30 : 24), color: Z.sites.map(s => ROLECOL(s.Role)), line: {color: Z.sites.map(s => s.Site === siteSel ? '#ffd34d' : '#fff'), width: Z.sites.map(s => s.Site === siteSel ? 4 : 2)}}, name: 'Candidate sites', customdata: Z.sites.map(s => [s.Role, s.Primary_zone]), hovertemplate: '<b>Site %{text}</b> · %{customdata[0]}<br>%{customdata[1]}<extra></extra>'}],
    mapLayout(extentOf(D.setup.views.site)), CFG).then(gd => { if (!gd._aqClick) { gd._aqClick = 1; gd.on('plotly_click', ev => { const p = ev.points[0]; if (!p) return;
      if (typeof addMode !== 'undefined' && addMode) return addSiteAt(p.y, p.x);
      if (p.data.name === 'Candidate sites') { siteSel = p.text; draw4(); } }); } });
  const s = Z.sites.find(x => x.Site === siteSel) || Z.sites[0];
  if (!s) { $('siteDetail').innerHTML = `<h3>${ic('target')}No candidate sites yet</h3><p class="note">Add sites with the editor in <b>Ranked sites</b>: click a high-scoring zone on the map. Then run modelling (M5–M8) from Step 6.</p>`; $('logSvg').innerHTML = ''; $('logSite').textContent = ''; return; }
  const zz = s.zones, win = zz.length ? [Math.min(...zz.map(z => z.t)), Math.max(...zz.map(z => z.b))] : null;
  const drill = /^Priority 1/.test(s.Role) ? 'Drill first as an exploratory borewell' : /^Priority/.test(s.Role) ? 'Drill only if the priority-1 site is dry or weak' : /^Alternate/.test(s.Role) ? 'Keep as an alternate to the priority-1 site' : 'Do not drill (see the basis)';
  const RL = {'I-POS': ['Positive', '#17663f'], 'I-NEU': ['Neutral', '#2f7fe0'], 'I-NEG': ['Negative', '#e0453c']};
  $('siteDetail').innerHTML = `<h3>${ic('target')}Site ${esc(s.Site)} · ${esc(s.Role)}<span class="sp pill p-a">${esc(s.Status)}</span></h3>
   <div class="grid g2e" style="gap:18px"><dl class="kv">
    <dt>Position</dt><dd class="num">${(+s.Lat).toFixed(6)}° N, ${(+s.Lon).toFixed(6)}° E</dd>
    <dt>On the grid</dt><dd>${esc(s.Location_on_grid)} · ADMT point ${esc(s.ADMT_point)}</dd>
    <dt>Primary zone</dt><dd>${esc(s.Primary_zone)}</dd><dt>Supporting</dt><dd>${esc(s.Supporting_zones || 'none')}</dd>
    <dt>To boundary</dt><dd class="num">${s.Distance_to_boundary_m} m</dd><dt>To transformer</dt><dd class="num">${s.Distance_to_transformer_m} m</dd>
    <dt>Target window</dt><dd class="num">${win ? win[0] + '–' + win[1] + ' m nominal' : '–'}</dd></dl>
   <div><div style="font-weight:700;margin-bottom:8px">Under each reading</div>
    ${Object.keys(s.scores).map(k => { const v = s.scores[k], neg = !(((Z.interp.interpretations || {})[k] || {}).permeable || []).length, val = neg ? v.lowk : v.perm, lab = RL[k] || [k, '#555'];
      return `<div style="margin-bottom:10px"><div class="row" style="justify-content:space-between;font-size:12.5px"><span><b style="color:${lab[1]}">${lab[0]}</b> · ${neg ? 'clay/gouge cells' : 'permeable cells'}, 100–250 m</span><span class="num">${Math.round(val * 100)} %</span></div><div class="bar"><i style="width:${val * 100}%;background:${lab[1]}"></i></div></div>`; }).join('')}
    <p class="note">At the nearest station (${esc(s.nearest.line)} st ${s.nearest.station}, ${Math.round(s.nearest.dist)} m away), from the M3 response classes of run ${esc(RUN)}.</p></div></div>
   <div class="ai-card auto" style="margin-top:14px"><div class="orb">${ic('spark')}</div><div><span class="tag">Auto-check · recommendation</span><b>${drill}</b>
    <p>${esc(s.Basis)}. ${win ? `Plan drilling to at least ${Math.max(250, win[1] + 40)} m so the full ${win[0]}–${win[1]} m window is crossed; log every fracture and water strike, record the static level and run a pumping test.` : ''} The positive reading would make this a good site; the negative reading says the low response is clay-filled. Only the borehole decides between them.</p>
    <div class="row" style="gap:8px;margin-top:10px"><button class="chip sm" id="accBtn">Accept as decision</button><button class="chip sm" onclick="askAI('Give me the case for and against drilling Site ${esc(s.Site)} first, under all three readings.',{site:'${esc(s.Site)}'})">Ask AquaTwin AI</button></div></div></div>`;
  $('accBtn').onclick = async e => { const b = e.target; b.disabled = true;
    try { const r = await post('/api/decision', {decision: `Site ${s.Site} (${s.Role}): ${drill}${win ? `; drill to at least ${Math.max(250, win[1] + 40)} m` : ''}`, reason: `Studio Step 4, run ${RUN}: ${s.Basis}`, by: 'Hydrogeologist via NBL-AquaTwin Studio'}); b.textContent = 'Logged as ' + r.id; b.classList.add('on'); }
    catch (er) { b.textContent = 'Could not log: ' + er.message; b.disabled = false; } };
  drawLog(s);
}
function drawLog(s) {
  const G = s.column, Z = D.interp;
  $('logSite').textContent = `Site ${s.Site} · ${s.nearest.line} st ${s.nearest.station}`;
  const maxd = Math.max(...G.depths), H = 560, top = 24, sc = d => top + d / maxd * (H - top - 14), W = 480;
  const dcol = {D1: '#17663f', D2: '#4caf7a', D3: '#3b8ee8', D4: '#d3d9dc', D5: '#e0453c'};
  const prof = (D.setup.profile || []), pc = ['#d9b27c', '#c6a77f', '#8fbfe6', '#a3a8ae', '#7d848b', '#6b7178'];
  const step = G.depths.length > 1 ? G.depths[1] - G.depths[0] : 10;
  let o = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Drilling log forecast">`;
  [[40, 'Expected (G1)'], [140, 'Class'], [196, 'Conf.'], [244, 'Zones'], [356, 'Reported strikes']].forEach(c => o += `<text x="${c[0]}" y="14" font-size="11" font-weight="700" fill="#33504e">${c[1]}</text>`);
  prof.forEach((p, i) => o += `<rect x="40" y="${sc(p[1])}" width="90" height="${sc(Math.min(p[2], maxd)) - sc(p[1])}" fill="${pc[i % pc.length]}"/><text x="85" y="${(sc(p[1]) + sc(Math.min(p[2], maxd))) / 2 + 4}" font-size="10.5" text-anchor="middle" fill="#1d2f2e">${p[2] - p[1] >= 50 ? esc(p[0].split(' ')[0]) : ''}</text>`);
  G.depths.forEach((d, k) => { const c = G.cls[k], dec = G.dec[k];
    o += `<rect x="140" y="${sc(d - step)}" width="46" height="${sc(d) - sc(d - step) + .5}" fill="${dec === 2 || c == null ? '#eceff0' : CLS_COL[c - 1]}"/>`;
    const q = Z.depth_conf.find(r => r.depth_m === d); o += `<rect x="196" y="${sc(d - step)}" width="30" height="${sc(d) - sc(d - step) + .5}" fill="${q ? dcol[q.depth_class] : '#ccc'}"/>`; });
  for (let d = 0; d <= maxd; d += 100) o += `<line x1="34" x2="${W - 10}" y1="${sc(d)}" y2="${sc(d)}" stroke="#c9d6d4" stroke-dasharray="2 3"/><text x="30" y="${sc(d) + 4}" font-size="10.5" text-anchor="end" fill="#5b7270">${d}</text>`;
  const zy = spread(s.zones.map(z => sc(z.t) + 10), 14, 30, H - 4);
  s.zones.forEach((z, i) => { o += `<rect x="${244 + i * 12}" y="${sc(z.t)}" width="9" height="${sc(z.b) - sc(z.t)}" rx="3" fill="${i === 0 ? '#0b4f9c' : '#4f93d6'}"/><text x="${248 + s.zones.length * 12}" y="${zy[i]}" font-size="10.5" fill="#0b2f5c" font-weight="700">${z.z} ${z.t}–${z.b}</text>`; });
  const stk = Z.strikes || [], ky = spread(stk.map(b => sc((b[0] + b[1]) / 2) + 3), 13, 30, H - 4);
  stk.forEach((b, i) => { const m = (b[0] + b[1]) / 2; o += `<line x1="356" x2="366" y1="${sc(m)}" y2="${sc(m)}" stroke="#17663f" stroke-width="2"/><line x1="366" x2="372" y1="${sc(m)}" y2="${ky[i] - 3}" stroke="#17663f" stroke-width=".8"/><text x="375" y="${ky[i]}" font-size="10.5" fill="#17663f" font-weight="600">${esc(b[2]).replace('farm_well', 'Farm well')} ${b[0]}${b[1] !== b[0] ? '–' + b[1] : ''} m</text>`; });
  $('logSvg').innerHTML = o + '</svg><p class="note">Class colours as in Step 3 (blue = low response). Confidence: blue D3, grey D4, red D5 noise row. Green lines mark water strikes reported in the reference borewells, for comparison only.</p>';
}

/* ---------------- STEPS 5-7: classic pages ---------------- */
const CLASSIC = {
  5: {t: 'Assumptions', eye: 'Step 5 · Assumptions', icon: 'layers', d: 'The assumption register and the ADMT readings. Edits save a new version and are logged as decisions; old versions are never overwritten.', tabs: [['Assumption register', 'assumptions'], ['ADMT readings', 'interpretation'], ['Regional evidence', 'evidence']]},
  6: {t: 'Run & scenarios', eye: 'Step 6 · Modelling', icon: 'chart', d: 'Run the engine, then explore storage and connectivity, the MODFLOW scenarios, the 3D depth model and the instant what-if explorer.', tabs: [['Start a calculation', 'run'], ['Storage & connectivity', 'storage'], ['MODFLOW scenarios', 'scenarios'], ['3D depth explorer', 'depth'], ['What-if explorer', 'whatif'], ['Outcomes', 'outcomes']]},
  7: {t: 'Reports & decisions', eye: 'Step 7 · Reports', icon: 'doc', d: 'Overview, figures and reports of the run, and the locked pre-drilling predictions that the first borehole will test.', tabs: [['Overview', ''], ['Figures & reports', 'figures'], ['Locked predictions', 'predictions'], ['AI assistant (full)', 'assistant']]},
};
let classicBase = null;
async function buildClassic(n) {
  const C = CLASSIC[n];
  $('p5eye').textContent = C.eye; $('p5t').textContent = C.t; $('p5d').textContent = C.d;
  $('p5ic').innerHTML = ic(C.icon);
  $('p5tabs').innerHTML = C.tabs.map((t, i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-p="${t[1]}">${t[0]}</button>`).join('');
  $('p5tabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; $('p5tabs').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); showClassic(b.dataset.p); };
  try { if (!classicBase) classicBase = (await api('/api/classic')).url; showClassic(C.tabs[0][1], true); }
  catch (e) { fail('p5frame', e); }
}
function showClassic(page, first) {
  const url = classicBase + '/' + page + '?embed=true&embed_options=light_theme';
  const wait = first ? '<div class="loading" id="clWait">Starting the classic pages (first time takes 10–20 s)…</div>' : '';
  $('p5frame').innerHTML = wait + `<iframe class="classic" src="${url}" title="Classic page" ${first ? 'style="visibility:hidden" onload="setTimeout(()=>{this.style.visibility=\'visible\';var w=document.getElementById(\'clWait\');if(w)w.remove()},400)"' : ''}></iframe>`;
  if (first) setTimeout(() => { const f = $('p5frame').querySelector('iframe'); if (f && f.style.visibility === 'hidden') f.src = url; }, 9000);
}

/* ---------------- AI drawer ---------------- */
let chat = [], aiBusy = false;
const SUGS = {
  0: ['Which reference borewell is the best analogue for this site?', 'What does the over-exploited status mean for a new borewell?'],
  1: ['Which missing item limits the interpretation most?', 'Is any file category worth re-checking before QC?'],
  2: ['Can we trust the depth of the zones?', 'Should any line be re-surveyed before drilling?'],
  3: ['Compare this line with its crossing lines', 'Where does the low response persist across depths?'],
  4: ['Draft a one-paragraph drilling recommendation for the MD', 'What would the first borehole need to show to confirm each reading?'],
  6: ['Does net zero discharge hold for the design storm, and by how much?', 'Explain the storm check table in plain words', 'How long does the reservoir take to empty after the design storm?', 'Which input would change the reservoir size most?', 'Write a short note for the MD on the storm and storage plan'],
};
const stepNo = () => typeof cur === 'number' ? Math.min(cur, 7) : 0;
function drawSugs() { $('sugs').innerHTML = (SUGS[stepNo()] || SUGS[4]).map(q => `<button onclick="askAI(this.textContent)">${esc(q)}</button>`).join(''); }
async function aiStatus() {
  try { const s = await api('/api/ai/status');
    $('aiModel').textContent = s.ok ? `${s.has_key ? 'key ' + (s.key_mask || 'set') : 'no key yet'} · backup: ${(s.fallback || '').split('/').pop()}` : 'AI module not available';
    if (s.ok) { const ms = [...new Set([s.model, ...(s.models || [])])].filter(Boolean);
      $('modelSel').innerHTML = ms.map(m => `<option value="${esc(m)}" ${m === s.model ? 'selected' : ''}>${esc(m)}</option>`).join('');
      $('modelSel').onchange = async () => { try { await post('/api/ai/model', {model: $('modelSel').value}); addMsg('a', `Model set to <b>${esc($('modelSel').value)}</b>.`); } catch (e) { addMsg('a', 'Could not change the model: ' + esc(e.message)); } }; }
    if (s.ok && !s.has_key) $('keyRow').hidden = false;
  } catch (e) { $('aiModel').textContent = 'AI status unknown'; }
}
function toggleKey() { $('keyRow').hidden = !$('keyRow').hidden; if (!$('keyRow').hidden) $('keyIn').focus(); }
async function saveKey() { const k = $('keyIn').value.trim(); if (!k) return;
  try { const r = await post('/api/ai/key', {key: k}); $('keyIn').value = ''; $('keyRow').hidden = true; addMsg('a', `Key saved in ${esc(r.saved_in)}. It is never written into the NBL-AquaTwin folder.`); aiStatus(); }
  catch (e) { addMsg('a', 'The key could not be saved: ' + esc(e.message)); } }
function openAI(key) { $('drawer').classList.add('on'); drawSugs(); aiStatus(); if (!chat.length && !$('chat').children.length) addMsg('a', `Ask about the step you are on. I read this step's tables from run <b>${esc(RUN || '')}</b> and answer from them, and I say so when the data does not hold the answer.`); if (key) $('keyRow').hidden = false; setTimeout(() => $('aiIn').focus(), 250); }
function closeAI() { $('drawer').classList.remove('on'); }
function md(t) {
  const lines = esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').split(/\n/); let o = '', inl = false;
  lines.forEach(l => { const m = l.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)/); if (m) { if (!inl) { o += '<ul>'; inl = true; } o += `<li>${m[1]}</li>`; } else { if (inl) { o += '</ul>'; inl = false; } if (l.trim()) o += `<p>${l}</p>`; } });
  return o + (inl ? '</ul>' : '');
}
function addMsg(role, html) { const d = document.createElement('div'); d.className = 'msg ' + role; d.innerHTML = html; $('chat').appendChild(d); $('chat').scrollTop = 1e6; return d; }
function askAI(q, extra) { openAI(); $('aiIn').value = q; sendAI(extra); }
async function sendAI(extra) {
  const q = $('aiIn').value.trim(); if (!q || aiBusy) return; $('aiIn').value = ''; aiBusy = true; $('aiGo').disabled = true;
  addMsg('u', esc(q));
  const box = addMsg('a', '<span class="note">Thinking…</span>');
  const ctxExtra = Object.assign({step: typeof cur === 'number' ? STEPS[cur].t : 'New site wizard', reading, site_selected: siteSel, line_selected: psLine || qcLine, storm_digest: (stepNo() === 6 && typeof stormDigest === 'function') ? stormDigest() : undefined}, extra || {});
  let text = '';
  try {
    const r = await fetch('/api/ai/ask', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({site: SITE, run: RUN, step: stepNo(), question: q, history: chat, extra: JSON.stringify(ctxExtra)})});
    const rd = r.body.getReader(), dec = new TextDecoder();
    for (;;) { const {done, value} = await rd.read(); if (done) break; text += dec.decode(value, {stream: true}); box.innerHTML = md(text); $('chat').scrollTop = 1e6; }
  } catch (e) { text = text || 'Could not reach the local server: ' + e.message; box.innerHTML = md(text); }
  chat.push({role: 'user', content: q}, {role: 'assistant', content: text});
  const sug = (text.match(/Suggested decision:\s*(.+)/i) || [])[1];
  const acts = document.createElement('div'); acts.className = 'acts';
  acts.innerHTML = `${sug ? '<button class="acc">Accept suggested decision</button>' : ''}<button class="cp">${ic('copy', 12)} Copy</button>`;
  box.appendChild(acts);
  if (!/^No API key/.test(text) && !/^Could not reach/.test(text)) box.insertAdjacentHTML('beforeend', `<div class="meta">AI-generated from run ${esc(RUN)} · check the numbers before use</div>`);
  if (sug) acts.querySelector('.acc').onclick = async ev => { const b = ev.target; b.disabled = true; try { const r2 = await post('/api/decision', {decision: sug, reason: `AI suggestion accepted in Studio step ${cur} (run ${RUN}). Question: ${q}`}); b.textContent = 'Logged as ' + r2.id; } catch (er) { b.textContent = 'Could not log'; b.disabled = false; } };
  acts.querySelector('.cp').onclick = ev => { navigator.clipboard.writeText(text).then(() => ev.target.textContent = 'Copied', () => {}); };
  aiBusy = false; $('aiGo').disabled = false;
}
$('aiIn').addEventListener('keydown', e => { if (e.key === 'Enter') sendAI(); });
$('keyIn').addEventListener('keydown', e => { if (e.key === 'Enter') saveKey(); });

/* ---------------- start ---------------- */
let RUNS = [];
async function loadRuns() {
  const R = (await api('/api/runs', S())).runs; RUNS = R;
  $('runSel').innerHTML = R.map(r => `<option value="${esc(r.id)}">${esc(r.id)}${r.has_data === false ? '  (later modules only, no M0 data)' : ''}</option>`).join('') || '<option value="">no saved run yet</option>';
  let want = null; try { want = localStorage.getItem('aq_run_' + SITE); } catch (e) {}
  const full = R.find(r => r.has_data !== false);   // newest run that holds the M0 data (Steps 2 and 3 need it)
  RUN = R.find(r => r.id === want) ? want : (full ? full.id : (R[0] ? R[0].id : null));
  $('runSel').value = RUN || '';
}
function resetData(keepSetup) { const st = D.setup; D = {}; if (keepSetup) D.setup = st; Object.keys(built).forEach(k => delete built[k]); [0, 1, 2, 3, 4].forEach(k => { if (k !== 1 && k !== 0) status[k] = k === 2 || k === 4 ? 'review' : ''; }); }
async function start() {
  paintIcons(); drawSteps();
  try {
    const sites = (await api('/api/sites')).sites;
    $('siteSel').innerHTML = sites.map(s => `<option>${esc(s)}</option>`).join('') + '<option value="__new">+ New site…</option>';
    let want = null; try { want = localStorage.getItem('aq_site'); } catch (e) {}
    SITE = sites.includes(want) ? want : sites[0];
    $('siteSel').value = SITE;
    await loadRuns();
  } catch (e) { document.querySelector('main').insertAdjacentHTML('afterbegin', `<div class="err">The Studio server did not answer: ${esc(e.message)}</div>`); return; }
  $('siteSel').onchange = async () => { if ($('siteSel').value === '__new') { $('siteSel').value = SITE; return openNewSite(); } EDIT = null; SITE = $('siteSel').value; try { localStorage.setItem('aq_site', SITE); } catch (e) {} resetData(false); classicBase = classicBase; await loadRuns(); go(cur); };
  $('runSel').onchange = () => { RUN = $('runSel').value; try { localStorage.setItem('aq_run_' + SITE, RUN); } catch (e) {} resetData(true); chat = []; go(cur); };
  let s0 = 0; try { const s = localStorage.getItem('aq_step'); if (s === 'new') s0 = 'new'; else if (+s >= 0 && +s <= 7) s0 = +s; } catch (e) {}
  go(s0);
  // integrity status in the background so the sidebar shows it
  api('/api/integrity', S()).then(I => { D.integ = I; const L = I.last_check; status[1] = L ? (!L.changed.length && !L.missing.length && !L.not_in_manifest.length ? 'done' : 'review') : ''; drawSteps(); }).catch(() => {});
}
start();
