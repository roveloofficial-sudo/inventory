'use strict';

// ════════ STOCK OPNAME (F9) — sesi + autosave lokal (Prinsip 2) ════════
function opKey() { return 'rovelo_opname_' + (S.me ? S.me.id : ''); }
function opState() {
  if (UI.op) return UI.op;
  const local = store.get(opKey());
  const draft = (S.opname.sessions || []).find(s => s.Status === 'Draft');
  if (local && local.items) { UI.op = local; if (draft && !local.id) UI.op.id = draft.OpnameID; return UI.op; }
  if (draft) {
    const items = {};
    (S.opname.items || []).filter(i => i.OpnameID === draft.OpnameID).forEach(i => { items[i.VariantID] = { fisik: i.StokFisik === null ? '' : String(i.StokFisik), catatan: i.Catatan || '' }; });
    UI.op = { id: draft.OpnameID, lingkup: draft.Lingkup || '', catatan: draft.Catatan || '', items: items, started: draft.Tanggal };
    return UI.op;
  }
  return null;
}
const saveOpLocal = debounce(() => { if (UI.op) store.set(opKey(), UI.op); }, 400);
function opVariants(op) {
  return S.variants.filter(v => v.Aktif && (!op.lingkup || (IX.p[v.SKU] && IX.p[v.SKU].CategoryID === op.lingkup)) || (op.items[v.VariantID] && op.items[v.VariantID].fisik !== '')).sort(sortVariants);
}
function opCalc(op) {
  const vs = opVariants(op);
  let counted = 0, diff = 0, kurang = 0, lebih = 0, net = 0, fis = 0, sys = 0;
  vs.forEach(v => {
    const it = op.items[v.VariantID];
    if (!it || it.fisik === '' || it.fisik === undefined) return;
    const f = Number(it.fisik), s = stockOf(v.VariantID);
    counted++; fis += f; sys += s;
    const d = f - s; if (d) { diff++; net += d; if (d < 0) kurang += -d; else lebih += d; }
  });
  return { vs: vs, counted: counted, diff: diff, kurang: kurang, lebih: lebih, net: net, fis: fis, sys: sys };
}
function renderOpname() {
  const el = $('#page-opname');
  const op = opState();
  const head = pageHead('Stock Opname', { badge: '<span class="pill pill-outline">Physical count audit</span>', sub: 'Pencocokan stok fisik gudang terhadap catatan sistem. Hasil konfirmasi menerbitkan transaksi OPNAME di Audit/History tanpa mengubah riwayat sebelumnya.', actions: op ? `<button class="btn" data-act="op-save">${I('bookmark')}Simpan draft</button><button class="btn" data-act="op-history">${I('history')}Riwayat sesi</button><button class="btn btn-primary" data-act="op-confirm">${I('task_alt')}Konfirmasi opname</button>` : `<button class="btn" data-act="op-history">${I('history')}Riwayat sesi</button>` });
  if (!op) {
    el.innerHTML = head + `<div class="grid g-2-1"><div class="card card-pad col gap-16"><h3>Mulai sesi opname</h3><p class="muted">Pilih lingkup hitung. Stok sistem tidak berubah sampai sesi dikonfirmasi oleh Owner/Manager.</p>
      <div class="field"><label for="opScope">Lingkup</label><select id="opScope" class="select"><option value="">Semua varian aktif (${fmt(activeVariants().length)})</option>${S.categories.filter(c => c.Aktif).map(c => `<option value="${esc(c.CategoryID)}">Kategori: ${esc(c.NamaKategori)} (${fmt(S.variants.filter(v => v.Aktif && IX.p[v.SKU] && IX.p[v.SKU].CategoryID === c.CategoryID).length)})</option>`).join('')}</select></div>
      <div class="field"><label for="opNote">Catatan sesi</label><input id="opNote" class="input" placeholder="Mis. Opname bulanan rak A–B"></div>
      <button class="btn btn-primary" data-act="op-start" style="align-self:flex-start">${I('play_arrow')}Mulai sesi</button></div>
      <div class="card card-pad"><h3>Sesi terakhir</h3>${opSessionsList(5)}</div></div>`;
    return;
  }
  const f = UI.f.opname || (UI.f.opname = { seg: 'all' });
  const c = opCalc(op);
  const q = String(f.q || '').toLowerCase();
  const rows = c.vs.filter(v => {
    const it = op.items[v.VariantID]; const has = it && it.fisik !== '' && it.fisik !== undefined;
    const d = has ? Number(it.fisik) - stockOf(v.VariantID) : 0;
    if (f.seg === 'diff' && !(has && d !== 0)) return false;
    if (f.seg === 'match' && !(has && d === 0)) return false;
    if (f.seg === 'todo' && has) return false;
    if (f.cat && (!IX.p[v.SKU] || IX.p[v.SKU].CategoryID !== f.cat)) return false;
    if (q && (v.VariantID + ' ' + vName(v.VariantID) + ' ' + v.Warna).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
  const sess = S.opname.sessions.find(s => s.OpnameID === op.id);
  el.innerHTML = head + `
    <div class="grid g-4">
      <div class="kpi kpi-plain"><div class="kpi-top"><span class="kpi-label">Sesi aktif</span><span class="kpi-ic">${I('assignment')}</span></div><div class="kpi-val" style="font-size:22px">${esc(op.id || 'Draft lokal')}</div><div class="kpi-sub">${I('schedule', 'sm')} ${fmtDT(op.started || now())}</div><div class="kpi-sub">${I('badge', 'sm')} Petugas: ${esc(sess ? userName(sess.DibuatOleh) : S.me.nama)}</div></div>
      <div class="kpi kpi-plain"><div class="kpi-top"><span class="kpi-label">Item dihitung</span><span class="kpi-ic" style="color:var(--success)">${I('playlist_add_check')}</span></div><div class="kpi-val" id="opK1">${fmt(c.counted)}<small>/ ${fmt(c.vs.length)} varian</small></div><div class="progress mt-8"><i id="opK1b" style="width:${c.vs.length ? c.counted / c.vs.length * 100 : 0}%"></i></div><div class="kpi-sub t-success" id="opK1c">${c.vs.length ? Math.round(c.counted / c.vs.length * 100) : 0}% progres pencatatan</div></div>
      <div class="kpi kpi-plain"><div class="kpi-top"><span class="kpi-label t-danger">Item selisih</span><span class="kpi-ic" style="color:var(--danger)">${I('difference')}</span></div><div class="kpi-val t-danger" id="opK2">${fmt(c.diff)}<small>varian</small></div><div class="row mt-8" id="opK2b"><span class="pill pill-danger">${fmt(c.kurang)} pcs kurang</span><span class="pill pill-success">${fmt(c.lebih)} pcs lebih</span></div></div>
      <div class="kpi kpi-plain"><div class="kpi-top"><span class="kpi-label">Net total selisih</span><span class="kpi-ic">${I('balance')}</span></div><div class="kpi-val" id="opK3">${sgn(c.net)}<small>pcs</small></div><div class="kpi-sub" id="opK3b">Fisik: <b>${fmt(c.fis)}</b> · Sistem: <b>${fmt(c.sys)}</b> pcs</div></div>
    </div>
    <div class="banner banner-info sec">${I('verified_user')}<div><b>Peran khusus &amp; prosedur verifikasi (AC-F9-1)</b><p>Hanya Owner dan Manager (atau member dengan izin OPNAME) yang dapat memfinalisasi. Saat konfirmasi, selisih dihitung ulang terhadap stok terkini lalu stok sistem disamakan dengan stok fisik. Draft tersimpan otomatis di perangkat ini.</p></div></div>
    <div class="card table-card sec">
      <div class="filters"><div class="input-icon">${I('search')}<input class="input" data-filter="q" value="${esc(f.q || '')}" placeholder="Cari SKU, nama garmen, warna…" aria-label="Cari"></div>
        <select class="select" data-filter="cat" aria-label="Kategori"><option value="">Semua kategori</option>${S.categories.map(x => `<option value="${esc(x.CategoryID)}" ${f.cat === x.CategoryID ? 'selected' : ''}>${esc(x.NamaKategori)}</option>`).join('')}</select>
        <div class="seg">${[['all', 'Semua', c.vs.length], ['diff', 'Ada selisih', c.diff], ['match', 'Sesuai', c.counted - c.diff], ['todo', 'Belum dihitung', c.vs.length - c.counted]].map(s => `<button class="${(f.seg || 'all') === s[0] ? 'on' : ''}" data-act="op-seg" data-s="${s[0]}">${s[1]} (${fmt(s[2])})</button>`).join('')}</div></div>
      <div class="table-wrap" style="max-height:68vh"><table class="tbl"><thead><tr><th>Produk &amp; SKU</th><th>Varian</th><th class="num">Stok sistem</th><th class="center">Stok fisik</th><th class="num">Selisih</th><th>Catatan / alasan</th></tr></thead>
        <tbody>${rows.map(v => { const it = op.items[v.VariantID] || {}; const has = it.fisik !== '' && it.fisik !== undefined; const d = has ? Number(it.fisik) - stockOf(v.VariantID) : null; return `<tr>
          <td><div class="prod">${thumb(v.VariantID)}<div class="col"><b class="ellipsis">${esc(vName(v.VariantID))}</b><span class="mono" style="font-size:12px">${esc(v.VariantID)} · ${esc(IX.c[(IX.p[v.SKU] || {}).CategoryID] ? IX.c[IX.p[v.SKU].CategoryID].NamaKategori : '')}</span></div></div></td>
          <td class="nowrap"><span class="color-chip">${dotC(v.Warna)}${esc(v.Warna)} — ${esc(v.Ukuran)}</span></td>
          <td class="num strong">${fmt(stockOf(v.VariantID))} pcs</td>
          <td class="center"><input type="number" min="0" step="1" inputmode="numeric" class="input opname-in${d < 0 ? ' diff-neg' : d > 0 ? ' diff-pos' : ''}" data-op="${esc(v.VariantID)}" value="${esc(has ? it.fisik : '')}" placeholder="—" aria-label="Stok fisik ${esc(v.VariantID)}"></td>
          <td class="num" data-opd="${esc(v.VariantID)}">${opDiffPill(d)}</td>
          <td><input class="input input-sm" data-opn="${esc(v.VariantID)}" value="${esc(it.catatan || '')}" placeholder="${d ? 'Wajib diisi bila selisih' : 'Opsional'}" style="min-width:200px"></td></tr>`; }).join('') || `<tr><td colspan="6">${emptyHTML('fact_check', 'Tidak ada varian di filter ini')}</td></tr>`}</tbody></table></div>
      <div class="sticky-foot"><span class="ic" style="width:40px;height:40px;border-radius:8px;background:var(--info-bg);color:var(--info);display:grid;place-items:center">${I('sync_alt')}</span>
        <div class="col grow" id="opFoot">${opFootText(c)}</div>
        <button class="btn btn-danger" data-act="op-cancel">${I('close')}Batalkan sesi</button>
        <button class="btn" data-act="op-sheet">${I('download')}Ekspor lembar hitung (.xlsx)</button>
        <button class="btn btn-primary" data-act="op-confirm">${I('done_all')}Konfirmasi opname &amp; sesuaikan</button></div>
    </div>`;
  bindFilterInputs(el, 'opname');
  if (!el._opBound) {
    el._opBound = true;
    el.addEventListener('input', e => {
      const t = e.target, op2 = UI.op; if (!op2) return;
      if (t.dataset.op) {
        const vid = t.dataset.op, it = op2.items[vid] || (op2.items[vid] = { fisik: '', catatan: '' });
        it.fisik = t.value === '' ? '' : String(Math.max(0, Math.floor(Number(t.value)) || 0));
        const d = it.fisik === '' ? null : Number(it.fisik) - stockOf(vid);
        t.classList.toggle('diff-neg', d < 0); t.classList.toggle('diff-pos', d > 0);
        const cell = $(`[data-opd="${CSS.escape(vid)}"]`, el); if (cell) cell.innerHTML = opDiffPill(d);
        opRefreshKpi(); saveOpLocal();
      } else if (t.dataset.opn) { const it = op2.items[t.dataset.opn] || (op2.items[t.dataset.opn] = { fisik: '', catatan: '' }); it.catatan = t.value; saveOpLocal(); }
    });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.op) { e.preventDefault(); const all = $$('[data-op]', el); const i = all.indexOf(e.target); if (all[i + 1]) { all[i + 1].focus(); all[i + 1].select(); } } });
  }
}
function opDiffPill(d) {
  if (d === null || d === undefined) return '<span class="faint">—</span>';
  if (d === 0) return `<span class="pill pill-success">${I('check', 'sm')}0 pcs</span>`;
  return d < 0 ? `<span class="pill pill-danger">${I('arrow_downward', 'sm')}${sgn(d)} pcs</span>` : `<span class="pill pill-success">${I('arrow_upward', 'sm')}${sgn(d)} pcs</span>`;
}
function opFootText(c) { return `<b>Ringkasan rekonsiliasi sesi ini</b><span class="muted">${fmt(c.counted)} varian dihitung · ${fmt(c.diff)} berselisih (<span class="t-danger">−${fmt(c.kurang)} kurang</span>, <span class="t-success">+${fmt(c.lebih)} lebih</span>) · net selisih <b>${sgn(c.net)} pcs</b></span>`; }
const opRefreshKpi = debounce(() => {
  const op = UI.op; if (!op) return;
  const c = opCalc(op), el = $('#page-opname');
  const set = (id, h) => { const n = $('#' + id, el); if (n) n.innerHTML = h; };
  set('opK1', `${fmt(c.counted)}<small>/ ${fmt(c.vs.length)} varian</small>`);
  const b = $('#opK1b', el); if (b) b.style.width = (c.vs.length ? c.counted / c.vs.length * 100 : 0) + '%';
  set('opK1c', `${c.vs.length ? Math.round(c.counted / c.vs.length * 100) : 0}% progres pencatatan`);
  set('opK2', `${fmt(c.diff)}<small>varian</small>`);
  set('opK2b', `<span class="pill pill-danger">${fmt(c.kurang)} pcs kurang</span><span class="pill pill-success">${fmt(c.lebih)} pcs lebih</span>`);
  set('opK3', `${sgn(c.net)}<small>pcs</small>`); set('opK3b', `Fisik: <b>${fmt(c.fis)}</b> · Sistem: <b>${fmt(c.sys)}</b> pcs`);
  set('opFoot', opFootText(c));
  const segN = { all: c.vs.length, diff: c.diff, match: c.counted - c.diff, todo: c.vs.length - c.counted };
  $$('[data-act="op-seg"]', el).forEach(b => { b.textContent = b.textContent.replace(/\(\d+\)$/, '(' + fmt(segN[b.dataset.s]) + ')'); });
}, 120);
function opSessionsList(limit) {
  const ss = (S.opname.sessions || []).slice(0, limit || 30);
  if (!ss.length) return emptyHTML('fact_check', 'Belum ada sesi opname');
  return `<div class="list mt-12">${ss.map(s => { const its = (S.opname.items || []).filter(i => i.OpnameID === s.OpnameID); const df = its.filter(i => i.Selisih); return `<button class="li" data-act="op-view" data-id="${esc(s.OpnameID)}">${I('fact_check', 'faint')}<div class="col grow"><b class="mono">${esc(s.OpnameID)}</b><span>${fmtDT(s.TanggalKonfirmasi || s.Tanggal)} · ${esc(userName(s.DikonfirmasiOleh || s.DibuatOleh))}${its.length ? ' · ' + its.length + ' varian, ' + df.length + ' selisih' : ''}</span></div><span class="pill ${s.Status === 'Confirmed' ? 'pill-success' : s.Status === 'Draft' ? 'pill-info' : 'pill-outline'}">${esc(s.Status)}</span></button>`; }).join('')}</div>`;
}
function opItemsPayload(op) { return Object.keys(op.items).filter(v => op.items[v].fisik !== '' || op.items[v].catatan).map(v => ({ variantId: v, fisik: op.items[v].fisik, catatan: op.items[v].catatan })); }
async function opConfirm() {
  const op = UI.op; if (!op) return;
  if (!can('OPNAME')) { toast('Tidak ada akses', 'Hanya Owner/Manager yang dapat mengonfirmasi opname.', 'warning'); return; }
  const c = opCalc(op);
  if (!c.counted) { toast('Belum ada hitungan', 'Isi stok fisik minimal satu varian.', 'warning'); return; }
  const missingNote = c.vs.filter(v => { const it = op.items[v.VariantID]; return it && it.fisik !== '' && Number(it.fisik) !== stockOf(v.VariantID) && !String(it.catatan || '').trim(); });
  const ok = await modal({ icon: 'done_all', tone: 'success', title: 'Konfirmasi opname & sesuaikan stok?', text: `${fmt(c.counted)} varian dihitung, ${fmt(c.diff)} berselisih (net ${sgn(c.net)} pcs). Stok sistem akan disamakan dengan stok fisik dan tercatat sebagai transaksi OPNAME. Selisih yang sudah dikonfirmasi tidak bisa dibatalkan.`, body: missingNote.length ? `<div class="banner banner-warning">${I('edit_note')}<p>${missingNote.length} varian berselisih belum diberi catatan alasan. Disarankan diisi untuk audit.</p></div>` : '', ok: 'Konfirmasi opname' });
  if (!ok) return;
  const tag = tmpId('G');
  const payload = { opnameId: op.id || '', lingkup: op.lingkup, catatan: op.catatan, items: opItemsPayload(op) };
  const rows = c.vs.filter(v => { const it = op.items[v.VariantID]; return it && it.fisik !== '' && Number(it.fisik) !== stockOf(v.VariantID); })
    .map(v => ({ TxID: tmpId('TX'), GroupID: tag, Tanggal: now(), Jenis: 'OPNAME', VariantID: v.VariantID, Jumlah: Number(op.items[v.VariantID].fisik) - stockOf(v.VariantID), Sumber: 'Opname', Status: 'Pending', BundleSKU: '', Paket: 0, Referensi: op.id || 'SO', Catatan: op.items[v.VariantID].catatan || 'Penyesuaian opname', KunciImport: '', DibuatOleh: S.me.id, DibuatPada: now(), _tmp: tag }));
  const res = await optimistic({
    apply: () => { rows.forEach(r => S.tx.push(r)); applyConfirmLocal(rows); UI.op = null; },
    action: 'opname.confirm', data: payload,
    onOk: d => { applyPatch(d, tag); store.del(opKey()); UI.op = null; },
    okTitle: 'Opname dikonfirmasi'
  });
  if (!res.success) { UI.op = op; rerender(); }
}

// ════════ AUDIT / HISTORY (F11) ════════
function renderHistory() {
  const el = $('#page-history');
  const f = UI.f.history || (UI.f.history = { tab: 'tx' });
  if (!f.from) f.from = isoDate(now() - 29 * DAY);
  if (!f.to) f.to = isoDate(now());
  const tab = f.tab || 'tx';
  const canLog = can(['SETTINGS', 'MEMBER_MANAGE', 'EXPORT']);
  let body = '';
  if (tab === 'log' && canLog) body = logView(f);
  else body = txHistoryView(f);
  el.innerHTML = pageHead('Audit / History', { sub: 'Setiap perubahan stok tercatat: siapa, kapan, apa, stok sebelum dan sesudah. Riwayat tidak bisa diedit — koreksi selalu lewat transaksi baru.', actions: can('EXPORT') && tab === 'tx' ? `<button class="btn" data-act="hist-export">${I('download')}Export tabel</button>` : '' }) +
    `<div class="tabs"><button class="tab${tab === 'tx' ? ' on' : ''}" data-act="hist-tab" data-t="tx">${I('swap_vert')}Mutasi stok</button>${canLog ? `<button class="tab${tab === 'log' ? ' on' : ''}" data-act="hist-tab" data-t="log">${I('manage_history')}Log aktivitas</button>` : ''}</div>` + body;
  bindFilterInputs(el, 'history');
}
function histRows(f) {
  const from = parseIsoDate(f.from), to = parseIsoDate(f.to, true);
  const localOk = from >= dayStart(now()) - 44 * DAY;
  if (!localOk) {
    const key = [f.from, f.to, f.jenis, f.variantId].join('|');
    if (UI.histKey !== key) { UI.histKey = key; UI.hist = null; loadHistoryServer(f); }
    return UI.hist;
  }
  return S.tx.filter(t => t.Status === 'Confirmed' && t.Tanggal >= from && t.Tanggal <= to);
}
async function loadHistoryServer(f) {
  const r = await callApi('history.query', { from: parseIsoDate(f.from), to: parseIsoDate(f.to, true), jenis: f.jenis || '', variantId: f.variantId || '' });
  if (!r.success) { toast('Gagal memuat riwayat', r.message, 'danger'); UI.hist = []; }
  else UI.hist = r.data.rows.map(row => { const o = {}; r.data.cols.forEach((k, i) => { o[k] = row[i]; }); return o; });
  if (UI.page === 'history') rerender();
}
function txHistoryView(f) {
  const base = histRows(f);
  const filters = `<div class="filters">
      <div class="input-icon">${I('search')}<input class="input" data-filter="q" value="${esc(f.q || '')}" placeholder="Cari no. pesanan, referensi, SKU…" aria-label="Cari riwayat"></div>
      <label class="row"><span class="muted">Dari</span><input type="date" class="input" data-filter="from" value="${esc(f.from)}" max="${isoDate(now())}" style="width:auto"></label>
      <label class="row"><span class="muted">s/d</span><input type="date" class="input" data-filter="to" value="${esc(f.to)}" max="${isoDate(now())}" style="width:auto"></label>
      <select class="select" data-filter="jenis" aria-label="Jenis"><option value="">Semua jenis</option>${Object.keys(JENIS).map(j => `<option value="${j}" ${f.jenis === j ? 'selected' : ''}>${JENIS[j].label}</option>`).join('')}</select>
      ${f.variantId ? `<span class="tag">${esc(f.variantId)}<button data-act="hist-clear-var" aria-label="Hapus filter varian">${I('close', 'sm')}</button></span>` : ''}</div>`;
  if (base === null || base === undefined) return `<div class="card">${filters}<div class="card-body"><div class="skel" style="height:220px"></div><p class="muted mt-12">Memuat riwayat lebih dari 45 hari dari server…</p></div></div>`;
  const q = String(f.q || '').toLowerCase();
  const list = base.filter(t => (!f.jenis || t.Jenis === f.jenis) && (!f.variantId || t.VariantID === f.variantId) && (!q || (t.Referensi + ' ' + t.TxID + ' ' + t.GroupID + ' ' + t.VariantID + ' ' + t.Catatan + ' ' + vName(t.VariantID)).toLowerCase().indexOf(q) >= 0))
    .sort((a, b) => (b.DikonfirmasiPada || b.Tanggal) - (a.DikonfirmasiPada || a.Tanggal));
  UI.histList = list;
  const pg = paginate(list, 'history', 50);
  const tot = sum(list, t => t.Jumlah);
  return `<div class="card table-card">${filters}
    <div class="row wrap" style="padding:0 14px 12px;gap:16px"><span class="muted">${fmt(list.length)} mutasi</span><span class="muted">Net perubahan: <b class="${tot >= 0 ? 't-success' : 't-danger'}">${sgn(tot)} pcs</b></span></div>
    <div class="table-wrap"><table class="tbl"><thead><tr><th>Tanggal &amp; waktu</th><th>Jenis</th><th>Produk / varian</th><th class="num">Perubahan</th><th class="num">Sebelum</th><th class="num">Sesudah</th><th>Sumber</th><th>Referensi</th><th>Pengguna</th></tr></thead>
    <tbody>${pg.rows.map(t => { const j = JENIS[t.Jenis] || JENIS.IN; const bad = t.StokSebelum !== null && t.StokSesudah !== null && t.StokSebelum + t.Jumlah !== t.StokSesudah; return `<tr class="clickable" data-act="group-open" data-id="${esc(t.GroupID)}">
      <td class="nowrap">${fmtDT(t.DikonfirmasiPada || t.Tanggal)}${t.Tanggal && t.DikonfirmasiPada && dayIdx(t.Tanggal) !== dayIdx(t.DikonfirmasiPada) ? `<div class="muted" style="font-size:11.5px">tgl transaksi ${fmtDate(t.Tanggal)}</div>` : ''}</td>
      <td><span class="row nowrap" style="gap:6px"><span class="feed"><span class="fic ${j.cls}" style="width:26px;height:26px">${I(j.icon, 'sm')}</span></span>${esc(j.label)}</span></td>
      <td>${prodCell(t.VariantID, t.BundleSKU ? esc(t.BundleSKU) : '')}${IX.v[t.VariantID] && !IX.v[t.VariantID].Aktif ? ' <span class="pill pill-outline">Nonaktif</span>' : ''}</td>
      <td class="num ${t.Jumlah >= 0 ? 'qty-pos' : 'qty-neg'}">${sgn(t.Jumlah)}</td><td class="num muted">${t.StokSebelum === null ? '—' : fmt(t.StokSebelum)}</td><td class="num strong${bad ? ' t-danger' : ''}">${t.StokSesudah === null ? '—' : fmt(t.StokSesudah)}</td>
      <td>${t.Jenis === 'OUT' || t.Jenis === 'BUNDLE_OUT' ? chCh(t.Sumber) : esc(t.Sumber)}</td><td class="mono" style="font-size:12.5px">${esc(t.Referensi || '—')}</td><td class="nowrap">${esc(userName(t.DikonfirmasiOleh || t.DibuatOleh))}</td></tr>`; }).join('') || `<tr><td colspan="9">${emptyHTML('history', 'Tidak ada mutasi pada filter ini')}</td></tr>`}</tbody></table></div>${pagerHTML(pg, 'history', 'mutasi')}</div>`;
}
function logView(f) {
  const key = f.from + '|' + f.to;
  if (UI.logKey !== key) {
    UI.logKey = key; UI.log = null;
    callApi('audit.query', { from: parseIsoDate(f.from), to: parseIsoDate(f.to, true) }).then(r => { UI.log = r.success ? r.data : []; if (!r.success) toast('Gagal memuat log', r.message, 'danger'); if (UI.page === 'history') rerender(); });
  }
  const filters = `<div class="filters"><label class="row"><span class="muted">Dari</span><input type="date" class="input" data-filter="from" value="${esc(f.from)}" style="width:auto"></label><label class="row"><span class="muted">s/d</span><input type="date" class="input" data-filter="to" value="${esc(f.to)}" style="width:auto"></label><div class="input-icon">${I('search')}<input class="input" data-filter="lq" value="${esc(f.lq || '')}" placeholder="Cari aksi, pengguna, ID…"></div></div>`;
  if (!UI.log) return `<div class="card">${filters}<div class="card-body"><div class="skel" style="height:200px"></div></div></div>`;
  const q = String(f.lq || '').toLowerCase();
  const list = UI.log.filter(a => !q || (a.Aksi + ' ' + a.TabRujukan + ' ' + a.IDRujukan + ' ' + userName(a.UserID) + ' ' + a.Sesudah).toLowerCase().indexOf(q) >= 0);
  const pg = paginate(list, 'auditlog', 50);
  const AK = { Tambah: 'pill-info', Ubah: 'pill-outline', Konfirmasi: 'pill-success', Hapus: 'pill-danger', Nonaktifkan: 'pill-warning', Pulihkan: 'pill-warning', Opname: 'pill-info' };
  return `<div class="card table-card">${filters}<div class="table-wrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Pengguna</th><th>Aksi</th><th>Data</th><th>Ringkasan</th></tr></thead><tbody>${pg.rows.map(a => `<tr><td class="nowrap">${fmtDT(a.Tanggal)}</td><td class="nowrap">${esc(userName(a.UserID))}</td><td><span class="pill ${AK[a.Aksi] || 'pill-outline'}">${esc(a.Aksi)}</span></td><td><b>${esc(a.TabRujukan)}</b><div class="mono muted" style="font-size:11.5px;max-width:200px" class="ellipsis">${esc(String(a.IDRujukan).slice(0, 60))}</div></td><td class="muted" style="font-size:12.5px;max-width:520px">${a.Sebelum ? esc(String(a.Sebelum).slice(0, 160)) + ' → ' : ''}${esc(String(a.Sesudah).slice(0, 220))}</td></tr>`).join('') || `<tr><td colspan="5">${emptyHTML('manage_history', 'Tidak ada aktivitas pada periode ini')}</td></tr>`}</tbody></table></div>${pagerHTML(pg, 'auditlog', 'aktivitas')}</div>`;
}

Object.assign(ACT, {
  'op-start': () => { UI.op = { id: '', lingkup: $('#opScope').value, catatan: $('#opNote').value, items: {}, started: now() }; saveOpLocal(); rerender(); },
  'op-seg': el => { (UI.f.opname = UI.f.opname || {}).seg = el.dataset.s; rerender(); },
  'op-save': async el => {
    const op = UI.op; if (!op) return;
    if (!can('OPNAME')) { toast('Tersimpan di perangkat ini', 'Draft disimpan lokal. Simpan ke server memerlukan izin OPNAME.', 'info'); saveOpLocal(); return; }
    el.classList.add('loading');
    const r = await callApi('opname.save', { opnameId: op.id || '', lingkup: op.lingkup, catatan: op.catatan, items: opItemsPayload(op) });
    el.classList.remove('loading');
    if (!r.success) { toast('Gagal menyimpan draft', r.message, 'danger'); return; }
    S.opname = r.data.opname; op.id = r.data.opnameId; saveOpLocal(); rerender();
    toast('Draft opname tersimpan', r.message, 'success');
  },
  'op-confirm': () => opConfirm(),
  'op-cancel': async () => {
    const op = UI.op; if (!op) return;
    const ok = await modal({ icon: 'close', tone: 'danger', title: 'Batalkan sesi opname?', text: 'Semua hitungan di sesi ini dihapus. Stok tidak berubah.', ok: 'Batalkan sesi', danger: true });
    if (!ok) return;
    if (op.id && can('OPNAME')) { const r = await callApi('opname.cancel', { opnameId: op.id }); if (r.success) S.opname = r.data.opname; }
    store.del(opKey()); UI.op = null; rerender(); toast('Sesi dibatalkan', 'Tidak ada stok yang berubah.', 'info');
  },
  'op-history': () => modal({ title: 'Riwayat sesi opname', icon: 'history', closeX: true, size: 'lg', body: opSessionsList(30), ok: false, cancel: 'Tutup' }),
  'op-view': el => {
    const s = S.opname.sessions.find(x => x.OpnameID === el.dataset.id); if (!s) return;
    const its = S.opname.items.filter(i => i.OpnameID === s.OpnameID);
    closeModal(false);
    setTimeout(() => modal({ title: s.OpnameID, icon: 'fact_check', closeX: true, size: 'xl', text: `${esc(s.Status)} · ${fmtDT(s.TanggalKonfirmasi || s.Tanggal)} · ${esc(userName(s.DikonfirmasiOleh || s.DibuatOleh))}${s.Catatan ? ' · ' + esc(s.Catatan) : ''}`,
      body: its.length ? `<div class="table-wrap" style="max-height:60vh;border:1px solid var(--border);border-radius:8px"><table class="tbl dense"><thead><tr><th>Varian</th><th class="num">Sistem</th><th class="num">Fisik</th><th class="num">Selisih</th><th>Catatan</th></tr></thead><tbody>${its.map(i => `<tr><td>${prodCell(i.VariantID)}</td><td class="num">${fmt(i.StokSistem)}</td><td class="num">${i.StokFisik === null ? '—' : fmt(i.StokFisik)}</td><td class="num">${opDiffPill(i.StokFisik === null ? null : i.Selisih)}</td><td class="muted">${esc(i.Catatan)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Rincian item sesi lama tersedia lewat Export → Hasil Stock Opname.</p>',
      ok: can('EXPORT') ? 'Export hasil' : false, cancel: 'Tutup', onOk: () => { setTimeout(() => openExport('opname'), 200); } }), 200);
  },
  'op-sheet': async () => {
    const op = UI.op; if (!op) return;
    const c = opCalc(op);
    const rows = c.vs.map(v => { const it = op.items[v.VariantID] || {}; const has = it.fisik !== '' && it.fisik !== undefined; return [v.VariantID, vName(v.VariantID), v.Warna, v.Ukuran, stockOf(v.VariantID), has ? Number(it.fisik) : '', has ? Number(it.fisik) - stockOf(v.VariantID) : '', it.catatan || '']; });
    await exportXlsx('LembarHitung', 'Lembar Hitung Stock Opname', ['VariantID', 'Produk', 'Warna', 'Ukuran', 'Stok Sistem', 'Stok Fisik', 'Selisih', 'Catatan'], rows);
  },
  'hist-tab': el => { (UI.f.history = UI.f.history || {}).tab = el.dataset.t; rerender(); },
  'hist-clear-var': () => { delete UI.f.history.variantId; UI.histKey = null; rerender(); },
  'hist-export': async () => {
    const list = UI.histList || [];
    await exportXlsx('Riwayat', 'Audit / History Mutasi Stok', ['Tanggal', 'Jenis', 'VariantID', 'Produk', 'Perubahan', 'Sebelum', 'Sesudah', 'Sumber', 'Referensi', 'Pengguna'], list.map(t => [fmtDT(t.DikonfirmasiPada || t.Tanggal), (JENIS[t.Jenis] || {}).label || t.Jenis, t.VariantID, vName(t.VariantID), t.Jumlah, t.StokSebelum, t.StokSesudah, t.Sumber, t.Referensi, userName(t.DikonfirmasiOleh || t.DibuatOleh)]));
  }
});
