'use strict';

// ════════ PRODUCTS, VARIAN & BUNDLE (F2, F3, F6, F10) ════════
const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'XXXL', '3XL', '4XL'];
function sizeRank(s) { const i = SIZE_ORDER.indexOf(String(s).toUpperCase()); return i >= 0 ? i : (isNaN(Number(s)) ? 50 : 100 + Number(s)); }
function sortVariants(a, b) { return a.SKU.localeCompare(b.SKU) || a.Warna.localeCompare(b.Warna) || sizeRank(a.Ukuran) - sizeRank(b.Ukuran); }

function renderProducts() {
  const el = $('#page-products');
  const f = UI.f.products || (UI.f.products = { tab: 'variants' });
  const tab = f.tab || 'variants';
  const actions = (can('EXPORT') ? `<button class="btn" data-act="export-open" data-type="produk">${I('download')}Export</button>` : '') +
    (tab === 'bundles' ? (can('BUNDLE_MANAGE') ? `<button class="btn btn-primary" data-act="bundle-new">${I('add')}Bundle baru</button>` : '')
      : (can('PRODUCT_EDIT') ? `<button class="btn btn-primary" data-act="product-new">${I('add')}Produk baru</button>` : ''));
  const nV = S.variants.length, nB = S.bundles.length;
  el.innerHTML = pageHead('Products', { badge: '<span class="pill pill-info">Katalog master</span>', sub: 'Kelola SKU, varian warna & ukuran, batas stok minimum, dan paket bundling.', actions: actions }) +
    `<div class="tabs" role="tablist"><button class="tab${tab === 'variants' ? ' on' : ''}" data-act="prod-tab" data-t="variants">${I('style')}Produk &amp; Varian <span class="n">${nV}</span></button><button class="tab${tab === 'bundles' ? ' on' : ''}" data-act="prod-tab" data-t="bundles">${I('redeem')}Bundle <span class="n">${nB}</span></button></div>` +
    (tab === 'bundles' ? bundlesView() : variantsView(f));
  bindFilterInputs(el, 'products');
}

function variantsView(f) {
  const q = String(f.q || '').toLowerCase();
  const st = f.status || '';
  let list = S.variants.slice().sort(sortVariants).filter(v => {
    const p = IX.p[v.SKU];
    const active = v.Aktif && (!p || p.Aktif);
    if (st === 'inactive') { if (active) return false; }
    else if (!active && st !== 'all') return false;
    const s = vStatus(v);
    if (st === 'normal' && s !== 'normal') return false;
    if (st === 'low' && s !== 'low') return false;
    if (st === 'out' && s !== 'out') return false;
    if (st === 'restock' && s === 'normal') return false;
    if (f.cat && (!p || p.CategoryID !== f.cat)) return false;
    if (q && (v.VariantID + ' ' + (p ? p.NamaProduk : '') + ' ' + v.Warna + ' ' + v.Ukuran).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
  if (st === 'restock') list.sort((a, b) => stockOf(a.VariantID) - stockOf(b.VariantID));
  const pg = paginate(list, 'products', 25);
  const totalStock = sum(list, v => stockOf(v.VariantID));
  return `<div class="card table-card">
    <div class="filters">
      <div class="input-icon">${I('search')}<input class="input" data-filter="q" value="${esc(f.q || '')}" placeholder="Cari nama produk, SKU, warna, ukuran…" aria-label="Cari produk"></div>
      <select class="select" data-filter="cat" aria-label="Kategori"><option value="">Semua kategori</option>${S.categories.map(c => `<option value="${esc(c.CategoryID)}" ${f.cat === c.CategoryID ? 'selected' : ''}>${esc(c.NamaKategori)}</option>`).join('')}</select>
      <select class="select" data-filter="status" aria-label="Status stok">${[['', 'Semua status'], ['restock', 'Perlu restock'], ['normal', 'Normal'], ['low', 'Low Stock'], ['out', 'Habis'], ['inactive', 'Nonaktif'], ['all', 'Termasuk nonaktif']].map(o => `<option value="${o[0]}" ${st === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>
      <span class="grow"></span><span class="muted tnum">${fmt(list.length)} varian · ${fmt(totalStock)} pcs</span>
    </div>
    <div class="table-wrap"><table class="tbl">
      <thead><tr><th>Foto</th><th>Kode / SKU</th><th>Nama produk</th><th>Warna</th><th>Ukuran</th><th class="num">Stok</th><th class="num">Min</th><th>Status</th><th></th></tr></thead>
      <tbody>${pg.rows.length ? pg.rows.map(v => {
        const p = IX.p[v.SKU], s = stockOf(v.VariantID), stat = (!v.Aktif || (p && !p.Aktif)) ? 'inactive' : vStatus(v);
        return `<tr class="clickable" data-act="variant-open" data-id="${esc(v.VariantID)}">
          <td class="w1">${thumb(v.VariantID)}</td>
          <td class="nowrap"><span class="mono strong">${esc(v.VariantID)}</span></td>
          <td><div class="col"><b>${esc(p ? p.NamaProduk : v.SKU)}</b><span class="muted" style="font-size:12.5px">${esc(p && IX.c[p.CategoryID] ? IX.c[p.CategoryID].NamaKategori : '—')}</span></div></td>
          <td class="nowrap"><span class="color-chip">${dotC(v.Warna)}${esc(v.Warna)}</span></td>
          <td><span class="pill pill-outline">${esc(v.Ukuran)}</span></td>
          <td class="num ${stat === 'out' ? 't-danger bold' : stat === 'low' ? 't-warning bold' : 'strong'}">${fmt(s)}</td>
          <td class="num muted">${fmt(v.BatasMinimum)}</td>
          <td>${stPill(stat)}</td>
          <td class="act">${I('chevron_right', 'faint')}</td></tr>`;
      }).join('') : `<tr><td colspan="9">${emptyHTML('inventory_2', 'Tidak ada varian', 'Ubah filter atau tambahkan produk baru.')}</td></tr>`}</tbody></table></div>
    ${pagerHTML(pg, 'products', 'varian')}</div>`;
}

/** Input filter: ketik → debounce → render ulang tanpa kehilangan fokus. */
function bindFilterInputs(root, key) {
  $$('[data-filter]', root).forEach(inp => {
    const f = UI.f[key] || (UI.f[key] = {});
    const apply = () => { f[inp.dataset.filter] = inp.value; f.pg = 1; const pos = inp.selectionStart; renderPage(UI.page); const n = $(`#page-${UI.page} [data-filter="${inp.dataset.filter}"]`); if (n && inp.tagName === 'INPUT' && n.type !== 'date') { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { } } };
    if (inp.tagName === 'INPUT' && inp.type !== 'date') inp.addEventListener('input', debounce(apply, 180));
    else inp.addEventListener('change', apply);
  });
}

function bundlesView() {
  if (!S.bundles.length) return `<div class="card">${emptyHTML('redeem', 'Belum ada bundle', 'Bundle menjual paket (mis. 3 celana) tanpa stok paket terpisah — stok dihitung dari komponen.', can('BUNDLE_MANAGE') ? `<button class="btn btn-primary mt-8" data-act="bundle-new">${I('add')}Bundle baru</button>` : '')}</div>`;
  return `<div class="banner banner-info mb-16">${I('info')}<div><b>Stok bundle dihitung, tidak disimpan</b><p>Jumlah paket yang bisa dibuat = nilai terkecil dari stok komponen ÷ jumlah per paket (ukuran sama dalam satu paket). Penjualan bundle langsung mengurangi stok komponen.</p></div></div>
  <div class="card table-card"><div class="table-wrap"><table class="tbl">
    <thead><tr><th>Bundle</th><th>Resep per paket</th><th>Bisa dibuat per ukuran</th><th>Status</th><th></th></tr></thead>
    <tbody>${S.bundles.map(b => {
      const items = IX.bItems[b.BundleSKU] || [];
      const sizes = bundleSizes(b.BundleSKU).sort((x, y) => sizeRank(x) - sizeRank(y));
      return `<tr class="clickable" data-act="bundle-edit" data-id="${esc(b.BundleSKU)}">
        <td><div class="prod"><span class="thumb">${I('redeem')}</span><div class="col"><b>${esc(b.NamaBundle)}</b><span class="mono">${esc(b.BundleSKU)} · ${esc(items[0] ? items[0].SKU : '')}</span></div></div></td>
        <td><div class="row wrap">${items.map(i => `<span class="tag" style="padding-right:10px">${dotC(i.Warna)}${esc(i.Warna)} ×${i.Jumlah}</span>`).join('')}<span class="muted">= ${sum(items, i => i.Jumlah)} helai</span></div></td>
        <td><div class="row wrap gap-4">${sizes.map(u => { const c = bundleCap(b.BundleSKU, u); return `<span class="pill ${c === 0 ? 'pill-danger' : c < 3 ? 'pill-warning' : 'pill-outline'}">${esc(u)} · ${fmt(c)}</span>`; }).join('') || '<span class="muted">Varian komponen belum lengkap</span>'}</div></td>
        <td>${b.Aktif ? '<span class="pill pill-success">Aktif</span>' : '<span class="pill pill-outline">Nonaktif</span>'}</td>
        <td class="act">${I('chevron_right', 'faint')}</td></tr>`;
    }).join('')}</tbody></table></div></div>`;
}

// ── Detail varian ──
function openVariant(vid) {
  const v = IX.v[vid]; if (!v) return;
  const p = IX.p[v.SKU] || {};
  const tot = S.stockTotals[vid] || [0, 0];
  const hist = S.tx.filter(t => t.VariantID === vid && t.Status === 'Confirmed').sort((a, b) => (b.DikonfirmasiPada || b.Tanggal) - (a.DikonfirmasiPada || a.Tanggal)).slice(0, 10);
  const inBundles = S.bundles.filter(b => (IX.bItems[b.BundleSKU] || []).some(i => i.SKU === v.SKU && slug(i.Warna) === slug(v.Warna)));
  const stat = (!v.Aktif || !p.Aktif) ? 'inactive' : vStatus(v);
  const editable = can('PRODUCT_EDIT');
  openDrawer({
    title: p.NamaProduk || v.SKU, sub: 'Detail varian · ' + vid, badge: stPill(stat), noFocus: true,
    body: `<div class="row gap-16 top">${thumb(vid, 'xl')}<div class="col gap-4 grow">
        <span class="mono strong" style="font-size:15px">${esc(vid)}</span>
        <span class="muted">${esc(IX.c[p.CategoryID] ? IX.c[p.CategoryID].NamaKategori : '—')} · Brand ${esc(p.BrandCode || '—')}</span>
        <div class="row wrap mt-8"><span class="tag" style="padding-right:10px">${dotC(v.Warna)}${esc(v.Warna)}</span><span class="tag" style="padding-right:10px">Ukuran ${esc(v.Ukuran)}</span></div>
        ${p.FotoLink ? `<button class="link mt-8" data-act="photo-preview" data-sku="${esc(v.SKU)}" style="align-self:flex-start">${I('image', 'sm')} Lihat foto produk</button>` : ''}</div></div>
      <div class="stats3"><div><span>Stok tersedia</span><b class="${stat === 'out' ? 't-danger' : stat === 'low' ? 't-warning' : ''}">${fmt(stockOf(vid))} pcs</b></div><div><span>Total masuk</span><b class="t-success">${fmt(tot[0])}</b></div><div><span>Total keluar</span><b>${fmt(tot[1])}</b></div></div>
      <div class="dr-section"><div class="overline">Pengaturan varian</div>
        <div class="form-grid"><div class="field"><label for="vMin">Batas minimum stok</label><div class="row"><input id="vMin" type="number" min="0" step="1" class="input" value="${v.BatasMinimum}" ${editable ? '' : 'disabled'}>${editable ? `<button class="btn" data-act="variant-min" data-id="${esc(vid)}">Simpan</button>` : ''}</div><span class="help">Status Low Stock jika stok ≤ batas ini.</span></div>
        <div class="field"><span class="flabel">Status varian</span><label class="row" style="height:40px"><span class="switch"><input type="checkbox" id="vAktif" ${v.Aktif ? 'checked' : ''} ${editable ? '' : 'disabled'} data-act="variant-active" data-id="${esc(vid)}"><span></span></span>${v.Aktif ? 'Aktif — muncul di pilihan input' : 'Nonaktif — tidak muncul di input baru'}</label></div></div>
        ${inBundles.length ? `<div class="help">Dipakai di bundle: ${inBundles.map(b => '<b>' + esc(b.NamaBundle) + '</b>').join(', ')}</div>` : ''}</div>
      <div><div class="row between" style="margin-bottom:8px"><span class="overline">Riwayat ringkas</span><button class="link" data-act="variant-history" data-id="${esc(vid)}" style="font-size:13px">Lihat semua</button></div>
        ${hist.length ? `<div class="table-wrap" style="border:1px solid var(--border);border-radius:8px"><table class="tbl dense"><thead><tr><th>Tanggal</th><th>Jenis</th><th class="num">Perubahan</th><th class="num">Sesudah</th></tr></thead><tbody>${hist.map(t => `<tr><td class="nowrap">${fmtDT(t.Tanggal)}</td><td><span class="nowrap">${esc((JENIS[t.Jenis] || {}).label || t.Jenis)}</span> <span class="muted" style="font-size:12px">${esc(t.Sumber)}</span></td><td class="num ${t.Jumlah >= 0 ? 'qty-pos' : 'qty-neg'}">${sgn(t.Jumlah)}</td><td class="num">${fmt(t.StokSesudah)}</td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">Belum ada transaksi terkonfirmasi dalam ${45} hari terakhir.</p>`}</div>`,
    foot: `${can('PRODUCT_DELETE') ? `<button class="btn btn-danger" data-act="variant-delete" data-id="${esc(vid)}">${I('delete')}Hapus</button>` : ''}<span class="grow"></span>
      ${can('OUT_CREATE') ? `<button class="btn" data-act="out-new" data-vid="${esc(vid)}">${I('remove')}Barang keluar</button>` : ''}
      ${can('IN_CREATE') ? `<button class="btn" data-act="in-new" data-vid="${esc(vid)}">${I('add')}Barang masuk</button>` : ''}
      ${editable ? `<button class="btn btn-primary" data-act="product-edit" data-sku="${esc(v.SKU)}">${I('edit')}Edit produk</button>` : ''}`
  });
}

// ── Form produk (baru / edit) ──
function openProductForm(sku) {
  const p = sku ? IX.p[sku] : null;
  const existing = p ? S.variants.filter(v => v.SKU === sku).sort(sortVariants) : [];
  const colors = Array.from(new Set(listOf(S.settings.WarnaList).concat(existing.map(v => v.Warna))));
  const sizes = Array.from(new Set(listOf(S.settings.UkuranList).concat(existing.map(v => v.Ukuran)))).sort((a, b) => sizeRank(a) - sizeRank(b));
  const F = { colors: [], sizes: [], photo: null, thumb: null, noTouched: false };
  // ── SKU otomatis: BRAND-KODEKATEGORI-NOMOR (mis. RVL-CP-001); hanya nomor yang diisi
  const catOf = () => IX.c[$('#pCat').value] || {};
  const kodeKat = () => slug(($('#pKatKode') || {}).value || '');
  const prefix = () => { const b = slug($('#pBrand').value), k = kodeKat(); return b && k ? b + '-' + k + '-' : ''; };
  const composeSku = () => { const pre = prefix(), no = (($('#pNo') || {}).value || '').trim(); return pre && no ? pre + no.padStart(3, '0') : ''; }; // 1 → 001
  const nextNo = pre => { let max = 0; S.products.forEach(x => { if (x.SKU.indexOf(pre) === 0) { const m = x.SKU.slice(pre.length).match(/^(\d+)$/); if (m) max = Math.max(max, Number(m[1])); } }); return String(max + 1).padStart(3, '0'); };
  const syncSku = (fromCat) => {
    if (p) return;
    const c = catOf(), kk = $('#pKatKode'), has = !!c.KodeKategori;
    if (fromCat) { kk.value = has ? c.KodeKategori : suggestKodeKategori(c.NamaKategori, c.CategoryID); kk.readOnly = has; }
    $('#pKatHelp').innerHTML = has ? 'Kode tersimpan untuk kategori ini · ubah di General Settings → Kategori' : 'Kode baru untuk <b>' + esc(c.NamaKategori || '') + '</b> — disimpan & dipakai seterusnya';
    const pre = prefix();
    $('#pSkuPre').textContent = pre || '—';
    if (pre && !F.noTouched) $('#pNo').value = nextNo(pre);
    const sku = composeSku(), dup = sku && IX.p[sku];
    $('#pSkuHelp').innerHTML = !sku ? 'Isi kode kategori dan nomor.' : dup ? `<span class="t-danger">${I('error', 'sm')} SKU <b>${esc(sku)}</b> sudah dipakai produk lain</span>` : 'SKU: <b class="mono">' + esc(sku) + '</b> · nomor berikutnya disarankan otomatis, boleh diubah';
    draw();
  };
  const draw = () => {
    const combos = [];
    const curSku = p ? p.SKU : (composeSku() || 'SKU');
    F.colors.forEach(w => F.sizes.forEach(u => { const vid = vidOf(curSku, w, u); if (!existing.some(v => v.VariantID === vid)) combos.push([w, u, vid]); }));
    $('#pCombos').innerHTML = combos.length ? `<div class="help">${combos.length} varian baru akan dibuat:</div><div class="table-wrap" style="border:1px solid var(--border);border-radius:8px;max-height:260px"><table class="tbl dense"><thead><tr><th>Varian</th><th class="num">Stok awal</th></tr></thead><tbody>${combos.map(c => `<tr><td><span class="color-chip">${dotC(c[0])}<span class="mono">${esc(c[2])}</span></span></td><td class="num"><input type="number" min="0" step="1" class="input input-sm qty" data-awal="${esc(c[0])}|${esc(c[1])}" placeholder="0" style="margin-left:auto"></td></tr>`).join('')}</tbody></table></div><span class="help">Stok awal dicatat sebagai transaksi barang masuk${can('IN_CONFIRM') ? ' (langsung dikonfirmasi)' : ' (Pending, menunggu konfirmasi)'}.</span>` : `<span class="help">${p ? 'Pilih warna & ukuran untuk menambah varian baru.' : 'Pilih minimal satu warna dan satu ukuran.'}</span>`;
    $('#pComboCount').textContent = combos.length ? combos.length + ' varian baru' : '';
  };
  const chips = (arr, kind) => arr.map(x => `<button type="button" class="pick-chip" data-pick="${kind}" data-v="${esc(x)}">${kind === 'colors' ? dotC(x) : ''}${esc(x)}</button>`).join('');
  openDrawer({
    title: p ? 'Edit produk' : 'Tambah produk & varian', sub: p ? p.SKU + ' · ' + existing.length + ' varian' : 'Definisikan spesifikasi ukuran, warna & ambang stok',
    body: `<div class="field"><label for="pNama">Nama / jenis produk <span class="req">*</span></label><input id="pNama" class="input" value="${esc(p ? p.NamaProduk : '')}" placeholder="ROVELO-CP-HITAM" maxlength="80"><span class="help">Boleh huruf, angka, dan simbol (mis. - / &amp; .)</span></div>
      <div class="field"><label for="pCat">Kategori <span class="req">*</span></label><select id="pCat" class="select">${S.categories.filter(c => c.Aktif || (p && p.CategoryID === c.CategoryID)).map(c => `<option value="${esc(c.CategoryID)}" ${p && p.CategoryID === c.CategoryID ? 'selected' : ''}>${esc(c.NamaKategori)}</option>`).join('')}</select></div>
      ${p ? `<div class="form-grid"><div class="field"><label for="pBrand">Brand code <span class="req">*</span></label><input id="pBrand" class="input mono" value="${esc(p.BrandCode)}" maxlength="10"></div>
      <div class="field"><label for="pSku">Product code / SKU</label><input id="pSku" class="input mono" value="${esc(p.SKU)}" readonly><span class="help">SKU tidak bisa diubah setelah dibuat.</span></div></div>` : `<div class="form-grid"><div class="field"><label for="pBrand">Brand code <span class="req">*</span></label><input id="pBrand" class="input mono" value="RVL" maxlength="10" autocapitalize="characters"></div>
      <div class="field"><label for="pKatKode">Kode kategori <span class="req">*</span></label><input id="pKatKode" class="input mono" maxlength="12" autocapitalize="characters" placeholder="CP"><span class="help" id="pKatHelp"></span></div></div>
      <div class="field"><label for="pNo">Product code / SKU <span class="req">*</span></label><div class="sku-build"><span class="sku-pre mono" id="pSkuPre">RVL-</span><input id="pNo" class="input mono" inputmode="numeric" maxlength="6" placeholder="001" aria-label="Nomor produk"></div><span class="help" id="pSkuHelp"></span></div>`}
      ${p ? `<div class="field"><span class="flabel">Varian saat ini</span><div class="row wrap">${existing.map(v => `<span class="tag" style="padding-right:10px">${dotC(v.Warna)}${esc(v.Warna)} · ${esc(v.Ukuran)}${v.Aktif ? '' : ' (nonaktif)'}</span>`).join('')}</div></div>` : ''}
      <div class="field"><span class="flabel">${p ? 'Tambah warna' : 'Warna'} <span class="req">*</span></span><div class="pick-chips" id="pColors">${chips(colors, 'colors')}</div><div class="row"><input id="pColorNew" class="input input-sm" placeholder="Warna lain…" style="max-width:200px"><button type="button" class="btn btn-sm" data-act="pick-add" data-k="colors">${I('add')}Tambah</button></div></div>
      <div class="field"><span class="flabel">${p ? 'Tambah ukuran' : 'Ukuran'} <span class="req">*</span></span><div class="pick-chips" id="pSizes">${chips(sizes, 'sizes')}</div><div class="row"><input id="pSizeNew" class="input input-sm" placeholder="Ukuran lain…" style="max-width:200px"><button type="button" class="btn btn-sm" data-act="pick-add" data-k="sizes">${I('add')}Tambah</button></div></div>
      <div class="field"><label for="pMin">Batas minimum stok <span class="t-warning" style="text-transform:none;letter-spacing:0;font-weight:500;float:right">${I('info', 'sm')} Memicu notifikasi</span></label><input id="pMin" type="number" min="0" step="1" class="input" value="${esc(S.settings.BatasMinimumDefault || 5)}"><span class="help">Berlaku untuk varian baru. Batas per varian bisa diubah di detail varian.</span></div>
      <details class="adv" ${p ? '' : ''}><summary>${I('tune')}Opsi lanjutan (foto produk &amp; stok awal)<span class="muted" id="pComboCount" style="font-weight:500;margin-left:6px"></span>${I('keyboard_arrow_down', 'chev')}</summary><div class="adv-body">
        <div class="field"><span class="flabel">Upload thumbnail garmen</span><label class="drop" id="pDrop">${I('cloud_upload')}<b>Seret foto atau klik untuk memilih file</b><span class="muted" style="font-size:12.5px">JPG/PNG/WEBP maks 5 MB · disimpan di Drive (tanpa link publik)</span><input type="file" id="pFile" accept="image/jpeg,image/png,image/webp" hidden></label>
          <div id="pPhotoPrev">${p && p.Thumb ? `<div class="row mt-8">${thumb(p.SKU, 'lg')}<span class="muted">Foto saat ini</span></div>` : ''}</div></div>
        <div id="pCombos"></div></div></details>`,
    foot: `${p && can('PRODUCT_DELETE') ? `<button class="btn btn-danger" data-act="product-delete" data-sku="${esc(p.SKU)}">${I('delete')}Hapus produk</button>` : ''}${p ? `<button class="btn" data-act="product-toggle" data-sku="${esc(p.SKU)}">${p.Aktif ? I('block') + 'Nonaktifkan' : I('check') + 'Aktifkan'}</button>` : ''}<span class="grow"></span><button class="btn" data-act="drawer-close">Batal</button><button class="btn btn-primary" id="pSave">${p ? 'Simpan perubahan' : 'Simpan produk'}</button>`,
    onMount: d => {
      d._F = F;
      d.addEventListener('click', e => {
        const c = e.target.closest('[data-pick]'); if (!c) return;
        const arr = F[c.dataset.pick], v = c.dataset.v, i = arr.indexOf(v);
        if (i >= 0) arr.splice(i, 1); else arr.push(v);
        c.classList.toggle('on', i < 0); draw();
      });
      if (!p) {
        $('#pCat', d).addEventListener('change', () => syncSku(true));
        $('#pBrand', d).addEventListener('input', () => { const e = $('#pBrand', d); e.value = slug(e.value); syncSku(false); });
        $('#pKatKode', d).addEventListener('input', () => { const e = $('#pKatKode', d); e.value = slug(e.value); syncSku(false); });
        $('#pNo', d).addEventListener('input', () => { const e = $('#pNo', d); e.value = e.value.replace(/\D/g, ''); F.noTouched = !!e.value; syncSku(false); });
        syncSku(true);
      }
      const file = $('#pFile', d), drop = $('#pDrop', d);
      const takeFile = async fl => {
        if (!fl) return;
        if (fl.size > 5 * 1024 * 1024) { toast('File terlalu besar', 'Ukuran foto maksimal 5 MB. Kompres dulu sebelum diunggah.', 'danger'); return; }
        try { F.photo = await resizeImage(fl, 1200, 'image/jpeg', .86); F.thumb = await squareThumb(fl, 96); $('#pPhotoPrev', d).innerHTML = `<div class="row mt-8"><span class="thumb lg"><img src="${F.thumb}" alt=""></span><span class="muted">${esc(fl.name)} · siap diunggah</span></div>`; }
        catch (err) { toast('Foto tidak valid', err.message, 'danger'); }
      };
      file.addEventListener('change', () => takeFile(file.files[0]));
      ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
      ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
      drop.addEventListener('drop', e => takeFile(e.dataTransfer.files[0]));
      $('#pSave', d).addEventListener('click', () => saveProduct(p, F, composeSku, catOf, kodeKat));
      draw();
    }
  });
}
function squareThumb(file, size) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); const s = Math.min(img.width, img.height); g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size); URL.revokeObjectURL(img.src); res(c.toDataURL('image/jpeg', .72)); };
    img.onerror = () => rej(new Error('File gambar tidak bisa dibaca.'));
    img.src = URL.createObjectURL(file);
  });
}
async function saveProduct(p, F, composeSku, catOf, kodeKat) {
  const d = $('#drawer');
  const variants = [];
  F.colors.forEach(w => F.sizes.forEach(u => {
    const inp = $(`[data-awal="${CSS.escape(w + '|' + u)}"]`, d);
    variants.push({ warna: w, ukuran: u, min: $('#pMin', d).value, stokAwal: inp ? inp.value || 0 : 0 });
  }));
  const sku = p ? p.SKU : composeSku();
  const payload = { mode: p ? 'update' : 'create', sku: sku, nama: $('#pNama', d).value, brand: $('#pBrand', d).value, categoryId: $('#pCat', d).value, variants: variants.filter(v => !S.variants.some(x => x.VariantID === vidOf(sku, v.warna, v.ukuran))) };
  if (!payload.nama.trim()) { toast('Lengkapi data', 'Nama produk wajib diisi.', 'warning'); $('#pNama', d).focus(); return; }
  if (!p) {
    const cat = catOf(), kk = kodeKat();
    if (!slug(payload.brand)) { toast('Lengkapi data', 'Brand code wajib diisi (mis. RVL).', 'warning'); $('#pBrand', d).focus(); return; }
    if (!/^[A-Z0-9]{1,12}$/.test(kk)) { toast('Lengkapi data', 'Kode kategori wajib 1–12 huruf/angka (mis. CP).', 'warning'); $('#pKatKode', d).focus(); return; }
    if (!cat.KodeKategori && S.categories.some(c => c.CategoryID !== cat.CategoryID && c.KodeKategori === kk)) { toast('Kode kategori dipakai', 'Kode ' + kk + ' sudah dipakai kategori lain. Gunakan kode lain.', 'warning'); $('#pKatKode', d).focus(); return; }
    if (!/^\d{1,6}$/.test(($('#pNo', d).value || '').trim())) { toast('Lengkapi data', 'Isi nomor produk (angka, mis. 001).', 'warning'); $('#pNo', d).focus(); return; }
    if (IX.p[sku]) { toast('SKU sudah dipakai', 'SKU ' + sku + ' sudah dipakai produk lain. Ganti nomornya.', 'warning'); $('#pNo', d).focus(); return; }
    if (!cat.KodeKategori) payload.kodeKategori = kk;
  }
  if (!p && !payload.variants.length) { toast('Lengkapi data', 'Pilih minimal satu warna dan satu ukuran.', 'warning'); return; }
  const btn = $('#pSave', d); btn.classList.add('loading');
  const r = await callApi('product.save', payload);
  btn.classList.remove('loading');
  if (!r.success) { toast('Gagal menyimpan', r.message, 'danger', 8000); return; }
  upsert(S.products, [r.data.product], 'SKU');
  if (r.data.categories) S.categories = r.data.categories;
  upsert(S.variants, r.data.variants, 'VariantID');
  r.data.variants.forEach(v => { if (S.stock[v.VariantID] === undefined) S.stock[v.VariantID] = 0; });
  if (r.data.patch) applyPatch(r.data.patch);
  if (F.photo) {
    const prod = IX.p[sku] || r.data.product; prod.Thumb = F.thumb; // tampil instan
    callApi('product.photo', { sku: sku, b64: F.photo.split(',')[1], mime: 'image/jpeg', thumb: F.thumb }).then(x => {
      if (x.success) { const pp = S.products.find(q => q.SKU === sku); if (pp) { pp.FotoLink = x.data.fotoLink; pp.Thumb = x.data.thumb; } cacheStateSoon(); }
      else toast('Foto gagal diunggah', x.message, 'danger');
    });
  }
  reindex(); closeDrawer(); afterChange(); cacheStateSoon();
  toast(p ? 'Produk diperbarui' : 'Produk ditambahkan', r.message, 'success');
}

async function previewPhoto(sku) {
  const p = IX.p[sku]; if (!p || !p.FotoLink) return;
  modal({ title: p.NamaProduk, icon: 'image', closeX: true, size: 'lg', body: `<div class="skel" style="height:320px" id="phBox"></div>`, ok: false, cancel: 'Tutup' });
  const r = await callApi('file.get', { url: p.FotoLink });
  const box = $('#phBox');
  if (!box) return;
  if (!r.success) { box.outerHTML = `<div class="banner banner-danger">${I('error')}<p>${esc(r.message)}</p></div>`; return; }
  const src = 'data:' + r.data.mime + ';base64,' + r.data.b64;
  box.outerHTML = `<img class="preview-img" src="${src}" alt="${esc(p.NamaProduk)}"><div class="row mt-12" style="justify-content:center"><button class="btn" id="phDl">${I('download')}Unduh</button></div>`;
  $('#phDl').onclick = () => fetch(src).then(x => x.blob()).then(b => download(b, r.data.name));
}

// ── Bundle ──
function openBundleForm(bsku) {
  const b = bsku ? IX.b[bsku] : null;
  const items = b ? (IX.bItems[bsku] || []).map(i => Object.assign({}, i)) : [];
  const pantsCats = S.categories.filter(c => /celana|pants|jeans|chino/i.test(c.NamaKategori)).map(c => c.CategoryID);
  const prods = S.products.filter(p => p.Aktif && (!pantsCats.length || pantsCats.indexOf(p.CategoryID) >= 0));
  const st = { sku: items[0] ? items[0].SKU : (prods[0] ? prods[0].SKU : ''), rows: items.length ? items.map(i => ({ w: i.Warna, n: i.Jumlah })) : [{ w: '', n: 3 }] };
  const colorsOf = sku => Array.from(new Set(S.variants.filter(v => v.SKU === sku).map(v => v.Warna)));
  const ro = !can('BUNDLE_MANAGE');
  const draw = () => {
    const cols = colorsOf(st.sku);
    $('#bRows').innerHTML = st.rows.map((r, i) => `<div class="row"><select class="select" data-brow="w" data-i="${i}" ${ro ? 'disabled' : ''}><option value="">Pilih warna…</option>${cols.map(c => `<option ${slug(c) === slug(r.w) ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select><div class="unit" data-unit="helai" style="width:130px"><input type="number" min="1" step="1" class="input" value="${r.n}" data-brow="n" data-i="${i}" ${ro ? 'disabled' : ''}></div>${!ro && st.rows.length > 1 ? `<button class="icon-btn" data-act="brow-del" data-i="${i}" aria-label="Hapus komponen">${I('delete')}</button>` : ''}</div>`).join('');
    const total = sum(st.rows, r => Number(r.n) || 0);
    const tmp = 'TMPBDL';
    IX.bItems[tmp] = st.rows.filter(r => r.w).map(r => ({ BundleSKU: tmp, SKU: st.sku, Warna: r.w, Jumlah: Number(r.n) || 0 }));
    const sizes = bundleSizes(tmp).sort((a, c) => sizeRank(a) - sizeRank(c));
    $('#bCap').innerHTML = `<div class="row between"><span class="overline">Bisa dibuat sekarang</span><span class="muted">${total} helai per paket ${total < 2 ? '<span class="t-danger">(minimal 2)</span>' : ''}</span></div><div class="row wrap mt-8">${sizes.map(u => { const c = IX.bItems[tmp].length ? bundleCap(tmp, u) : 0; return `<span class="pill pill-lg ${c === 0 ? 'pill-danger' : 'pill-outline'}">${esc(u)}: ${fmt(c)} paket</span>`; }).join('') || '<span class="muted">Pilih komponen untuk melihat kapasitas.</span>'}</div>`;
    delete IX.bItems[tmp];
  };
  openDrawer({
    title: b ? b.NamaBundle : 'Bundle baru', sub: b ? b.BundleSKU + ' · perubahan resep tidak mengubah transaksi lama' : 'Paket berisi celana, satu ukuran per paket; warna boleh sama atau campur',
    body: `<div class="form-grid"><div class="field"><label for="bSku">SKU bundle <span class="req">*</span></label><input id="bSku" class="input mono" value="${esc(b ? b.BundleSKU : 'BDL-')}" ${b ? 'readonly' : ''} maxlength="30"></div>
      <div class="field"><label for="bNama">Nama bundle <span class="req">*</span></label><input id="bNama" class="input" value="${esc(b ? b.NamaBundle : '')}" placeholder="Bundle 3 Navy" ${ro ? 'disabled' : ''}></div></div>
      <div class="field"><label for="bProd">Produk komponen</label><select id="bProd" class="select" ${ro ? 'disabled' : ''}>${(prods.length ? prods : S.products).map(p => `<option value="${esc(p.SKU)}" ${p.SKU === st.sku ? 'selected' : ''}>${esc(p.SKU + ' · ' + p.NamaProduk)}</option>`).join('')}</select><span class="help">Ukuran dipilih saat paket dijual (mis. XL) — semua komponen memakai ukuran itu.</span></div>
      <div class="field"><span class="flabel">Resep per paket</span><div class="col gap-12" id="bRows"></div>${ro ? '' : `<button class="btn btn-sm" data-act="brow-add" style="align-self:flex-start">${I('add')}Tambah warna</button>`}</div>
      <div class="dr-section" id="bCap"></div>
      <div class="field"><label for="bNote">Catatan</label><input id="bNote" class="input" value="${esc(b ? b.Catatan : '')}" ${ro ? 'disabled' : ''}></div>
      ${b ? `<label class="row"><span class="switch"><input type="checkbox" id="bAktif" ${b.Aktif ? 'checked' : ''} ${ro ? 'disabled' : ''}><span></span></span>Bundle aktif (bisa dipilih untuk input baru)</label>` : ''}`,
    foot: ro ? `<button class="btn" data-act="drawer-close">Tutup</button>` : `${b ? `<button class="btn btn-danger" data-act="bundle-delete" data-id="${esc(b.BundleSKU)}">${I('delete')}Hapus</button>` : ''}<span class="grow"></span><button class="btn" data-act="drawer-close">Batal</button><button class="btn btn-primary" id="bSave">Simpan bundle</button>`,
    onMount: d => {
      draw();
      d.addEventListener('change', e => { const t = e.target; if (t.id === 'bProd') { st.sku = t.value; st.rows.forEach(r => { r.w = ''; }); draw(); } if (t.dataset.brow) { st.rows[Number(t.dataset.i)][t.dataset.brow] = t.dataset.brow === 'n' ? Number(t.value) : t.value; draw(); } });
      d._bundle = st; d._draw = draw;
      const sv = $('#bSave', d); if (sv) sv.onclick = () => saveBundle(b, st);
    }
  });
}
async function saveBundle(b, st) {
  const d = $('#drawer');
  const payload = { mode: b ? 'update' : 'create', bundleSku: $('#bSku', d).value.trim().toUpperCase(), nama: $('#bNama', d).value.trim(), catatan: $('#bNote', d).value, aktif: b ? $('#bAktif', d).checked : true, items: st.rows.filter(r => r.w).map(r => ({ sku: st.sku, warna: r.w, jumlah: Number(r.n) })) };
  if (!payload.nama) { toast('Lengkapi data', 'Nama bundle wajib diisi.', 'warning'); return; }
  if (sum(payload.items, i => i.jumlah) < 2) { toast('Resep belum valid', 'Total helai per paket minimal 2.', 'warning'); return; }
  const btn = $('#bSave', d); btn.classList.add('loading');
  const r = await callApi('bundle.save', payload);
  btn.classList.remove('loading');
  if (!r.success) { toast('Gagal menyimpan bundle', r.message, 'danger', 8000); return; }
  const bs = r.data.bundleSku;
  upsert(S.bundles, [{ BundleSKU: bs, NamaBundle: payload.nama, Aktif: payload.aktif, Catatan: payload.catatan }], 'BundleSKU');
  S.bundleItems = S.bundleItems.filter(i => i.BundleSKU !== bs).concat(payload.items.map(i => ({ BundleSKU: bs, SKU: i.sku, Warna: i.warna, Jumlah: i.jumlah })));
  reindex(); closeDrawer(); afterChange(); cacheStateSoon();
  toast('Bundle tersimpan', r.message, 'success');
}

Object.assign(ACT, {
  'prod-tab': el => { (UI.f.products = UI.f.products || {}).tab = el.dataset.t; rerender(); },
  'variant-open': el => openVariant(el.dataset.id),
  'product-new': () => openProductForm(null),
  'product-edit': el => openProductForm(el.dataset.sku),
  'photo-preview': el => previewPhoto(el.dataset.sku),
  'variant-history': el => { closeDrawer(); navigateTo('history', { filter: { variantId: el.dataset.id, tab: 'tx' } }); },
  'pick-add': el => {
    const k = el.dataset.k, inp = $(k === 'colors' ? '#pColorNew' : '#pSizeNew'), v = inp.value.trim();
    if (!v) return;
    const box = $(k === 'colors' ? '#pColors' : '#pSizes');
    if (!$(`[data-v="${CSS.escape(v)}"]`, box)) box.insertAdjacentHTML('beforeend', `<button type="button" class="pick-chip" data-pick="${k}" data-v="${esc(v)}">${k === 'colors' ? dotC(v) : ''}${esc(v)}</button>`);
    $(`[data-v="${CSS.escape(v)}"]`, box).click(); inp.value = '';
  },
  'variant-min': el => {
    const vid = el.dataset.id, val = int($('#vMin').value);
    if (isNaN(val) || val < 0) { toast('Nilai tidak valid', 'Batas minimum harus bilangan bulat ≥ 0.', 'warning'); return; }
    optimistic({ apply: () => { IX.v[vid].BatasMinimum = val; }, action: 'variant.save', data: { variantId: vid, min: val }, okTitle: 'Batas minimum disimpan', okMsg: 'Status stok diperbarui di semua halaman.' });
    setTimeout(() => openVariant(vid), 10);
  },
  'variant-active': el => {
    const vid = el.dataset.id, on = el.checked;
    optimistic({ apply: () => { IX.v[vid].Aktif = on; }, action: 'variant.save', data: { variantId: vid, aktif: on }, okTitle: on ? 'Varian diaktifkan' : 'Varian dinonaktifkan' });
  },
  'variant-delete': async el => {
    const vid = el.dataset.id;
    const ok = await modal({ icon: 'delete', tone: 'danger', title: 'Hapus varian ' + vid + '?', text: 'Varian yang sudah punya transaksi tidak bisa dihapus — nonaktifkan saja.', ok: 'Hapus', danger: true });
    if (!ok) return;
    const r = await callApi('variant.delete', { variantId: vid });
    if (!r.success) { toast('Tidak bisa dihapus', r.message, 'danger', 7000); return; }
    S.variants = S.variants.filter(v => v.VariantID !== vid); delete S.stock[vid];
    reindex(); closeDrawer(); afterChange(); toast('Varian dihapus', r.message, 'success');
  },
  'product-toggle': async el => {
    const sku = el.dataset.sku, p = IX.p[sku], on = !p.Aktif;
    closeDrawer();
    optimistic({ apply: () => { p.Aktif = on; }, action: 'product.setActive', data: { sku: sku, aktif: on }, okTitle: on ? 'Produk diaktifkan' : 'Produk dinonaktifkan', okMsg: on ? '' : 'Produk tetap ada di riwayat, tetapi tidak muncul di input baru.' });
  },
  'product-delete': async el => {
    const sku = el.dataset.sku;
    const ok = await modal({ icon: 'delete', tone: 'danger', title: 'Hapus produk ' + sku + '?', text: 'Semua varian produk ini ikut terhapus. Produk yang sudah punya riwayat transaksi tidak bisa dihapus.', ok: 'Hapus produk', danger: true });
    if (!ok) return;
    const r = await callApi('product.delete', { sku: sku });
    if (!r.success) { toast('Tidak bisa dihapus', r.message, 'danger', 7000); return; }
    S.products = S.products.filter(p => p.SKU !== sku); S.variants = S.variants.filter(v => v.SKU !== sku);
    reindex(); closeDrawer(); afterChange(); toast('Produk dihapus', r.message, 'success');
  },
  'bundle-new': () => openBundleForm(null),
  'bundle-edit': el => openBundleForm(el.dataset.id),
  'brow-add': () => { const d = $('#drawer'); d._bundle.rows.push({ w: '', n: 1 }); d._draw(); },
  'brow-del': el => { const d = $('#drawer'); d._bundle.rows.splice(Number(el.dataset.i), 1); d._draw(); },
  'bundle-delete': async el => {
    const bs = el.dataset.id;
    const ok = await modal({ icon: 'delete', tone: 'danger', title: 'Hapus bundle ' + bs + '?', text: 'Bundle yang sudah pernah terjual tidak bisa dihapus — nonaktifkan saja.', ok: 'Hapus', danger: true });
    if (!ok) return;
    const r = await callApi('bundle.delete', { bundleSku: bs });
    if (!r.success) { toast('Tidak bisa dihapus', r.message, 'danger', 7000); return; }
    S.bundles = S.bundles.filter(b => b.BundleSKU !== bs); S.bundleItems = S.bundleItems.filter(i => i.BundleSKU !== bs);
    reindex(); closeDrawer(); afterChange(); toast('Bundle dihapus', r.message, 'success');
  }
});
