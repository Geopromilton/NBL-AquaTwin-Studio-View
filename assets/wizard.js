/* NBL-AquaTwin Studio - New-site wizard, file browser and candidate-site editor (Step 4). */
'use strict';
let W = {step: 1, scan: null, rows: [], geom: {}, boundary: null, bw: []};
const ROLES = ['line', 'continuation', 'repeat', 'borewell check', 'exclude (anomalous record)', 'test / other project (exclude)', 'vendor export (ignore)'];
const DIRS = ['N-S', 'S-N', 'E-W', 'W-E', 'NE-SW', 'SW-NE', 'NW-SE', 'SE-NW'];
function wzSave() { try { localStorage.setItem('aq_wizard', JSON.stringify(Object.assign({}, W, {inputs: wzInputs()}))); } catch (e) {} }
function wzInputs() { const o = {}; document.querySelectorAll('#pnew input').forEach(i => { if (i.id) o[i.id] = i.type === 'checkbox' ? i.checked : i.value; }); return o; }
function wzLoad() { try { const d = JSON.parse(localStorage.getItem('aq_wizard') || 'null'); if (!d) return;
  W = Object.assign(W, d); Object.entries(d.inputs || {}).forEach(([k, v]) => { const i = $(k); if (i) { if (i.type === 'checkbox') i.checked = v; else i.value = v; } }); } catch (e) {} }

function wzGo(n) {
  if (n > 1 && !$('w_name').value.trim()) { $('w_name').focus(); $('w_name').style.borderColor = '#e0453c'; return; }
  W.step = n;
  document.querySelectorAll('#pnew .wz').forEach(c => c.classList.toggle('on', +c.dataset.w === n));
  const lab = ['Site', 'Instrument data', 'Lines & boundary', 'Borewells & noise', 'Review & create', 'First run'];
  const done = k => k === 1 ? !!$('w_name').value.trim() : k === 2 ? !!W.scan : k === 3 ? (wzLines().length && wzLines().every(l => W.geom[l.name]) && !!W.boundary) : k === 4 ? true : k === 5 ? !!W.created : !!W.ran;
  $('wzSteps').innerHTML = lab.map((t, i) => `<button class="${i + 1 === n ? 'on' : ''} ${done(i + 1) && i + 1 !== n ? 'ok' : ''}" onclick="wzGo(${i + 1})"><i>${done(i + 1) && i + 1 !== n ? '✓' : i + 1}</i>${t}</button>`).join('');
  if (n === 3) { wzLinesTable(); wzDrawMap(); }
  if (n === 4) wzBwTable();
  if (n === 5) wzReview();
  wzSave(); paintIcons($('pnew')); $('main').scrollTop = 0;
}
function openNewSite() {
  cur = 'new';
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('on', p.id === 'pnew'));
  document.querySelectorAll('.step,.tab').forEach(b => b.classList.remove('on'));
  if (!W._loaded) { wzLoad(); W._loaded = 1; if (W.scan) wzScanTable(); }
  wzGo(W.step && W.step < 6 ? W.step : 1);
}

/* ---------- file browser ---------- */
let fsTarget = null, fsMode = 'dir', fsParent = '', fsSel = null;
function browse(target, mode) { fsTarget = target; fsMode = mode; fsSel = null; $('fsTitle').textContent = mode === 'dir' ? 'Choose a folder' : 'Choose a file';
  $('fsUse').textContent = mode === 'dir' ? 'Use this folder' : 'Use this file'; $('fsModal').hidden = false;
  const v = $(target).value.trim(); fsLoad(v ? (mode === 'file' ? v.replace(/[\\/][^\\/]*$/, '') : v) : (W.scan ? W.scan.folder : '')); }
async function fsLoad(path) {
  try { const r = await api('/api/fs', {path: path || ''}); fsParent = r.parent || ''; $('fsPath').value = r.path;
    $('fsHint').textContent = fsMode === 'dir' ? 'Open the folder, then press "Use this folder".' : 'Click a file, then press "Use this file".';
    $('fsList').innerHTML = r.dirs.map(d => `<button data-d="${esc(d)}">${ic('db', 15)}<span>${esc(d)}</span></button>`).join('') +
      (fsMode === 'file' ? r.files.map(f => `<button class="f" data-f="${esc(f)}">${ic('doc', 15)}<span>${esc(f)}</span></button>`).join('') : `<div class="note" style="padding:8px">${r.files.length} file(s) in this folder</div>`);
    $('fsList').onclick = e => { const b = e.target.closest('button'); if (!b) return;
      const sep = r.path.includes('\\') || /^[A-Z]:/.test(r.path) ? '\\' : '/';
      const join = n => r.path ? (r.path.endsWith(sep) ? r.path + n : r.path + sep + n) : n;
      if (b.dataset.d) fsLoad(join(b.dataset.d)); else { $('fsList').querySelectorAll('button').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); fsSel = join(b.dataset.f); } };
  } catch (e) { $('fsList').innerHTML = `<div class="err">${esc(e.message)}</div>`; }
}
function fsChoose() { const v = fsMode === 'dir' ? $('fsPath').value : fsSel; if (!v) return; $(fsTarget).value = v; $('fsModal').hidden = true; wzSave(); }

/* ---------- 2. scan ---------- */
async function wzScan() {
  const f = $('w_folder').value.trim(); if (!f) return;
  $('w_scanOut').innerHTML = '<div class="loading">Reading every .dat record…</div>';
  try { W.scan = await post('/api/newsite/scan', {folder: f}); }
  catch (e) { $('w_scanOut').innerHTML = `<div class="err">${esc(e.message)}</div>`; return; }
  W.rows = W.scan.files.map(r => ({...r, dir: (r.line.match(/\s([NSEW]{1,2}-[NSEW]{1,2})$/) || [])[1] || '', line: r.role === 'borewell check' ? r.line.replace(/\s[NSEW]{1,2}-[NSEW]{1,2}$/, '') : r.line}));
  if (W.scan.stakeout_candidates.length && !$('w_stake').value) $('w_stake').value = W.scan.folder + (W.scan.folder.includes('\\') ? '\\' : '/') + W.scan.stakeout_candidates[0];
  wzScanTable(); wzSave();
}
function wzScanTable() {
  const S = W.scan, R = W.rows;
  const nl = new Set(R.filter(r => r.role === 'line').map(r => r.line)).size;
  const warn = [];
  R.forEach(r => { if (r.role === 'borewell check' && /\?/.test(r.line)) warn.push(`<b>${esc(r.file)}</b>: no well number in the name; type the well ID (e.g. BW-3).`);
    if (r.role === 'borewell check' && !r.dir) warn.push(`<b>${esc(r.file)}</b>: choose the direction the check was walked.`);
    if (r.role === 'continuation' && !R.some(x => x.role === 'line' && x.line === r.line)) warn.push(`<b>${esc(r.file)}</b>: continuation of ${esc(r.line)}, but no main record for ${esc(r.line)}.`); });
  const perWell = {}; R.filter(r => r.role === 'borewell check').forEach(r => { perWell[r.line] = (perWell[r.line] || 0) + 1; });
  Object.entries(perWell).filter(([, v]) => v !== 2).forEach(([k, v]) => warn.push(`Well <b>${esc(k)}</b> has ${v} check record(s). The two-direction test needs exactly 2 (for example N-S and E-W) — check the well IDs.`));
  const dup = {}; R.filter(r => r.role === 'line').forEach(r => { dup[r.line] = (dup[r.line] || 0) + 1; });
  Object.entries(dup).filter(([, v]) => v > 1).forEach(([k, v]) => warn.push(`Line <b>${esc(k)}</b> has ${v} records marked "line"; they are joined in time order (as for N7). Mark extra ones "repeat" if they re-measure the same stations.`));
  $('w_scanOut').innerHTML = `<div class="grid g4" style="margin:14px 0">
      ${kpi('k-blue', 'db', 'Records', R.length, `${S.ignored.length} vendor exports ignored`)}${kpi('k-green', 'section', 'Survey lines', nl, `${R.filter(r => r.role === 'repeat').length} repeats · ${R.filter(r => r.role === 'borewell check').length} borewell checks`)}
      ${kpi('k-amber', 'layers', 'Depth levels', S.depth_levels ? `${S.depth_levels.first}–${S.depth_levels.last} m` : '–', S.depth_levels ? `every ${S.depth_levels.step} m · ${S.channels || '?'} channels` : '')}${kpi('k-blue', 'cal', 'Survey days', S.dates.length, S.dates.length ? `${S.dates[0]} to ${S.dates[S.dates.length - 1]}` : '')}</div>
    <div class="tw" style="max-height:420px;overflow:auto"><table><thead><tr><th>File</th><th>Rec.</th><th>Stations</th><th>Recorded</th><th style="width:190px">What it is</th><th style="width:110px">Line / well</th><th style="width:96px">Walked</th></tr></thead><tbody>
    ${R.map((r, i) => `<tr><td>${esc(r.file)}</td><td class="num">${r.record ?? ''}</td><td class="num">${r.stations ?? ''}</td><td class="num">${esc((r.time_first || '').slice(0, 16))}</td>
      <td><select data-r="${i}" data-k="role">${ROLES.map(o => `<option ${o === r.role ? 'selected' : ''}>${o}</option>`).join('')}</select></td>
      <td><input data-r="${i}" data-k="line" value="${esc(r.line)}"></td>
      <td>${r.role === 'borewell check' ? `<select data-r="${i}" data-k="dir"><option></option>${DIRS.map(o => `<option ${o === r.dir ? 'selected' : ''}>${o}</option>`).join('')}</select>` : ''}</td></tr>`).join('')}</tbody></table></div>
    ${warn.length ? `<div class="warnbox"><b>Check before you continue</b><ul style="margin:6px 0 0;padding-left:18px">${warn.map(w => `<li>${w}</li>`).join('')}</ul></div>` : '<div class="okbox">Every record has a role. Check the line names once more.</div>'}`;
  $('w_scanOut').querySelectorAll('select,input').forEach(el => el.onchange = () => { W.rows[+el.dataset.r][el.dataset.k] = el.value; if (el.dataset.k === 'role') wzScanTable(); else wzSave(); });
  paintIcons($('w_scanOut'));
}
function wzLines() {   // lines from the scan: records in time order, cumulative station offsets
  const g = {};
  W.rows.filter(r => r.role === 'line' || r.role === 'continuation').sort((a, b) => (a.role === 'continuation') - (b.role === 'continuation') || String(a.time_first).localeCompare(String(b.time_first)))
    .forEach(r => { const L = g[r.line] = g[r.line] || {name: r.line, records: [], n: 0, date: r.time_first};
      L.records.push({file: r.file, record: r.record, offset: L.n, n_stations: r.stations}); L.n += r.stations || 0; });
  return Object.values(g).sort((a, b) => a.name.localeCompare(b.name, 'en', {numeric: true}));
}

/* ---------- 3. geometry ---------- */
async function wzStake() {
  try { const r = await post('/api/newsite/stakeout', {path: $('w_stake').value.trim()});
    r.lines.forEach(L => { const pl = (L.planned || '').toLowerCase(); const walked = /north to south/.test(pl) ? 'N-S' : /south to north/.test(pl) ? 'S-N' : /west to east/.test(pl) ? 'W-E' : /east to west/.test(pl) ? 'E-W' : '';
      W.geom[L.line] = Object.assign(W.geom[L.line] || {}, {start: L.start, end: L.end, walked: (W.geom[L.line] || {}).walked || walked}); });
    wzLinesTable(); wzDrawMap(); wzSave();
  } catch (e) { $('w_lines').innerHTML = `<tr><td><div class="err">${esc(e.message)}</div></td></tr>`; }
}
async function wzBoundary() {
  try { W.boundary = (await post('/api/newsite/boundary', {path: $('w_bnd').value.trim()})).points; wzDrawMap(); wzSave(); wzGo(3); }
  catch (e) { Plotly.purge('w_map'); $('w_map').innerHTML = `<div class="err">${esc(e.message)}</div>`; }
}
function rainFor(date) { const rd = $('w_rain').value; if (!rd || !date) return 'post'; return String(date).slice(0, 10) <= rd ? 'pre' : 'post'; }
function wzLinesTable() {
  const Ls = wzLines();
  if (!Ls.length) { $('w_lines').innerHTML = '<tr><td class="note">Scan the instrument folder first (step 2).</td></tr>'; return; }
  $('w_lines').innerHTML = `<thead><tr><th>Line</th><th>Stations</th><th>Start lat</th><th>Start lon</th><th>End lat</th><th>End lon</th><th>Walked</th><th>Rain</th></tr></thead><tbody>${Ls.map(L => {
    const g = W.geom[L.name] = W.geom[L.name] || {}; if (!g.rain) g.rain = rainFor(L.date);
    const inp = (k, i) => `<input data-l="${esc(L.name)}" data-k="${k}" data-j="${i}" value="${g[k] ? g[k][i] : ''}" style="width:96px">`;
    return `<tr style="${g.start && g.end ? '' : 'background:#fff6e4'}"><td><b>${esc(L.name)}</b></td><td class="num">${L.n}</td><td>${inp('start', 0)}</td><td>${inp('start', 1)}</td><td>${inp('end', 0)}</td><td>${inp('end', 1)}</td>
      <td><select data-l="${esc(L.name)}" data-k="walked"><option></option>${DIRS.map(o => `<option ${o === g.walked ? 'selected' : ''}>${o}</option>`).join('')}</select></td>
      <td><select data-l="${esc(L.name)}" data-k="rain">${['pre', 'post'].map(o => `<option ${o === g.rain ? 'selected' : ''}>${o}</option>`).join('')}</select></td></tr>`; }).join('')}</tbody>`;
  $('w_lines').querySelectorAll('input,select').forEach(el => el.onchange = () => { const g = W.geom[el.dataset.l];
    if (el.dataset.j !== undefined) { g[el.dataset.k] = g[el.dataset.k] || [null, null]; g[el.dataset.k][+el.dataset.j] = parseFloat(el.value); } else g[el.dataset.k] = el.value;
    wzDrawMap(); wzSave(); });
}
function wzStations(L, g, spacing) {   // same rule as newsite.py: station 1 at the walked-from end
  const lat0 = g.start[0], mlon = 111320 * Math.cos(lat0 * Math.PI / 180), mlat = 110574;
  let a = [g.start[1] * mlon, g.start[0] * mlat], b = [g.end[1] * mlon, g.end[0] * mlat];
  let u = [b[0] - a[0], b[1] - a[1]]; const len = Math.hypot(u[0], u[1]); u = [u[0] / len, u[1] / len];
  const m = (g.walked || '').match(/^([NSEW]{1,2})-([NSEW]{1,2})$/);
  if (m) { const V = s => [(s.includes('E') ? 1 : 0) - (s.includes('W') ? 1 : 0), (s.includes('N') ? 1 : 0) - (s.includes('S') ? 1 : 0)];
    const p = V(m[1]), q = V(m[2]), w = [q[0] - p[0], q[1] - p[1]]; if (u[0] * w[0] + u[1] * w[1] < 0) { const t = a; a = b; b = t; u = [-u[0], -u[1]]; } }
  const s1 = spacing, sn = spacing * L.n;
  return {first: [(a[1] + u[1] * s1) / mlat, (a[0] + u[0] * s1) / mlon], last: [(a[1] + u[1] * sn) / mlat, (a[0] + u[0] * sn) / mlon], beyond: sn > len + spacing ? Math.round(sn - len) : 0};
}
function wzDrawMap() {
  if (!$('w_map')) return;
  const tr = [], sp = +$('w_spacing').value || 2.5;
  if (W.boundary) tr.push({type: 'scatter', mode: 'lines', x: [...W.boundary.map(p => p[1]), W.boundary[0][1]], y: [...W.boundary.map(p => p[0]), W.boundary[0][0]], fill: 'toself', fillcolor: 'rgba(31,138,84,.1)', line: {color: '#17663f', width: 2.4}, name: 'Boundary', hoverinfo: 'skip'});
  wzLines().forEach(L => { const g = W.geom[L.name]; if (!g || !g.start || !g.end || g.start.some(isNaN) || g.end.some(isNaN)) return;
    const s = wzStations(L, g, sp);
    tr.push({type: 'scatter', mode: 'lines', x: [s.first[1], s.last[1]], y: [s.first[0], s.last[0]], line: {color: s.beyond ? '#e0a02a' : '#0f6f73', width: 2.4}, name: L.name, hovertemplate: `${L.name}: ${L.n} stations${s.beyond ? ` · runs ${s.beyond} m past the planned end` : ''}<extra></extra>`, showlegend: false});
    tr.push({type: 'scatter', mode: 'markers+text', x: [s.first[1], s.last[1]], y: [s.first[0], s.last[0]], text: [L.name, ''], textposition: 'top center', textfont: {size: 10}, marker: {symbol: ['circle', 'triangle-up'], size: [8, 8], color: '#0f6f73'}, showlegend: false, hoverinfo: 'skip'}); });
  W.bw.forEach(b => { if (b.lat && b.lon) tr.push({type: 'scatter', mode: 'markers+text', x: [+b.lon], y: [+b.lat], text: [b.id], textposition: 'top center', marker: {size: 11, color: '#2f7fe0', line: {color: '#fff', width: 2}}, showlegend: false, hoverinfo: 'skip'}); });
  if ($('w_tr_on').checked && $('w_tr_lat').value) { const la = +$('w_tr_lat').value, lo = +$('w_tr_lon').value, r = +$('w_tr_r').value || 120, c = [];
    for (let i = 0; i <= 60; i++) { const t = i / 60 * 2 * Math.PI; c.push([lo + r * Math.cos(t) / (111320 * Math.cos(la * Math.PI / 180)), la + r * Math.sin(t) / 110574]); }
    tr.push({type: 'scatter', mode: 'lines', x: c.map(p => p[0]), y: c.map(p => p[1]), line: {color: '#e0453c', dash: 'dash'}, showlegend: false, hoverinfo: 'skip'}); }
  if (!tr.length) { Plotly.purge('w_map'); $('w_map').innerHTML = '<div class="note" style="padding:20px">Load the boundary and the line positions to see them here.</div>'; return; }
  clearBox('w_map');
  const lat = (tr[0].y.find(v => v != null)) || 0;
  Plotly.react('w_map', tr, base({margin: {l: 8, r: 8, t: 8, b: 8}, xaxis: {visible: false}, yaxis: {visible: false, scaleanchor: 'x', scaleratio: 1 / Math.cos(lat * Math.PI / 180)}, plot_bgcolor: '#f3f7f4', dragmode: 'pan'}), {displayModeBar: false, responsive: true});
}

/* ---------- 4. borewells ---------- */
function wzAddBw() { W.bw.push({id: `BW-${W.bw.length + 1}`, lat: '', lon: '', elev: '', depth: '', status: '', strikes: ''}); wzBwTable(); }
function wzBwTable() {
  const ids = [...new Set(W.rows.filter(r => r.role === 'borewell check').map(r => r.line))];
  ids.forEach(id => { if (!W.bw.some(b => b.id === id)) W.bw.push({id, lat: '', lon: '', elev: '', depth: '', status: '', strikes: ''}); });
  const recs = id => W.rows.filter(r => r.role === 'borewell check' && r.line === id).map(r => `${r.file}${r.dir ? ' (' + r.dir + ')' : ''}`).join('<br>') || '<span class="note">none</span>';
  const f = (i, k, w) => `<input data-b="${i}" data-k="${k}" value="${esc(W.bw[i][k] ?? '')}" style="width:${w}px">`;
  $('w_bw').innerHTML = `<thead><tr><th>Well</th><th>Latitude</th><th>Longitude</th><th>Ground m</th><th>Depth m</th><th>Status</th><th>Water strikes (m)</th><th>Check records</th><th></th></tr></thead><tbody>${W.bw.map((b, i) => `<tr>
    <td>${f(i, 'id', 70)}</td><td>${f(i, 'lat', 100)}</td><td>${f(i, 'lon', 100)}</td><td>${f(i, 'elev', 64)}</td><td>${f(i, 'depth', 64)}</td><td>${f(i, 'status', 110)}</td><td>${f(i, 'strikes', 120)}</td><td style="font-size:12px">${recs(b.id)}</td>
    <td><button class="chip sm" onclick="W.bw.splice(${i},1);wzBwTable()">Remove</button></td></tr>`).join('')}</tbody>`;
  $('w_bw').querySelectorAll('input').forEach(el => el.onchange = () => { W.bw[+el.dataset.b][el.dataset.k] = el.value; wzSave(); });
}
const parseStrikes = s => String(s || '').split(/[,;]/).map(t => t.trim()).filter(Boolean).map(t => { const m = t.match(/(\d+(?:\.\d+)?)\s*(?:[-–to]+\s*(\d+(?:\.\d+)?))?/); return m ? [+m[1], +(m[2] || m[1])] : null; }).filter(Boolean);

/* ---------- 5. review ---------- */
function wzSpec() {
  const sp = +$('w_spacing').value || 2.5;
  const lines = wzLines().map(L => { const g = W.geom[L.name] || {}; return {name: L.name, records: L.records, n_stations: L.n, walked: g.walked || '', rain: g.rain || 'post', start: g.start, end: g.end}; });
  const facts = {}; if ($('w_geo').value) facts['Geology'] = $('w_geo').value; if ($('w_gw').value) facts['Groundwater setting'] = $('w_gw').value;
  return {site: {name: $('w_name').value.trim(), code: $('w_code').value.trim(), location: $('w_loc').value.trim(), prepared_by: $('w_by').value.trim()},
    source_folder: W.scan ? W.scan.folder : '', extra_files: [$('w_stake').value.trim(), $('w_bnd').value.trim()].filter(p => p && W.scan && !p.startsWith(W.scan.folder)),
    boundary: W.boundary, boundary_file: $('w_bnd').value.trim(), spacing: sp, depth_levels: W.scan ? W.scan.depth_levels : null, channels: W.scan ? W.scan.channels : null,
    instrument: 'ADMT-600ZN-12D', lines,
    repeats: W.rows.filter(r => r.role === 'repeat').map(r => ({line: r.line, file: r.file, rain: rainFor(r.time_first)})),
    borewells: W.bw.filter(b => b.lat && b.lon).map(b => ({id: b.id, lat: +b.lat, lon: +b.lon, elev: b.elev ? +b.elev : null, depth: b.depth ? +b.depth : null, status: b.status, strikes: parseStrikes(b.strikes),
      records: W.rows.filter(r => r.role === 'borewell check' && r.line === b.id).map(r => ({file: r.file, direction: r.dir, n_stations: r.stations}))})),
    reported_wells: W.bw.filter(b => !(b.lat && b.lon) && b.strikes).map(b => ({id: b.id, strikes: parseStrikes(b.strikes), depth: b.depth ? +b.depth : null})),
    transformer: $('w_tr_on').checked && $('w_tr_lat').value ? {lat: +$('w_tr_lat').value, lon: +$('w_tr_lon').value, radius: +$('w_tr_r').value || 120} : null,
    rain_date: $('w_rain').value || null, facts};
}
async function wzReview() {
  const sp = wzSpec(), chk = [];
  const ok = (c, t, fix) => chk.push(`<li style="color:${c ? '#155e36' : '#8a1f19'}">${c ? '✓' : '✗'} ${t}${!c && fix ? ` — <a href="#" onclick="wzGo(${fix});return false">fix</a>` : ''}</li>`);
  ok(!!sp.site.name, `Site name: <b>${esc(sp.site.name || '–')}</b>`, 1);
  ok(!!W.scan, `Instrument folder scanned: ${W.scan ? esc(W.scan.folder) : '–'}`, 2);
  ok(sp.lines.length > 0, `${sp.lines.length} survey lines, ${sp.lines.reduce((a, l) => a + l.n_stations, 0)} stations`, 2);
  const nogeo = sp.lines.filter(l => !l.start || !l.end || l.start.some(v => v == null || isNaN(v)) || l.end.some(v => v == null || isNaN(v)));
  ok(!nogeo.length, nogeo.length ? `No start/end point for ${nogeo.map(l => l.name).join(', ')}` : 'Every line has a start and end point', 3);
  const nowalk = sp.lines.filter(l => !l.walked); ok(!nowalk.length, nowalk.length ? `Walking direction missing for ${nowalk.map(l => l.name).join(', ')}` : 'Every line has a walking direction', 3);
  ok(!!(sp.boundary && sp.boundary.length >= 3), sp.boundary ? `Lease boundary: ${sp.boundary.length} vertices` : 'No lease boundary', 3);
  ok(true, `${sp.repeats.length} repeat record(s); ${sp.borewells.length} borewell(s) with position; ${sp.borewells.reduce((a, b) => a + b.records.length, 0)} borewell-check record(s)`);
  const qbw = W.rows.filter(r => r.role === 'borewell check' && (/\?/.test(r.line) || !r.dir)); ok(!qbw.length, qbw.length ? `${qbw.length} borewell-check record(s) without a well ID or direction` : 'Borewell checks linked', 2);
  ok(true, sp.transformer ? `Transformer zone: ${sp.transformer.radius} m radius` : 'No transformer recorded (nothing excluded for noise)');
  let plan = null; try { if (sp.site.name && W.scan) plan = await post('/api/newsite/plan', {spec: sp}); } catch (e) {}
  if (plan && plan.exists) ok(false, `A site called ${esc(plan.site)} already exists — choose another name`, 1);
  const blocked = chk.some(c => c.includes('✗'));
  $('w_review').innerHTML = `<ul style="list-style:none;padding:0;margin:0 0 12px;line-height:1.9">${chk.join('')}</ul>
    ${plan ? `<div class="okbox">Will create <code>sites\\${esc(plan.site)}</code>, copy <b>${plan.copy_files}</b> files (${plan.copy_mb} MB) read-only with fingerprints, compute station coordinates and crossings, and write <code>site_config.yaml</code>. Method settings (QC, classes, 3D, MODFLOW) start from the Siddanahalli template and are marked for review.</div>` : ''}`;
  $('w_create').disabled = blocked;
}
async function wzCreate() {
  const b = $('w_create'); b.disabled = true; b.lastChild.textContent = 'Creating…';
  try { W.created = await post('/api/newsite/create', {spec: wzSpec()}); wzSave(); wzGo(6);
    $('w_created').innerHTML = `<div class="okbox"><b>Site ${esc(W.created.site)} created.</b> ${W.created.files_copied} files copied read-only (${W.created.checksum_mismatches} fingerprint mismatches) · ${W.created.stations} stations · ${W.created.crossings} line crossings · ${W.created.borewell_stations} borewell-check stations · ${W.created.area_ha} ha · UTM ${esc(W.created.utm_zone)}.${W.created.beyond_end ? ` <br>${W.created.beyond_end} stations lie beyond the planned line ends; check the walking directions and line lengths.` : ''}</div>`;
    const sites = (await api('/api/sites')).sites; $('siteSel').innerHTML = sites.map(s => `<option>${esc(s)}</option>`).join('') + '<option value="__new">+ New site…</option>'; $('siteSel').value = SITE;
  } catch (e) { $('w_review').insertAdjacentHTML('beforeend', `<div class="err" style="margin-top:10px">${esc(e.message)}</div>`); }
  b.disabled = false; b.lastChild.textContent = 'Create the site';
}
let wzPoll = null;
async function wzRun(site, modules) {
  site = site || (W.created && W.created.site); if (!site) return;
  modules = modules || ['M0', 'M1', 'M2', 'M3', 'M4'];
  $('w_runbtn').disabled = true;
  try { await post('/api/run/start', {site, modules}); } catch (e) { $('w_job').innerHTML = `<div class="err">${esc(e.message)}</div>`; $('w_runbtn').disabled = false; return; }
  clearInterval(wzPoll); wzPoll = setInterval(() => jobView(site, modules, 'w_job', () => { W.ran = true; $('w_open').hidden = false; $('w_runbtn').disabled = false; wzSave(); }), 2500);
}
async function jobView(site, modules, el, onDone) {
  let J; try { J = (await api('/api/jobs', {site})).jobs[0]; } catch (e) { return; }
  if (!J) return;
  const done = J.finished_modules || [];
  $(el).innerHTML = `<div class="mods">${modules.map(m => `<span class="pill ${done.includes(m) ? 'p-g' : J.running && done.length === modules.indexOf(m) ? 'p-b' : 'p-n'}">${m}${done.includes(m) ? ' ✓' : J.running && done.length === modules.indexOf(m) ? ' …' : ''}</span>`).join('')}
    <span class="note" style="margin-left:8px">${J.running ? 'running' : J.failed ? 'stopped with an error' : 'finished'}${J.run_folder ? ' · run ' + esc(J.run_folder) : ''}</span></div><div class="logbox">${esc(J.tail.join('\n'))}</div>`;
  const lb = $(el).querySelector('.logbox'); if (lb) lb.scrollTop = 1e6;
  if (!J.running) { clearInterval(wzPoll); if (onDone) onDone(J); }
}
async function wzOpen() {
  const s = W.created.site; SITE = s; try { localStorage.setItem('aq_site', s); } catch (e) {}
  $('siteSel').value = s; resetData(false); await loadRuns(); W = {step: 1, scan: null, rows: [], geom: {}, boundary: null, bw: []}; try { localStorage.removeItem('aq_wizard'); } catch (e) {}
  go(0);
}

/* ---------- Step 4: candidate-site editor (sites made with the wizard) ---------- */
let EDIT = null, addMode = false;
const ROLE_OPTS = ['Priority 1', 'Priority 2', 'Priority 3 (reserve)', 'Alternate to A', 'Zone noted, not for drilling'];
function siteEditor() {
  const Z = D.interp, box = $('siteEdit'); if (!box) return;
  if (!Z.sites_editable) { box.innerHTML = `<p class="note">Candidate sites for this site come from the frozen prior interpretation and are read-only here.</p>`; return; }
  EDIT = EDIT || Z.sites.map(s => ({Site: s.Site, Role: s.Role, Lat: s.Lat, Lon: s.Lon, Location_on_grid: s.Location_on_grid, Basis: s.Basis, zone: Z.zones.find(z => s.Primary_zone && s.Primary_zone.startsWith(z.Zone)) || null}));
  box.innerHTML = `<div class="row" style="gap:8px;align-items:center;margin-bottom:8px"><button class="chip sm ${addMode ? 'on' : ''}" onclick="addMode=!addMode;siteEditor()">${addMode ? 'Click a station or zone on the map…' : '+ Add a site from the map'}</button>
      <button class="btn pri" style="padding:8px 14px;margin-left:auto" onclick="saveSites()" ${EDIT.length ? '' : 'disabled'}>Save candidate sites</button></div>
    ${EDIT.length ? `<div class="grid" style="gap:8px">${EDIT.map((e, i) => `<div class="editrow">
      <input data-e="${i}" data-k="Site" value="${esc(e.Site)}" aria-label="Site letter" style="width:46px;text-align:center;font-weight:800">
      <select data-e="${i}" data-k="Role" aria-label="Role">${ROLE_OPTS.map(o => `<option ${o === e.Role ? 'selected' : ''}>${o}</option>`).join('')}</select>
      <span class="note num">${esc(e.Location_on_grid)}${e.zone ? ` · ${e.zone.Zone} ${e.zone.Top_m}–${e.zone.Bottom_m} m · ${e.zone.Score}/10` : ''}</span>
      <button class="chip sm" onclick="EDIT.splice(${i},1);siteEditor()">Remove</button>
      <input data-e="${i}" data-k="Basis" value="${esc(e.Basis || '')}" placeholder="Why this site (basis)" aria-label="Basis" style="grid-column:1/-1">
    </div>`).join('')}</div>` :
      `<p class="note">No candidate sites yet. Press <b>+ Add a site from the map</b>, then click a zone or a station. Start with the highest-scoring zones that are clear of the boundary and the transformer, and supported by a crossing line.</p>`}
    <p class="note" id="saveMsg"></p>`;
  box.querySelectorAll('input,select').forEach(el => el.onchange = () => { EDIT[+el.dataset.e][el.dataset.k] = el.value; });
}
function addSiteAt(lat, lon) {
  let best = null; allLines().forEach(l => { const G = D.geo[l]; G.lat.forEach((a, i) => { const d = dist(a, G.lon[i], lat, lon); if (!best || d < best.d) best = {l, i, d, st: G.st[i], lat: a, lon: G.lon[i]}; }); });
  if (!best) return;
  const z = D.interp.zones.find(z => z.Line === best.l && best.st >= z.Station_from - 1 && best.st <= z.Station_to + 1) || null;
  const used = new Set(EDIT.map(e => e.Site)); let c = 65; while (used.has(String.fromCharCode(c))) c++;
  EDIT.push({Site: String.fromCharCode(c), Role: ROLE_OPTS[Math.min(EDIT.length, 2)], Lat: best.lat, Lon: best.lon, Location_on_grid: `${best.l} st ${best.st}`, Basis: z ? `${z.Zone} score ${z.Score}, ${z.Top_m}-${z.Bottom_m} m, ${z.Crossings_supporting} crossing line(s) support` : '', zone: z});
  addMode = false; siteEditor();
}
async function saveSites() {
  try { const r = await post('/api/sites/save', {site: SITE, sites: EDIT}); $('saveMsg').textContent = `Saved ${r.sites} site(s) to ${r.saved}; logged as ${r.decision}.`;
    D.interp = null; EDIT = null; await needInterp(); draw4(); siteEditor(); }
  catch (e) { $('saveMsg').textContent = 'Could not save: ' + e.message; }
}
async function approveReadings() {
  try { const r = await post('/api/interp/approve', {site: SITE, run: RUN}); D.interp = null; await needInterp(); BUILD[4](); alertNote(`Readings approved (${r.file}); logged as ${r.decision}.`); }
  catch (e) { alertNote('Could not approve: ' + e.message); }
}
function alertNote(t) { const n = $('approveMsg'); if (n) n.textContent = t; }
