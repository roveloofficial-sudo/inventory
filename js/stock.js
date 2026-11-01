'use strict';

// ════════ EDITOR ITEM (varian / bundle + jumlah) — dipakai Stock In, Stock Out, PO, RTS ════════
function ItemsEditor(root, o) {
  o = o || {};
  const ed = { rows: [] };
  const sizeOpts = r => bundleSizes(r.id).sort((a, b) => sizeRank(a) - sizeRank(b)).map(u => `<option ${u === r.ukuran ? 'selected' : ''}>${esc(u)}</option>`).join('');
  ed.add = init => { ed.rows.push(Object.assign({ key: tmpId('r'), kind: 'variant', id: '', ukuran: '', qty: '' }, init || {})); ed.render(); };
  ed.comps = r => {
    if (!r.id) return [];
    if (r.kind === 'bundle') return (IX.bItems[r.id] || []).map(i => ({ vid: slug(i.SKU) + '-' + slug(i.Warna) + '-' + slug(r.ukuran), q: i.Jumlah * (int(r.qty) || 0) }));
    return [{ vid: r.id, q: int(r.qty) || 0 }];
  };
  ed.net = () => { const m = {}; ed.rows.forEach(r => ed.comps(r).forEach(c => { m[c.vid] = (m[c.vid] || 0) + c.q; })); return m; };
  ed.info = r => {
    if (!r.id) return '<span class="faint">Pilih produk terlebih dahulu.</span>';
    const q = int(r.qty) || 0;
    if (r.kind === 'bundle') {
      const cap = r.ukuran ? bundleCap(r.id, r.ukuran) : 0;
      return `<span>${I('redeem', 'sm')} Bisa dibuat <b>${fmt(cap)}</b> paket ukuran ${esc(r.ukuran || '-')}:</span> ` + ed.comps(r).map(c => {
        const s = stockOf(c.vid), bad = o.mode === 'out' && c.q > s;
        return `<span class="${bad ? 't-danger strong' : ''}">${esc(IX.v[c.vid] ? IX.v[c.vid].Warna : c.vid)} −${fmt(c.q)} (stok ${fmt(s)})</span>`;
      }).join(' · ');
    }
    const s = stockOf(r.id);
    if (o.mode === 'out') return q > s ? `<span class="t-danger strong">${I('error', 'sm')} Stok tidak cukup — tersedia ${fmt(s)} pcs</span>` : `Stok ${fmt(s)} → <b>${fmt(s - q)}</b> pcs setelah dikonfirmasi`;
    if (o.mode === 'in') return `Stok ${fmt(s)} → <b>${fmt(s + q)}</b> pcs setelah dikonfirmasi`;
    return `Stok saat ini ${fmt(s)} pcs`;
  };
  ed.update = r => { const el = $(`[data-ed-info="${r.key}"]`, root); if (el) el.innerHTML = ed.info(r); if (o.onChange) o.onChange(ed); };
  ed.render = () => {
    root.innerHTML = ed.rows.map(r => `<div class="dr-section" style="padding:12px;gap:8px;background:var(--surface)" data-row="${r.key}">
      <div class="row top"><div class="grow">${comboHTML(r.key, r.id, o.bundles ? 'Cari varian atau bundle…' : 'Cari produk, SKU, warna, ukuran…', { bundle: r.kind === 'bundle' })}</div>
        ${r.kind === 'bundle' ? `<select class="select" data-ed-size="${r.key}" style="width:96px" aria-label="Ukuran paket">${sizeOpts(r)}</select>` : ''}
        <div class="unit" data-unit="${r.kind === 'bundle' ? 'paket' : 'pcs'}" style="width:${r.kind === 'bundle' ? 128 : 116}px"><input type="number" min="1" step="1" class="input" data-ed-qty="${r.key}" value="${esc(r.qty)}" placeholder="0" aria-label="Jumlah"></div>
        ${ed.rows.length > 1 ? `<button type="button" class="icon-btn" data-ed-del="${r.key}" aria-label="Hapus item">${I('close')}</button>` : ''}</div>
      <div class="help" data-ed-info="${r.key}">${ed.info(r)}</div></div>`).join('');
    bindCombos(root, () => ({ bundles: !!o.bundles }), (it, inp) => {
      const r = ed.rows.find(x => x.key === inp.dataset.comboInput);
      r.kind = it.kind; r.id = it.id;
      if (it.kind === 'bundle') { const sz = bundleSizes(it.id).sort((a, b) => sizeRank(a) - sizeRank(b)); r.ukuran = sz[0] || ''; ed.render(); }
      else ed.update(r);
      const q = $(`[data-ed-qty="${r.key}"]`, root); if (q) q.focus();
    });
    if (o.onChange) o.onChange(ed);
  };
  root.addEventListener('input', e => { const k = e.target.dataset.edQty; if (k) { const r = ed.rows.find(x => x.key === k); r.qty = e.target.value; ed.update(r); } });
  root.addEventListener('change', e => { const k = e.target.dataset.edSize; if (k) { const r = ed.rows.find(x => x.key === k); r.ukuran = e.target.value; ed.update(r); } });
  root.addEventListener('click', e => { const b = e.target.closest('[data-ed-del]'); if (b) { ed.rows = ed.rows.filter(x => x.key !== b.dataset.edDel); ed.render(); } });
  ed.value = () => ed.rows.filter(r => r.id && int(r.qty) > 0).map(r => r.kind === 'bundle' ? { bundleSku: r.id, ukuran: r.ukuran, qty: int(r.qty) } : { variantId: r.id, qty: int(r.qty) });
  ed.problems = () => {
    const out = [];
    ed.rows.forEach((r, i) => { if (!r.id) out.push('Item ' + (i + 1) + ' belum dipilih.'); else if (!(int(r.qty) > 0)) out.push('Jumlah item ' + (i + 1) + ' harus bilangan bulat > 0.'); });
    return out;
  };
  ed.shortages = () => { const n = ed.net(); return Object.keys(n).filter(v => n[v] > stockOf(v)).map(v => ({ vid: v, need: n[v], have: stockOf(v) })); };
  (o.initial && o.initial.length ? o.initial : [{}]).forEach(x => ed.rows.push(Object.assign({ key: tmpId('r'), kind: 'variant', id: '', ukuran: '', qty: '' }, x)));
  ed.render();
  return ed;
}

/** Buat baris transaksi lokal sementara (tampil instan sebelum server menjawab). */
function localRows(kind, p, tag) {
  const base = { GroupID: tag, Tanggal: p.tanggal || now(), Sumber: p.sumber || 'Manual', Status: 'Pending', BundleSKU: '', Paket: 0, Referensi: p.referensi || '', Catatan: p.catatan || '', KunciImport: '', StokSebelum: null, StokSesudah: null, DibuatOleh: S.me.id, DibuatPada: now(), DikonfirmasiOleh: '', DikonfirmasiPada: null, _tmp: tag };
  const rows = [];
  (p.items || []).forEach(it => {
    if (it.bundleSku) (IX.bItems[it.bundleSku] || []).forEach((c, k) => rows.push(Object.assign({}, base, { TxID: tmpId('TX'), Jenis: 'BUNDLE_OUT', VariantID: slug(c.SKU) + '-' + slug(c.Warna) + '-' + slug(it.ukuran), Jumlah: -c.Jumlah * it.qty, BundleSKU: it.bundleSku, Paket: k === 0 ? it.qty : 0 })));
    else rows.push(Object.assign({}, base, { TxID: tmpId('TX'), Jenis: kind === 'out' ? 'OUT' : kind === 'po' ? 'PO_IN' : 'IN', VariantID: it.variantId, Jumlah: kind === 'out' ? -it.qty : it.qty }));
  });
  return rows;
}
/** Perbarui item PO di memori saat penerimaan dikonfirmasi. */
function applyPOLocal(rows) {
  const touched = {};
  rows.filter(r => r.Jenis === 'PO_IN').forEach(r => {
    const it = S.poItems.find(i => i.PONumber === r.Referensi && i.VariantID === r.VariantID);
    if (it) { it.JumlahDiterima += r.Jumlah; it.Sisa = it.JumlahPesan - it.JumlahDiterima; touched[r.Referensi] = 1; }
  });
  Object.keys(touched).forEach(no => {
    const po = S.po.find(p => p.PONumber === no); if (!po) return;
    const its = S.poItems.filter(i => i.PONumber === no);
    po.Status = its.every(i => i.JumlahDiterima >= i.JumlahPesan) ? 'Completed' : 'Partially Received';
  });
}
function submitTx(kind, payload, confirm, okTitle) {
  const tag = tmpId('G');
  const rows = localRows(kind, payload, tag);
  return optimistic({
    apply: () => { rows.forEach(r => S.tx.push(r)); if (confirm) { applyConfirmLocal(rows); applyPOLocal(rows); } },
    action: kind === 'in' ? 'tx.createIn' : kind === 'out' ? 'tx.createOut' : 'po.receive',
    data: Object.assign({}, payload, { confirm: !!confirm }),
    onOk: d => applyPatch(d, tag),
    okTitle: okTitle || (confirm ? 'Tersimpan & dikonfirmasi' : 'Tersimpan sebagai Pending')
  });
}

// ════════ DAFTAR GRUP TRANSAKSI & DETAIL ════════
const PERIODS = [['today', 'Hari ini'], ['7d', '7 hari'], ['30d', '30 hari'], ['month', 'Bulan ini'], ['all', `Semua (${45} hari)`]];
function inPeriod(ms, p) {
  if (!p || p === 'all') return true;
  if (p === 'today') return dayIdx(ms) === dayIdx(now());
  if (p === '7d') return ms >= dayStart(now()) - 6 * DAY;
  if (p === '30d') return ms >= dayStart(now()) - 29 * DAY;
  if (p === 'month') return ms >= monthStart(now());
  return true;
}
function srcLabel(g) {
  if (g.jenis === 'PO_IN') return `<span class="chip-ch"><span class="lg">${I('receipt_long')}</span>PO</span>`;
  if (g.jenis === 'OUT' || g.jenis === 'BUNDLE_OUT') return chCh(g.sumber);
  const ic = /batch/i.test(g.sumber) ? 'precision_manufacturing' : /awal/i.test(g.sumber) ? 'flag' : 'bolt';
  return `<span class="chip-ch"><span class="lg">${I(ic)}</span>${esc(g.sumber || 'Langsung')}</span>`;
}
function importOf(gid) { return S.imports.find(i => i.ImportID === gid); }
function groupRef(g) {
  const imp = importOf(g.id);
  if (imp) return `<div class="col"><b class="ellipsis" style="max-width:220px">${esc(imp.NamaFile)}</b><span class="muted mono" style="font-size:12px">Import · ${fmt(g.rows.length)} baris</span></div>`;
  return `<div class="col"><b class="mono nowrap">${esc(g.ref || g.id)}</b><span class="muted" style="font-size:12px">${esc(g.jenis === 'PO_IN' ? (g.rows[0].Catatan || '').split('·')[0] : g.id)}</span></div>`;
}
function groupTable(list, key, kind) {
  const pg = paginate(list, key, 15);
  return `<div class="table-wrap"><table class="tbl">
    <thead><tr><th>${kind === 'out' ? 'No. pesanan / ref' : 'No. batch / ref'}</th><th>Tanggal &amp; waktu</th><th>Sumber</th><th>Produk &amp; varian</th><th class="num">Jumlah</th><th>Dibuat oleh</th><th>Status</th><th></th></tr></thead>
    <tbody>${pg.rows.length ? pg.rows.map(g => {
      const first = g.rows[0];
      const others = new Set(g.rows.map(r => r.VariantID)).size - 1;
      const canConf = g.status === 'Pending' && !g.optimistic && can(kind === 'out' ? 'OUT_CONFIRM' : 'IN_CONFIRM');
      return `<tr class="clickable${g.optimistic ? ' optimistic' : ''}" data-act="group-open" data-id="${esc(g.id)}">
        <td>${groupRef(g)}</td>
        <td class="nowrap">${fmtDT(g.tanggal)}</td>
        <td>${srcLabel(g)}</td>
        <td>${g.jenis === 'BUNDLE_OUT' && first.BundleSKU ? `<div class="prod"><span class="thumb">${I('redeem')}</span><div class="col"><b class="ellipsis">${esc(IX.b[first.BundleSKU] ? IX.b[first.BundleSKU].NamaBundle : first.BundleSKU)}</b><span>${esc(vSub(first.VariantID).split(' · ')[1] || '')} · ${g.rows.length} komponen</span></div></div>` : prodCell(first.VariantID, others > 0 ? '+' + others + ' varian' : '')}</td>
        <td class="num ${g.qty >= 0 ? 'qty-pos' : 'qty-neg'}">${sgn(g.qty)} pcs</td>
        <td><div class="row"><span class="avatar" style="width:28px;height:28px;font-size:11px">${esc(initials(userName(g.dibuatOleh)))}</span><span class="nowrap">${esc(userName(g.dibuatOleh))}</span></div></td>
        <td>${txPill(g.status, g.optimistic)}</td>
        <td class="act">${canConf ? `<button class="btn btn-xs btn-primary" data-act="group-confirm" data-id="${esc(g.id)}">${I('check')}Konfirmasi</button>` : I('chevron_right', 'faint')}</td></tr>`;
    }).join('') : `<tr><td colspan="8">${emptyHTML('inbox', 'Tidak ada transaksi', 'Ubah filter periode atau status.')}</td></tr>`}</tbody></table></div>${pagerHTML(pg, key, 'batch transaksi')}`;
}
function txFilters(f, srcOpts) {
  return `<div class="filters">
    <div class="input-icon">${I('search')}<input class="input" data-filter="q" value="${esc(f.q || '')}" placeholder="Cari batch, no. PO/pesanan, SKU, produk…" aria-label="Cari"></div>
    <select class="select" data-filter="src" aria-label="Sumber"><option value="">Semua sumber</option>${srcOpts.map(s => `<option ${f.src === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
    <select class="select" data-filter="status" aria-label="Status"><option value="">Semua status</option>${['Pending', 'Confirmed', 'Rejected'].map(s => `<option value="${s}" ${f.status === s ? 'selected' : ''}>${s === 'Rejected' ? 'Ditolak' : s}</option>`).join('')}</select>
    <select class="select" data-filter="period" aria-label="Periode">${PERIODS.map(p => `<option value="${p[0]}" ${(f.period || 'all') === p[0] ? 'selected' : ''}>${p[1]}</option>`).join('')}</select>
    ${can('EXPORT') ? `<button class="btn btn-icon" data-act="export-open" data-type="${srcOpts.indexOf('Shopee') >= 0 ? 'keluar' : 'masuk'}" aria-label="Export" title="Export">${I('download')}</button>` : ''}</div>`;
}
function matchGroup(g, f) {
  if (f.status && g.status !== f.status) return false;
  if (f.src && (g.jenis === 'PO_IN' ? 'PO' : g.sumber) !== f.src) return false;
  if (!inPeriod(g.tanggal, f.period)) return false;
  if (f.q) {
    const q = f.q.toLowerCase(), imp = importOf(g.id);
    const hay = (g.id + ' ' + g.ref + ' ' + (imp ? imp.NamaFile : '') + ' ' + g.rows.slice(0, 60).map(r => r.VariantID + ' ' + vName(r.VariantID) + ' ' + r.Referensi).join(' ')).toLowerCase();
    if (hay.indexOf(q) < 0) return false;
  }
  return true;
}

function openGroup(gid) {
  const g = groups()[gid]; if (!g) return;
  const out = g.jenis === 'OUT' || g.jenis === 'BUNDLE_OUT';
  const imp = importOf(gid);
  const pend = g.status === 'Pending' && !g.optimistic;
  const perm = out ? 'OUT_CONFIRM' : 'IN_CONFIRM';
  const agg = {};
  g.rows.forEach(r => { const a = agg[r.VariantID] || (agg[r.VariantID] = { q: 0, before: null, after: null, n: 0 }); a.q += r.Jumlah; a.n++; if (a.before === null) a.before = r.StokSebelum; a.after = r.StokSesudah; });
  const vids = Object.keys(agg);
  const short = pend ? vids.filter(v => agg[v].q < 0 && stockOf(v) + agg[v].q < 0) : [];
  const j = JENIS[g.jenis] || JENIS.IN;
  const title = imp ? imp.NamaFile : (j.label + (g.ref ? ' · ' + g.ref : ''));
  openDrawer({
    title: title, sub: g.id + (imp ? ' · import ' + imp.Sumber : ''), badge: txPill(g.status, g.optimistic), wide: g.rows.length > 12, noFocus: true,
    body: `<div class="form-grid">
        <div class="field"><span class="flabel">Tanggal transaksi</span><b>${fmtDT(g.tanggal)}</b></div>
        <div class="field"><span class="flabel">Sumber</span><div>${srcLabel(g)}</div></div>
        <div class="field"><span class="flabel">Referensi</span><b class="mono">${esc(g.ref || '—')}</b></div>
        <div class="field"><span class="flabel">Dibuat oleh</span><span>${esc(userName(g.dibuatOleh))} · ${relTime(g.dibuatPada)}</span></div>
        ${g.konfPada ? `<div class="field span-2"><span class="flabel">${g.status === 'Rejected' ? 'Ditolak oleh' : 'Dikonfirmasi oleh'}</span><span>${esc(userName(g.konfOleh))} · ${fmtDT(g.konfPada)}</span></div>` : ''}
      </div>
      ${pend ? `<div class="banner banner-info">${I('hourglass_top')}<div><b>Belum mengubah stok</b><p>Transaksi Pending tidak menghitung stok tersedia sampai dikonfirmasi.</p></div></div>` : ''}
      ${short.length ? `<div class="banner banner-danger">${I('error')}<div><b>Stok tidak cukup untuk ${short.length} varian</b><p>${short.map(v => esc(vLabel(v)) + ' (tersedia ' + fmt(stockOf(v)) + ', dibutuhkan ' + fmt(-agg[v].q) + ')').join('; ')}</p></div></div>` : ''}
      ${g.rows[0].BundleSKU ? `<div class="banner">${I('redeem')}<div><b>${esc(IX.b[g.rows[0].BundleSKU] ? IX.b[g.rows[0].BundleSKU].NamaBundle : g.rows[0].BundleSKU)}</b><p>${fmt(sum(g.rows, r => r.Paket || 0))} paket dipecah menjadi komponen sesuai resep.</p></div></div>` : ''}
      <div class="table-wrap" style="border:1px solid var(--border);border-radius:8px;max-height:52vh"><table class="tbl dense">
        <thead><tr><th>Produk &amp; varian</th><th class="num">Perubahan</th><th class="num">${g.status === 'Confirmed' ? 'Sebelum → sesudah' : 'Stok kini → setelah'}</th></tr></thead>
        <tbody>${vids.slice(0, 300).map(v => { const a = agg[v]; const b = g.status === 'Confirmed' ? a.before : stockOf(v); const af = g.status === 'Confirmed' ? a.after : stockOf(v) + a.q; return `<tr><td>${prodCell(v, a.n > 1 ? a.n + ' pesanan' : '')}</td><td class="num ${a.q >= 0 ? 'qty-pos' : 'qty-neg'}">${sgn(a.q)}</td><td class="num nowrap">${g.status === 'Rejected' ? '<span class="muted">—</span>' : fmt(b) + ' → <b class="' + (af < 0 ? 't-danger' : '') + '">' + fmt(af) + '</b>'}</td></tr>`; }).join('')}</tbody>
        <tfoot><tr><td class="strong" style="padding:10px 14px">Total ${vids.length} varian</td><td class="num strong" style="padding:10px 14px">${sgn(g.qty)} pcs</td><td></td></tr></tfoot></table></div>
      ${g.rows[0].Catatan ? `<div class="field"><span class="flabel">Catatan</span><p>${esc(g.rows[0].Catatan)}</p></div>` : ''}`,
    foot: pend && can(perm) ? `<button class="btn btn-danger" data-act="${imp ? 'import-cancel' : 'group-reject'}" data-id="${esc(gid)}">${I('block')}${imp ? 'Batalkan import' : 'Tolak'}</button><span class="grow"></span><button class="btn" data-act="drawer-close">Tutup</button><button class="btn btn-primary" data-act="group-confirm" data-id="${esc(gid)}" ${short.length && S.settings.StokMinusMode !== 'tandai' ? 'disabled' : ''}>${I('task_alt')}${imp ? 'Konfirmasi proses' : 'Konfirmasi'} (${sgn(g.qty)} pcs)</button>`
      : `<span class="grow"></span>${pend ? `<span class="muted">Menunggu konfirmasi ${out ? 'Admin' : 'Admin/atasan'}.</span>` : ''}<button class="btn" data-act="drawer-close">Tutup</button>`
  });
}
async function confirmGroup(gid) {
  const g = groups()[gid];
  if (!g || g.status !== 'Pending') return;
  const rows = g.rows.filter(r => r.Status === 'Pending');
  const net = {}; rows.forEach(r => { net[r.VariantID] = (net[r.VariantID] || 0) + r.Jumlah; });
  const short = Object.keys(net).filter(v => net[v] < 0 && stockOf(v) + net[v] < 0);
  if (short.length && S.settings.StokMinusMode !== 'tandai') {
    modal({ icon: 'error', tone: 'danger', title: 'Stok tidak cukup', text: 'Transaksi ditolak agar stok tidak minus. Kurangi jumlah atau terima barang dulu.', body: `<ul class="insight">${short.map(v => `<li><b>${esc(vLabel(v))}</b> — tersedia ${fmt(stockOf(v))}, dibutuhkan ${fmt(-net[v])}</li>`).join('')}</ul>`, ok: false, cancel: 'Mengerti' });
    return;
  }
  const tot = sum(rows, r => r.Jumlah);
  const ok = await modal({ icon: 'task_alt', tone: 'success', title: 'Konfirmasi transaksi?', text: `${fmt(rows.length)} baris · total <b>${sgn(tot)} pcs</b>. Stok akan ${tot >= 0 ? 'bertambah' : 'berkurang'} dan tercatat di Audit.`, ok: 'Konfirmasi' });
  if (!ok) return;
  closeDrawer();
  const imp = importOf(gid);
  optimistic({
    apply: () => { applyConfirmLocal(rows); applyPOLocal(rows); if (imp) imp.Status = 'Confirmed'; },
    action: 'tx.confirm', data: { groupId: gid },
    onOk: d => applyPatch(d),
    okTitle: 'Transaksi dikonfirmasi'
  });
}
async function rejectGroup(gid) {
  const g = groups()[gid]; if (!g) return;
  let alasan = '';
  const ok = await modal({ icon: 'block', tone: 'danger', title: 'Tolak transaksi?', text: 'Stok tidak berubah. Riwayat tetap tersimpan sebagai Ditolak.', body: `<div class="field"><label for="rjWhy">Alasan</label><input id="rjWhy" class="input" placeholder="Mis. jumlah tidak sesuai fisik"></div>`, ok: 'Tolak transaksi', danger: true, onOk: box => { alasan = $('#rjWhy', box).value; } });
  if (!ok) return;
  closeDrawer();
  const rows = g.rows.filter(r => r.Status === 'Pending');
  optimistic({ apply: () => rows.forEach(r => { r.Status = 'Rejected'; r.DikonfirmasiOleh = S.me.id; r.DikonfirmasiPada = now(); }), action: 'tx.reject', data: { groupId: gid, alasan: alasan }, onOk: d => applyPatch(d), okTitle: 'Transaksi ditolak' });
}

// ════════ STOCK IN (F4) ════════
function renderStockIn() {
  const el = $('#page-stockin');
  const f = UI.f.stockin || (UI.f.stockin = { period: 'all' });
  const all = groupList(g => g.jenis === 'IN' || g.jenis === 'PO_IN');
  const list = all.filter(g => matchGroup(g, f));
  const pend = all.filter(g => g.status === 'Pending');
  const today = all.filter(g => g.status === 'Confirmed' && dayIdx(g.konfPada) === dayIdx(now()));
  const openPO = S.po.filter(p => p.Status === 'Ordered' || p.Status === 'Partially Received');
  const sisa = sum(S.poItems.filter(i => openPO.some(p => p.PONumber === i.PONumber)), i => i.Sisa);
  const d = S.dashboard || emptyDash();
  el.innerHTML = pageHead('Stock In', { badge: `<span class="pill pill-success">${I('south_east', 'sm')}Barang masuk</span>`, sub: 'Catat batch produksi, penerimaan PO, atau penerimaan langsung. Stok bertambah setelah dikonfirmasi.', actions: (can('IN_CREATE') && can('PO_MANAGE') ? `<button class="btn" data-act="po-receive">${I('receipt_long')}Penerimaan PO</button>` : '') + (can('IN_CREATE') ? `<button class="btn btn-primary" data-act="in-new">${I('add')}Stock in baru</button>` : '') }) + `
    <div class="grid g-4">
      ${kpi({ cls: 'kpi-in', label: 'Total masuk bulan ini', icon: 'move_to_inbox', val: fmt(d.kpi.inMonth), unit: 'pcs', sub: delta(d.kpi.inMonth, d.kpi.inPrev) })}
      ${kpi({ cls: 'kpi-info', label: 'Menunggu konfirmasi', icon: 'hourglass_top', val: fmt(sum(pend, g => g.qty)), unit: 'pcs', sub: `<span class="t-info strong">● ${pend.length} batch perlu persetujuan</span>`, act: 'filter-pending', arg: 'stockin' })}
      ${kpi({ cls: 'kpi-plain', label: 'PO terbuka / transit', icon: 'local_shipping', val: fmt(openPO.length), unit: 'PO aktif', sub: `<span class="muted">${fmt(sisa)} pcs sisa alokasi</span>`, act: 'nav-po' })}
      ${kpi({ cls: 'kpi-plain', label: 'Dikonfirmasi hari ini', icon: 'done_all', val: fmt(sum(today, g => g.qty)), unit: 'pcs', sub: `<span class="t-success">${I('check_circle', 'sm')} Masuk stok aktif gudang</span>` })}
    </div>
    <div class="card table-card sec">${txFilters(f, ['Batch Produksi', 'Penerimaan Langsung', 'PO', 'Stok Awal'])}${groupTable(list, 'stockin', 'in')}</div>`;
  bindFilterInputs(el, 'stockin');
}
function openStockIn(prefVid) {
  if (!can('IN_CREATE')) { toast('Tidak ada akses', 'Anda tidak punya izin input barang masuk.', 'warning'); return; }
  let ed;
  openDrawer({
    title: 'Stock in baru', sub: 'Barang masuk dari batch produksi atau penerimaan langsung', badge: '<span class="pill pill-success">Barang masuk</span>',
    body: `<div class="form-grid"><div class="field"><label for="inSrc">Sumber masuk</label><select id="inSrc" class="select"><option>Batch Produksi</option><option>Penerimaan Langsung</option></select></div>
      <div class="field"><label for="inRef">No. batch / referensi</label><input id="inRef" class="input mono" value="BTH-${esc(stamp().slice(2, 8))}-${Math.floor(100 + Math.random() * 900)}"></div>
      <div class="field"><label for="inDate">Tanggal masuk</label><input id="inDate" type="date" class="input" value="${isoDate(now())}" max="${isoDate(now())}"></div>
      <div class="field"><label for="inNote">Catatan</label><input id="inNote" class="input" placeholder="Opsional"></div></div>
      <div class="field"><span class="flabel">Item barang masuk</span><div class="col gap-12" id="inItems"></div><button class="btn btn-sm" data-act="ed-add" style="align-self:flex-start">${I('add')}Tambah item</button></div>
      <div class="help" id="inSum"></div>`,
    foot: `<button class="btn" data-act="drawer-close">Batal</button><span class="grow"></span><button class="btn" id="inPend">Simpan sebagai Pending</button>${can('IN_CONFIRM') ? `<button class="btn btn-primary" id="inConf">${I('task_alt')}Simpan &amp; konfirmasi</button>` : ''}`,
    onMount: d => {
      ed = ItemsEditor($('#inItems', d), { mode: 'in', initial: prefVid ? [{ id: prefVid }] : [], onChange: e => { const n = sum(e.value(), x => x.qty); $('#inSum', d).innerHTML = n ? `Total <b>${fmt(n)} pcs</b> dari ${e.value().length} item.` : ''; } });
      d._ed = ed;
      const go = confirm => {
        const pr = ed.problems(); if (pr.length) { toast('Lengkapi item', pr[0], 'warning'); return; }
        const payload = { sumber: $('#inSrc', d).value, referensi: $('#inRef', d).value.trim(), tanggal: parseIsoDate($('#inDate', d).value), catatan: $('#inNote', d).value.trim(), items: ed.value() };
        closeDrawer(); submitTx('in', payload, confirm);
      };
      $('#inPend', d).onclick = () => go(false);
      if ($('#inConf', d)) $('#inConf', d).onclick = () => go(true);
    }
  });
}

// ════════ STOCK OUT — manual (F5 metode 1) ════════
function renderStockOut() {
  const el = $('#page-stockout');
  const f = UI.f.stockout || (UI.f.stockout = { tab: 'list', period: 'all' });
  const tab = f.tab || 'list';
  const pendImp = S.imports.filter(i => i.Status === 'Preview' && i.Jenis !== 'RTS');
  const actions = (can('IMPORT') ? `<button class="btn${tab === 'import' ? ' btn-primary' : ''}" data-act="so-tab" data-t="import">${I('upload_file')}Import marketplace</button>` : '') + (can('OUT_CREATE') && tab !== 'import' ? `<button class="btn btn-primary" data-act="out-new">${I('add')}Barang keluar manual</button>` : '');
  let body = '';
  if (tab === 'import') body = renderImportWizard();
  else if (tab === 'imports') body = importsView();
  else {
    const all = groupList(g => g.jenis === 'OUT' || g.jenis === 'BUNDLE_OUT');
    const list = all.filter(g => matchGroup(g, f));
    const pend = all.filter(g => g.status === 'Pending');
    const d = S.dashboard || emptyDash();
    body = `<div class="grid g-4">
      ${kpi({ cls: 'kpi-out', label: 'Keluar hari ini', icon: 'today', val: fmt(d.kpi.outToday || sum(all.filter(g => g.status === 'Confirmed' && dayIdx(g.tanggal) === dayIdx(now())), g => -g.qty)), unit: 'pcs' })}
      ${kpi({ cls: 'kpi-out', label: 'Keluar bulan ini', icon: 'local_shipping', val: fmt(d.kpi.outMonth), unit: 'pcs', sub: delta(d.kpi.outMonth, d.kpi.outPrev) })}
      ${kpi({ cls: 'kpi-info', label: 'Menunggu konfirmasi', icon: 'hourglass_top', val: fmt(pend.length), unit: 'transaksi', sub: `<span class="muted">${fmt(-sum(pend, g => g.qty))} pcs belum mengurangi stok</span>`, act: 'filter-pending', arg: 'stockout' })}
      ${kpi({ cls: pendImp.length ? 'kpi-alert' : 'kpi-plain', label: 'Import menunggu', icon: 'upload_file', val: fmt(pendImp.length), unit: 'file', sub: pendImp.length ? '<span class="t-danger strong">Perlu Konfirmasi Proses</span>' : '<span class="muted">Tidak ada antrean</span>', act: 'so-tab', arg: 'imports' })}
    </div>
    ${pendImp.length ? `<div class="banner banner-warning sec">${I('upload_file')}<div><b>${pendImp.length} file import menunggu konfirmasi</b><p>${pendImp.map(i => esc(i.NamaFile) + ' (' + esc(i.Sumber) + ', ' + fmt(i.BarisValid) + ' baris)').join(' · ')}</p></div><div class="actions"><button class="btn btn-sm" data-act="so-tab" data-t="imports">Lihat</button></div></div>` : ''}
    <div class="card table-card sec">${txFilters(f, markets())}${groupTable(list, 'stockout', 'out')}</div>`;
  }
  el.innerHTML = pageHead('Stock Out', { badge: `<span class="pill pill-info">${I('north_east', 'sm')}Barang keluar</span>`, sub: 'Input manual atau import file pesanan Shopee, TikTok Shop, Lazada. Stok berkurang hanya setelah dikonfirmasi.', actions: actions }) +
    `<div class="tabs"><button class="tab${tab === 'list' ? ' on' : ''}" data-act="so-tab" data-t="list">${I('list_alt')}Riwayat &amp; pending</button>${can('IMPORT') ? `<button class="tab${tab === 'import' ? ' on' : ''}" data-act="so-tab" data-t="import">${I('upload_file')}Import marketplace</button>` : ''}<button class="tab${tab === 'imports' ? ' on' : ''}" data-act="so-tab" data-t="imports">${I('folder_open')}Riwayat import ${pendImp.length ? `<span class="n alert">${pendImp.length}</span>` : ''}</button></div>` + body;
  bindFilterInputs(el, 'stockout');
  if (tab === 'import') mountImportWizard();
}
function importsView() {
  const list = S.imports.filter(i => i.Jenis !== 'RTS');
  if (!list.length) return `<div class="card">${emptyHTML('folder_open', 'Belum ada riwayat import', 'File ekspor marketplace yang diimpor akan tercatat di sini.')}</div>`;
  return `<div class="card table-card"><div class="table-wrap"><table class="tbl"><thead><tr><th>File</th><th>Sumber</th><th>Diimpor</th><th class="num">Baris valid</th><th class="num">Dilewati</th><th>Status</th><th></th></tr></thead><tbody>${list.map(i => {
    const st = i.Status === 'Preview' ? '<span class="pill pill-warning">' + I('hourglass_top') + 'Menunggu konfirmasi</span>' : i.Status === 'Confirmed' ? txPill('Confirmed') : '<span class="pill pill-outline">Dibatalkan</span>';
    return `<tr class="${groups()[i.ImportID] ? 'clickable' : ''}" ${groups()[i.ImportID] ? `data-act="group-open" data-id="${esc(i.ImportID)}"` : ''}><td><div class="row">${I('description', 'faint')}<div class="col"><b class="ellipsis" style="max-width:280px">${esc(i.NamaFile)}</b><span class="muted mono" style="font-size:12px">${esc(i.ImportID)}</span></div></div></td><td>${chCh(i.Sumber)}</td><td class="nowrap">${fmtDT(i.TanggalImport)}<div class="muted" style="font-size:12px">${esc(userName(i.DiimporOleh))}</div></td><td class="num">${fmt(i.BarisValid)}</td><td class="num muted">${fmt(i.BarisDilewati)}</td><td>${st}</td>
      <td class="act">${i.Status === 'Preview' && can('OUT_CONFIRM') && groups()[i.ImportID] ? `<button class="btn btn-xs btn-primary" data-act="group-confirm" data-id="${esc(i.ImportID)}">${I('task_alt')}Konfirmasi proses</button>` : ''}${i.Status === 'Preview' && can('IMPORT') ? ` <button class="btn btn-xs" data-act="import-cancel" data-id="${esc(i.ImportID)}">Batalkan</button>` : ''}</td></tr>`;
  }).join('')}</tbody></table></div></div>`;
}
function openStockOut(prefVid) {
  if (!can('OUT_CREATE')) { toast('Tidak ada akses', 'Anda tidak punya izin input barang keluar.', 'warning'); return; }
  let ed, src = 'Manual';
  const mk = markets();
  openDrawer({
    title: 'Barang keluar manual', sub: 'Varian satuan atau paket bundle (dipecah otomatis per komponen)', badge: '<span class="pill pill-info">Barang keluar</span>',
    body: `<div class="field"><span class="flabel">Sumber penjualan</span><div class="pick-chips" id="outSrc">${mk.map(m => `<button type="button" class="pick-chip${m === src ? ' on' : ''}" data-src="${esc(m)}">${CHANNELS[m] && CHANNELS[m].logo ? `<img src="${ASSETS[CHANNELS[m].logo]}" alt="">` : I((CHANNELS[m] || {}).icon || 'storefront', 'sm')}${esc(m)}</button>`).join('')}</div></div>
      <div class="form-grid"><div class="field"><label for="outRef">No. pesanan (opsional)</label><input id="outRef" class="input mono" placeholder="Mis. 241022TKT9912"></div>
      <div class="field"><label for="outDate">Tanggal</label><input id="outDate" type="date" class="input" value="${isoDate(now())}" max="${isoDate(now())}"></div></div>
      <div class="field"><span class="flabel">Item barang keluar</span><div class="col gap-12" id="outItems"></div><button class="btn btn-sm" data-act="ed-add" style="align-self:flex-start">${I('add')}Tambah item</button></div>
      <div id="outSum"></div>
      <div class="field"><label for="outNote">Catatan</label><input id="outNote" class="input" placeholder="Opsional"></div>`,
    foot: `<button class="btn" data-act="drawer-close">Batal</button><span class="grow"></span><button class="btn" id="outPend">Simpan sebagai Pending</button>${can('OUT_CONFIRM') ? `<button class="btn btn-primary" id="outConf">${I('task_alt')}Simpan &amp; konfirmasi</button>` : ''}`,
    onMount: d => {
      $('#outSrc', d).addEventListener('click', e => { const b = e.target.closest('[data-src]'); if (!b) return; src = b.dataset.src; $$('[data-src]', d).forEach(x => x.classList.toggle('on', x === b)); });
      const sumBox = $('#outSum', d);
      ed = ItemsEditor($('#outItems', d), {
        mode: 'out', bundles: true, initial: prefVid ? [{ id: prefVid }] : [], onChange: e => {
          const n = e.net(), keys = Object.keys(n).filter(k => n[k] > 0), sh = e.shortages();
          if (!keys.length) { sumBox.innerHTML = ''; return; }
          sumBox.innerHTML = `<div class="dr-section"><div class="row between"><span class="overline">Ringkasan pengurangan per varian</span><b>${fmt(sum(keys, k => n[k]))} helai</b></div>${keys.map(k => `<div class="row between"><span class="ellipsis">${esc(IX.v[k] ? k : k + ' (varian belum ada)')}</span><span class="tnum ${n[k] > stockOf(k) ? 't-danger strong' : ''}">${fmt(stockOf(k))} → ${fmt(stockOf(k) - n[k])}</span></div>`).join('')}
            ${sh.length ? `<div class="banner banner-danger" style="padding:10px 12px">${I('error')}<p><b>Stok tidak cukup:</b> ${sh.map(s => esc(s.vid) + ' (tersedia ' + fmt(s.have) + ', dibutuhkan ' + fmt(s.need) + ')').join('; ')}${S.settings.StokMinusMode === 'tandai' ? ' — akan ditandai "Stok Minus".' : ' — transaksi akan ditolak.'}</p></div>` : ''}</div>`;
        }
      });
      d._ed = ed;
      const go = confirm => {
        const pr = ed.problems(); if (pr.length) { toast('Lengkapi item', pr[0], 'warning'); return; }
        if (confirm && ed.shortages().length && S.settings.StokMinusMode !== 'tandai') { toast('Stok tidak cukup', 'Kurangi jumlah, atau simpan sebagai Pending.', 'danger'); return; }
        const payload = { sumber: src, referensi: $('#outRef', d).value.trim(), tanggal: parseIsoDate($('#outDate', d).value), catatan: $('#outNote', d).value.trim(), items: ed.value() };
        closeDrawer(); submitTx('out', payload, confirm);
      };
      $('#outPend', d).onclick = () => go(false);
      if ($('#outConf', d)) $('#outConf', d).onclick = () => go(true);
    }
  });
}

// ════════ PENERIMAAN PO (Goods Receipt) ════════
function openReceive(poNo) {
  const open = S.po.filter(p => p.Status === 'Ordered' || p.Status === 'Partially Received').sort((a, b) => b.TanggalBuat - a.TanggalBuat);
  if (!open.length) { toast('Tidak ada PO aktif', 'Ubah status PO menjadi Ordered terlebih dahulu.', 'warning'); return; }
  const st = { po: poNo && open.some(p => p.PONumber === poNo) ? poNo : open[0].PONumber, qty: {} };
  const pendingQty = no => { const m = {}; S.tx.forEach(t => { if (t.Jenis === 'PO_IN' && t.Status === 'Pending' && t.Referensi === no) m[t.VariantID] = (m[t.VariantID] || 0) + t.Jumlah; }); return m; };
  const draw = () => {
    const d = $('#drawer');
    const po = S.po.find(p => p.PONumber === st.po);
    const items = S.poItems.filter(i => i.PONumber === st.po);
    const pq = pendingQty(st.po);
    let errs = 0, total = 0;
    $('#rcStatus', d).innerHTML = `<span class="pill pill-info">${esc(po.Status)}</span>`;
    $('#rcCount', d).textContent = items.length + ' SKU dalam PO';
    $('#rcItems', d).innerHTML = items.map(i => {
      const v = IX.v[i.VariantID] || { Warna: '?', Ukuran: '?' };
      const maks = Math.max(0, i.JumlahPesan - i.JumlahDiterima - (pq[i.VariantID] || 0));
      const done = i.JumlahDiterima >= i.JumlahPesan;
      const q = st.qty[i.VariantID] === undefined ? '' : st.qty[i.VariantID];
      const bad = q !== '' && (int(q) > maks || int(q) < 0 || isNaN(int(q)));
      if (bad) errs++; else total += int(q) || 0;
      return `<div class="rcv-item${bad ? ' bad' : ''}${done ? ' done' : ''}">
        <div class="row top"><span class="size-badge${done ? ' soft' : ''}">${esc(v.Ukuran)}</span><div class="col grow"><b>${esc(vName(i.VariantID))}</b><span class="muted mono" style="font-size:12px">${esc(v.Warna + ' ' + v.Ukuran)} · SKU: ${esc(i.VariantID)}</span></div>${done ? `<span class="pill pill-success">${I('check', 'sm')}Lengkap (selesai)</span>` : `<span class="pill pill-success">Sisa ${fmt(i.Sisa)} pcs</span>`}</div>
        <div class="stats3"><div><span>Dipesan</span><b>${fmt(i.JumlahPesan)} pcs</b></div><div><span>Sudah diterima</span><b class="t-success">${fmt(i.JumlahDiterima)} pcs</b></div><div><span>Sisa PO</span><b>${fmt(i.Sisa)} pcs</b></div></div>
        ${done ? `<div class="row between"><i class="muted">Semua kuantitas telah diterima</i><span class="muted">Terima: 0</span></div>` : `<div class="row between">${bad ? `<span class="t-danger strong" style="font-size:12.5px">${I('error', 'sm')} Kuantitas melebihi sisa PO! Maksimal ${fmt(maks)} pcs <button class="link" data-rc-max="${esc(i.VariantID)}" data-max="${maks}" style="font-size:12.5px">Pakai ${fmt(maks)}</button></span>` : `<button class="link" style="font-size:12.5px;font-weight:600;color:var(--success);text-decoration:none" data-rc-max="${esc(i.VariantID)}" data-max="${maks}">${I('check', 'sm')} Maksimal ${fmt(maks)} pcs (terima semua)</button>`}
          <div class="row"><span class="muted">Terima:</span><div class="unit" data-unit="pcs" style="width:110px"><input type="number" min="0" step="1" class="input${bad ? ' invalid' : ''}" data-rc="${esc(i.VariantID)}" value="${esc(q)}" placeholder="0" aria-label="Jumlah diterima ${esc(i.VariantID)}"></div></div></div>
          ${pq[i.VariantID] ? `<span class="help">${fmt(pq[i.VariantID])} pcs sudah tercatat di penerimaan Pending.</span>` : ''}`}</div>`;
    }).join('');
    $('#rcErr', d).hidden = !errs;
    if (errs) $('#rcErr p', d).textContent = `Terdapat ${errs} item melebihi sisa PO yang diperbolehkan (AC-F7-2). Periksa dan sesuaikan kembali kuantitas fisik sebelum konfirmasi.`;
    const cb = $('#rcConf', d), pb = $('#rcPend', d);
    if (cb) { cb.disabled = !!errs || !total; cb.innerHTML = errs ? `${I('block')}Konfirmasi ditolak (perbaiki kuantitas)` : `${I('task_alt')}Konfirmasi penerimaan (+${fmt(total)} pcs)`; }
    pb.disabled = !!errs || !total;
  };
  openDrawer({
    title: 'Penerimaan PO', badge: '<span class="pill pill-info">● Goods receipt</span>', sub: 'Pencatatan barang masuk dari Purchase Order yang aktif',
    body: `<div class="dr-section"><div class="field"><div class="row between"><label for="rcPo">Nomor purchase order</label><span id="rcStatus"></span></div><select id="rcPo" class="select">${open.map(p => `<option value="${esc(p.PONumber)}" ${p.PONumber === st.po ? 'selected' : ''}>${esc(p.PONumber)}${p.Vendor ? ' — ' + esc(p.Vendor) : ''}</option>`).join('')}</select></div>
        <div class="form-grid"><div class="field"><label for="rcSj">No. surat jalan (SJ) <span class="req">*</span></label><input id="rcSj" class="input mono" placeholder="SJ-2026-001"></div>
        <div class="field"><label for="rcDate">Tanggal penerimaan</label><input id="rcDate" type="date" class="input" value="${isoDate(now())}" max="${isoDate(now())}"></div></div>
        <div class="field"><label for="rcNote">Catatan / batch gudang</label><input id="rcNote" class="input" placeholder="Mis. Batch 2, kondisi kardus baik"></div></div>
      <div id="rcErr" class="banner banner-danger" hidden>${I('error')}<div><b>Validasi penerimaan gagal</b><p></p></div></div>
      <div class="row between"><div class="col"><span class="overline">Rincian item sisa PO</span><span class="muted" style="font-size:12.5px">Alokasi kuantitas aktual fisik yang diterima</span></div><span class="pill pill-outline pill-lg" id="rcCount"></span></div>
      <div class="col gap-12" id="rcItems"></div>`,
    foot: `<button class="btn" data-act="drawer-close" style="flex:1">Batal</button><button class="btn" id="rcPend" style="flex:1">Simpan sebagai Pending</button>${can('IN_CONFIRM') ? `<button class="btn btn-primary btn-block" id="rcConf"></button>` : ''}`,
    onMount: d => {
      draw();
      $('#rcPo', d).addEventListener('change', e => { st.po = e.target.value; st.qty = {}; draw(); });
      d.addEventListener('input', e => { const v = e.target.dataset.rc; if (!v) return; st.qty[v] = e.target.value; const pos = e.target.selectionStart; draw(); const n = $(`[data-rc="${CSS.escape(v)}"]`, d); n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { } });
      d.addEventListener('click', e => { const b = e.target.closest('[data-rc-max]'); if (b) { st.qty[b.dataset.rcMax] = b.dataset.max; draw(); } });
      const go = confirm => {
        const sj = $('#rcSj', d).value.trim();
        if (!sj) { toast('Lengkapi data', 'No. Surat Jalan wajib diisi.', 'warning'); $('#rcSj', d).focus(); return; }
        const items = Object.keys(st.qty).filter(k => int(st.qty[k]) > 0).map(k => ({ variantId: k, qty: int(st.qty[k]) }));
        const payload = { poNumber: st.po, sj: sj, tanggal: parseIsoDate($('#rcDate', d).value), catatan: $('#rcNote', d).value.trim(), items: items, referensi: st.po, sumber: 'PO' };
        closeDrawer();
        submitTx('po', payload, confirm, confirm ? 'Penerimaan dikonfirmasi' : 'Penerimaan tersimpan (Pending)');
      };
      $('#rcPend', d).onclick = () => go(false);
      if ($('#rcConf', d)) $('#rcConf', d).onclick = () => go(true);
    }
  });
}

Object.assign(ACT, {
  'group-open': el => openGroup(el.dataset.id),
  'group-confirm': (el, e) => { e.stopPropagation(); confirmGroup(el.dataset.id); },
  'group-reject': el => rejectGroup(el.dataset.id),
  'in-new': el => openStockIn(el.dataset.vid),
  'out-new': el => openStockOut(el.dataset.vid),
  'po-receive': el => openReceive(el.dataset.po),
  'ed-add': () => { const d = $('#drawer'); if (d._ed) d._ed.add(); },
  'so-tab': el => { const f = UI.f.stockout || (UI.f.stockout = {}); f.tab = el.dataset.t || el.dataset.arg; f.pg = 1; rerender(); },
  'filter-pending': el => { const k = el.dataset.arg; const f = UI.f[k] || (UI.f[k] = {}); f.status = 'Pending'; f.tab = 'list'; f.pg = 1; rerender(); },
  'nav-po': () => navigateTo('po'),
  'import-cancel': async (el, e) => {
    e.stopPropagation();
    const id = el.dataset.id;
    const ok = await modal({ icon: 'block', tone: 'danger', title: 'Batalkan import?', text: 'Semua baris Pending dari file ini ditolak. Stok tidak berubah.', ok: 'Batalkan import', danger: true });
    if (!ok) return;
    closeDrawer();
    const g = groups()[id];
    optimistic({
      apply: () => { if (g) g.rows.forEach(r => { if (r.Status === 'Pending') r.Status = 'Rejected'; }); const i = importOf(id); if (i) i.Status = 'Dibatalkan'; S.rts = S.rts.filter(r => !(r.ImportID === id && r.Status === 'PENDING_STOCK')); },
      action: 'import.cancel', data: { importId: id }, okTitle: 'Import dibatalkan'
    });
  }
});
