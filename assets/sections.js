/* NBL-AquaTwin Studio - pseudo-sections and depth slices in the hydrogeologist's figure style
   (3-panel section: raw / depth-shape anomaly / lateral index; gridded depth-slice maps on the local grid). */
'use strict';

/* ---------- one palette everywhere: purple-blue = low response (more conductive) ... red = high ---------- */
const AQ = [[0, '#6b0f4f'], [0.07, '#3b1a8f'], [0.16, '#2233c4'], [0.27, '#2a6fe0'], [0.38, '#2fa9e0'], [0.48, '#3fc4b8'],
  [0.56, '#7fd17a'], [0.64, '#c3dc4a'], [0.72, '#f6e13a'], [0.82, '#f9ae2a'], [0.91, '#f0602a'], [1, '#d7191c']];
DIV.length = 0; AQ.forEach(s => DIV.push(s));                                    // used by Step 4 maps
['#3b1a8f', '#2a6fe0', '#3fc4b8', '#c3dc4a', '#f6e13a', '#f9ae2a', '#e5391f'].forEach((c, i) => { CLS_COL[i] = c; });   // C1 (low) .. C7 (high)
const AQGRAD = 'linear-gradient(90deg,' + AQ.map(s => `${s[1]} ${Math.round(s[0] * 100)}%`).join(',') + ')';
const ZTHR = -1.28;                                                               // conductive threshold, z (10 % tail)

psVar = 'sec';
let LG = null;                                                                    // local grid geometry for the run
async function needLocal() { if (!LG || LG._run !== RUN || LG._site !== SITE) { LG = await api('/api/local', SR()); LG._run = RUN; LG._site = SITE; } return LG; }
const _reset1 = resetData; resetData = function (k) { _reset1(k); LG = null; };

function hatch(x0, x1, y0, y1, n, xref, yref) {          // diagonal hatch lines clipped to a rectangle (one scatter trace)
  const X = [], Y = [], w = x1 - x0, span = w * 0.35;
  for (let k = 0; k <= n; k++) {
    const u = x0 - span + (w + span) * k / n;                 // line from (u, y1) to (u + span, y0)
    const a = Math.max(x0, u), b = Math.min(x1, u + span); if (b <= a) continue;
    const yAt = x => y1 + (y0 - y1) * (x - u) / span;
    X.push(a, b, null); Y.push(yAt(a), yAt(b), null);
  }
  return {type: 'scatter', mode: 'lines', x: X, y: Y, xaxis: xref, yaxis: yref, line: {color: 'rgba(60,60,60,.55)', width: 1}, hoverinfo: 'skip', showlegend: false};
}

/* ================= 3-panel section ================= */
async function drawSection(L) {
  const G = await needLocal();
  const isN = psLine[0] === 'N', g = G.lines[psLine];
  const pos = (isN ? g.y : g.x).map(v => +v);
  const ord = pos.map((p, i) => i).sort((a, b) => pos[a] - pos[b]);
  const X = ord.map(i => pos[i]);
  const mask = $('psMask').checked;
  const trR = (D.setup.transformer || {}).r || 0, inT = i => L.dist_tr && L.dist_tr[i] != null && L.dist_tr[i] < trR;
  // transformer-zone cells stay visible (hatched, not interpreted); other excluded cells are hidden when asked
  const pick = A => A.map((row, k) => ord.map(i => (mask && L.dec[k][i] === 2 && !inT(i)) || row[i] == null ? null : row[i]));
  const raw = pick(L.raw), shp = pick(L.shape);
  const vals = raw.flat().filter(v => v != null).sort((a, b) => a - b), q = a => vals[Math.floor(a * (vals.length - 1))];
  // lateral index: station median of raw (kept cells) minus the line's median station
  const med = a => { const s = a.filter(v => v != null).sort((p, r) => p - r); return s.length ? s[Math.floor(s.length / 2)] : null; };
  const stMed = ord.map((i, j) => med(L.raw.map((row, k) => L.dec[k][i] === 2 ? null : row[i])));
  const lineMed = med(stMed.slice()), lat0 = stMed.map(v => v == null || lineMed == null ? null : v - lineMed);
  const lat = lat0.map((v, j) => { const w = lat0.slice(Math.max(0, j - 1), j + 2).filter(u => u != null); return v == null || !w.length ? null : +(w.reduce((a, b) => a + b, 0) / w.length).toFixed(3); });   // 3-station running mean
  const tr = [], sh = [], an = [];
  const dA = [0.70, 1], dB = [0.25, 0.64], dC = [0, 0.15];
  tr.push({type: 'heatmap', x: X, y: L.depths, z: raw, xaxis: 'x', yaxis: 'y', colorscale: AQ, zmin: q(.02), zmax: q(.98),
    colorbar: {title: {text: 'log₁₀ ΔV (raw)', side: 'right'}, y: (dA[0] + dA[1]) / 2, len: dA[1] - dA[0], thickness: 12},
    hovertemplate: `${isN ? 'N' : 'E'} %{x:.0f} m · %{y} m<br>log₁₀ ΔV %{z:.3f}<extra>raw</extra>`});
  if (vals.length) {
    tr.push({type: 'heatmap', x: X, y: L.depths, z: shp, xaxis: 'x2', yaxis: 'y2', zsmooth: 'best', colorscale: AQ, zmin: -2.5, zmax: 2.5,
      colorbar: {title: {text: 'Shape z (per depth)<br>purple-blue = more conductive', side: 'right'}, y: (dB[0] + dB[1]) / 2, len: dB[1] - dB[0], thickness: 12},
      hovertemplate: `${isN ? 'N' : 'E'} %{x:.0f} m · %{y} m<br>z = %{z:.2f}<extra>depth shape</extra>`});
    tr.push({type: 'contour', x: X, y: L.depths, z: shp, xaxis: 'x2', yaxis: 'y2', showscale: false, hoverinfo: 'skip', contours: {coloring: 'none', start: ZTHR, end: ZTHR, size: 1, showlabels: false},
      line: {color: '#111', width: 1.4}, connectgaps: false, name: `Conductive threshold (z = ${ZTHR})`, showlegend: false});
  }
  // lateral index as two filled areas
  const pz = lat.map(v => v == null ? null : Math.max(0, v)), nz = lat.map(v => v == null ? null : Math.min(0, v));
  tr.push({type: 'scatter', mode: 'lines', x: X, y: nz, xaxis: 'x3', yaxis: 'y3', fill: 'tozeroy', fillcolor: 'rgba(42,111,224,.55)', line: {width: 0}, hoverinfo: 'skip', showlegend: false});
  tr.push({type: 'scatter', mode: 'lines', x: X, y: pz, xaxis: 'x3', yaxis: 'y3', fill: 'tozeroy', fillcolor: 'rgba(224,69,60,.45)', line: {width: 0}, hoverinfo: 'skip', showlegend: false});
  tr.push({type: 'scatter', mode: 'lines', x: X, y: lat, xaxis: 'x3', yaxis: 'y3', line: {color: '#111', width: 1.2}, showlegend: false, hovertemplate: '%{x:.0f} m<br>lateral index %{y:.3f}<extra></extra>'});
  const d0 = L.depths[0], d1 = L.depths[L.depths.length - 1];
  // transformer zone: hatched in all panels
  const tz = ord.map(inT);
  if (tz.some(Boolean)) {
    const xs = X.filter((x, j) => tz[j]), a = Math.min(...xs) - 1.25, b = Math.max(...xs) + 1.25;
    [['x', 'y', d0 - 5, d1 + 5], ['x2', 'y2', d0 - 5, d1 + 5]].forEach(([xr, yr, y0, y1]) => tr.push(hatch(a, b, y0, y1, 26, xr, yr)));
    sh.push({type: 'rect', xref: 'x3', yref: 'y3 domain', x0: a, x1: b, y0: 0, y1: 1, fillcolor: 'rgba(120,120,120,.2)', line: {width: 0}, layer: 'below'});
  }
  // target window
  [120, 250].forEach(y => sh.push({type: 'line', xref: 'x2 domain', yref: 'y2', x0: 0, x1: 1, y0: y, y1: y, line: {color: '#111', width: 1.2, dash: 'dash'}}));
  // crossings: dotted verticals in all panels, labels above (a)
  (G.crossings || []).forEach(c => { const me = c.a === psLine ? c.ia : c.b === psLine ? c.ib : null; if (me == null) return; const other = c.a === psLine ? c.b : c.a, xp = pos[me];
    ['x', 'x2', 'x3'].forEach((xr, k) => sh.push({type: 'line', xref: xr, yref: ['y', 'y2', 'y3'][k] + ' domain', x0: xp, x1: xp, y0: 0, y1: 1, line: {color: '#111', width: 1, dash: 'dot'}}));
    an.push({xref: 'x', yref: 'y domain', x: xp, y: 1, yanchor: 'bottom', text: other, showarrow: false, font: {size: 11, color: '#333'}}); });
  // zones (score >= 6) as boxes on (b)
  if ($('psZones').checked) D.interp.zones.filter(z => z.Line === psLine && +z.Score >= 6).forEach(z => {
    const ia = L.st.indexOf(z.Station_from), ib = L.st.indexOf(z.Station_to); if (ia < 0 || ib < 0) return;
    const xa = Math.min(pos[ia], pos[ib]) - 1.25, xb = Math.max(pos[ia], pos[ib]) + 1.25, T = z.Near_transformer === 'Yes';
    sh.push({type: 'rect', xref: 'x2', yref: 'y2', x0: xa, x1: xb, y0: z.Top_m, y1: z.Bottom_m, line: {color: '#111', width: T ? 1.2 : 2, dash: T ? 'dash' : 'solid'}});
    an.push({xref: 'x2', yref: 'y2', x: xa, y: z.Top_m, xanchor: 'left', yanchor: 'bottom', text: `${z.Zone} (${z.Score}${T ? ', T' : ''})`, showarrow: false, font: {size: 10.5, color: '#111'}, bgcolor: 'rgba(255,255,255,.75)'}); });
  // candidate sites on this line: black vertical to 400 m
  D.interp.sites.filter(s => s.nearest && s.nearest.line === psLine).forEach(s => { const i = L.st.indexOf(s.nearest.station); if (i < 0) return; const xp = pos[i];
    sh.push({type: 'line', xref: 'x2', yref: 'y2', x0: xp, x1: xp, y0: 0, y1: 400, line: {color: '#111', width: 3}});
    const n = (String(s.Role).match(/Priority (\d)/) || [])[1];
    an.push({xref: 'x2', yref: 'y2 domain', x: xp, y: 1, yanchor: 'bottom', text: `<b>${s.Site}${n ? ' (' + n + ')' : ''}</b>`, showarrow: false, font: {size: 12, color: '#111'}}); });
  const ttl = (t, d) => ({xref: 'paper', yref: 'paper', x: 0, y: d[1] + 0.03, xanchor: 'left', yanchor: 'bottom', text: `<b>${t}</b>`, showarrow: false, font: {size: 13.5, color: '#122b2c'}});
  an.push(ttl('(a) Raw potential difference, as recorded', dA), ttl('(b) Normalised depth-shape anomaly; boxes = zones scoring 6 or more (unvalidated)', dB),
    ttl("(c) Lateral index (< 0 = more conductive than the line's typical station)", dC));
  const rng = [X[0] - 1.5, X[X.length - 1] + 1.5];
  const ax = (d, extra = {}) => Object.assign({domain: d, title: 'Nominal depth (m)', gridcolor: 'rgba(0,0,0,0)', zeroline: false, ticks: 'outside', showline: true, linecolor: '#111', mirror: true, range: [d1 + 5, d0 - 15]}, extra);
  const xa = (a, show) => ({anchor: a, range: rng, showticklabels: show, ticks: 'outside', showline: true, linecolor: '#111', mirror: true, zeroline: false, gridcolor: 'rgba(0,0,0,0)', matches: a === 'y' ? undefined : 'x',
    title: show ? `Position ${isN ? 'south to north' : 'west to east'} (m, local grid)` : undefined});
  const lay = base({margin: {l: 70, r: 20, t: 28, b: 56}, plot_bgcolor: '#ffffff', showlegend: false, shapes: sh, annotations: an,
    xaxis: xa('y', false), xaxis2: xa('y2', false), xaxis3: xa('y3', true),
    yaxis: ax(dA), yaxis2: ax(dB), yaxis3: {domain: dC, title: 'Lateral index<br>(log₁₀)', zeroline: true, zerolinecolor: '#111', gridcolor: 'rgba(0,0,0,0)', ticks: 'outside', showline: true, linecolor: '#111', mirror: true}});
  $('ps').style.height = '1040px';
  clearBox('ps');
  await Plotly.react('ps', tr, lay, Object.assign({}, CFG, {toImageButtonOptions: {format: 'png', scale: 5, filename: `Section_${psLine}`}}));
}

/* wrap the existing drawPS: the 3-panel view replaces the main chart; the other views keep the single panel */
const _drawPS0 = drawPS;
drawPS = async function () {
  if (psVar !== 'sec') { $('ps').style.height = '560px'; if ($('ps')._fullLayout) Plotly.purge($('ps')); return _drawPS0(); }
  let L; try { L = await needLine(psLine); } catch (e) { fail('ps', e); return; }
  try { if ($('ps')._fullLayout && $('ps').layout && !$('ps').layout.xaxis3) Plotly.purge($('ps')); await drawSection(L); } catch (e) { console.error(e); fail('ps', e); return; }
  const zs = D.interp.zones.filter(zz => zz.Line === psLine), qr = D.qc.Lines.find(r => r.line === psLine) || {};
  const keep = psVar; psVar = 'shape'; try { psSide(L, zs, qr); } catch (e) { console.error(e); } psVar = keep;
  $('psLegend').innerHTML = `<div style="height:14px;border-radius:7px;background:${AQGRAD}"></div><div class="row" style="justify-content:space-between;margin-top:6px;font-size:12px;color:var(--muted)"><span>Purple-blue: lower than the depth's background<br><b style="color:#2233c4">more conductive · candidate fracture</b></span><span style="text-align:right">Red: higher<br><b style="color:#d7191c">less conductive · massive rock</b></span></div>
  <p class="note" style="margin-top:10px">(a) is the instrument record. (b) removes each depth's site-wide level, so colours compare stations at the same depth; the black line marks z = ${ZTHR} (the most conductive 10 %). (c) shows whether a whole station reads lower (blue) or higher (red) than the line's typical station. Hatched: within ${(D.setup.transformer || {}).r || 120} m of the transformer, not interpreted. Dotted: crossing lines. Dashed: the 120–250 m target window.</p>`;
};

/* ================= gridded depth slices ================= */
const SLV = () => (psVar === 'lv' ? 'lv' : 'shape');
function sliceTraces(R, S, opt = {}) {
  const v = R.var, lim = v === 'lv' ? 0.6 : 2.5, tr = [];
  tr.push({type: 'heatmap', x: R.x, y: R.y, z: S.z, zsmooth: 'best', colorscale: AQ, zmin: -lim, zmax: lim, showscale: !!opt.scale, xaxis: opt.xa, yaxis: opt.ya,
    colorbar: {title: {text: v === 'lv' ? 'Levelled response' : 'Shape z (per depth)', side: 'right'}, thickness: 12, len: .8},
    hovertemplate: `E %{x} m · N %{y} m<br>${v === 'lv' ? 'levelled' : 'z'} %{z:.2f}<extra>${S.depth} m</extra>`});
  if (v === 'shape') tr.push({type: 'contour', x: R.x, y: R.y, z: S.z, showscale: false, hoverinfo: 'skip', xaxis: opt.xa, yaxis: opt.ya, contours: {coloring: 'none', start: ZTHR, end: ZTHR, size: 1}, line: {color: '#111', width: 1.2}, connectgaps: false, name: `Conductive threshold (z = ${ZTHR})`, showlegend: !!opt.legend});
  const g = R.geo, lx = [], ly = [];
  Object.values(R.lines).forEach(l => { lx.push(...l.x, null); ly.push(...l.y, null); });
  tr.push({type: 'scatter', mode: 'lines', x: lx, y: ly, line: {color: 'rgba(20,20,20,.55)', width: 0.7}, hoverinfo: 'skip', xaxis: opt.xa, yaxis: opt.ya, name: 'ADMT profile', showlegend: !!opt.legend});
  if (g.boundary.length) tr.push({type: 'scatter', mode: 'lines', x: g.boundary.map(p => p[0]), y: g.boundary.map(p => p[1]), line: {color: '#c00000', width: 2}, hoverinfo: 'skip', xaxis: opt.xa, yaxis: opt.ya, name: 'Site boundary', showlegend: !!opt.legend});
  if (g.transformer) { const t = g.transformer, cx = [], cy = []; for (let i = 0; i <= 120; i++) { const a = i / 120 * 2 * Math.PI; cx.push(t.x + t.r * Math.cos(a)); cy.push(t.y + t.r * Math.sin(a)); }
    tr.push({type: 'scatter', mode: 'lines', x: cx, y: cy, line: {color: '#111', width: 1.4, dash: 'dash'}, hoverinfo: 'skip', xaxis: opt.xa, yaxis: opt.ya, name: `Transformer influence (${t.r} m)`, showlegend: !!opt.legend});
    tr.push({type: 'scatter', mode: 'markers', x: [t.x], y: [t.y], marker: {symbol: 'triangle-up', size: 12, color: '#111'}, hovertemplate: 'Transformer<extra></extra>', xaxis: opt.xa, yaxis: opt.ya, name: 'Transformer', showlegend: !!opt.legend}); }
  const pri = g.sites.filter(s => /^Priority/.test(s.Role)), alt = g.sites.filter(s => /^Alternate/.test(s.Role)), oth = g.sites.filter(s => !/^Priority|^Alternate/.test(s.Role));
  const num_ = s => (String(s.Role).match(/Priority (\d)/) || [])[1] || '';
  tr.push({type: 'scatter', mode: 'markers+text', x: pri.map(s => s.x), y: pri.map(s => s.y), text: pri.map(num_), textfont: {color: '#fff', size: 10, family: FONT.family}, marker: {size: 17, color: '#111', line: {color: '#fff', width: 1.5}},
    customdata: pri.map(s => [s.Site, s.Role]), hovertemplate: 'Site %{customdata[0]}<br>%{customdata[1]}<extra></extra>', xaxis: opt.xa, yaxis: opt.ya, name: 'Priority well (1, 2, 3 = drilling order)', showlegend: !!opt.legend});
  tr.push({type: 'scatter', mode: 'text', x: pri.map(s => s.x + 7), y: pri.map(s => s.y + 7), text: pri.map(s => `<b>${s.Site}</b>`), textposition: 'top right', textfont: {size: 12, color: '#111'}, hoverinfo: 'skip', showlegend: false, xaxis: opt.xa, yaxis: opt.ya});
  tr.push({type: 'scatter', mode: 'markers+text', x: alt.map(s => s.x), y: alt.map(s => s.y), text: alt.map(s => s.Site), textposition: 'bottom right', textfont: {size: 11, color: '#111'}, marker: {symbol: 'square', size: 9, color: '#fff', line: {color: '#111', width: 2}},
    customdata: alt.map(s => s.Role), hovertemplate: 'Site %{text}<br>%{customdata}<extra></extra>', xaxis: opt.xa, yaxis: opt.ya, name: 'Alternate site', showlegend: !!opt.legend});
  tr.push({type: 'scatter', mode: 'markers+text', x: oth.map(s => s.x), y: oth.map(s => s.y), text: oth.map(s => s.Site), textposition: 'top center', textfont: {size: 11, color: '#111'}, marker: {symbol: 'x-thin', size: 10, line: {color: '#111', width: 2.2}},
    customdata: oth.map(s => s.Role), hovertemplate: 'Site %{text}<br>%{customdata}<extra></extra>', xaxis: opt.xa, yaxis: opt.ya, name: 'Zone noted', showlegend: !!opt.legend});
  return tr;
}
function sliceDecor(R, xa = 'x', ya = 'y', dom) {   // north arrow + 50 m scale bar
  const x0 = R.x[0], x1 = R.x[R.x.length - 1], y0 = R.y[0], y1 = R.y[R.y.length - 1];
  return {shapes: [{type: 'line', xref: xa, yref: ya, x0: x1 - 60, x1: x1 - 10, y0: y0 + 6, y1: y0 + 6, line: {color: '#111', width: 3}}],
    annotations: [{xref: xa, yref: ya, x: x1 - 35, y: y0 + 8, yanchor: 'bottom', text: '50 m', showarrow: false, font: {size: 11}},
      {xref: xa, yref: ya, x: x0 + 8, y: y1 - 14, ax: x0 + 8, ay: y1 - 46, axref: xa, ayref: ya, text: '', showarrow: true, arrowhead: 2, arrowsize: 1.2, arrowwidth: 2, arrowcolor: '#111'},
      {xref: xa, yref: ya, x: x0 + 8, y: y1 - 8, text: '<b>N</b>', showarrow: false, yanchor: 'bottom', font: {size: 12}}]};
}
const _drawSlice0 = drawSlice;
drawSlice = async function () {
  const d = +$('dsDepth').value; $('dsLab').textContent = d + ' m';
  let R; try { R = await api('/api/slicegrid', {...SR(), depths: d, var: SLV()}); } catch (e) { fail('dslice', e); return; }
  const S = R.slices[0], dcl = (D.qc.Depth_confidence || []).find(r => r.depth_m === d);
  if (!S.z) { if ($('dslice')._fullLayout) Plotly.purge($('dslice')); $('dslice').innerHTML = `<p class="note">Nothing to show at ${d} m for this view (no kept readings, or this run has no result for it yet).</p>`; return; }
  const dec = sliceDecor(R);
  dec.annotations.push({xref: 'paper', yref: 'paper', x: 0, y: 1.0, xanchor: 'left', yanchor: 'bottom', text: `<b>${d} m</b>${dcl ? ' · depth confidence ' + dcl.depth_class : ''}`, showarrow: false, font: {size: 13}});
  clearBox('dslice');
  Plotly.react('dslice', sliceTraces(R, S, {scale: true, legend: true}), base({margin: {l: 56, r: 10, t: 26, b: 40}, plot_bgcolor: '#fff', shapes: dec.shapes, annotations: dec.annotations,
    xaxis: {title: 'Easting (m, local)', range: [R.x[0], R.x[R.x.length - 1]], constrain: 'domain', showline: true, mirror: true, linecolor: '#111', ticks: 'outside', zeroline: false, gridcolor: 'rgba(0,0,0,0)'},
    yaxis: {title: 'Northing (m, local)', range: [R.y[0], R.y[R.y.length - 1]], scaleanchor: 'x', scaleratio: 1, showline: true, mirror: true, linecolor: '#111', ticks: 'outside', zeroline: false, gridcolor: 'rgba(0,0,0,0)'},
    legend: {orientation: 'h', y: -0.12, font: {size: 10.5}}}), Object.assign({}, CFG, {toImageButtonOptions: {format: 'png', scale: 5, filename: `Depth_slice_${d}m`}}));
};

/* six depths side by side (the report figure) */
async function drawSix() {
  const ds = ($('sixDepths').value || '').split(/[ ,;]+/).map(Number).filter(v => v > 0).slice(0, 6);
  if (!ds.length) return;
  $('sixMsg').textContent = 'Computing…';
  let R; try { R = await api('/api/slicegrid', {...SR(), depths: ds.join(','), var: SLV()}); } catch (e) { $('sixMsg').textContent = e.message; return; }
  const n = R.slices.length, cols = 3, rows = Math.ceil(n / cols), tr = [], lay = base({margin: {l: 56, r: 10, t: 30, b: 90}, plot_bgcolor: '#fff', showlegend: true, legend: {orientation: 'h', y: -0.06, x: 0.5, xanchor: 'center', font: {size: 11}}, annotations: [], shapes: []});
  const gap = 0.05, w = (1 - gap * (cols - 1)) / cols, h = (1 - 0.06 * (rows - 1)) / rows;
  R.slices.forEach((S, i) => { const r = Math.floor(i / cols), c = i % cols, xa = 'x' + (i ? i + 1 : ''), ya = 'y' + (i ? i + 1 : '');
    if (S.z) tr.push(...sliceTraces(R, S, {xa, ya, scale: i === 0, legend: i === 0}));
    const xd = [c * (w + gap), c * (w + gap) + w], yd = [1 - (r + 1) * h - r * 0.06, 1 - r * h - r * 0.06];
    lay['xaxis' + (i ? i + 1 : '')] = {domain: xd, anchor: ya, range: [R.x[0], R.x[R.x.length - 1]], constrain: 'domain', showline: true, mirror: true, linecolor: '#111', ticks: 'outside', zeroline: false, gridcolor: 'rgba(0,0,0,0)', title: r === rows - 1 ? 'Easting (m)' : undefined};
    lay['yaxis' + (i ? i + 1 : '')] = {domain: yd, anchor: xa, range: [R.y[0], R.y[R.y.length - 1]], scaleanchor: xa, scaleratio: 1, showline: true, mirror: true, linecolor: '#111', ticks: 'outside', zeroline: false, gridcolor: 'rgba(0,0,0,0)', title: c === 0 ? 'Northing (m)' : undefined};
    lay.annotations.push({xref: xa + ' domain', yref: ya + ' domain', x: 0, y: 1, xanchor: 'left', yanchor: 'bottom', text: `<b>${S.depth} m</b>`, showarrow: false, font: {size: 14}});
    const dd = sliceDecor(R, xa, ya); lay.shapes.push(...dd.shapes); lay.annotations.push(...dd.annotations); });
  const t0 = tr.find(t => t.type === 'heatmap'); if (t0) t0.colorbar = {orientation: 'h', x: 0.5, xanchor: 'center', y: -0.16, len: 0.6, thickness: 12, title: {text: 'Normalised depth-shape anomaly, z (per depth): purple-blue = more conductive, red = less conductive', side: 'bottom'}};
  $('sixPlot').style.height = (rows * 560 + 160) + 'px';
  clearBox('sixPlot');
  await Plotly.react('sixPlot', tr, lay, Object.assign({}, CFG, {toImageButtonOptions: {format: 'png', scale: 4, filename: 'Depth_slices_' + ds.join('-') + 'm'}}));
  $('sixMsg').textContent = 'Local grid from the site origin; 5 m cells; nominal depth; unvalidated. Camera icon (top right of the figure) saves a high-resolution PNG.';
}
