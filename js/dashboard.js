'use strict';

// ════════ DASHBOARD (F1) ════════
const CH = {}; // instance Chart.js
function emptyDash() { return { kpi: { inMonth: 0, outMonth: 0, inPrev: 0, outPrev: 0, netWeek: 0, outToday: 0 }, daily: [], monthly: [], yearly: [], channels: {}, channelsPrev: {}, topByChannel: {}, best: [], bestBundles: [] }; }
/** Rata-rata keluar per hari (30 hari) per varian, dari transaksi lokal → perkiraan habis. */
function velocity() {
  if (IX._velKey === S.tx.length + ':' + (IX.groups ? 1 : 0) && IX._vel) return IX._vel;
  const from = now() - 30 * DAY, m = {};
  S.tx.forEach(t => { if (t.Status === 'Confirmed' && (t.Jenis === 'OUT' || t.Jenis === 'BUNDLE_OUT') && t.Tanggal >= from) m[t.VariantID] = (m[t.VariantID] || 0) - t.Jumlah; });
  Object.keys(m).forEach(k => { m[k] = m[k] / 30; });
  IX._vel = m; IX._velKey = S.tx.length + ':1';
  return m;
}
function coverDays(vid) { const v = velocity()[vid]; return v > 0 ? stockOf(vid) / v : Infinity; }
function chOrder(obj) { const base = Object.keys(CHANNELS); return base.concat(Object.keys(obj).filter(k => base.indexOf(k) < 0)); }

function renderDashboard() {
  const el = $('#page-dashboard');
  const d = S.dashboard || emptyDash();
  const act = activeVariants();
  const total = sum(act, v => Math.max(0, stockOf(v.VariantID)));
  const low = act.filter(v => vStatus(v) === 'low'), oos = act.filter(v => vStatus(v) === 'out');
  const pend = groupList(g => g.status === 'Pending');
  const openPO = S.po.filter(p => ['Draft', 'Ordered', 'Partially Received'].indexOf(p.Status) >= 0);
  const sisaPO = sum(S.poItems.filter(i => openPO.some(p => p.PONumber === i.PONumber && p.Status !== 'Draft')), i => i.Sisa);
  const rtsP = S.rts.filter(r => r.Status === 'PENDING_STOCK');
  const k = d.kpi;
  const actions = (can('EXPORT') ? `<button class="btn" data-act="export-open">${I('download')}Export laporan</button>` : '') +
    (can('IMPORT') ? `<button class="btn btn-primary" data-act="go-import">${I('upload_file')}Import marketplace</button>` : '');

  el.innerHTML = pageHead('Dashboard', { sub: 'Kondisi stok ' + esc(fmtDayLong(now())) + ' · data diperbarui otomatis setelah transaksi dikonfirmasi.', actions: actions }) + `
    <div class="grid g-4">
      ${kpi({ cls: 'kpi-stock', label: 'Total stok', icon: 'inventory_2', val: fmt(total), unit: 'pcs', sub: `<span class="${k.netWeek >= 0 ? 't-success' : 't-danger'} strong">${I(k.netWeek >= 0 ? 'arrow_upward' : 'arrow_downward', 'sm')} ${sgn(k.netWeek)}</span><span class="muted">minggu ini</span>`, act: 'nav-products' })}
      ${kpi({ cls: 'kpi-in', label: 'Barang masuk', icon: 'move_to_inbox', val: fmt(k.inMonth), unit: 'pcs bulan ini', sub: delta(k.inMonth, k.inPrev), act: 'nav-stockin' })}
      ${kpi({ cls: 'kpi-out', label: 'Barang keluar', icon: 'local_shipping', val: fmt(k.outMonth), unit: 'pcs bulan ini', sub: delta(k.outMonth, k.outPrev), act: 'nav-stockout' })}
      ${kpi({ cls: 'kpi-alert', label: 'Low stock', icon: 'warning', val: fmt(low.length), unit: 'varian', sub: `<span class="t-danger strong">${I('error', 'sm fill')} ${fmt(oos.length)} habis (Out of Stock)</span>`, act: 'restock' })}
    </div>
    <div class="mini-stats">
      <button class="mini" data-nav="products">${I('style')}<div><b>${fmt(act.length)}</b><span class="l">Total varian aktif</span></div>${I('chevron_right', 'go')}</button>
      <button class="mini" data-nav="po">${I('receipt_long')}<div><b>${fmt(openPO.length)}</b><span class="l">PO terbuka · sisa ${fmt(sisaPO)} pcs</span></div>${I('chevron_right', 'go')}</button>
      <button class="mini" data-nav="rts">${I('assignment_return')}<div><b>${fmt(rtsP.length)}</b><span class="l">RTS pending stok</span></div>${I('chevron_right', 'go')}</button>
      <button class="mini" data-act="nav-pending">${I('hourglass_top')}<div><b>${fmt(pend.length)}</b><span class="l">Menunggu konfirmasi</span></div>${I('chevron_right', 'go')}</button>
    </div>

    <div class="grid g-2-1 sec">
      <div class="card">
        <div class="card-head"><h3>${I('show_chart')}Tren barang keluar</h3>
          <div class="seg" role="tablist">${[['daily', 'Harian'], ['monthly', 'Bulanan'], ['yearly', 'Tahunan']].map(x => `<button role="tab" class="${UI.dashMode === x[0] ? 'on' : ''}" data-act="dash-mode" data-m="${x[0]}" aria-selected="${UI.dashMode === x[0]}">${x[1]}</button>`).join('')}</div></div>
        <div class="card-body"><div class="row between" style="margin-bottom:8px"><span class="muted" id="trendCaption"></span><span class="strong" id="trendTotal"></span></div>
          <div class="chart-box"><canvas id="trendChart" role="img" aria-label="Grafik tren barang keluar"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-head"><h3><span class="t-danger">${I('warning')}</span>Peringatan stok</h3><button class="link" data-act="restock" style="font-weight:500">Lihat semua</button></div>
        <div class="card-body">${alertList(oos.concat(low.sort((a, b) => stockOf(a.VariantID) / (a.BatasMinimum || 1) - stockOf(b.VariantID) / (b.BatasMinimum || 1))))}</div>
        <div class="card-foot"><span class="muted">${fmt(low.length + oos.length)} varian perlu restock</span>${can('PO_MANAGE') && (low.length + oos.length) ? `<button class="btn btn-primary btn-sm" data-act="po-from-low">${I('add_shopping_cart')}Buat PO</button>` : ''}</div>
      </div>
    </div>

    <div class="grid g-2 sec">
      <div class="card">${channelCard(d)}</div>
      <div class="card">${bestCard(d)}</div>
    </div>

    <div class="grid g-3 sec">
      <div class="card">${topChannelCard(d)}</div>
      <div class="card">${activityCard()}</div>
      <div class="card">${insightCard(d, low, oos, pend)}</div>
    </div>`;
  drawTrend();
}

function alertList(list) {
  if (!list.length) return emptyHTML('verified', 'Semua stok aman', 'Tidak ada varian di bawah batas minimum.');
  return `<div class="list">${list.slice(0, 5).map(v => {
    const s = stockOf(v.VariantID), st = vStatus(v), cd = coverDays(v.VariantID);
    const pill = st === 'out' ? `<span class="pill pill-danger pill-lg">Habis (0)</span>` : `<span class="pill pill-warning pill-lg">${fmt(s)} · Rendah</span>`;
    const est = st === 'out' ? 'Min ' + v.BatasMinimum : (isFinite(cd) ? '± ' + Math.max(1, Math.round(cd)) + ' hari lagi' : 'Min ' + v.BatasMinimum);
    return `<button class="li" data-act="variant-open" data-id="${esc(v.VariantID)}">${thumb(v.VariantID)}<div class="col grow"><b class="ellipsis">${esc(v.SKU + ' ' + v.Warna + ' ' + v.Ukuran)}</b><span class="ellipsis">${esc(vName(v.VariantID))} · ${est}</span></div>${pill}</button>`;
  }).join('')}</div>`;
}

function channelCard(d) {
  const ch = d.channels || {};
  const total = sum(Object.values(ch));
  const order = chOrder(ch).filter(c => ch[c] || CHANNELS[c]);
  const lastImp = S.imports.filter(i => i.Status === 'Confirmed')[0];
  return `<div class="card-head"><h3>${I('storefront')}Barang keluar per channel</h3><span class="muted">Total: <b class="tnum" style="color:var(--ink)">${fmt(total)}</b> pcs</span></div>
    <div class="card-body" style="padding-top:6px">${order.map(c => {
      const q = ch[c] || 0, p = total ? q / total * 100 : 0, prev = (d.channelsPrev || {})[c] || 0;
      const col = (CHANNELS[c] || {}).color || '#6B7280';
      return `<div class="chbar"><div class="top">${chLogo(c)}<span class="name">${esc(c)} — <b class="tnum">${fmt(q)}</b></span><span class="pct tnum">${fmt1(p)}%</span></div>
        <div class="track" title="${esc(c)}: ${fmt(q)} pcs (${fmt1(p)}%) · bulan lalu ${fmt(prev)} pcs"><i style="width:${p.toFixed(2)}%;background:${col}"></i></div></div>`;
    }).join('')}</div>
    <div class="card-foot"><span class="muted">Sumber: transaksi Confirmed bulan ini</span><span class="muted" style="font-size:12.5px">${lastImp ? 'Import terakhir: ' + esc(lastImp.Sumber) + ' · ' + relTime(lastImp.TanggalImport) : ''}</span></div>`;
}

function bestCard(d) {
  const mode = UI.bestMode;
  const all = UI.bestAll;
  let rows;
  if (mode === 'paket') {
    const list = d.bestBundles || [];
    rows = list.length ? list.slice(0, all ? 10 : 5).map((b, i) => {
      const per = sum(IX.bItems[b[0]] || [], x => x.Jumlah) || 1;
      const mom = b[2] ? (b[1] - b[2]) / b[2] * 100 : null;
      return `<div class="li"><span class="rank r${i + 1}">${i + 1}</span><span class="thumb">${I('redeem')}</span><div class="col grow"><b class="ellipsis">${esc(IX.b[b[0]] ? IX.b[b[0]].NamaBundle : b[0])}</b><span>${esc(b[0])}</span></div>
        <div class="end"><b class="tnum">${fmt(b[1])} paket</b> <span class="muted tnum">(${fmt(b[1] * per)} helai)</span><div style="font-size:12.5px">${mom === null ? '<span class="muted">Baru</span>' : `<span class="${mom >= 0 ? 't-success' : 't-danger'}">${mom >= 0 ? '+' : ''}${fmt1(mom, 0)}% MoM</span>`}</div></div></div>`;
    }).join('') : emptyHTML('redeem', 'Belum ada penjualan paket bulan ini');
  } else {
    const list = d.best || [];
    const max = list.length ? list[0][1] : 1;
    rows = list.length ? list.slice(0, all ? 10 : 5).map((b, i) => {
      const v = IX.v[b[0]];
      const mom = b[2] ? (b[1] - b[2]) / b[2] * 100 : null;
      return `<button class="li" data-act="variant-open" data-id="${esc(b[0])}"><span class="rank r${i + 1}">${i + 1}</span>${thumb(b[0])}<div class="col grow"><b class="ellipsis">${esc(v ? v.SKU + ' ' + v.Warna + ' ' + v.Ukuran : b[0])}</b><span class="ellipsis">${esc(vName(b[0]))}</span><div class="hbar"><i style="width:${(b[1] / max * 100).toFixed(1)}%"></i></div></div>
        <div class="end"><b class="tnum">${fmt(b[1])} helai</b><div style="font-size:12.5px">${mom === null ? '<span class="muted">Baru</span>' : Math.abs(mom) < 2 ? '<span class="muted">Stabil</span>' : `<span class="${mom >= 0 ? 't-success' : 't-danger'}">${mom >= 0 ? '+' : ''}${fmt1(mom, 0)}% MoM</span>`}</div></div></button>`;
    }).join('') : emptyHTML('star', 'Belum ada penjualan bulan ini');
  }
  const n = mode === 'paket' ? (d.bestBundles || []).length : (d.best || []).length;
  return `<div class="card-head"><h3><span style="color:#CA8A04">${I('star', 'fill')}</span>Best seller bulan ini</h3>
      <div class="seg"><button class="${mode === 'helai' ? 'on' : ''}" data-act="best-mode" data-m="helai">Per helai</button><button class="${mode === 'paket' ? 'on' : ''}" data-act="best-mode" data-m="paket">Per paket</button></div></div>
    <div class="card-body"><div class="list">${rows}</div></div>
    ${n > 5 ? `<div class="card-foot"><span class="muted">Peringkat dari helai keluar terkonfirmasi</span><button class="link" data-act="best-all">${all ? 'Tampilkan top 5' : 'Tampilkan top 10'}</button></div>` : ''}`;
}

function topChannelCard(d) {
  const top = d.topByChannel || {};
  const chs = chOrder(top).filter(c => top[c] && top[c].length);
  if (!UI.chTab || chs.indexOf(UI.chTab) < 0) UI.chTab = chs[0] || null;
  const list = UI.chTab ? top[UI.chTab] : [];
  return `<div class="card-head"><h3>${I('leaderboard')}Terlaris per marketplace</h3></div>
    <div class="card-body">${chs.length ? `<div class="pick-chips" style="margin-bottom:12px">${chs.map(c => `<button class="pick-chip${c === UI.chTab ? ' on' : ''}" data-act="ch-tab" data-c="${esc(c)}">${CHANNELS[c] && CHANNELS[c].logo ? `<img src="${ASSETS[CHANNELS[c].logo]}" alt="">` : I((CHANNELS[c] || {}).icon || 'storefront', 'sm')}${esc(c)}</button>`).join('')}</div>
      <div class="list">${list.map((x, i) => `<button class="li" data-act="variant-open" data-id="${esc(x[0])}"><span class="rank r${i + 1}">${i + 1}</span>${thumb(x[0])}<div class="col grow"><b class="ellipsis">${esc(IX.v[x[0]] ? IX.v[x[0]].SKU + ' ' + vSub(x[0]) : x[0])}</b><span class="ellipsis">${esc(vName(x[0]))}</span></div><b class="end tnum">${fmt(x[1])}</b></button>`).join('')}</div>`
      : emptyHTML('storefront', 'Belum ada penjualan bulan ini')}</div>`;
}

function activityCard() {
  const list = groupList(g => g.status === 'Confirmed').sort((a, b) => b.konfPada - a.konfPada).slice(0, 10);
  return `<div class="card-head"><h3>${I('history')}Aktivitas terbaru</h3><button class="link" data-nav="history" style="font-weight:500">Riwayat</button></div>
    <div class="card-body" style="padding-top:8px">${list.length ? `<div class="feed">${list.map(g => {
      const j = JENIS[g.jenis] || JENIS.IN;
      const src = g.jenis === 'OUT' || g.jenis === 'BUNDLE_OUT' ? g.sumber : (g.jenis === 'PO_IN' ? g.ref : g.sumber);
      return `<button class="fi li" style="background:none;padding:10px 0;border-radius:0" data-act="group-open" data-id="${esc(g.id)}"><span class="fic ${j.cls}">${I(j.icon)}</span><div class="col grow"><b class="ellipsis" style="font-size:13.5px">${esc(j.label)} · ${esc(src || '')}</b><span class="ellipsis">${g.rows.length} varian · ${userName(g.konfOleh)} · ${relTime(g.konfPada)}</span></div><b class="end tnum ${g.qty >= 0 ? 'qty-pos' : 'qty-neg'}">${sgn(g.qty)}</b></button>`;
    }).join('')}</div>` : emptyHTML('history', 'Belum ada aktivitas')}</div>`;
}

/** Insight otomatis — analisis teks dari data (tanpa biaya AI). */
function insightCard(d, low, oos, pend) {
  const out = [];
  const ch = d.channels || {}, tot = sum(Object.values(ch));
  const topCh = Object.keys(ch).sort((a, b) => ch[b] - ch[a])[0];
  if (topCh && tot) out.push(`<b>${esc(topCh)}</b> menyumbang <b>${fmt1(ch[topCh] / tot * 100)}%</b> barang keluar bulan ini (${fmt(ch[topCh])} dari ${fmt(tot)} pcs).`);
  if (d.best && d.best[0]) {
    const b = d.best[0], mom = b[2] ? (b[1] - b[2]) / b[2] * 100 : null;
    out.push(`Terlaris: <b>${esc(IX.v[b[0]] ? IX.v[b[0]].SKU + ' ' + vSub(b[0]) : b[0])}</b> — ${fmt(b[1])} helai${mom !== null ? ` (${mom >= 0 ? 'naik' : 'turun'} ${fmt1(Math.abs(mom), 0)}% dari bulan lalu)` : ''}.`);
  }
  const bestIds = (d.best || []).map(x => x[0]);
  const hotOut = oos.filter(v => bestIds.indexOf(v.VariantID) >= 0);
  if (hotOut.length) out.push(`<b class="t-danger">${hotOut.length} varian terlaris sedang habis</b>: ${hotOut.slice(0, 3).map(v => esc(v.SKU + ' ' + v.Warna + ' ' + v.Ukuran)).join(', ')}. Prioritaskan restock.`);
  const risk = activeVariants().filter(v => stockOf(v.VariantID) > 0).map(v => [v, coverDays(v.VariantID)]).filter(x => x[1] < 7).sort((a, b) => a[1] - b[1]);
  if (risk.length) out.push(`Perkiraan habis: <b>${esc(risk[0][0].SKU + ' ' + risk[0][0].Warna + ' ' + risk[0][0].Ukuran)}</b> dalam ± ${Math.max(1, Math.round(risk[0][1]))} hari (rata-rata ${fmt1(velocity()[risk[0][0].VariantID])} pcs/hari)${risk.length > 1 ? `, disusul ${risk.length - 1} varian lain di bawah 7 hari` : ''}.`);
  if (d.kpi.outPrev) { const p = (d.kpi.outMonth - d.kpi.outPrev) / d.kpi.outPrev * 100; out.push(`Barang keluar bulan ini ${p >= 0 ? 'naik' : 'turun'} <b>${fmt1(Math.abs(p))}%</b> dibanding bulan lalu.`); }
  if (pend.length) out.push(`<b>${pend.length} transaksi</b> menunggu konfirmasi — stok belum berubah sampai dikonfirmasi.`);
  if (poLate().length) out.push(`<b class="t-danger">${poLate().length} PO</b> melewati tanggal target penerimaan.`);
  return `<div class="card-head"><h3>${I('lightbulb')}Insight otomatis</h3><span class="pill pill-outline">dari data</span></div>
    <div class="card-body">${out.length ? `<ul class="insight">${out.slice(0, 6).map(x => `<li>${x}</li>`).join('')}</ul>` : emptyHTML('lightbulb', 'Belum cukup data untuk dianalisis')}</div>`;
}

function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function drawTrend() {
  const cv = $('#trendChart');
  if (!cv) return;
  const d = S.dashboard || emptyDash();
  let labels = [], vals = [], cap = '';
  if (UI.dashMode === 'monthly') { labels = d.monthly.map(x => MONTHS[(x[0] % 100) - 1] + ' ' + String(Math.floor(x[0] / 100)).slice(2)); vals = d.monthly.map(x => x[1]); cap = '12 bulan terakhir'; }
  else if (UI.dashMode === 'yearly') { labels = d.yearly.map(x => String(x[0])); vals = d.yearly.map(x => x[1]); cap = 'Semua tahun'; }
  else { labels = d.daily.map(x => { const w = wib(x[0]); return w.getUTCDate() + ' ' + MONTHS[w.getUTCMonth()]; }); vals = d.daily.map(x => x[1]); cap = '30 hari terakhir'; }
  $('#trendCaption').textContent = cap;
  $('#trendTotal').textContent = fmt(sum(vals)) + ' pcs';
  if (CH.trend) { CH.trend.destroy(); CH.trend = null; }
  if (!window.Chart) {
    // Chart.js dimuat di latar (tidak menahan tampilan awal); grafik digambar begitu siap
    loadScript(CDN.chart).then(() => { if (window.Chart && $('#trendChart')) drawTrend(); })
      .catch(() => { const c = $('#trendChart'); if (c) c.parentNode.innerHTML = `<div class="empty">${I('cloud_off')}<b>Grafik belum termuat</b><span>Periksa koneksi internet. Total periode: ${fmt(sum(vals))} pcs.</span></div>`; });
    return;
  }
  const line = cssVar('--info') || '#2563EB', ink3 = cssVar('--ink-3'), grid = cssVar('--hair'), surf = cssVar('--surface');
  const last = vals.length - 1;
  CH.trend = new Chart(cv, {
    type: 'line',
    data: { labels: labels, datasets: [{ data: vals, borderColor: line, borderWidth: 2, tension: .32, fill: true, backgroundColor: line + '1A', pointRadius: vals.map((_, i) => i === last ? 5 : 0), pointHoverRadius: 6, pointBackgroundColor: line, pointBorderColor: surf, pointBorderWidth: 2, borderCapStyle: 'round', borderJoinStyle: 'round' }] },
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 300 }, resizeDelay: 80, transitions: { resize: { animation: { duration: 0 } } },
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: 18, right: 8 } },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#111', titleFont: { family: 'Geist', weight: '600' }, bodyFont: { family: 'Geist' }, padding: 10, cornerRadius: 6, displayColors: false, callbacks: { label: c => fmt(c.parsed.y) + ' pcs keluar' } }
      },
      scales: {
        x: { grid: { display: false }, border: { color: grid }, ticks: { color: ink3, font: { family: 'Geist', size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: UI.dashMode === 'daily' ? 8 : 12 } },
        y: { beginAtZero: true, grid: { color: grid, lineWidth: 1 }, border: { display: false }, ticks: { color: ink3, font: { family: 'Geist', size: 11 }, maxTicksLimit: 5, callback: v => fmt(v) } }
      }
    },
    plugins: [{ id: 'endLabel', afterDatasetsDraw(c) { const m = c.getDatasetMeta(0); const p = m.data[last]; if (!p) return; const g = c.ctx; g.save(); g.font = '600 12px Geist, system-ui'; g.fillStyle = cssVar('--ink'); g.textAlign = 'right'; g.fillText(fmt(vals[last]) + ' pcs', Math.min(p.x, c.chartArea.right), p.y - 12); g.restore(); } }]
  });
}

Object.assign(ACT, {
  'dash-mode': el => { UI.dashMode = el.dataset.m; $$('[data-act="dash-mode"]').forEach(b => { b.classList.toggle('on', b === el); b.setAttribute('aria-selected', b === el); }); drawTrend(); },
  'best-mode': el => { UI.bestMode = el.dataset.m; rerender(); },
  'best-all': () => { UI.bestAll = !UI.bestAll; rerender(); },
  'ch-tab': el => { UI.chTab = el.dataset.c; rerender(); },
  'nav-products': () => navigateTo('products', { filter: { status: '' } }),
  'nav-stockin': () => navigateTo('stockin'),
  'nav-stockout': () => navigateTo('stockout', { filter: { tab: 'list' } }),
  'nav-pending': () => { const g = groupList(x => x.status === 'Pending')[0]; navigateTo(g && (g.jenis === 'OUT' || g.jenis === 'BUNDLE_OUT') ? 'stockout' : 'stockin', { filter: { status: 'Pending', tab: 'list' } }); },
  'restock': () => navigateTo('products', { filter: { status: 'restock', tab: 'variants' } }),
  'go-import': () => navigateTo('stockout', { filter: { tab: 'import' } })
});
