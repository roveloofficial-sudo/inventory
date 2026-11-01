'use strict';

// ════════ PURCHASE ORDERS (F7) ════════
const PO_PILL = { 'Draft': 'pill-outline', 'Ordered': 'pill-info', 'Partially Received': 'pill-warning', 'Completed': 'pill-success', 'Cancelled': 'pill-outline' };
const poPill = s => `<span class="pill ${PO_PILL[s] || 'pill-outline'}">${s === 'Cancelled' ? I('block') : s === 'Completed' ? I('check_circle', 'fill') : '<span class="pd"></span>'}${esc(s === 'Partially Received' ? 'Partial' : s)}</span>`.replace('<span class="pill', `<span title="${esc(s)}" class="pill`);
function poStats(no) {
  const its = S.poItems.filter(i => i.PONumber === no);
  return { items: its, pesan: sum(its, i => i.JumlahPesan), terima: sum(its, i => i.JumlahDiterima), sisa: sum(its, i => i.Sisa) };
}
function renderPO() {
  const el = $('#page-po');
  const f = UI.f.po || (UI.f.po = {});
  const active = S.po.filter(p => ['Draft', 'Ordered', 'Partially Received'].indexOf(p.Status) >= 0);
  const waiting = S.po.filter(p => p.Status === 'Ordered' || p.Status === 'Partially Received');
  const sisaW = sum(waiting, p => poStats(p.PONumber).sisa);
  const doneM = S.po.filter(p => p.Status === 'Completed' && (p.DiubahPada || 0) >= monthStart(now()));
  const late = poLate();
  const wkEnd = dayStart(now()) + 7 * DAY;
  let list = S.po.slice().sort((a, b) => b.TanggalBuat - a.TanggalBuat).filter(p => {
    if (f.status && p.Status !== f.status) return false;
    if (f.quick === 'active' && active.indexOf(p) < 0) return false;
    if (f.quick === 'receive' && waiting.indexOf(p) < 0) return false;
    if (f.quick === 'due' && !(waiting.indexOf(p) >= 0 && p.TanggalTarget && p.TanggalTarget <= wkEnd)) return false;
    if (f.q) { const q = f.q.toLowerCase(); const hay = (p.PONumber + ' ' + (p.Vendor || '') + ' ' + poStats(p.PONumber).items.map(i => i.VariantID).join(' ')).toLowerCase(); if (hay.indexOf(q) < 0) return false; }
    return true;
  });
  if (!f.sel || !S.po.some(p => p.PONumber === f.sel)) f.sel = list[0] ? list[0].PONumber : null;
  const pg = paginate(list, 'po', 12);
  const qc = (k, l, n) => `<button class="qchip${f.quick === k ? ' on' : ''}" data-act="po-quick" data-q="${k}">${l} (${n})</button>`;
  el.innerHTML = pageHead('Purchase Orders', { over: 'Modul pengadaan', sub: 'Rencana pembelian ke konveksi/pemasok (format PO-YYMM-0001). Membuat PO tidak mengubah stok — stok bertambah saat penerimaan dikonfirmasi.', actions: (can('EXPORT') ? `<button class="btn" data-act="export-open" data-type="po">${I('download')}Ekspor rekap</button>` : '') + (can('PO_MANAGE') ? `<button class="btn btn-primary" data-act="po-new">${I('add')}PO baru</button>` : '') }) + `
    <div class="grid g-4">
      ${kpi({ cls: 'kpi-stock', label: 'Total PO aktif', icon: 'local_shipping', val: fmt(active.length), unit: 'pesanan', sub: `<span class="t-info">●</span><span class="muted">${fmt(waiting.length)} ordered &amp; in transit</span>`, act: 'po-quick', arg: 'active' })}
      ${kpi({ cls: 'kpi-in', label: 'Menunggu penerimaan', icon: 'move_to_inbox', val: fmt(sisaW), unit: 'pcs', sub: `<span class="t-success">${I('schedule', 'sm')} Sisa alokasi dari ${fmt(waiting.length)} PO</span>`, act: 'po-quick', arg: 'receive' })}
      ${kpi({ cls: 'kpi-out', label: 'Selesai bulan ini', icon: 'verified', val: fmt(doneM.length), unit: 'PO closed', sub: `<span class="muted">${fmt(sum(doneM, p => poStats(p.PONumber).terima))} pcs terverifikasi masuk</span>` })}
      ${kpi({ cls: late.length ? 'kpi-alert' : 'kpi-plain', label: 'Butuh perhatian', icon: 'notification_important', val: fmt(late.length), unit: 'PO terlambat', sub: late.length ? `<span class="t-danger">${I('schedule', 'sm')} ${esc(late[0].PONumber)} lewat target ${dayIdx(now()) - dayIdx(late[0].TanggalTarget)} hari</span>` : '<span class="muted">Semua sesuai jadwal</span>' })}
    </div>
    <div class="card sec"><div class="filters">
      <div class="input-icon">${I('search')}<input class="input" data-filter="q" value="${esc(f.q || '')}" placeholder="Cari no. PO, pemasok, SKU…" aria-label="Cari PO"></div>
      <select class="select" data-filter="status" aria-label="Status"><option value="">Semua status</option>${Object.keys(PO_PILL).map(s => `<option ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <span class="grow"></span>${f.quick || f.status || f.q ? '<button class="link" data-act="po-reset">Reset filter</button>' : ''}</div>
      <div class="quick">Filter cepat: ${qc('active', 'PO aktif', active.length)}${qc('receive', 'Perlu diterima', waiting.length)}${qc('due', 'Jatuh tempo minggu ini', waiting.filter(p => p.TanggalTarget && p.TanggalTarget <= wkEnd).length)}</div></div>
    <div class="grid g-main-side sec">
      <div class="card table-card"><div class="card-head" style="padding-bottom:14px"><h3>${I('receipt_long')}Daftar purchase orders <span class="pill pill-outline">${fmt(list.length)} data</span></h3><span class="muted" style="font-size:12.5px">Urutan: tanggal dibuat (terbaru)</span></div>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>No. PO &amp; tanggal</th><th>Pemasok / konveksi</th><th class="num">Item</th><th class="num">Dipesan</th><th class="num">Diterima</th><th class="num">Sisa</th><th>Status</th></tr></thead>
        <tbody>${pg.rows.length ? pg.rows.map(p => { const s = poStats(p.PONumber); const isLate = late.indexOf(p) >= 0; return `<tr class="clickable${f.sel === p.PONumber ? ' sel' : ''}" data-act="po-sel" data-id="${esc(p.PONumber)}">
          <td><b class="mono" style="${p.Status === 'Cancelled' ? 'text-decoration:line-through;color:var(--ink-4)' : ''}">${esc(p.PONumber)}</b><div class="muted" style="font-size:12.5px">${fmtDate(p.TanggalBuat)}</div></td>
          <td><div class="col"><span>${esc(p.Vendor || '—')}</span>${isLate ? `<span class="t-danger" style="font-size:12px">${I('schedule', 'sm')} Lewat target ${fmtDate(p.TanggalTarget)}</span>` : p.TanggalTarget ? `<span class="muted" style="font-size:12px">Target ${fmtDate(p.TanggalTarget)}</span>` : ''}</div></td>
          <td class="num">${s.items.length} SKU</td><td class="num">${fmt(s.pesan)}</td><td class="num t-success">${fmt(s.terima)}</td><td class="num strong">${fmt(p.Status === 'Cancelled' ? 0 : s.sisa)}</td><td>${poPill(p.Status)}</td></tr>`; }).join('') : `<tr><td colspan="7">${emptyHTML('receipt_long', 'Belum ada PO', 'Buat PO untuk mencatat rencana pembelian.')}</td></tr>`}</tbody></table></div>${pagerHTML(pg, 'po', 'purchase orders')}</div>
      <div class="col gap-16">${poDetail(f.sel)}</div>
    </div>`;
  bindFilterInputs(el, 'po');
}
function poDetail(no) {
  const p = S.po.find(x => x.PONumber === no);
  if (!p) return `<div class="card">${emptyHTML('receipt_long', 'Pilih PO', 'Detail PO akan tampil di sini.')}</div>`;
  const s = poStats(no);
  const pct = s.pesan ? Math.round(s.terima / s.pesan * 100) : 0;
  const rc = S.tx.filter(t => t.Jenis === 'PO_IN' && t.Referensi === no && t.Status === 'Confirmed').sort((a, b) => a.DikonfirmasiPada - b.DikonfirmasiPada);
  const pendRc = S.tx.filter(t => t.Jenis === 'PO_IN' && t.Referensi === no && t.Status === 'Pending');
  const steps = [
    { b: 'Draft dibuat', s: fmtDT(p.TanggalBuat) + ' · oleh ' + userName(p.DibuatOleh), st: 'done' },
    { b: 'PO diajukan ke pemasok', s: p.Status === 'Draft' ? 'Belum diajukan' : (p.Vendor ? 'Status Ordered · ' + p.Vendor : 'Status Ordered'), st: p.Status === 'Draft' ? 'todo' : 'done' },
    { b: 'Partially received', s: rc.length ? fmtDT(rc[0].DikonfirmasiPada) + ' · diterima ' + fmt(s.terima) + ' pcs' + (pendRc.length ? ' · ' + pendRc.length + ' penerimaan Pending' : '') : 'Belum ada penerimaan', st: p.Status === 'Partially Received' ? 'now' : (p.Status === 'Completed' ? 'done' : 'todo') },
    { b: p.Status === 'Cancelled' ? 'Cancelled' : 'Completed / closed', s: p.Status === 'Completed' ? fmtDT(rc.length ? rc[rc.length - 1].DikonfirmasiPada : p.DiubahPada) : p.Status === 'Cancelled' ? 'Dibatalkan · ' + fmtDT(p.DiubahPada) : `Menunggu pelunasan sisa ${fmt(s.sisa)} pcs${p.TanggalTarget ? ' (target ' + fmtDate(p.TanggalTarget) + ')' : ''}`, st: p.Status === 'Completed' || p.Status === 'Cancelled' ? 'done' : 'todo' }
  ];
  const actions = [];
  if (can('PO_MANAGE')) {
    if (p.Status === 'Draft') actions.push(`<button class="btn btn-sm" data-act="po-edit" data-id="${esc(no)}">${I('edit')}Edit</button>`, `<button class="btn btn-sm btn-primary" data-act="po-status" data-id="${esc(no)}" data-s="Ordered">${I('send')}Tandai ordered</button>`);
    if ((p.Status === 'Ordered' || p.Status === 'Partially Received') && can('IN_CREATE')) actions.push(`<button class="btn btn-primary" data-act="po-receive" data-po="${esc(no)}">${I('move_to_inbox')}Terima sisa ${fmt(s.sisa)} pcs</button>`);
    if (p.Status === 'Ordered' || p.Status === 'Partially Received') actions.push(`<button class="btn btn-sm" data-act="po-edit" data-id="${esc(no)}">${I('edit')}Ubah info</button>`);
    if (['Draft', 'Ordered', 'Partially Received'].indexOf(p.Status) >= 0) actions.push(`<button class="btn btn-sm btn-danger" data-act="po-status" data-id="${esc(no)}" data-s="Cancelled">${I('block')}Batalkan</button>`);
  }
  return `<div class="card"><div class="card-body col gap-16">
    <div class="row between top"><div class="col"><span class="overline" style="color:var(--info)">Inspeksi PO terpilih</span><b class="mono" style="font-size:16px;margin-top:4px">${esc(no)}</b><span class="muted" style="font-size:12.5px">${esc(p.Vendor || 'Tanpa pemasok')} · dibuat ${fmtDate(p.TanggalBuat)}</span></div>${poPill(p.Status)}</div>
    <div class="row gap-16" style="background:var(--info-bg);border-radius:8px;padding:14px"><span class="ring" style="--p:${pct}" data-label="${pct}%"></span><div class="col grow"><div class="row between"><span class="muted">Realisasi kedatangan</span><b class="tnum">${fmt(s.terima)} / ${fmt(s.pesan)} pcs</b></div><div class="progress info mt-8"><i style="width:${pct}%"></i></div><span class="muted mt-8" style="font-size:12.5px">Sisa alokasi: <b style="color:var(--ink)">${fmt(s.sisa)} pcs</b></span></div></div>
    <div><span class="overline">Status timeline siklus PO</span><ul class="timeline mt-12">${steps.map(x => `<li class="${x.st}"><span class="tdot"></span><b>${esc(x.b)}</b><span>${esc(x.s)}</span></li>`).join('')}</ul></div>
    <div><span class="overline">Daftar SKU dalam pesanan</span><div class="list mt-12">${s.items.map(i => `<div class="li">${thumb(i.VariantID)}<div class="col grow"><b class="ellipsis" style="font-size:13px">${esc(vName(i.VariantID))}</b><span class="mono ellipsis" style="font-size:11.5px">${esc(i.VariantID)}</span></div><div class="end"><b class="tnum" style="font-size:13px">${fmt(i.JumlahDiterima)} / ${fmt(i.JumlahPesan)} pcs</b>${i.Sisa > 0 && p.Status !== 'Cancelled' ? `<div class="t-danger" style="font-size:12px">Sisa ${fmt(i.Sisa)} pcs</div>` : `<div class="t-success" style="font-size:12px">Lengkap</div>`}</div></div>`).join('')}</div></div>
    ${p.Catatan ? `<div class="field"><span class="flabel">Catatan</span><p>${esc(p.Catatan)}</p></div>` : ''}
    ${p.BuktiLink ? `<button class="btn btn-sm" data-act="doc-preview" data-url="${esc(p.BuktiLink)}" style="align-self:flex-start">${I('description')}Lihat dokumen PO</button>` : ''}
    ${actions.length ? `<div class="row wrap">${actions.join('')}</div>` : ''}
  </div></div>
  <div class="banner banner-warning">${I('lightbulb')}<div><b>Standar toleransi penerimaan (QC)</b><p>Barang cacat jahit/kain yang ditemukan saat penerimaan dicatat di Returns / RTS sebelum PO ditutup, bukan dimasukkan ke stok.</p></div></div>`;
}
function openPOForm(no, prefill) {
  const p = no ? S.po.find(x => x.PONumber === no) : null;
  const itemsEditable = !p || p.Status === 'Draft';
  const vendors = Array.from(new Set(S.po.map(x => x.Vendor).filter(Boolean)));
  const init = p ? S.poItems.filter(i => i.PONumber === no).map(i => ({ id: i.VariantID, qty: i.JumlahPesan })) : (prefill || []);
  let ed, bukti = null;
  openDrawer({
    title: p ? 'Edit ' + p.PONumber : 'Purchase order baru', sub: p ? 'Status ' + p.Status + (itemsEditable ? '' : ' — item tidak bisa diubah setelah Ordered') : 'Nomor PO dibuat otomatis (PO-YYMM-0001)',
    body: `<div class="form-grid"><div class="field"><label for="poVendor">Pemasok / konveksi</label><input id="poVendor" class="input" list="poVendors" value="${esc(p ? p.Vendor : '')}" placeholder="Mis. Konveksi Bandung Utama"><datalist id="poVendors">${vendors.map(v => `<option value="${esc(v)}">`).join('')}</datalist></div>
      <div class="field"><label for="poTarget">Tanggal target terima</label><input id="poTarget" type="date" class="input" value="${p && p.TanggalTarget ? isoDate(p.TanggalTarget) : ''}"></div></div>
      <div class="field"><label for="poNote">Catatan</label><input id="poNote" class="input" value="${esc(p ? p.Catatan : '')}" placeholder="Opsional — jangan memuat data pribadi pelanggan"></div>
      ${itemsEditable ? `<div class="field"><span class="flabel">Item dipesan</span><div class="col gap-12" id="poItems"></div><button class="btn btn-sm" data-act="ed-add" style="align-self:flex-start">${I('add')}Tambah item</button></div>` : `<div class="field"><span class="flabel">Item dipesan</span><div class="list">${init.map(i => `<div class="li">${thumb(i.id)}<div class="col grow"><b>${esc(vLabel(i.id))}</b></div><b>${fmt(i.qty)} pcs</b></div>`).join('')}</div></div>`}
      <div class="field"><span class="flabel">Dokumen PO / faktur (opsional)</span><label class="drop" style="padding:18px">${I('attach_file')}<span id="poDocName">${p && p.BuktiLink ? 'Dokumen sudah ada — pilih file untuk mengganti' : 'PDF / JPG / PNG, maks 5 MB'}</span><input type="file" id="poDoc" accept=".pdf,image/*" hidden></label></div>
      ${!p ? `<label class="check"><input type="checkbox" id="poOrdered"> Langsung tandai <b>Ordered</b> (sudah dipesan ke pemasok)</label>` : ''}`,
    foot: `<button class="btn" data-act="drawer-close">Batal</button><span class="grow"></span><button class="btn btn-primary" id="poSave">${p ? 'Simpan perubahan' : 'Buat PO'}</button>`,
    onMount: d => {
      if (itemsEditable) { ed = ItemsEditor($('#poItems', d), { initial: init.map(x => ({ id: x.id, qty: x.qty })) }); d._ed = ed; }
      $('#poDoc', d).addEventListener('change', async e => {
        const fl = e.target.files[0]; if (!fl) return;
        if (fl.size > 5 * 1024 * 1024) { toast('File terlalu besar', 'Maksimal 5 MB.', 'danger'); return; }
        const url = await readAsDataURL(fl); bukti = { b64: url.split(',')[1], mime: fl.type || 'application/pdf', name: fl.name }; $('#poDocName', d).textContent = fl.name;
      });
      $('#poSave', d).onclick = async () => {
        if (ed) { const pr = ed.problems(); if (pr.length) { toast('Lengkapi item', pr[0], 'warning'); return; } const vs = ed.value().map(x => x.variantId); if (new Set(vs).size !== vs.length) { toast('Varian ganda', 'Varian yang sama muncul dua kali. Gabungkan jumlahnya.', 'warning'); return; } }
        const payload = { poNumber: p ? p.PONumber : '', vendor: $('#poVendor', d).value, tanggalTarget: parseIsoDate($('#poTarget', d).value), catatan: $('#poNote', d).value, items: ed ? ed.value() : undefined, langsungPesan: !p && $('#poOrdered', d).checked, bukti: bukti };
        const btn = $('#poSave', d); btn.classList.add('loading');
        const r = await callApi('po.save', payload);
        btn.classList.remove('loading');
        if (!r.success) { toast('Gagal menyimpan PO', r.message, 'danger', 8000); return; }
        applyPatch({ po: r.data.po, poItems: r.data.poItems });
        (UI.f.po = UI.f.po || {}).sel = r.data.poNumber;
        closeDrawer();
        if (UI.page !== 'po') navigateTo('po'); else afterChange();
        cacheStateSoon();
        toast(p ? 'PO diperbarui' : 'PO dibuat', r.message, 'success');
      };
    }
  });
}
async function previewDoc(url) {
  modal({ title: 'Dokumen', icon: 'description', closeX: true, size: 'xl', body: `<div class="skel" style="height:360px" id="docBox"></div>`, ok: false, cancel: 'Tutup' });
  const r = await callApi('file.get', { url: url });
  const box = $('#docBox'); if (!box) return;
  if (!r.success) { box.outerHTML = `<div class="banner banner-danger">${I('error')}<p>${esc(r.message)}</p></div>`; return; }
  const src = 'data:' + r.data.mime + ';base64,' + r.data.b64;
  const blobUrl = URL.createObjectURL(await (await fetch(src)).blob());
  box.outerHTML = (/^image\//.test(r.data.mime) ? `<img class="preview-img" src="${blobUrl}" alt="">` : `<iframe src="${blobUrl}" title="${esc(r.data.name)}" style="width:100%;height:70vh;border:1px solid var(--border);border-radius:8px"></iframe>`) + `<div class="row mt-12" style="justify-content:center"><button class="btn" id="docDl">${I('download')}Unduh ${esc(r.data.name)}</button></div>`;
  $('#docDl').onclick = () => fetch(blobUrl).then(x => x.blob()).then(b => download(b, r.data.name));
}

// ════════ RETURNS / RTS (F8) ════════
function renderRTS() {
  const el = $('#page-rts');
  const f = UI.f.rts || (UI.f.rts = { tab: 'PENDING_STOCK' });
  const tab = f.tab || 'PENDING_STOCK';
  const lim = Number(S.settings.RTSPendingHari || 7);
  const age = r => dayIdx(now()) - dayIdx(r.TanggalRetur || r.DibuatPada);
  const cnt = s => S.rts.filter(r => r.Status === s).length;
  let list = S.rts.filter(r => r.Status === tab).filter(r => {
    if (f.src && r.Sumber !== f.src) return false;
    if (f.old === true || f.dur === 'old') { if (age(r) <= lim) return false; }
    if (f.dur === 'new' && age(r) > lim) return false;
    if (f.q) { const q = f.q.toLowerCase(); if ((r.NomorPesanan + ' ' + r.VariantID + ' ' + vName(r.VariantID) + ' ' + r.Alasan).toLowerCase().indexOf(q) < 0) return false; }
    return true;
  }).sort((a, b) => tab === 'PENDING_STOCK' ? (a.TanggalRetur || 0) - (b.TanggalRetur || 0) : (b.TanggalProses || 0) - (a.TanggalProses || 0));
  const pg = paginate(list, 'rts', 20);
  UI.rtsSel = UI.rtsSel || {};
  const selIds = Object.keys(UI.rtsSel).filter(id => UI.rtsSel[id] && list.some(r => r.RTSID === id));
  const weekAgo = dayStart(now()) - 6 * DAY;
  const wk = S.rts.filter(r => (r.DibuatPada || 0) >= weekAgo);
  const stk = cnt('STOCKED'), nr = cnt('NOT_RESTOCKED');
  const old = S.rts.filter(r => r.Status === 'PENDING_STOCK' && age(r) > lim);
  const canP = can('RTS_PROCESS');
  el.innerHTML = pageHead('Returns / RTS', { badge: '<span class="pill pill-info">Pending stock dulu</span>', sub: 'Pencatatan retur marketplace sebelum masuk stok fisik. Barang dicek kondisinya, lalu dimasukkan ke stok atau ditandai tidak dimasukkan.', actions: (can('IMPORT') ? `<button class="btn" data-act="rts-import">${I('upload_file')}Import RTS (.xlsx / .csv)</button>` : '') + (can(['IN_CREATE', 'RTS_PROCESS']) ? `<button class="btn btn-primary" data-act="rts-new">${I('add')}RTS baru</button>` : '') }) + `
    <div class="card" style="padding:6px 6px 0"><div class="tabs" style="margin:0;border:0">${[['PENDING_STOCK', 'Pending stock', 'alert'], ['STOCKED', 'Stocked', ''], ['NOT_RESTOCKED', 'Tidak dimasukkan', '']].map(t => `<button class="tab${tab === t[0] ? ' on' : ''}" data-act="rts-tab" data-t="${t[0]}">${t[1]} <span class="n ${t[2] && cnt(t[0]) ? t[2] : ''}">${cnt(t[0])}</span></button>`).join('')}<span class="grow"></span><span class="muted hide-sm" style="align-self:center;padding-right:12px;font-size:13px">${I('sync', 'sm')} Sinkron otomatis</span></div></div>
    <div class="banner banner-warning sec">${I('shield')}<div><b>Aturan AC-F8-1 aktif</b><p>Barang retur berstatus Pending Stock tidak menambah stok tersedia sampai dikonfirmasi kelayakannya. Konfirmasi dua kali tidak akan menambah stok dua kali.</p></div></div>
    <div class="card table-card sec">
      <div class="filters"><div class="input-icon">${I('search')}<input class="input" data-filter="q" value="${esc(f.q || '')}" placeholder="Cari no. pesanan, SKU, alasan…" aria-label="Cari RTS"></div>
        <select class="select" data-filter="src" aria-label="Marketplace"><option value="">Semua marketplace</option>${markets().map(m => `<option ${f.src === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select>
        <select class="select" data-filter="dur" aria-label="Durasi"><option value="">Semua durasi</option><option value="old" ${f.dur === 'old' || f.old === true ? 'selected' : ''}>Lebih dari ${lim} hari</option><option value="new" ${f.dur === 'new' ? 'selected' : ''}>${lim} hari atau kurang</option></select>
        ${can('EXPORT') ? `<button class="btn" data-act="export-open" data-type="rts">${I('download')}Export</button>` : ''}</div>
      ${selIds.length && tab === 'PENDING_STOCK' && canP ? `<div class="banner" style="margin:0 14px 14px;padding:10px 14px;align-items:center">${I('checklist')}<b style="margin:0">${selIds.length} item dipilih · ${fmt(sum(S.rts.filter(r => selIds.indexOf(r.RTSID) >= 0), r => r.Jumlah))} pcs</b><div class="actions"><button class="btn btn-sm" data-act="rts-reject" data-ids="${esc(selIds.join(','))}">Tidak dimasukkan</button><button class="btn btn-sm btn-primary" data-act="rts-stock" data-ids="${esc(selIds.join(','))}">${I('inventory')}Masukkan ke stok tersedia</button></div></div>` : ''}
      <div class="table-wrap"><table class="tbl"><thead><tr>${tab === 'PENDING_STOCK' && canP ? '<th class="w1"><input type="checkbox" data-act="rts-all" aria-label="Pilih semua"></th>' : ''}<th>No. pesanan</th><th>Marketplace</th><th>Produk &amp; varian</th><th class="num">Jumlah</th><th>Tanggal retur</th><th>Alasan / kondisi</th><th>${tab === 'PENDING_STOCK' ? 'Status' : 'Diproses'}</th>${tab === 'PENDING_STOCK' && canP ? '<th></th>' : ''}</tr></thead>
      <tbody>${pg.rows.length ? pg.rows.map(r => { const a = age(r); return `<tr>
        ${tab === 'PENDING_STOCK' && canP ? `<td><input type="checkbox" data-rts-sel="${esc(r.RTSID)}" ${UI.rtsSel[r.RTSID] ? 'checked' : ''} aria-label="Pilih ${esc(r.NomorPesanan)}"></td>` : ''}
        <td><b class="mono">${esc(r.NomorPesanan || '—')}</b><div class="muted mono" style="font-size:11.5px">${esc(r.RTSID)}</div></td>
        <td>${chCh(r.Sumber)}</td>
        <td>${prodCell(r.VariantID, r.BundleSKU ? 'dari ' + esc(r.BundleSKU) : '')}</td>
        <td class="num strong">${fmt(r.Jumlah)} pcs</td>
        <td class="nowrap">${fmtDate(r.TanggalRetur)}${tab === 'PENDING_STOCK' ? `<div><span class="pill ${a > lim ? 'pill-danger' : 'pill-outline'}" style="margin-top:4px">${a > lim ? I('warning') : ''}${a === 0 ? 'hari ini' : a + ' hari lalu'}</span></div>` : ''}</td>
        <td><div class="col"><span class="ellipsis" style="max-width:240px">${esc(r.Alasan || '—')}</span>${r.Catatan ? `<span class="muted ellipsis" style="font-size:12px;max-width:240px">${esc(r.Catatan)}</span>` : ''}</div></td>
        <td>${tab === 'PENDING_STOCK' ? `<span class="pill pill-warning"><span class="pd"></span>Pending stock</span>` : `<div class="col"><span>${tab === 'STOCKED' ? '<span class="pill pill-success">' + I('check_circle', 'fill') + 'Stocked</span>' : '<span class="pill pill-outline">' + I('block') + 'Tidak dimasukkan</span>'}</span><span class="muted" style="font-size:12px">${esc(userName(r.DiprosesOleh))} · ${fmtDate(r.TanggalProses)}</span></div>`}</td>
        ${tab === 'PENDING_STOCK' && canP ? `<td class="act"><div class="row"><button class="btn btn-xs" data-act="rts-reject" data-ids="${esc(r.RTSID)}">Tidak</button><button class="btn btn-xs btn-primary" data-act="rts-stock" data-ids="${esc(r.RTSID)}">${I('inventory')}Masukkan ke stok</button></div></td>` : ''}</tr>`; }).join('') : `<tr><td colspan="9">${emptyHTML('assignment_return', 'Tidak ada retur di tab ini')}</td></tr>`}</tbody></table></div>
      ${pagerHTML(pg, 'rts', 'item' + (tab === 'PENDING_STOCK' ? ' tertunda' : ''))}</div>
    <div class="grid g-3 sec">
      ${kpi({ cls: 'kpi-stock', label: 'Total RTS masuk minggu ini', icon: 'move_to_inbox', val: fmt(sum(wk, r => r.Jumlah)), unit: 'pcs', sub: `<span class="muted">Rata-rata ${fmt1(sum(wk, r => r.Jumlah) / 7)} per hari dari ${new Set(wk.map(r => r.Sumber)).size} kanal</span>` })}
      ${kpi({ cls: 'kpi-in', label: 'Kelayakan masuk stok', icon: 'verified', val: stk + nr ? fmt1(stk / (stk + nr) * 100) + '%' : '—', sub: `<span class="muted">${fmt(stk)} item dimasukkan kembali, ${fmt(nr)} tidak layak</span>` })}
      ${kpi({ cls: old.length ? 'kpi-alert' : 'kpi-plain', label: `Perlu investigasi (>${lim} hari)`, icon: 'timer_off', val: fmt(old.length), unit: 'item', sub: old.length ? '<span class="t-danger">Klaim ekspedisi berisiko hangus jika terlalu lama</span>' : '<span class="muted">Tidak ada retur tertahan</span>', act: 'rts-old' })}
    </div>`;
  bindFilterInputs(el, 'rts');
  if (!el._rtsBound) { el._rtsBound = true; el.addEventListener('change', e => { const id = e.target.dataset && e.target.dataset.rtsSel; if (id) { UI.rtsSel[id] = e.target.checked; rerender(); } }); }
}
async function processRTS(ids, action) {
  const items = S.rts.filter(r => ids.indexOf(r.RTSID) >= 0 && r.Status === 'PENDING_STOCK');
  if (!items.length) { toast('Sudah diproses', 'Item retur ini sudah tidak Pending.', 'info'); return; }
  const qty = sum(items, r => r.Jumlah);
  let catatan = '';
  const listHtml = `<div class="list">${items.slice(0, 6).map(r => `<div class="li">${thumb(r.VariantID)}<div class="col grow"><b class="ellipsis">${esc(vLabel(r.VariantID))}</b><span>${esc(r.NomorPesanan)} · ${esc(r.Sumber)}</span></div><b>${fmt(r.Jumlah)} pcs</b></div>`).join('')}${items.length > 6 ? `<span class="muted">+${items.length - 6} item lain</span>` : ''}</div>`;
  const ok = action === 'stock'
    ? await modal({ icon: 'inventory', tone: 'success', title: 'MASUKKAN KE STOK TERSEDIA?', text: `${fmt(qty)} pcs akan ditambahkan ke stok dan status berubah menjadi <b>Stocked</b>. Pastikan barang sudah dicek layak jual.`, body: listHtml + `<div class="field mt-12"><label for="rtsNote">Catatan kondisi (opsional)</label><input id="rtsNote" class="input" placeholder="Mis. segel utuh, sudah disetrika"></div>`, ok: 'Masukkan ke stok', onOk: box => { catatan = $('#rtsNote', box).value; } })
    : await modal({ icon: 'block', tone: 'danger', title: 'Tandai tidak dimasukkan?', text: 'Stok tidak berubah. Wajib isi alasan (mis. rusak, noda permanen).', body: listHtml + `<div class="field mt-12"><label for="rtsNote">Alasan <span class="req">*</span></label><input id="rtsNote" class="input" placeholder="Mis. jahitan sobek, tidak layak jual"></div>`, ok: 'Tandai tidak dimasukkan', danger: true, onOk: box => { catatan = $('#rtsNote', box).value.trim(); if (!catatan) { $('#rtsNote', box).classList.add('invalid'); $('#rtsNote', box).focus(); return false; } } });
  if (!ok) return;
  UI.rtsSel = {};
  const tag = tmpId('G');
  optimistic({
    apply: () => {
      items.forEach(r => { r.Status = action === 'stock' ? 'STOCKED' : 'NOT_RESTOCKED'; r.DiprosesOleh = S.me.id; r.TanggalProses = now(); if (catatan) r.Catatan = catatan; });
      if (action === 'stock') { const rows = items.map(r => ({ TxID: tmpId('TX'), GroupID: tag, Tanggal: now(), Jenis: 'RTS_IN', VariantID: r.VariantID, Jumlah: r.Jumlah, Sumber: 'RTS', Status: 'Pending', BundleSKU: r.BundleSKU, Paket: 0, Referensi: r.RTSID, Catatan: 'Retur ' + r.NomorPesanan, KunciImport: '', DibuatOleh: S.me.id, DibuatPada: now(), _tmp: tag })); rows.forEach(x => S.tx.push(x)); applyConfirmLocal(rows); }
    },
    action: 'rts.process', data: { ids: items.map(r => r.RTSID), action: action, catatan: catatan },
    onOk: d => applyPatch(d, tag),
    okTitle: action === 'stock' ? 'Masuk ke stok tersedia' : 'Ditandai tidak dimasukkan'
  });
}
function openRTSForm() {
  let ed, src = 'Shopee';
  openDrawer({
    title: 'RTS baru', sub: 'Catat barang retur — status Pending Stock, belum menambah stok', badge: '<span class="pill pill-warning">Pending stock</span>',
    body: `<div class="field"><span class="flabel">Marketplace asal</span><div class="pick-chips" id="rtsSrc">${markets().map(m => `<button type="button" class="pick-chip${m === src ? ' on' : ''}" data-src="${esc(m)}">${CHANNELS[m] && CHANNELS[m].logo ? `<img src="${ASSETS[CHANNELS[m].logo]}" alt="">` : I((CHANNELS[m] || {}).icon || 'storefront', 'sm')}${esc(m)}</button>`).join('')}</div></div>
      <div class="form-grid"><div class="field"><label for="rtsOrder">No. pesanan</label><input id="rtsOrder" class="input mono" placeholder="Opsional"></div><div class="field"><label for="rtsDate">Tanggal retur</label><input id="rtsDate" type="date" class="input" value="${isoDate(now())}" max="${isoDate(now())}"></div></div>
      <div class="field"><span class="flabel">Item diretur</span><div class="col gap-12" id="rtsItems"></div><button class="btn btn-sm" data-act="ed-add" style="align-self:flex-start">${I('add')}Tambah item</button><span class="help">Retur bundle otomatis dicatat per komponen.</span></div>
      <div class="field"><label for="rtsWhy">Alasan / kondisi</label><input id="rtsWhy" class="input" list="rtsWhyList" placeholder="Mis. ukuran kebesaran, salah kirim warna"><datalist id="rtsWhyList"><option>Ukuran tidak sesuai</option><option>Salah kirim warna</option><option>Alamat tidak ditemukan</option><option>Pembeli berubah pikiran</option><option>Kemasan rusak saat pengiriman</option><option>Barang cacat produksi</option></datalist></div>`,
    foot: `<button class="btn" data-act="drawer-close">Batal</button><span class="grow"></span><button class="btn btn-primary" id="rtsSave">${I('save')}Simpan sebagai pending stock</button>`,
    onMount: d => {
      $('#rtsSrc', d).addEventListener('click', e => { const b = e.target.closest('[data-src]'); if (!b) return; src = b.dataset.src; $$('[data-src]', d).forEach(x => x.classList.toggle('on', x === b)); });
      ed = ItemsEditor($('#rtsItems', d), { bundles: true }); d._ed = ed;
      $('#rtsSave', d).onclick = async () => {
        const pr = ed.problems(); if (pr.length) { toast('Lengkapi item', pr[0], 'warning'); return; }
        const payload = { sumber: src, nomorPesanan: $('#rtsOrder', d).value.trim(), tanggalRetur: parseIsoDate($('#rtsDate', d).value), alasan: $('#rtsWhy', d).value.trim(), items: ed.value() };
        const btn = $('#rtsSave', d); btn.classList.add('loading');
        const r = await callApi('rts.create', payload);
        btn.classList.remove('loading');
        if (!r.success) { toast('Gagal menyimpan', r.message, 'danger', 8000); return; }
        upsert(S.rts, r.data.rts, 'RTSID');
        closeDrawer(); (UI.f.rts = UI.f.rts || {}).tab = 'PENDING_STOCK';
        if (UI.page !== 'rts') navigateTo('rts'); else afterChange();
        cacheStateSoon(); toast('RTS dicatat', r.message, 'success');
      };
    }
  });
}
function openRTSImport() {
  const st = { source: '', P: null };
  const draw = () => {
    const d = $('#drawer'), body = $('#drBody', d);
    if (!st.P) {
      body.innerHTML = `<div class="field"><span class="flabel">Marketplace</span><div class="pick-chips">${['Shopee', 'TikTok Shop', 'Lazada'].map(s => `<button type="button" class="pick-chip${st.source === s ? ' on' : ''}" data-ri-src="${esc(s)}"><img src="${ASSETS[CHANNELS[s].logo]}" alt="">${esc(s)}</button>`).join('')}</div><span class="help">Kosongkan untuk deteksi otomatis.</span></div>
        <label class="drop" id="riDrop">${I('upload_file')}<b>Pilih file retur (.xlsx / .csv)</b><span class="muted" style="font-size:12.5px">Kolom: No. Pesanan, SKU / Nama Produk, Variasi, Jumlah, Tanggal Retur (opsional), Alasan (opsional)</span><input type="file" id="riFile" accept=".xlsx,.xls,.csv" hidden></label>
        ${st.err ? `<div class="banner banner-danger">${I('error')}<p>${esc(st.err)}</p></div>` : ''}${st.busy ? `<div class="bar-loader" style="width:100%"></div><p class="muted">${esc(st.busy)}</p>` : ''}`;
      $('#riFile', d).onchange = async e => {
        const fl = e.target.files[0]; if (!fl) return;
        st.err = ''; st.busy = 'Membaca & mencocokkan…'; draw();
        try { const P = await parseMarketplaceFile(fl, st.source, 'RTS'); await prepareImport(P); P.rows.forEach(r => { if (P.dupKeys && P.dupKeys[r.key]) r.dup = true; }); st.P = P; } catch (x) { st.err = x.message; }
        st.busy = ''; draw();
      };
      return;
    }
    const P = st.P;
    const ok = P.rows.filter(r => r.include && r.id), bad = P.rows.filter(r => !r.id);
    body.innerHTML = `${P.dupFile ? `<div class="banner banner-danger">${I('block')}<div><b>File sudah pernah diimpor</b><p>${esc(P.dupFile.nama)} · ${fmtDT(P.dupFile.tanggal)}</p></div></div>` : ''}
      <div class="row gap-12">${chLogo(P.meta.source)}<div class="col"><b>${esc(P.meta.fileName)}</b><span class="muted">${fmt(P.rows.length)} item retur · ${fmt(ok.length)} siap · ${fmt(bad.length)} tidak cocok</span></div></div>
      <div class="table-wrap" style="border:1px solid var(--border);border-radius:8px;max-height:55vh"><table class="tbl dense"><thead><tr><th></th><th>No. pesanan</th><th>Produk</th><th class="num">Jml</th><th>Keterangan</th></tr></thead><tbody>${P.rows.map(r => `<tr><td>${r.id && !r.dup ? `<input type="checkbox" data-ri="${r.i}" ${r.include ? 'checked' : ''}>` : I(r.dup ? 'content_copy' : 'cancel', 'faint')}</td><td class="mono">${esc(r.order || '—')}</td><td>${r.id ? (r.kind === 'bundle' ? esc(r.id + ' ' + r.bUkuran) : prodCell(r.id)) : `<span class="t-danger">${esc(r.skuRaw || r.nama)}</span>`}</td><td class="num">${fmt(r.qty)}</td><td class="muted" style="font-size:12.5px">${esc(r.dup ? 'Sudah tercatat' : r.note || (r.suggestion ? 'Saran: ' + r.suggestion : ''))}</td></tr>`).join('')}</tbody></table></div>
      ${bad.length ? `<p class="help">Baris tidak cocok dilewati — catat manual lewat "RTS baru" bila perlu.</p>` : ''}`;
    $('#riSave', d).disabled = !!P.dupFile || !ok.length;
  };
  openDrawer({
    title: 'Import RTS', sub: 'Semua baris dicatat sebagai Pending Stock — stok tidak berubah', wide: true,
    body: '', foot: `<button class="btn" data-act="drawer-close">Batal</button><span class="grow"></span><button class="btn btn-primary" id="riSave" disabled>${I('save')}Simpan ke RTS</button>`,
    onMount: d => {
      draw();
      d.addEventListener('click', e => { const b = e.target.closest('[data-ri-src]'); if (b) { st.source = st.source === b.dataset.riSrc ? '' : b.dataset.riSrc; draw(); } });
      d.addEventListener('change', e => { const i = e.target.dataset && e.target.dataset.ri; if (i !== undefined && st.P) st.P.rows[Number(i)].include = e.target.checked; });
      $('#riSave', d).onclick = async () => {
        const P = st.P, rows = P.rows.filter(r => r.include && r.id);
        const btn = $('#riSave', d); btn.classList.add('loading');
        const r = await callApi('import.save', { meta: { fileName: P.meta.fileName, hash: P.meta.hash, source: P.meta.source, kind: 'RTS', total: P.meta.total, skipped: P.rows.length - rows.length }, rows: rows.map(x => ({ order: x.order, tanggalRetur: x.tanggalRetur || x.tanggal, alasan: x.alasan, variantId: x.kind === 'variant' ? x.id : undefined, bundleSku: x.kind === 'bundle' ? x.id : undefined, ukuran: x.bUkuran, qty: x.qty })), isLast: true });
        btn.classList.remove('loading');
        if (!r.success) { toast('Import RTS gagal', r.message, 'danger', 8000); return; }
        closeDrawer(); await refresh(true); toast('RTS diimpor', r.message, 'success');
      };
    }
  });
}

Object.assign(ACT, {
  'po-new': () => openPOForm(null),
  'po-edit': el => openPOForm(el.dataset.id),
  'po-sel': el => { (UI.f.po = UI.f.po || {}).sel = el.dataset.id; rerender(); if (window.innerWidth < 1280) setTimeout(() => { const c = $('#page-po .g-main-side > .col'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30); },
  'po-quick': el => { const f = UI.f.po = UI.f.po || {}; const q = el.dataset.q || el.dataset.arg; f.quick = f.quick === q ? '' : q; f.pg = 1; rerender(); },
  'po-reset': () => { UI.f.po = { sel: (UI.f.po || {}).sel }; rerender(); },
  'po-status': async el => {
    const no = el.dataset.id, s = el.dataset.s, p = S.po.find(x => x.PONumber === no);
    const ok = await modal(s === 'Cancelled' ? { icon: 'block', tone: 'danger', title: 'Batalkan ' + no + '?', text: 'PO yang dibatalkan tidak bisa diubah lagi. Barang yang sudah diterima tetap di stok.', ok: 'Batalkan PO', danger: true } : { icon: 'send', title: 'Tandai ' + no + ' sebagai Ordered?', text: 'Item PO tidak bisa diubah setelah dipesan. Penerimaan barang bisa dicatat setelah ini.', ok: 'Tandai ordered' });
    if (!ok) return;
    optimistic({ apply: () => { p.Status = s; p.DiubahPada = now(); }, action: 'po.setStatus', data: { poNumber: no, status: s }, okTitle: s === 'Cancelled' ? 'PO dibatalkan' : 'PO ditandai Ordered' });
  },
  'po-from-low': () => {
    const low = activeVariants().filter(v => vStatus(v) !== 'normal').slice(0, 20);
    openPOForm(null, low.map(v => ({ id: v.VariantID, qty: Math.max((v.BatasMinimum || 5) * 3 - stockOf(v.VariantID), v.BatasMinimum || 5) })));
  },
  'doc-preview': el => previewDoc(el.dataset.url),
  'rts-tab': el => { const f = UI.f.rts = UI.f.rts || {}; f.tab = el.dataset.t; f.pg = 1; UI.rtsSel = {}; rerender(); },
  'rts-old': () => { const f = UI.f.rts = UI.f.rts || {}; f.tab = 'PENDING_STOCK'; f.dur = 'old'; rerender(); },
  'rts-stock': el => processRTS(el.dataset.ids.split(','), 'stock'),
  'rts-reject': el => processRTS(el.dataset.ids.split(','), 'reject'),
  'rts-all': el => { $$('[data-rts-sel]').forEach(c => { UI.rtsSel[c.dataset.rtsSel] = el.checked; }); rerender(); },
  'rts-new': () => openRTSForm(),
  'rts-import': () => openRTSImport()
});
