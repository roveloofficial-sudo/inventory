'use strict';

// ════════ IMPORT MARKETPLACE (F5 metode 2, Bagian 14) ════════
// Tahap 1 (tanpa AI): kenali kolom dari nama header, cocokkan SKU/variasi ke varian ROVELO.
// Tahap 2 (opsional): baris yang gagal dikirim ke AI di server → hasil SELALU "Perlu dicek".
const HDR = {
  order: ['nopesanan', 'nomorpesanan', 'orderid', 'ordernumber', 'ordersn', 'idpesanan', 'noorder', 'nomororder'],
  status: ['statuspesanan', 'orderstatus', 'status', 'statusorder'],
  sku: ['nomorreferensisku', 'skureferensi', 'sellersku', 'skupenjual', 'skuvariasi', 'variantsku', 'sku', 'kodesku', 'skuinduk', 'parentsku', 'kodeproduk'],
  name: ['namaproduk', 'productname', 'itemname', 'namabarang', 'product', 'produk'],
  variation: ['namavariasi', 'variation', 'variasi', 'variationname', 'variant', 'varian', 'skuname', 'variasiproduk'],
  qty: ['jumlah', 'quantity', 'qty', 'kuantitas', 'jumlahproduk', 'jumlahbarang', 'jumlahdibeli'],
  date: ['waktupesanandibuat', 'tanggalpesanan', 'createdtime', 'ordercreatedtime', 'createtime', 'orderdate', 'createdat', 'tanggal', 'waktupembayarandilakukan', 'paidtime'],
  returnDate: ['tanggalretur', 'returndate', 'waktupengembalian', 'tanggalpengembalian', 'returncreatedtime', 'tanggalpengembalianbarang'],
  reason: ['alasanpengembalian', 'returnreason', 'alasan', 'alasanretur', 'reason'],
  color: ['warna', 'color', 'colour'],
  size: ['ukuran', 'size']
};
const SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL', '4XL', 'ALLSIZE', 'FREESIZE'];
const COLOR_SYN = [['black', 'hitam', 'jetblack'], ['navy', 'dongker', 'birudongker', 'birutua', 'navyblue'], ['abu', 'abuabu', 'grey', 'gray', 'heathergrey', 'misty'], ['white', 'putih', 'crispwhite', 'offwhite'], ['cream', 'krem', 'beige'], ['khaki', 'coklatmuda'], ['sagegreen', 'sage', 'hijausage'], ['indigo', 'indigoraw'], ['olive', 'hijauarmy', 'army'], ['brown', 'coklat', 'cokelat']];
const normH = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function detectColumns(head) {
  const n = head.map(normH), map = {};
  Object.keys(HDR).forEach(k => { for (const syn of HDR[k]) { const i = n.indexOf(syn); if (i >= 0) { map[k] = i; break; } } });
  return map;
}
function detectSource(head, fileName) {
  const n = head.map(normH), f = String(fileName || '').toLowerCase();
  if (n.indexOf('nomorreferensisku') >= 0 || n.indexOf('nopesanan') >= 0 || /shopee|order\.all/.test(f)) return 'Shopee';
  if (n.indexOf('orderitemid') >= 0 || /lazada/.test(f)) return 'Lazada';
  if ((n.indexOf('orderid') >= 0 && n.indexOf('sellersku') >= 0) || /tiktok|tokopedia/.test(f)) return 'TikTok Shop';
  return null;
}
function parseDateLoose(v) {
  if (v === '' || v === null || v === undefined) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v.getTime();
  if (typeof v === 'number') return v > 20000 && v < 80000 ? Math.round((v - 25569) * DAY) - TZ_MS : null;
  const s = String(v).trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 12), +(m[5] || 0), +(m[6] || 0)) - TZ_MS;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
  if (m) {
    let a = +m[1], b = +m[2], y = +m[3]; if (y < 100) y += 2000;
    let dd = a, mm = b; if (b > 12 && a <= 12) { dd = b; mm = a; }
    let h = +(m[4] || 12); if (m[7]) { if (/pm/i.test(m[7]) && h < 12) h += 12; if (/am/i.test(m[7]) && h === 12) h = 0; }
    return Date.UTC(y, mm - 1, dd, h, +(m[5] || 0), +(m[6] || 0)) - TZ_MS;
  }
  const t = Date.parse(s);
  return isNaN(t) ? null : t;
}
function parseVariation(text) {
  let t = String(text || '').replace(/(warna|color|colour|ukuran|size|variasi|variation)\s*[:=]/gi, ',');
  const tokens = t.split(/[,;/|\n]+|\s+-\s+/).map(x => x.trim()).filter(Boolean);
  let size = '', color = [];
  const isSize = u => SIZES.indexOf(u) >= 0 || /^\d{2}$/.test(u);
  tokens.forEach(tok => { const u = tok.toUpperCase().replace(/\s+/g, ''); if (!size && isSize(u)) size = u; else color.push(tok); });
  if (!size && color.length === 1) { const p = color[0].split(/\s+/); const last = p[p.length - 1].toUpperCase(); if (p.length > 1 && isSize(last)) { size = last; color = [p.slice(0, -1).join(' ')]; } }
  return { warna: color.join(' ').trim(), ukuran: size };
}
function colorMatch(prodColors, raw) {
  const r = normH(raw);
  if (!r) return null;
  let hit = prodColors.find(c => normH(c) === r);
  if (hit) return hit;
  const grp = COLOR_SYN.find(g => g.indexOf(r) >= 0);
  if (grp) { hit = prodColors.find(c => grp.indexOf(normH(c)) >= 0); if (hit) return hit; }
  hit = prodColors.find(c => normH(c).indexOf(r) >= 0 || r.indexOf(normH(c)) >= 0);
  return hit || null;
}
/** Indeks pencocokan (dibangun sekali per impor). */
function matchIndex() {
  const vid = {}, prod = {}, bund = {};
  S.variants.forEach(v => { vid[slug(v.VariantID)] = v.VariantID; });
  S.products.forEach(p => { prod[slug(p.SKU)] = p.SKU; });
  S.bundles.forEach(b => { bund[slug(b.BundleSKU)] = b.BundleSKU; });
  const prodKeys = Object.keys(prod).sort((a, b) => b.length - a.length);
  const bundKeys = Object.keys(bund).sort((a, b) => b.length - a.length);
  return { vid, prod, bund, prodKeys, bundKeys };
}
function resolveRow(r, X) {
  const raw = slug(r.skuRaw);
  const setV = (id, how, note) => Object.assign(r, { kind: 'variant', id: id, match: how === 'Kolom' ? 'Cocok' : 'Perlu dicek', method: how, note: note || '' });
  // 1. SKU varian langsung (mis. RVL001-BLACK-M)
  if (raw && X.vid[raw]) { setV(X.vid[raw], 'Kolom'); return; }
  // 2. SKU bundle (opsional akhiran ukuran, mis. BDL-3NAVY-XL)
  const bk = raw && X.bundKeys.find(k => raw === k || raw.indexOf(k) === 0);
  if (bk) {
    const bsku = X.bund[bk];
    const sizes = bundleSizes(bsku);
    const fromSku = raw.slice(bk.length);
    const uk = sizes.find(u => slug(u) === slug(r.ukuran)) || sizes.find(u => slug(u) === fromSku);
    Object.assign(r, { kind: 'bundle', id: bsku, bUkuran: uk || '', match: uk ? 'Cocok' : 'Perlu dicek', method: 'Kolom', note: uk ? '' : 'Ukuran paket tidak terbaca dari file' });
    return;
  }
  // 3. SKU produk + warna/ukuran dari nama variasi
  let pk = raw && X.prodKeys.find(k => raw === k || raw.indexOf(k) === 0);
  let how = 'Kolom';
  // 4. Fuzzy nama produk
  if (!pk) {
    const words = String(r.nama || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);
    let best = null, score = 0;
    S.products.forEach(p => {
      const pw = p.NamaProduk.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);
      if (!pw.length || !words.length) return;
      const hit = pw.filter(w => words.indexOf(w) >= 0).length / pw.length;
      if (hit > score) { score = hit; best = p; }
    });
    if (best && score >= 0.5) { pk = slug(best.SKU); how = 'Fuzzy'; }
  }
  if (!pk) { Object.assign(r, { kind: null, id: '', match: 'Tidak ditemukan', method: '—', note: 'SKU/nama tidak dikenali' }); return; }
  const sku = X.prod[pk];
  const vs = S.variants.filter(v => v.SKU === sku);
  const colors = Array.from(new Set(vs.map(v => v.Warna)));
  const rest = raw.slice(pk.length);
  let w = colorMatch(colors, r.warna), u = vs.map(v => v.Ukuran).find(x => slug(x) === slug(r.ukuran));
  if ((!w || !u) && rest) { if (!w) w = colors.find(c => rest.indexOf(slug(c)) >= 0) || null; if (!u) u = vs.map(v => v.Ukuran).filter(x => rest.endsWith(slug(x))).sort((a, b) => b.length - a.length)[0]; }
  const v = w && u ? vs.find(x => x.Warna === w && slug(x.Ukuran) === slug(u)) : null;
  if (v) { setV(v.VariantID, how, how === 'Fuzzy' ? 'Dicocokkan dari nama produk — periksa' : ''); r.suggestion = how === 'Fuzzy' ? v.VariantID : ''; if (how === 'Fuzzy') { r.id = ''; r.kind = null; } return; }
  Object.assign(r, { kind: null, id: '', match: 'Perlu dicek', method: how, note: `Warna/ukuran tidak cocok dengan varian ${sku}` + (r.variasi ? ` ("${r.variasi}")` : '') });
  const guess = vs.find(x => (!w || x.Warna === w) && (!u || slug(x.Ukuran) === slug(u)));
  if (guess) r.suggestion = guess.VariantID;
}
function classifyStatus(raw, hasCol) {
  if (!hasCol) return 'Valid';
  const s = normH(raw);
  const inList = k => listOf(S.settings[k]).some(x => normH(x) === s);
  if (!s) return 'Perlu dicek';
  if (inList('StatusPesananBatal')) return 'Batal';
  if (inList('StatusPesananRetur')) return 'Dikembalikan';
  if (inList('StatusPesananValid')) return 'Valid';
  return 'Perlu dicek';
}

/** Baca file → baris terstruktur + pencocokan + kunci duplikasi. */
async function parseMarketplaceFile(file, source, kind) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran file maksimal 5 MB.');
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) throw new Error('Format harus .xlsx atau .csv.');
  const buf = await readAsArrayBuffer(file);
  const hash = await sha256Hex(buf);
  await loadScript(CDN.xlsx);
  const isCsv = /\.csv$/i.test(file.name);
  const wb = XLSX.read(buf, { type: 'array', cellDates: true, raw: isCsv });
  let best = null;
  wb.SheetNames.forEach(name => {
    const ws = wb.Sheets[name];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: false });
    for (let h = 0; h < Math.min(15, aoa.length); h++) {
      const cols = detectColumns(aoa[h]);
      const score = Object.keys(cols).length + (cols.sku !== undefined || cols.name !== undefined ? 2 : 0);
      if (!best || score > best.score) best = { ws: ws, aoa: aoa, h: h, cols: cols, score: score };
    }
  });
  if (!best || (best.cols.sku === undefined && best.cols.name === undefined)) throw new Error('Kolom penting tidak ditemukan: SKU atau Nama Produk. Pastikan file adalah ekspor pesanan marketplace.');
  const C = best.cols, head = best.aoa[best.h];
  const src = source || detectSource(head, file.name);
  if (!src) throw new Error('Marketplace tidak terdeteksi otomatis. Pilih sumber (Shopee / TikTok Shop / Lazada) lalu unggah ulang.');
  const missing = [];
  if (C.qty === undefined) missing.push('Jumlah (dianggap 1 per baris)');
  if (C.order === undefined) missing.push('No. Pesanan');
  if (C.status === undefined && kind !== 'RTS') missing.push('Status Pesanan (semua dianggap valid)');
  const cellText = (r, c, v) => { if (typeof v !== 'number') return String(v).trim(); const cell = best.ws[XLSX.utils.encode_cell({ r: r, c: c })]; return cell && cell.w ? String(cell.w).trim() : String(v); };
  const X = matchIndex();
  const raw = [];
  for (let i = best.h + 1; i < best.aoa.length; i++) {
    const row = best.aoa[i];
    const get = k => C[k] === undefined ? '' : row[C[k]];
    const order = C.order === undefined ? '' : cellText(i, C.order, get('order'));
    const skuRaw = C.sku === undefined ? '' : cellText(i, C.sku, get('sku'));
    const nama = String(get('name') || '').trim();
    if (!skuRaw && !nama) continue;
    const qtyRaw = get('qty');
    const qty = C.qty === undefined ? 1 : Number(String(qtyRaw).replace(/[^\d.-]/g, ''));
    if (C.qty !== undefined && !(qty > 0)) continue; // baris keterangan (mis. baris ke-2 ekspor TikTok)
    const variasi = String(get('variation') || '').trim();
    const pv = parseVariation(variasi);
    raw.push({
      i: raw.length, order: order, tanggal: parseDateLoose(get('date')), statusRaw: String(get('status') || '').trim(), skuRaw: skuRaw, nama: nama, variasi: variasi,
      warna: String(get('color') || '').trim() || pv.warna, ukuran: String(get('size') || '').trim().toUpperCase() || pv.ukuran, qty: Math.round(qty), lines: 1,
      tanggalRetur: parseDateLoose(get('returnDate')), alasan: String(get('reason') || '').trim()
    });
  }
  if (!raw.length) throw new Error('Tidak ada baris pesanan yang bisa dibaca dari file ini.');
  // Gabungkan baris identik dalam satu pesanan (mis. Lazada: 1 baris per unit).
  const agg = {}, rows = [];
  raw.forEach(r => {
    const key = slug(src) + '|' + r.order + '|' + slug(r.skuRaw || r.nama) + '|' + slug(r.warna) + '|' + slug(r.ukuran);
    if (agg[key]) { agg[key].qty += r.qty; agg[key].lines++; return; }
    r.key = key; r.orderKey = slug(src) + '|' + r.order; agg[key] = r; rows.push(r);
  });
  rows.forEach((r, i) => {
    r.i = i;
    r.sys = kind === 'RTS' ? 'Dikembalikan' : classifyStatus(r.statusRaw, C.status !== undefined);
    resolveRow(r, X);
    r.dup = false;
  });
  return { meta: { fileName: file.name, size: file.size, hash: hash, source: src, kind: kind || 'OUT', total: raw.length, missing: missing, cols: Object.keys(C) }, rows: rows };
}
/** Cek duplikasi + saran AI (satu panggilan server). */
async function prepareImport(P) {
  const kind = P.meta.kind;
  const keys = kind === 'RTS' ? [] : P.rows.filter(r => r.sys === 'Valid').map(r => r.key);
  const orders = Array.from(new Set(P.rows.filter(r => r.sys === 'Dikembalikan').map(r => r.orderKey)));
  const uniq = {}, unmatched = [];
  P.rows.forEach(r => { if (!r.id && !r.suggestion && (r.sys === 'Valid' || r.sys === 'Dikembalikan')) { const k = r.skuRaw + '|' + r.nama + '|' + r.variasi; if (!(k in uniq)) { uniq[k] = unmatched.length; unmatched.push({ i: unmatched.length, sku: r.skuRaw, nama: r.nama, variasi: r.variasi }); } } });
  const res = await callApi('import.prepare', { hash: P.meta.hash, kind: kind, keys: keys, orders: orders, unmatched: unmatched.slice(0, 150) });
  if (!res.success) throw new Error(res.message);
  const d = res.data;
  P.dupFile = d.duplicateFile;
  const ex = {}; (d.existingKeys || []).forEach(k => { ex[k] = 1; });
  const ded = {}; (d.deductedOrders || []).forEach(k => { ded[k] = 1; });
  P.aiUsed = d.aiUsed; P.aiError = d.aiError;
  if (d.ai) {
    const byI = {}; d.ai.forEach(a => { byI[a.i] = a; });
    P.rows.forEach(r => {
      if (r.id || r.suggestion) return;
      const a = byI[uniq[r.skuRaw + '|' + r.nama + '|' + r.variasi]];
      if (a) { r.suggestion = a.id; r.suggestKind = a.bundle ? 'bundle' : 'variant'; r.suggestSize = a.ukuran; r.method = 'AI'; r.match = 'Perlu dicek'; r.note = `Saran AI (yakin ${Math.round(a.yakin * 100)}%): ${a.alasan}`; }
    });
  }
  P.rows.forEach(r => {
    if (r.sys === 'Valid' && ex[r.key]) { r.dup = true; r.note = 'Sudah pernah diproses (pesanan & item yang sama)'; }
    if (r.sys === 'Dikembalikan' && kind !== 'RTS') { r.deducted = !!ded[r.orderKey]; if (!r.deducted) r.note = (r.note ? r.note + ' · ' : '') + 'Pesanan ini belum pernah tercatat keluar — periksa sebelum masuk RTS'; }
    r.include = defaultInclude(r, kind);
  });
  return P;
}
function defaultInclude(r, kind) {
  if (!r.id || r.match !== 'Cocok' || r.dup) return false;
  if (r.sys === 'Valid') return true;
  if (r.sys === 'Dikembalikan') return kind === 'RTS' || !!r.deducted;
  return false;
}

// ── Wizard UI ──
function impState() { return UI.imp || (UI.imp = { step: 'pick', source: '', P: null, filter: 'all', pg: 1, busy: '' }); }
function renderImportWizard() {
  const st = impState();
  if (!can('IMPORT')) return noAccessHTML('Import marketplace');
  if (st.step === 'pick' || !st.P) return importPickHTML(st);
  return importPreviewHTML(st);
}
function importPickHTML(st) {
  const srcs = ['Shopee', 'TikTok Shop', 'Lazada'];
  const other = markets().filter(m => srcs.indexOf(m) < 0);
  return `<div class="grid g-2-1">
    <div class="card card-pad col gap-16">
      <div><h3>1. Pilih marketplace</h3><p class="muted mt-8">Kosongkan untuk deteksi otomatis dari header file.</p></div>
      <div class="src-cards">${srcs.map(s => `<button class="src-card${st.source === s ? ' on' : ''}" data-act="imp-src" data-s="${esc(s)}"><img src="${ASSETS[CHANNELS[s].logo]}" alt=""><div class="col"><b>${esc(s)}</b><span class="muted" style="font-size:12px">${s === 'Shopee' ? 'Order.all.xlsx' : s === 'Lazada' ? 'Export pesanan .xlsx' : 'Order export .xlsx/.csv'}</span></div></button>`).join('')}</div>
      ${other.length ? `<div class="row wrap"><span class="muted">Sumber lain:</span>${other.map(s => `<button class="qchip${st.source === s ? ' on' : ''}" data-act="imp-src" data-s="${esc(s)}">${esc(s)}</button>`).join('')}<button class="link" data-act="imp-template" style="font-size:12.5px;margin-left:auto">${I('download', 'sm')} Template CSV</button></div>` : ''}
      <div><h3>2. Unggah file pesanan</h3></div>
      <label class="drop" id="impDrop">${st.busy ? `<div class="bar-loader"></div><b>${esc(st.busy)}</b>` : `${I('upload_file')}<b>Seret file .xlsx / .csv ke sini atau klik untuk memilih</b><span class="muted" style="font-size:12.5px">Maks 5 MB · file asli tidak diubah · diproses di browser lalu divalidasi server</span>`}<input type="file" id="impFile" accept=".xlsx,.xls,.csv" hidden></label>
      ${st.err ? `<div class="banner banner-danger">${I('error')}<div><b>File tidak bisa diproses</b><p>${esc(st.err)}</p></div></div>` : ''}
    </div>
    <div class="card card-pad col gap-12">
      <h3>Cara kerja</h3>
      <ul class="timeline mt-8">
        <li class="done"><span class="tdot"></span><b>Kolom dikenali otomatis</b><span>No. pesanan, status, SKU, nama variasi, jumlah — gratis, cepat, akurat.</span></li>
        <li class="done"><span class="tdot"></span><b>AI hanya untuk baris gagal</b><span>${S.settings.AIAktif === 'true' && S.hasAiKey ? 'Aktif — hasil AI selalu berstatus Perlu dicek.' : 'Nonaktif — baris gagal ditandai untuk diperbaiki manual.'}</span></li>
        <li class="done"><span class="tdot"></span><b>Preview &amp; perbaiki</b><span>Batal &amp; duplikat dikeluarkan otomatis; retur dicatat ke RTS.</span></li>
        <li><span class="tdot"></span><b>Konfirmasi proses</b><span>Stok berkurang hanya setelah Admin menekan Konfirmasi Proses.</span></li>
      </ul>
      <div class="banner banner-info">${I('shield')}<div><b>Anti dobel 2 lapis</b><p>File yang sama (hash) dan baris pesanan yang sama tidak akan diproses dua kali.</p></div></div>
    </div></div>`;
}
const MATCH_PILL = { 'Cocok': 'pill-success', 'Perlu dicek': 'pill-warning', 'Tidak ditemukan': 'pill-danger' };
const MATCH_IC = { 'Cocok': 'check_circle', 'Perlu dicek': 'warning', 'Tidak ditemukan': 'cancel' };
function impBuckets(P) {
  const b = { all: P.rows, ready: [], check: [], notfound: [], skip: [], rts: [], dup: [] };
  P.rows.forEach(r => {
    if (r.dup) b.dup.push(r);
    else if (r.sys === 'Batal') b.skip.push(r);
    else if (r.sys === 'Dikembalikan') b.rts.push(r);
    else if (r.sys === 'Perlu dicek') b.check.push(r);
    else if (r.match === 'Cocok') b.ready.push(r);
    else if (r.match === 'Tidak ditemukan') b.notfound.push(r);
    else b.check.push(r);
  });
  return b;
}
function importPreviewHTML(st) {
  const P = st.P, b = impBuckets(P);
  const inc = P.rows.filter(r => r.include && r.id);
  const out = inc.filter(r => r.sys === 'Valid'), rts = inc.filter(r => r.sys === 'Dikembalikan');
  const net = {}; out.forEach(r => impComps(r).forEach(c => { net[c.vid] = (net[c.vid] || 0) + c.q; }));
  const short = Object.keys(net).filter(v => net[v] > stockOf(v));
  const unknownStatus = {}; P.rows.filter(r => r.sys === 'Perlu dicek').forEach(r => { unknownStatus[r.statusRaw || '(kosong)'] = (unknownStatus[r.statusRaw || '(kosong)'] || 0) + 1; });
  const list = b[st.filter] || P.rows;
  const pg = { size: 50 }; pg.pages = Math.max(1, Math.ceil(list.length / 50)); st.pg = Math.min(st.pg || 1, pg.pages);
  const rows = list.slice((st.pg - 1) * 50, st.pg * 50);
  const chip = (k, label, ic, cls) => `<button class="sum-chip${st.filter === k ? ' on' : ''}" data-act="imp-filter" data-f="${k}">${ic ? `<span class="${cls || ''}">${I(ic, 'sm')}</span>` : ''}${label} <b class="tnum">${fmt(b[k].length)}</b></button>`;
  const P1 = P.meta;
  return `${P.dupFile ? `<div class="banner banner-danger mb-16">${I('block')}<div><b>File sudah pernah diimpor</b><p>${esc(P.dupFile.nama)} · ${fmtDT(P.dupFile.tanggal)} oleh ${esc(P.dupFile.oleh)} (status ${esc(P.dupFile.status)}). Proses dihentikan agar stok tidak berkurang dua kali.</p></div><div class="actions"><button class="btn btn-sm" data-act="imp-reset">Unggah file lain</button></div></div>` : ''}
    <div class="card"><div class="card-head"><div class="row gap-12">${chLogo(P1.source)}<div class="col"><h3>${esc(P1.fileName)}</h3><span class="muted" style="font-size:12.5px">${esc(P1.source)} · ${fmt(P1.total)} baris file → ${fmt(P.rows.length)} item pesanan · ${(P1.size / 1024).toFixed(0)} KB</span></div></div><button class="btn btn-sm" data-act="imp-reset">${I('restart_alt')}Ganti file</button></div>
      <div class="card-body col gap-12">
        ${P1.missing.length ? `<div class="banner banner-warning" style="padding:10px 14px">${I('info')}<p>Kolom tidak ada di file: ${esc(P1.missing.join(', '))}.</p></div>` : ''}
        ${P.aiError ? `<div class="banner banner-warning" style="padding:10px 14px">${I('smart_toy')}<p>${esc(P.aiError)}. Baris gagal tetap bisa diperbaiki manual.</p></div>` : ''}
        ${Object.keys(unknownStatus).length ? `<div class="banner banner-warning" style="padding:10px 14px">${I('help')}<div class="grow"><b>Status pesanan belum dikenali</b><p>Tentukan perlakuannya (berlaku untuk file ini). Tambahkan ke General Settings agar dikenali otomatis berikutnya.</p><div class="col gap-4 mt-8">${Object.keys(unknownStatus).map(s => `<div class="row wrap"><span class="tag" style="padding-right:10px">"${esc(s)}" · ${unknownStatus[s]} baris</span><button class="btn btn-xs" data-act="imp-status" data-s="${esc(s)}" data-to="Valid">Hitung sebagai Valid</button><button class="btn btn-xs" data-act="imp-status" data-s="${esc(s)}" data-to="Batal">Lewati (batal)</button></div>`).join('')}</div></div></div>` : ''}
        <div class="sum-chips">${chip('all', 'Semua')}${chip('ready', 'Siap diproses', 'check_circle', 't-success')}${chip('check', 'Perlu dicek', 'warning', 't-warning')}${chip('notfound', 'Tidak ditemukan', 'cancel', 't-danger')}${chip('skip', 'Batal/dilewati', 'block', 'faint')}${chip('rts', 'Retur → RTS', 'assignment_return', 't-info')}${chip('dup', 'Duplikat', 'content_copy', 'faint')}</div>
      </div>
      <div class="table-wrap" style="max-height:62vh"><table class="tbl dense">
        <thead><tr><th class="w1"><input type="checkbox" data-act="imp-all" aria-label="Pilih semua di halaman ini"></th><th>No. pesanan</th><th>Status asli → sistem</th><th style="min-width:300px">Produk ROVELO</th><th>SKU file</th><th>Warna</th><th>Ukuran</th><th class="num">Jml</th><th>Kecocokan</th><th>Cara</th><th>Keterangan</th></tr></thead>
        <tbody>${rows.map(r => impRowHTML(r)).join('') || `<tr><td colspan="11">${emptyHTML('filter_alt_off', 'Tidak ada baris di filter ini')}</td></tr>`}</tbody></table></div>
      ${pg.pages > 1 ? `<div class="table-foot"><span>Halaman ${st.pg} dari ${pg.pages} · ${fmt(list.length)} baris</span><div class="pager"><button data-act="imp-pg" data-pg="${st.pg - 1}" ${st.pg <= 1 ? 'disabled' : ''}>${I('chevron_left')}</button><button data-act="imp-pg" data-pg="${st.pg + 1}" ${st.pg >= pg.pages ? 'disabled' : ''}>${I('chevron_right')}</button></div></div>` : ''}
      <div class="sticky-foot">
        <div class="col grow"><b>${fmt(out.length)} baris barang keluar · ${fmt(sum(Object.values(net)))} helai dari ${fmt(Object.keys(net).length)} varian${rts.length ? ` · ${fmt(rts.length)} retur → RTS` : ''}</b>
          <span class="${short.length ? 't-danger' : 'muted'}" style="font-size:12.5px">${short.length ? `${I('error', 'sm')} Stok tidak cukup: ${short.slice(0, 3).map(v => esc(v) + ' (tersedia ' + fmt(stockOf(v)) + ', butuh ' + fmt(net[v]) + ')').join('; ')}${short.length > 3 ? '…' : ''}` : 'Baris "Perlu dicek" & "Tidak ditemukan" tidak ikut diproses kecuali diperbaiki.'}</span>
          ${st.progress ? `<div class="progress info mt-8"><i style="width:${st.progress}%"></i></div>` : ''}</div>
        <button class="btn" data-act="imp-reset">Batalkan</button>
        <button class="btn" data-act="imp-save" data-c="0" ${P.dupFile || st.busy || !(out.length || rts.length) ? 'disabled' : ''}>${I('save')}Simpan untuk dikonfirmasi</button>
        ${can('OUT_CONFIRM') ? `<button class="btn btn-primary" data-act="imp-save" data-c="1" ${P.dupFile || st.busy || !(out.length || rts.length) ? 'disabled' : ''}>${I('task_alt')}Konfirmasi proses</button>` : ''}
      </div></div>`;
}
function impComps(r) {
  if (r.kind === 'bundle') return (IX.bItems[r.id] || []).map(i => ({ vid: slug(i.SKU) + '-' + slug(i.Warna) + '-' + slug(r.bUkuran), q: i.Jumlah * r.qty }));
  return r.id ? [{ vid: r.id, q: r.qty }] : [];
}
function impRowHTML(r) {
  const label = r.id ? (r.kind === 'bundle' ? `<div class="prod"><span class="thumb">${I('redeem')}</span><div class="col"><b>${esc(IX.b[r.id] ? IX.b[r.id].NamaBundle : r.id)}</b><span>${esc(r.id)} · ukuran ${esc(r.bUkuran || '?')}</span></div></div>` : prodCell(r.id)) : '';
  const canFix = !r.dup && r.sys !== 'Batal';
  const fix = canFix && (!r.id || r.match !== 'Cocok') ? `<div class="col gap-4">${r.suggestion ? `<div class="row"><span class="muted ellipsis" style="font-size:12.5px">Saran: <b>${esc(r.suggestKind === 'bundle' ? r.suggestion + (r.suggestSize ? ' ' + r.suggestSize : '') : r.suggestion)}</b></span><button class="btn btn-xs" data-act="imp-accept" data-i="${r.i}">${I('check')}Pakai</button></div>` : ''}${comboHTML('imp' + r.i, '', 'Pilih varian / bundle…')}</div>` : label;
  const sysCls = { Valid: 'pill-success', Batal: 'pill-outline', Dikembalikan: 'pill-info', 'Perlu dicek': 'pill-warning' }[r.sys];
  const dis = !r.id || r.dup || r.sys === 'Batal' || r.sys === 'Perlu dicek';
  return `<tr class="${r.include ? '' : ''}"><td><input type="checkbox" data-imp-inc="${r.i}" ${r.include ? 'checked' : ''} ${dis ? 'disabled' : ''} aria-label="Sertakan baris"></td>
    <td class="nowrap"><span class="mono">${esc(r.order || '—')}</span>${r.tanggal ? `<div class="muted" style="font-size:11.5px">${fmtDT(r.tanggal)}</div>` : ''}</td>
    <td class="nowrap"><span class="muted" style="font-size:12.5px">${esc(r.statusRaw || '—')}</span> → <span class="pill ${sysCls}">${esc(r.sys)}</span></td>
    <td>${fix}</td>
    <td class="mono nowrap" style="font-size:12.5px">${esc(r.skuRaw || '—')}${r.nama && !r.skuRaw ? `<div class="muted ellipsis" style="max-width:200px">${esc(r.nama)}</div>` : ''}</td>
    <td>${esc(r.warna || '—')}</td><td>${esc(r.ukuran || '—')}</td>
    <td class="num strong">${fmt(r.qty)}${r.lines > 1 ? `<div class="muted" style="font-size:11px">${r.lines} baris</div>` : ''}</td>
    <td>${r.dup ? '<span class="pill pill-outline">' + I('content_copy') + 'Duplikat</span>' : `<span class="pill ${MATCH_PILL[r.match] || 'pill-outline'}">${I(MATCH_IC[r.match] || 'help', 'fill')}${esc(r.match)}</span>`}</td>
    <td class="muted">${esc(r.method || '—')}</td>
    <td class="muted" style="font-size:12.5px;min-width:180px">${esc(r.note || '')}</td></tr>`;
}
function mountImportWizard() {
  const st = impState();
  const root = $('#page-stockout');
  const file = $('#impFile', root), drop = $('#impDrop', root);
  if (file) {
    file.addEventListener('change', () => handleImportFile(file.files[0]));
    ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => handleImportFile(e.dataTransfer.files[0]));
  }
  if (!root._impBound) { root._impBound = true; root.addEventListener('change', impIncHandler); }
  if (st.P) {
    bindCombos(root, () => ({ bundles: true }), (it, inp) => {
      const r = st.P.rows[Number(inp.dataset.comboInput.slice(3))];
      if (!r) return;
      r.kind = it.kind; r.id = it.id;
      if (it.kind === 'bundle') { const sz = bundleSizes(it.id); r.bUkuran = sz.find(u => slug(u) === slug(r.ukuran)) || sz[0] || ''; }
      r.match = 'Cocok'; r.method = 'Manual'; r.note = 'Diperbaiki manual oleh ' + S.me.nama;
      r.include = defaultInclude(r, st.P.meta.kind);
      rerender();
    });
  }
}
function impIncHandler(e) {
  const i = e.target.dataset && e.target.dataset.impInc;
  if (i === undefined || !UI.imp || !UI.imp.P) return;
  UI.imp.P.rows[Number(i)].include = e.target.checked;
  rerenderImportFooter();
}
const rerenderImportFooter = debounce(() => rerender(), 120);
async function handleImportFile(f) {
  if (!f) return;
  const st = impState();
  st.err = ''; st.busy = 'Membaca file…'; rerender();
  try {
    const P = await parseMarketplaceFile(f, st.source, 'OUT');
    st.busy = 'Memeriksa duplikasi' + (S.settings.AIAktif === 'true' && S.hasAiKey ? ' & meminta saran AI…' : '…'); rerender();
    await prepareImport(P);
    Object.assign(st, { P: P, step: 'preview', busy: '', filter: 'all', pg: 1 });
    const b = impBuckets(P);
    toast('Preview siap', `${fmt(b.ready.length)} siap · ${fmt(b.check.length + b.notfound.length)} perlu dicek · ${fmt(b.skip.length)} batal · ${fmt(b.dup.length)} duplikat`, b.check.length + b.notfound.length ? 'warning' : 'success');
  } catch (e) { st.busy = ''; st.err = e.message; }
  rerender();
}
async function saveImport(confirm) {
  const st = impState(), P = st.P;
  const inc = P.rows.filter(r => r.include && r.id);
  const out = inc.filter(r => r.sys === 'Valid'), rts = inc.filter(r => r.sys === 'Dikembalikan');
  const net = {}; out.forEach(r => impComps(r).forEach(c => { net[c.vid] = (net[c.vid] || 0) + c.q; }));
  const short = Object.keys(net).filter(v => net[v] > stockOf(v));
  if (confirm && short.length && S.settings.StokMinusMode !== 'tandai') {
    const ok = await modal({ icon: 'error', tone: 'danger', title: 'Stok tidak cukup untuk ' + short.length + ' varian', text: 'Konfirmasi akan ditolak server. Simpan dulu sebagai Pending, lalu konfirmasi setelah stok masuk atau perbaiki baris.', body: `<ul class="insight">${short.slice(0, 8).map(v => `<li><b>${esc(vLabel(v))}</b> — tersedia ${fmt(stockOf(v))}, dibutuhkan ${fmt(net[v])}</li>`).join('')}</ul>`, ok: 'Simpan sebagai Pending' });
    if (!ok) return; confirm = false;
  } else {
    const ok = await modal({ icon: confirm ? 'task_alt' : 'save', tone: confirm ? 'success' : 'info', title: confirm ? 'Konfirmasi proses import?' : 'Simpan import untuk dikonfirmasi?', text: `${fmt(out.length)} baris keluar (${fmt(sum(Object.values(net)))} helai)${rts.length ? ' dan ' + fmt(rts.length) + ' retur → RTS Pending' : ''}. ${confirm ? 'Stok akan berkurang sekarang.' : 'Stok belum berubah sampai Admin menekan Konfirmasi Proses.'}`, ok: confirm ? 'Konfirmasi proses' : 'Simpan' });
    if (!ok) return;
  }
  const toRow = r => r.kind === 'bundle' ? { key: r.key, order: r.order, tanggal: r.tanggal, bundleSku: r.id, ukuran: r.bUkuran, qty: r.qty, note: r.method === 'Kolom' ? '' : 'Pencocokan: ' + r.method } : { key: r.key, order: r.order, tanggal: r.tanggal, variantId: r.id, qty: r.qty, note: r.method === 'Kolom' ? '' : 'Pencocokan: ' + r.method };
  const meta = { fileName: P.meta.fileName, hash: P.meta.hash, source: P.meta.source, kind: 'OUT', total: P.meta.total, skipped: P.rows.length - inc.length };
  const chunks = []; for (let i = 0; i < out.length; i += 1000) chunks.push(out.slice(i, i + 1000));
  if (!chunks.length) chunks.push([]);
  let importId = null, inserted = 0, dups = 0, last = null;
  st.busy = 'Menyimpan…'; st.progress = 2; rerender();
  for (let k = 0; k < chunks.length; k++) {
    const isLast = k === chunks.length - 1;
    const res = await callApi('import.save', { importId: importId, meta: meta, rows: chunks[k].map(toRow), rts: isLast ? rts.map(r => ({ order: r.order, tanggal: r.tanggal, tanggalRetur: r.tanggalRetur, alasan: r.alasan || r.statusRaw, variantId: r.kind === 'variant' ? r.id : undefined, bundleSku: r.kind === 'bundle' ? r.id : undefined, ukuran: r.bUkuran, qty: r.qty })) : [], isLast: isLast, confirm: isLast && confirm });
    if (!res.success && !(res.data && res.data.importId)) { st.busy = ''; st.progress = 0; rerender(); toast('Import gagal', res.message + (importId ? ' Sebagian baris sudah tersimpan sebagai Pending — buka Riwayat import untuk melanjutkan/membatalkan.' : ''), 'danger', 10000); if (importId) refresh(true); return; }
    importId = (res.data || {}).importId || importId; inserted += (res.data || {}).inserted || 0; dups += (res.data || {}).duplicates || 0; last = res;
    st.progress = Math.round((k + 1) / chunks.length * 100); rerender();
  }
  UI.imp = null;
  const f = UI.f.stockout || (UI.f.stockout = {}); f.tab = last.success ? 'list' : 'imports';
  await refresh(true);
  if (last.success) toast(last.data.confirmed ? 'Import dikonfirmasi' : 'Import tersimpan', last.message + (dups ? ` (${dups} baris duplikat dilewati)` : ''), 'success', 6000);
  else toast('Import tersimpan, konfirmasi ditolak', last.message, 'danger', 10000);
}
function downloadTemplate() {
  const csv = '﻿No Pesanan,Tanggal,Status Pesanan,SKU,Nama Produk,Warna,Ukuran,Jumlah\nRS-0001,' + isoDate(now()) + ' 10:00,Selesai,RVL001-BLACK-M,ROVELO Regular Chino,Black,M,2\nRS-0002,' + isoDate(now()) + ' 11:30,Selesai,BDL-3NAVY,Bundle 3 Navy,,XL,1\n';
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'ROVELO_Template_Import.csv');
}

Object.assign(ACT, {
  'imp-src': el => { const st = impState(); st.source = st.source === el.dataset.s ? '' : el.dataset.s; rerender(); },
  'imp-reset': () => { UI.imp = null; rerender(); },
  'imp-filter': el => { const st = impState(); st.filter = el.dataset.f; st.pg = 1; rerender(); },
  'imp-pg': el => { impState().pg = Number(el.dataset.pg); rerender(); },
  'imp-template': () => downloadTemplate(),
  'imp-save': el => saveImport(el.dataset.c === '1'),
  'imp-status': el => {
    const st = impState(), s = el.dataset.s;
    st.P.rows.forEach(r => { if (r.sys === 'Perlu dicek' && (r.statusRaw || '(kosong)') === s) { r.sys = el.dataset.to; r.note = (r.note ? r.note + ' · ' : '') + 'Status "' + s + '" dianggap ' + el.dataset.to; r.include = defaultInclude(r, 'OUT'); } });
    rerender();
  },
  'imp-accept': el => {
    const r = impState().P.rows[Number(el.dataset.i)];
    r.kind = r.suggestKind || 'variant'; r.id = r.suggestion;
    if (r.kind === 'bundle') { const sz = bundleSizes(r.id); r.bUkuran = sz.find(u => slug(u) === slug(r.suggestSize || r.ukuran)) || sz[0] || ''; }
    r.match = 'Cocok'; r.note = 'Saran ' + r.method + ' diterima oleh ' + S.me.nama; r.method = r.method === 'AI' ? 'AI' : 'Manual';
    r.include = defaultInclude(r, impState().P.meta.kind);
    rerender();
  },
  'imp-all': el => {
    const st = impState(), list = impBuckets(st.P)[st.filter] || st.P.rows;
    list.slice((st.pg - 1) * 50, st.pg * 50).forEach(r => { if (r.id && !r.dup && r.sys !== 'Batal' && r.sys !== 'Perlu dicek') r.include = el.checked; });
    rerender();
  }
});
