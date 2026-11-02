'use strict';

// ════════ GENERAL SETTINGS (F12) & MEMBER (F13, Bagian 18) ════════
function settingsTabs() {
  const t = [];
  if (can('SETTINGS')) t.push(['profile', 'storefront', 'Profil bisnis & sistem'], ['policy', 'policy', 'Kebijakan stok & marketplace'], ['catalog', 'category', 'Kategori & varian']);
  if (can('MEMBER_MANAGE')) t.push(['members', 'group', 'Member & hak akses']);
  if (isOwner()) t.push(['security', 'shield_lock', 'Backup & keamanan']);
  return t;
}
function renderSettings() {
  const el = $('#page-settings');
  const tabs = settingsTabs();
  if (!tabs.length) { el.innerHTML = noAccessHTML('General Settings'); return; }
  const f = UI.f.settings || (UI.f.settings = {});
  if (!f.tab || !tabs.some(t => t[0] === f.tab)) f.tab = tabs[0][0];
  const body = { profile: setProfile, policy: setPolicy, catalog: setCatalog, members: setMembers, security: setSecurity }[f.tab]();
  el.innerHTML = pageHead('General Settings', { over: 'Modul otorisasi & konfigurasi', sub: 'Kelola konfigurasi sistem inventaris, kebijakan stok, serta otorisasi tim operasional ' + esc(S.settings.NamaBisnis || 'ROVELO') + '.', actions: f.tab === 'members' ? `<button class="btn" data-act="members-csv">${I('download')}Audit akses (.csv)</button><button class="btn btn-primary" data-act="member-new">${I('person_add')}Tambah member baru</button>` : '' }) +
    `<div class="tabs">${tabs.map(t => `<button class="tab${f.tab === t[0] ? ' on' : ''}" data-act="set-tab" data-t="${t[0]}">${I(t[1])}${t[2]}</button>`).join('')}</div>` + body;
  if (f.tab === 'policy' || f.tab === 'catalog') bindTagInputs(el);
}
function tagInput(id, values, placeholder) {
  return `<div class="chips-input" data-tags="${id}">${values.map(v => `<span class="tag" data-v="${esc(v)}">${CHANNELS[v] ? `<span class="cd" style="width:8px;height:8px;border-radius:50%;background:${CHANNELS[v].color}"></span>` : ''}${esc(v)}<button type="button" data-tag-del aria-label="Hapus ${esc(v)}">${I('close', 'sm')}</button></span>`).join('')}<input placeholder="${esc(placeholder || 'Ketik lalu Enter…')}" aria-label="${esc(placeholder || 'Tambah')}"></div>`;
}
function bindTagInputs(root) {
  $$('[data-tags]', root).forEach(box => {
    const inp = $('input', box);
    const add = () => { const v = inp.value.replace(/,/g, ' ').trim(); if (!v) return; if (!$$('.tag', box).some(t => t.dataset.v.toLowerCase() === v.toLowerCase())) inp.insertAdjacentHTML('beforebegin', `<span class="tag" data-v="${esc(v)}">${esc(v)}<button type="button" data-tag-del aria-label="Hapus">${I('close', 'sm')}</button></span>`); inp.value = ''; };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } else if (e.key === 'Backspace' && !inp.value) { const t = $$('.tag', box).pop(); if (t) t.remove(); } });
    inp.addEventListener('blur', add);
    box.addEventListener('click', e => { const b = e.target.closest('[data-tag-del]'); if (b) b.closest('.tag').remove(); else inp.focus(); });
  });
}
const tagsOf = id => $$(`[data-tags="${id}"] .tag`).map(t => t.dataset.v).join(',');
async function saveSettings(values, msg) {
  const before = Object.assign({}, S.settings);
  const r = await optimistic({ apply: () => Object.assign(S.settings, values), action: 'settings.save', data: { values: values }, onOk: d => { if (d.settings) S.settings = d.settings; renderLogos(); }, okTitle: msg || 'Pengaturan disimpan' });
  if (!r.success) S.settings = before;
  return r;
}
function setProfile() {
  const s = S.settings;
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  return `<div class="grid g-2">
    <div class="card"><div class="card-head"><h3>${I('storefront')}Identitas brand / bisnis</h3><span class="pill pill-success">Aktif</span></div><div class="card-body col gap-16">
      <div class="field"><label for="stName">Nama bisnis</label><input id="stName" class="input" value="${esc(s.NamaBisnis || '')}" maxlength="60"></div>
      <div class="field"><span class="flabel">Logo terpasang</span><div class="logo-box"><img src="${esc(logoSrc(false))}" alt="Logo" id="stLogoPrev"><div class="row"><label class="btn btn-sm">${I('upload')}Ganti logo<input type="file" id="stLogo" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden></label>${s.LogoData ? `<button class="btn btn-sm btn-ghost" data-act="logo-reset">Pakai bawaan</button>` : ''}</div></div><span class="help">Latar putih dihapus otomatis. Logo tampil di sidebar (versi putih), login, dan header PDF laporan.</span></div>
      <button class="btn btn-primary" data-act="profile-save" style="align-self:flex-start">Simpan perubahan</button></div></div>
    <div class="col gap-16">
      <div class="card"><div class="card-head"><h3>${I('contrast')}Tampilan</h3></div><div class="card-body"><div class="grid g-2" style="gap:12px">
        <label class="radio-card${!dark ? ' on' : ''}"><input type="radio" name="th" ${!dark ? 'checked' : ''} data-act="theme-set" data-v="light"><div><b>Terang</b><span>Latar #F4F5F7, kartu putih</span></div></label>
        <label class="radio-card${dark ? ' on' : ''}"><input type="radio" name="th" ${dark ? 'checked' : ''} data-act="theme-set" data-v="dark"><div><b>Gelap</b><span>Latar #0B0B0C, kartu #17181B</span></div></label></div></div></div>
      <div class="card"><div class="card-head"><h3>${I('info')}Informasi sistem</h3></div><div class="card-body"><div class="list">
        ${[['Versi aplikasi', (window.__PUBLIC__ && window.__PUBLIC__.version) || '1.0.0'], ['Zona waktu', 'Asia/Jakarta (WIB)'], ['Sesi login', '12 jam tidak aktif'], ['Batas upload file', '5 MB'], ['Penguncian login', '5x salah → 15 menit'], ['Backup otomatis', 'Harian 02.00 WIB (30 hari) + bulanan (12 bulan)']].map(x => `<div class="li"><span class="muted grow">${x[0]}</span><b>${esc(x[1])}</b></div>`).join('')}</div></div></div>
    </div></div>`;
}
function setPolicy() {
  const s = S.settings, own = isOwner();
  return `<div class="grid g-2">
    <div class="card"><div class="card-head"><h3>${I('inventory')}Kebijakan stok</h3></div><div class="card-body col gap-16">
      <div class="form-grid"><div class="field"><label for="stMin">Batas minimum stok default</label><div class="unit" data-unit="pcs / varian"><input id="stMin" type="number" min="0" class="input" value="${esc(s.BatasMinimumDefault)}"></div><span class="help">Dipakai untuk varian baru.</span></div>
      <div class="field"><label for="stRts">Notifikasi RTS pending setelah</label><div class="unit" data-unit="hari"><input id="stRts" type="number" min="1" max="90" class="input" value="${esc(s.RTSPendingHari || 7)}"></div></div></div>
      <div class="field"><span class="flabel">Kebijakan stok minus ${own ? '' : '<span class="muted" style="text-transform:none;letter-spacing:0;font-weight:500">· khusus Owner</span>'}</span>
        <label class="radio-card${s.StokMinusMode !== 'tandai' ? ' on' : ''}"><input type="radio" name="minus" value="tolak" ${s.StokMinusMode !== 'tandai' ? 'checked' : ''} ${own ? '' : 'disabled'}><div><b>Tolak transaksi (direkomendasikan)</b><span>Barang keluar ditolak jika melebihi stok tersedia.</span></div></label>
        <label class="radio-card${s.StokMinusMode === 'tandai' ? ' on' : ''}"><input type="radio" name="minus" value="tandai" ${s.StokMinusMode === 'tandai' ? 'checked' : ''} ${own ? '' : 'disabled'}><div><b>Peringatan saja (tandai "Stok Minus")</b><span>Transaksi diterima, ditandai, dan muncul di notifikasi. Wajib rekonsiliasi manual.</span></div></label></div>
    </div></div>
    <div class="card"><div class="card-head"><h3>${I('storefront')}Saluran integrasi marketplace</h3></div><div class="card-body col gap-16">
      <div class="field"><span class="flabel">Sumber penjualan</span>${tagInput('mk', markets(), 'Tambah sumber…')}<span class="help">Warna kanal hanya untuk grafik & label sumber — tidak pernah untuk status stok.</span></div>
      <div class="field"><span class="flabel">Status pesanan valid (stok berkurang)</span>${tagInput('sv', listOf(s.StatusPesananValid))}</div>
      <div class="field"><span class="flabel">Status pesanan batal (dilewati)</span>${tagInput('sb', listOf(s.StatusPesananBatal))}</div>
      <div class="field"><span class="flabel">Status dikembalikan (dicatat ke RTS)</span>${tagInput('sr', listOf(s.StatusPesananRetur))}</div>
    </div></div></div>
    ${own ? `<div class="card sec"><div class="card-head"><h3>${I('smart_toy')}Pencocokan AI untuk import</h3><span class="pill ${s.AIAktif === 'true' && S.hasAiKey ? 'pill-success' : 'pill-outline'}">${s.AIAktif === 'true' && S.hasAiKey ? 'Aktif' : 'Nonaktif'}</span></div><div class="card-body col gap-16">
      <p class="muted">AI hanya dipanggil untuk baris yang gagal dipetakan dari kolom; hasilnya selalu berstatus "Perlu dicek". Biaya per pemakaian mengikuti layanan AI (perlu persetujuan Owner).</p>
      <div class="form-grid"><label class="row"><span class="switch"><input type="checkbox" id="stAi" ${s.AIAktif === 'true' ? 'checked' : ''}><span></span></span>Aktifkan saran AI</label>
      <div class="field"><label for="stAiModel">Model</label><input id="stAiModel" class="input mono" value="${esc(s.AIModel || 'claude-haiku-5-5')}"></div></div>
      <span class="help">Kunci API diisi di tab Backup &amp; keamanan (disimpan di Script Properties, tidak pernah dikirim ke browser).</span></div></div>` : ''}
    <div class="row sec" style="justify-content:flex-end"><button class="btn btn-primary" data-act="policy-save">${I('save')}Simpan perubahan pengaturan</button></div>`;
}
function setCatalog() {
  const cnt = cid => S.variants.filter(v => IX.p[v.SKU] && IX.p[v.SKU].CategoryID === cid).length;
  return `<div class="grid g-2">
    <div class="card table-card"><div class="card-head" style="padding-bottom:14px"><h3>${I('category')}Kategori produk</h3><button class="btn btn-sm" data-act="cat-new">${I('add')}Kategori</button></div>
      <div class="table-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Nama kategori</th><th class="num">Varian</th><th>Status</th><th></th></tr></thead><tbody>${S.categories.map(c => `<tr><td class="mono">${esc(c.CategoryID)}</td><td><b>${esc(c.NamaKategori)}</b><div class="muted" style="font-size:12px;margin-top:2px">${c.KodeKategori ? 'Kode <span class="mono">' + esc(c.KodeKategori) + '</span>' : 'Kode belum diisi'}</div></td><td class="num">${fmt(cnt(c.CategoryID))}</td><td>${c.Aktif ? '<span class="pill pill-success">Aktif</span>' : '<span class="pill pill-outline">Nonaktif</span>'}</td><td class="act"><button class="btn btn-xs" data-act="cat-edit" data-id="${esc(c.CategoryID)}">${I('edit')}Ubah</button> <button class="btn btn-xs" data-act="cat-toggle" data-id="${esc(c.CategoryID)}">${c.Aktif ? 'Nonaktifkan' : 'Aktifkan'}</button></td></tr>`).join('')}</tbody></table></div></div>
    <div class="card"><div class="card-head"><h3>${I('palette')}Daftar warna &amp; ukuran</h3></div><div class="card-body col gap-16">
      <div class="field"><span class="flabel">Warna</span>${tagInput('wl', listOf(S.settings.WarnaList), 'Tambah warna…')}</div>
      <div class="field"><span class="flabel">Ukuran</span>${tagInput('ul', listOf(S.settings.UkuranList), 'Tambah ukuran…')}</div>
      <span class="help">Pilihan cepat saat membuat produk. Varian yang sudah ada tidak terpengaruh.</span>
      <button class="btn btn-primary" data-act="lists-save" style="align-self:flex-start">Simpan daftar</button></div></div></div>`;
}
function memberPerms(u) {
  const set = {}; (ROLE_PERMS[u.PeranDasar] || ['VIEW']).forEach(p => { set[p] = 1; });
  listOf(u.IzinTambahan).forEach(p => { set[p] = 1; }); listOf(u.IzinDicabut).forEach(p => { if (p !== 'VIEW') delete set[p]; });
  return set;
}
function setMembers() {
  const users = S.users || [];
  const act = users.filter(u => u.Aktif);
  const by = r => act.filter(u => u.PeranDasar === r).length;
  const roleP = r => r === 'Owner' ? `<span class="pill pill-dark">${I('star', 'fill sm')}Owner</span>` : `<span class="pill ${r === 'Manager' ? 'pill-info' : r === 'Admin' ? 'pill-warning' : 'pill-outline'}">${I(ROLE_ICON[r] || 'badge', 'sm')}${esc(r)}</span>`;
  return `<div class="banner banner-info mb-16">${I('verified_user', 'fill')}<div><b>Kepatuhan tata kelola akses (BR-06 &amp; BR-V11)</b><p>Hanya Owner yang berhak memberi atau mencabut izin MEMBER_MANAGE dan mengatur akun Owner. Minimal satu akun Owner aktif wajib dipertahankan. Semua izin dicek di server, bukan sekadar menyembunyikan tombol.</p></div></div>
    <div class="grid g-4">
      ${kpi({ cls: 'kpi-plain', label: 'Total member aktif', icon: 'groups', val: fmt(act.length), unit: 'pengguna', sub: `<span class="t-success">●</span><span class="muted">${by('Owner')} Owner · ${by('Manager')} Mgr · ${by('Admin')} Adm · ${by('Staff')} Staff</span>` })}
      ${kpi({ cls: 'kpi-in', label: 'Kebijakan stok minus', icon: 'shield', val: S.settings.StokMinusMode === 'tandai' ? 'Tandai' : 'Tolak', unit: 'transaksi', sub: `<span class="t-success">${I('check_circle', 'sm')} Strict out-of-stock guard</span>` })}
      ${kpi({ cls: 'kpi-out', label: 'Ambang min. stok', icon: 'tune', val: fmt(S.settings.BatasMinimumDefault), unit: 'pcs / varian', sub: '<span class="muted">Memicu status restock</span>' })}
      ${kpi({ cls: 'kpi-alert', label: 'Otentikasi & sesi', icon: 'lock_clock', val: '15 mnt', unit: 'kunci', sub: '<span class="muted">5x salah sandi · sesi 12 jam</span>' })}
    </div>
    <div class="card table-card sec"><div class="card-head" style="padding-bottom:14px"><h3>${I('badge')}Daftar pengguna &amp; otorisasi tim <span class="pill pill-outline">${users.length} user</span></h3></div>
      <div class="table-wrap"><table class="tbl"><thead><tr><th>Pengguna</th><th>Peran dasar</th><th>Izin kustom</th><th>Status &amp; login</th><th></th></tr></thead><tbody>${users.map(u => {
        const rp = ROLE_PERMS[u.PeranDasar] || [];
        const plus = listOf(u.IzinTambahan).filter(p => rp.indexOf(p) < 0), minus = listOf(u.IzinDicabut).filter(p => rp.indexOf(p) >= 0);
        const locked = u.TerkunciSampai && u.TerkunciSampai > now();
        return `<tr><td><div class="row gap-12"><span class="avatar" style="${u.PeranDasar === 'Owner' && !u.Foto ? 'background:var(--ink);color:var(--on-ink)' : ''}">${avatarInner(u.Nama, u.Foto)}</span><div class="col"><b>${esc(u.Nama)}</b><span class="muted" style="font-size:12.5px">@${esc(u.Username)}${u.Email ? ' · ' + esc(u.Email) : ''}</span></div></div></td>
          <td>${roleP(u.PeranDasar)}</td>
          <td><div class="row wrap gap-4">${u.PeranDasar === 'Owner' ? '<span class="tag" style="padding-right:10px">Akses master (penuh)</span>' : (plus.map(p => `<span class="pill pill-info" title="${esc(PERM_LABEL[p])}">+ ${esc(p)}</span>`).join('') + minus.map(p => `<span class="pill pill-outline" title="${esc(PERM_LABEL[p])}">− ${esc(p)}</span>`).join('')) || '<span class="muted">Sesuai peran</span>'}</div></td>
          <td>${!u.Aktif ? '<span class="pill pill-outline">' + I('block') + 'Nonaktif</span>' : locked ? `<span class="pill pill-danger">${I('lock')}Terkunci s/d ${fmtTime(u.TerkunciSampai)}</span>` : '<span class="pill pill-success"><span class="pd"></span>Aktif</span>'}<div class="muted" style="font-size:12px;margin-top:4px">${u.TerakhirLogin ? 'Login ' + relTime(u.TerakhirLogin) : 'Belum pernah login'}</div></td>
          <td class="act"><button class="btn btn-sm" data-act="member-edit" data-id="${esc(u.UserID)}" ${u.PeranDasar === 'Owner' && !isOwner() ? 'disabled' : ''}>${I('manage_accounts')}Ubah izin</button></td></tr>`;
      }).join('')}</tbody></table></div></div>
    <div class="card sec"><div class="card-head"><h3>${I('checklist')}Matriks otorisasi standar</h3><span class="pill pill-outline">Hierarki operasional</span></div><div class="card-body"><div class="matrix">${['Owner', 'Manager', 'Admin', 'Staff'].map((r, i) => `<div class="mcol"><div class="row between"><b>${i + 1}. ${r}</b>${I(ROLE_ICON[r], 'faint')}</div><ul>${PERMS.filter(p => p !== 'VIEW').map(p => `<li class="${ROLE_PERMS[r].indexOf(p) >= 0 ? '' : 'no'}">${I(ROLE_PERMS[r].indexOf(p) >= 0 ? 'check' : 'close', ROLE_PERMS[r].indexOf(p) >= 0 ? 't-success' : '')}${esc(PERM_LABEL[p])}</li>`).join('')}</ul></div>`).join('')}</div></div></div>`;
}
function openMemberForm(uid) {
  const u = uid ? (S.users || []).find(x => x.UserID === uid) : null;
  const st = { role: u ? u.PeranDasar : 'Staff', perms: u ? memberPerms(u) : Object.fromEntries(ROLE_PERMS.Staff.map(p => [p, 1])), foto: undefined, fotoNow: u ? u.Foto || '' : '' };
  const drawPerms = () => {
    const def = {}; ROLE_PERMS[st.role].forEach(p => { def[p] = 1; });
    $('#mbPerms').innerHTML = PERMS.map(p => { const on = !!st.perms[p], changed = on !== !!def[p]; const lock = p === 'VIEW' || (p === 'MEMBER_MANAGE' && !isOwner()) || st.role === 'Owner'; return `<label class="${changed ? 'changed' : ''}"><input type="checkbox" data-perm="${p}" ${on ? 'checked' : ''} ${lock ? 'disabled' : ''}>${esc(PERM_LABEL[p])}<span class="pc">${changed ? (on ? '+ ' : '− ') : ''}${p}</span></label>`; }).join('');
  };
  openDrawer({
    title: u ? u.Nama : 'Tambah member baru', sub: u ? '@' + u.Username + ' · ' + u.UserID : 'Pilih peran dasar, lalu sesuaikan izin bila perlu',
    badge: u ? (u.Aktif ? '<span class="pill pill-success">Aktif</span>' : '<span class="pill pill-outline">Nonaktif</span>') : '',
    body: `<div class="field"><span class="flabel">Foto profil (opsional)</span><div class="row gap-12 mb-photo"><span class="avatar avatar-lg" id="mbAvatar">${avatarInner(u ? u.Nama : '?', st.fotoNow)}</span>
        <div class="col gap-4"><div class="row wrap"><label class="btn btn-sm">${I('add_a_photo')}Pilih foto<input type="file" id="mbFoto" accept="image/png,image/jpeg,image/webp" hidden></label><button type="button" class="btn btn-sm btn-ghost" id="mbFotoDel" ${st.fotoNow ? '' : 'hidden'}>${I('delete')}Hapus foto</button></div><span class="help">JPG/PNG/WEBP · otomatis dipotong persegi & diperkecil</span></div></div></div>
      <div class="form-grid"><div class="field"><label for="mbNama">Nama lengkap <span class="req">*</span></label><input id="mbNama" class="input" value="${esc(u ? u.Nama : '')}"></div>
      <div class="field"><label for="mbUser">Username <span class="req">*</span></label><input id="mbUser" class="input mono" value="${esc(u ? u.Username : '')}" autocapitalize="none" spellcheck="false" placeholder="huruf kecil, angka, . _ -"></div>
      <div class="field span-2"><label for="mbEmail">Email Google (opsional)</label><input id="mbEmail" type="email" class="input" value="${esc(u ? u.Email : '')}" placeholder="Untuk akses lihat & unduh folder ROVELO di Drive"></div>
      ${u ? '' : `<div class="field span-2"><label for="mbPass">Sandi awal <span class="req">*</span></label><div class="row"><input id="mbPass" class="input mono" autocomplete="new-password"><button type="button" class="btn" data-act="gen-pass">${I('casino')}Buat</button></div><span class="help">Minimal 8 karakter, huruf + angka. Berikan ke member dan minta segera diganti.</span></div>`}</div>
      <div class="field"><span class="flabel">Peran dasar</span><div class="grid g-2" style="gap:10px">${['Owner', 'Manager', 'Admin', 'Staff'].map(r => `<label class="radio-card${st.role === r ? ' on' : ''}"><input type="radio" name="mbRole" value="${r}" ${st.role === r ? 'checked' : ''} ${r === 'Owner' && !isOwner() ? 'disabled' : ''}><div><b>${r}</b><span>${{ Owner: 'Akses penuh termasuk member', Manager: 'Penuh kecuali kelola member', Admin: 'Input & konfirmasi transaksi', Staff: 'Input transaksi, tanpa konfirmasi' }[r]}</span></div></label>`).join('')}</div></div>
      <div class="field"><span class="flabel">Izin efektif (centang untuk menambah / hapus centang untuk mencabut)</span><div class="perm-grid" id="mbPerms"></div></div>`,
    foot: `${u ? `<button class="btn" data-act="member-reset" data-id="${esc(u.UserID)}">${I('lock_reset')}Reset sandi</button><button class="btn ${u.Aktif ? 'btn-danger' : ''}" data-act="member-active" data-id="${esc(u.UserID)}">${u.Aktif ? I('person_off') + 'Nonaktifkan' : I('person') + 'Aktifkan'}</button>` : ''}<span class="grow"></span><button class="btn" data-act="drawer-close">Batal</button><button class="btn btn-primary" id="mbSave">${u ? 'Simpan' : 'Tambah member'}</button>`,
    onMount: d => {
      drawPerms();
      const showFoto = () => { const f = st.foto !== undefined ? st.foto : st.fotoNow; $('#mbAvatar', d).innerHTML = avatarInner($('#mbNama', d).value || (u ? u.Nama : '?'), f); $('#mbFotoDel', d).hidden = !f; };
      $('#mbFoto', d).addEventListener('change', async e => {
        const fl = e.target.files[0]; e.target.value = ''; if (!fl) return;
        if (!/^image\/(png|jpeg|webp)$/.test(fl.type)) { toast('Format tidak didukung', 'Pilih file JPG, PNG, atau WEBP.', 'warning'); return; }
        if (fl.size > 10 * 1024 * 1024) { toast('File terlalu besar', 'Maksimal 10 MB.', 'warning'); return; }
        try { st.foto = await squareThumb(fl, 160); showFoto(); } catch (err) { toast('Foto tidak valid', err.message, 'danger'); }
      });
      $('#mbFotoDel', d).addEventListener('click', () => { st.foto = ''; showFoto(); });
      $('#mbNama', d).addEventListener('input', () => { if (!(st.foto !== undefined ? st.foto : st.fotoNow)) showFoto(); });
      d.addEventListener('change', e => {
        if (e.target.name === 'mbRole') { st.role = e.target.value; st.perms = Object.fromEntries(ROLE_PERMS[st.role].map(p => [p, 1])); $$('.radio-card', d).forEach(c => c.classList.toggle('on', $('input', c).checked)); drawPerms(); }
        if (e.target.dataset.perm) { if (e.target.checked) st.perms[e.target.dataset.perm] = 1; else delete st.perms[e.target.dataset.perm]; drawPerms(); }
      });
      $('#mbSave', d).onclick = async () => {
        const def = ROLE_PERMS[st.role];
        const payload = { userId: u ? u.UserID : '', nama: $('#mbNama', d).value.trim(), username: $('#mbUser', d).value.trim().toLowerCase(), email: $('#mbEmail', d).value.trim(), peran: st.role, password: u ? undefined : $('#mbPass', d).value, izinTambahan: st.role === 'Owner' ? [] : PERMS.filter(p => st.perms[p] && def.indexOf(p) < 0), izinDicabut: st.role === 'Owner' ? [] : def.filter(p => p !== 'VIEW' && !st.perms[p]) };
        if (st.foto !== undefined) payload.foto = st.foto;
        const btn = $('#mbSave', d); btn.classList.add('loading');
        const r = await callApi('member.save', payload);
        btn.classList.remove('loading');
        if (!r.success) { toast('Gagal menyimpan member', r.message, 'danger', 8000); return; }
        S.users = r.data.users; S.userFotos = {};
        S.users.forEach(x => { S.userNames[x.UserID] = x.Nama; if (x.Foto) S.userFotos[x.UserID] = x.Foto; });
        const meRow = S.users.find(x => x.UserID === S.me.id); if (meRow) { S.me.foto = meRow.Foto || ''; S.me.nama = meRow.Nama; }
        renderShell(); cacheStateSoon();
        closeDrawer(); rerender(); toast(u ? 'Member diperbarui' : 'Member ditambahkan', r.message + (u ? ' Sesi member diakhiri agar izin baru langsung berlaku.' : ''), 'success', 6000);
      };
    }
  });
}
function setSecurity() {
  const me = S.me;
  if (!UI.backups) { UI.backups = 'loading'; callApi('backup.list').then(r => { UI.backups = r.success ? r.data : { logs: [], err: r.message }; if (UI.page === 'settings') rerender(); }); }
  const B = UI.backups === 'loading' ? null : UI.backups;
  return `<div class="grid g-2">
    <div class="card"><div class="card-head"><h3>${I('cloud_sync')}Pemulihan &amp; cadangan</h3><span class="pill pill-danger">Owner exclusive</span></div><div class="card-body col gap-16">
      <div class="dr-section"><div class="row between"><span class="overline">Cadangan harian cloud</span>${B && B.lastDaily ? `<span class="t-success strong" style="font-size:12.5px">${I('check_circle', 'sm')} Tersinkronisasi</span>` : ''}</div><div class="row gap-12">${I('cloud_done', 'lg')}<div class="col"><b>Google Drive · ROVELO/Backup</b><span class="muted" style="font-size:12.5px">Terakhir otomatis: ${B && B.lastDaily ? fmtDT(B.lastDaily) : 'belum ada'} · jadwal 02.00 WIB</span></div></div></div>
      <button class="btn" data-act="backup-now" style="align-self:flex-start">${I('backup')}Cadangkan sekarang (manual)</button>
      <div><span class="overline">Riwayat backup</span>${!B ? '<div class="skel mt-12" style="height:140px"></div>' : B.err ? `<p class="t-danger mt-8">${esc(B.err)}</p>` : `<div class="table-wrap mt-12" style="border:1px solid var(--border);border-radius:8px;max-height:320px"><table class="tbl dense"><thead><tr><th>Tanggal</th><th>Jenis</th><th>Status</th><th></th></tr></thead><tbody>${(B.logs || []).map(l => `<tr><td class="nowrap">${fmtDT(l.Tanggal)}</td><td>${esc(l.Jenis)}</td><td>${l.Status === 'Berhasil' ? '<span class="pill pill-success">Berhasil</span>' : `<span class="pill pill-danger" title="${esc(l.Keterangan)}">Gagal</span>`}</td><td class="act">${l.FileID ? `<button class="btn btn-xs" data-act="backup-restore" data-id="${esc(l.FileID)}" data-name="${esc(l.Keterangan)}">${I('settings_backup_restore')}Pulihkan</button> <a class="btn btn-xs btn-ghost" href="${esc(l.LinkFile)}" target="_blank" rel="noopener">${I('open_in_new')}</a>` : ''}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Belum ada backup.</td></tr>'}</tbody></table></div>`}</div>
    </div></div>
    <div class="col gap-16">
      <div class="card"><div class="card-head"><h3>${I('key')}Kode pemulihan darurat</h3><span class="t-info strong">${fmt(me.recoveryLeft || 0)} kode aktif</span></div><div class="card-body col gap-12"><p class="muted">Gunakan saat Owner lupa sandi. Setiap kode sekali pakai; disimpan sebagai hash di Script Properties.</p><button class="btn" data-act="regen-codes" style="align-self:flex-start">${I('autorenew')}Buat ulang 8 kode</button></div></div>
      <div class="card"><div class="card-head"><h3>${I('smart_toy')}Kunci API layanan AI</h3><span class="pill ${S.hasAiKey ? 'pill-success' : 'pill-outline'}">${S.hasAiKey ? 'Tersimpan' : 'Belum diisi'}</span></div><div class="card-body col gap-12">
        <div class="field"><label for="aiKey">Kunci API</label><input id="aiKey" type="password" class="input mono" autocomplete="off" placeholder="${esc(S.aiKeyMasked || 'sk-ant-…')}"><span class="help">Disimpan di Script Properties. Browser hanya melihat versi tersamar.</span></div>
        <div class="row"><button class="btn btn-primary btn-sm" data-act="ai-key-save">Simpan kunci</button>${S.hasAiKey ? '<button class="btn btn-sm btn-danger" data-act="ai-key-del">Hapus</button>' : ''}</div></div></div>
      <div class="card"><div class="card-head"><h3>${I('build')}Perawatan sistem</h3></div><div class="card-body col gap-12">
        <div class="row between"><div class="col"><b>Hitung ulang stok</b><span class="muted" style="font-size:12.5px">Menyelaraskan ringkasan stok dari seluruh transaksi.</span></div><button class="btn btn-sm" data-act="rebuild-stock">${I('calculate')}Jalankan</button></div>
        <div class="row between"><div class="col"><b>Keluar dari perangkat lain</b><span class="muted" style="font-size:12.5px">Mengakhiri sesi Anda di perangkat lain.</span></div><button class="btn btn-sm" data-act="logout-all">${I('devices')}Jalankan</button></div></div></div>
    </div></div>`;
}

Object.assign(ACT, {
  'set-tab': el => { (UI.f.settings = UI.f.settings || {}).tab = el.dataset.t; rerender(); },
  'theme-set': el => { const want = el.dataset.v; if ((document.documentElement.getAttribute('data-theme') === 'dark') !== (want === 'dark')) toggleTheme(); rerender(); },
  'profile-save': async () => {
    const vals = { NamaBisnis: $('#stName').value.trim() };
    const fl = $('#stLogo').files[0];
    if (fl) {
      if (fl.size > 5 * 1024 * 1024) { toast('File terlalu besar', 'Logo maksimal 5 MB.', 'danger'); return; }
      let url = await resizeImage(fl, 480, 'image/png', 1, true);
      if (url.length > 47000) url = await resizeImage(fl, 300, 'image/webp', .9, true);
      if (url.length > 47000) { toast('Logo terlalu detail', 'Gunakan logo yang lebih sederhana (maks ±35 KB setelah diperkecil).', 'danger'); return; }
      vals.LogoData = url;
    }
    saveSettings(vals, 'Profil bisnis disimpan');
  },
  'logo-reset': () => saveSettings({ LogoData: '' }, 'Logo bawaan dipakai kembali'),
  'policy-save': () => {
    const vals = { BatasMinimumDefault: $('#stMin').value, RTSPendingHari: $('#stRts').value, MarketplaceList: tagsOf('mk'), StatusPesananValid: tagsOf('sv'), StatusPesananBatal: tagsOf('sb'), StatusPesananRetur: tagsOf('sr') };
    if (isOwner()) { const m = $('input[name="minus"]:checked'); if (m) vals.StokMinusMode = m.value; if ($('#stAi')) { vals.AIAktif = $('#stAi').checked ? 'true' : 'false'; vals.AIModel = $('#stAiModel').value.trim(); } }
    Object.keys(vals).forEach(k => { if (String(vals[k]) === String(S.settings[k])) delete vals[k]; });
    if (!Object.keys(vals).length) { toast('Tidak ada perubahan', '', 'info'); return; }
    saveSettings(vals);
  },
  'lists-save': () => saveSettings({ WarnaList: tagsOf('wl'), UkuranList: tagsOf('ul') }, 'Daftar warna & ukuran disimpan'),
  'cat-new': () => catForm(null),
  'cat-edit': el => catForm(el.dataset.id),
  'cat-toggle': el => { const c = IX.c[el.dataset.id]; optimistic({ apply: () => { c.Aktif = !c.Aktif; }, action: 'category.save', data: { categoryId: c.CategoryID, nama: c.NamaKategori, aktif: !c.Aktif }, okTitle: 'Kategori diperbarui' }); },
  'member-new': () => openMemberForm(null),
  'member-edit': el => openMemberForm(el.dataset.id),
  'gen-pass': () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; const a = new Uint32Array(12); crypto.getRandomValues(a); let p = Array.from(a, x => c[x % c.length]).join(''); if (!/\d/.test(p)) p = p.slice(0, 11) + '7'; $('#mbPass').value = p; },
  'member-active': async el => {
    const u = S.users.find(x => x.UserID === el.dataset.id); const on = !u.Aktif;
    const ok = await modal(on ? { icon: 'person', title: 'Aktifkan ' + u.Nama + '?', ok: 'Aktifkan' } : { icon: 'person_off', tone: 'danger', title: 'Nonaktifkan ' + u.Nama + '?', text: 'Member tidak bisa login, sesi aktifnya diakhiri, dan akses folder Drive dicabut. Riwayatnya tetap ada.', ok: 'Nonaktifkan', danger: true });
    if (!ok) return;
    const r = await callApi('member.setActive', { userId: u.UserID, aktif: on });
    if (!r.success) { toast('Tidak berhasil', r.message, 'danger', 7000); return; }
    S.users = r.data.users; closeDrawer(); rerender(); toast('Selesai', r.message, 'success');
  },
  'member-reset': async el => {
    const u = S.users.find(x => x.UserID === el.dataset.id);
    const ok = await modal({ icon: 'lock_reset', tone: 'warning', title: 'Reset sandi ' + u.Nama + '?', text: 'Sandi sementara baru dibuat dan semua sesi member diakhiri.', ok: 'Reset sandi' });
    if (!ok) return;
    const r = await callApi('member.resetPassword', { userId: u.UserID });
    if (!r.success) { toast('Gagal', r.message, 'danger'); return; }
    modal({ icon: 'key', tone: 'success', title: 'Sandi sementara', text: esc(r.message), body: `<div class="codes" style="grid-template-columns:1fr"><code>${esc(r.data.password)}</code></div><p class="help mt-8">Hanya ditampilkan sekali. Salin sekarang.</p>`, ok: 'Salin & tutup', cancel: false, onOk: () => { try { navigator.clipboard.writeText(r.data.password); } catch (e) { } } });
  },
  'members-csv': () => {
    const rows = (S.users || []).map(u => [u.UserID, u.Nama, u.Username, u.Email, u.PeranDasar, u.IzinTambahan, u.IzinDicabut, u.Aktif ? 'Aktif' : 'Nonaktif', u.TerakhirLogin ? fmtDT(u.TerakhirLogin) : '']);
    download(new Blob([toCsv(['UserID', 'Nama', 'Username', 'Email', 'Peran', 'Izin Tambahan', 'Izin Dicabut', 'Status', 'Login Terakhir'], rows)], { type: 'text/csv;charset=utf-8' }), 'ROVELO_AuditAkses_' + stamp() + '.csv');
  },
  'backup-now': async el => {
    el.classList.add('loading');
    const r = await callApi('backup.now');
    el.classList.remove('loading');
    if (!r.success) { toast('Backup gagal', r.message, 'danger'); return; }
    UI.backups = null; rerender(); toast('Backup dibuat', r.data.name, 'success');
  },
  'backup-restore': async el => {
    const id = el.dataset.id;
    const box = { prev: null };
    const ok = await modal({ icon: 'settings_backup_restore', tone: 'warning', size: 'lg', title: 'Pulihkan data dari backup?', text: esc(el.dataset.name || id) + ' — sistem otomatis membuat backup "Sebelum Pulih" dulu, sehingga pemulihan ini bisa dibatalkan.',
      body: `<div id="rsPrev"><div class="skel" style="height:160px"></div></div><div class="field mt-16"><label for="rsType">Ketik PULIHKAN untuk melanjutkan</label><input id="rsType" class="input mono" autocomplete="off"></div>`,
      ok: 'Pulihkan data', danger: true,
      onMount: async b => { const r = await callApi('backup.preview', { fileId: id }); const p = $('#rsPrev', b); if (!p) return; box.prev = r; p.innerHTML = r.success ? `<div class="table-wrap" style="border:1px solid var(--border);border-radius:8px;max-height:300px"><table class="tbl dense"><thead><tr><th>Tab</th><th class="num">Baris di backup</th><th class="num">Baris sekarang</th></tr></thead><tbody>${r.data.tabs.map(t => `<tr><td>${esc(t.tab)}</td><td class="num">${fmt(t.backup)}</td><td class="num ${t.sekarang !== t.backup ? 'strong' : 'muted'}">${fmt(t.sekarang)}</td></tr>`).join('')}</tbody></table></div><p class="help mt-8">Transaksi setelah tanggal backup perlu diinput ulang.</p>` : `<div class="banner banner-danger">${I('error')}<p>${esc(r.message)}</p></div>`; },
      onOk: b => { if ($('#rsType', b).value.trim().toUpperCase() !== 'PULIHKAN') { $('#rsType', b).classList.add('invalid'); return false; } }
    });
    if (!ok) return;
    toast('Memulihkan data…', 'Proses ini bisa memakan waktu hingga 1 menit.', 'info', 6000);
    const r = await callApi('backup.restore', { fileId: id });
    if (!r.success) { toast('Pemulihan gagal', r.message, 'danger', 10000); return; }
    UI.backups = null; await refresh(true); toast('Data dipulihkan', r.message, 'success', 10000);
  },
  'regen-codes': async () => {
    const ok = await modal({ icon: 'autorenew', tone: 'warning', title: 'Buat ulang 8 kode pemulihan?', text: 'Semua kode lama langsung tidak berlaku.', ok: 'Buat ulang' });
    if (!ok) return;
    const r = await callApi('auth.regenRecovery');
    if (!r.success) { toast('Gagal', r.message, 'danger'); return; }
    S.me.recoveryLeft = 8; rerender();
    const txt = 'KODE PEMULIHAN ROVELO INVENTORY\nUsername: ' + S.me.username + '\nDibuat: ' + fmtDT(now()) + '\n\n' + r.data.codes.join('\n') + '\n\nSetiap kode hanya bisa dipakai sekali.';
    modal({ icon: 'key', tone: 'success', title: 'Simpan kode ini sekarang', text: 'Kode hanya ditampilkan sekali dan disimpan sebagai hash.', body: `<div class="codes">${r.data.codes.map(c => `<code>${esc(c)}</code>`).join('')}</div>`, ok: 'Unduh .txt', cancel: 'Tutup', onOk: () => download(new Blob([txt], { type: 'text/plain' }), 'ROVELO_KodePemulihan_' + stamp() + '.txt') });
  },
  'ai-key-save': async () => {
    const v = $('#aiKey').value.trim(); if (!v) { toast('Kunci kosong', 'Tempel kunci API terlebih dahulu.', 'warning'); return; }
    const r = await callApi('secret.save', { kunci: 'AI_API_KEY', nilai: v });
    $('#aiKey').value = '';
    if (!r.success) { toast('Gagal', r.message, 'danger'); return; }
    S.hasAiKey = r.data.ada; S.aiKeyMasked = r.data.samar; rerender(); toast('Kunci tersimpan', r.message, 'success');
  },
  'ai-key-del': async () => { const r = await callApi('secret.save', { kunci: 'AI_API_KEY', nilai: '__HAPUS__' }); if (r.success) { S.hasAiKey = false; S.aiKeyMasked = ''; rerender(); toast('Kunci dihapus', '', 'success'); } },
  'rebuild-stock': async el => { el.classList.add('loading'); const r = await callApi('system.rebuildStock'); el.classList.remove('loading'); if (r.success) { S.stock = r.data.stock; afterChange(); toast('Stok dihitung ulang', r.message, 'success'); } else toast('Gagal', r.message, 'danger'); }
});
function catForm(id) {
  const c = id ? IX.c[id] : null;
  modal({ icon: 'category', title: c ? 'Ubah kategori' : 'Kategori baru', body: `<div class="col gap-16"><div class="field"><label for="catName">Nama kategori</label><input id="catName" class="input" value="${esc(c ? c.NamaKategori : '')}" placeholder="Celana Pendek"></div>
      <div class="field"><label for="catKode">Kode kategori (untuk SKU)</label><input id="catKode" class="input mono" maxlength="12" value="${esc(c ? c.KodeKategori || '' : '')}" placeholder="CP"><span class="help">Dipakai di SKU otomatis, mis. RVL-<b>CP</b>-001. Mengubah kode tidak mengubah SKU produk yang sudah ada.</span></div></div>`, ok: 'Simpan',
    onMount: b => { const n = $('#catName', b), k = $('#catKode', b); let touched = !!k.value; k.addEventListener('input', () => { k.value = slug(k.value); touched = !!k.value; }); n.addEventListener('input', () => { if (!touched) k.value = suggestKodeKategori(n.value, c ? c.CategoryID : ''); }); },
    onOk: async b => { const n = $('#catName', b).value.trim(); if (!n) return false; const kode = slug($('#catKode', b).value); if (kode && S.categories.some(x => x.KodeKategori === kode && (!c || x.CategoryID !== c.CategoryID))) { toast('Kode dipakai', 'Kode ' + kode + ' sudah dipakai kategori lain.', 'warning'); return false; } const r = await callApi('category.save', { categoryId: c ? c.CategoryID : '', nama: n, kode: kode, aktif: c ? c.Aktif : true }); if (!r.success) { toast('Gagal', r.message, 'danger'); return false; } S.categories = r.data.categories; reindex(); rerender(); toast('Kategori disimpan', '', 'success'); } });
}

// ════════ EXPORT LAPORAN (F14, Bagian 19) — Excel / CSV / PDF di browser ════════
const REPORTS = {
  produk: { label: 'Data produk', fmts: ['xlsx', 'csv'], desc: 'Semua varian dan bundle' },
  stok: { label: 'Stok tersedia', fmts: ['xlsx', 'csv', 'pdf'], desc: 'Per varian dengan status' },
  masuk: { label: 'Barang masuk', fmts: ['xlsx', 'csv', 'pdf'], desc: 'Barang masuk terkonfirmasi pada periode', period: true },
  keluar: { label: 'Barang keluar', fmts: ['xlsx', 'csv', 'pdf'], desc: 'Barang keluar terkonfirmasi per periode dan sumber', period: true, source: true },
  bestseller: { label: 'Best seller', fmts: ['xlsx', 'pdf'], desc: 'Peringkat helai keluar dan paket bundle', period: true },
  po: { label: 'Purchase orders', fmts: ['xlsx', 'pdf'], desc: 'Status dan sisa penerimaan' },
  rts: { label: 'Returns / RTS', fmts: ['xlsx', 'csv'], desc: 'Status masuk stok' },
  opname: { label: 'Hasil stock opname', fmts: ['xlsx', 'pdf'], desc: 'Stok sistem, fisik, dan selisih', period: true }
};
function periodRange(p, from, to) {
  const n = now();
  if (p === 'month') return [monthStart(n), n + DAY];
  if (p === 'prev') { const ms = monthStart(n); return [monthStart(ms - DAY), ms - 1]; }
  if (p === '30d') return [dayStart(n) - 29 * DAY, n + DAY];
  if (p === 'year') { const d = wib(n); return [Date.UTC(d.getUTCFullYear(), 0, 1) - TZ_MS, n + DAY]; }
  return [parseIsoDate(from) || 0, parseIsoDate(to, true) || n + DAY];
}
function openExport(type) {
  if (!can('EXPORT')) { toast('Tidak ada akses', 'Export laporan memerlukan izin EXPORT.', 'warning'); return; }
  const st = { type: REPORTS[type] ? type : 'stok', fmt: 'xlsx', period: 'month', src: 'Semua' };
  const draw = b => {
    const R = REPORTS[st.type];
    if (R.fmts.indexOf(st.fmt) < 0) st.fmt = R.fmts[0];
    $('#exDesc', b).textContent = R.desc;
    $('#exFmt', b).innerHTML = R.fmts.map(f => `<button type="button" class="pick-chip${st.fmt === f ? ' on' : ''}" data-exf="${f}">${I(f === 'pdf' ? 'picture_as_pdf' : f === 'csv' ? 'csv' : 'table_view', 'sm')}${f === 'xlsx' ? 'Excel' : f.toUpperCase()}</button>`).join('');
    $('#exPer', b).hidden = !R.period; $('#exSrc', b).hidden = !R.source;
    $('#exCustom', b).hidden = st.period !== 'custom';
  };
  modal({
    icon: 'download', title: 'Export laporan', size: 'lg', ok: 'Unduh file', cancel: 'Batal',
    body: `<div class="col gap-16"><div class="field"><label for="exType">Jenis laporan</label><select id="exType" class="select">${Object.keys(REPORTS).map(k => `<option value="${k}" ${st.type === k ? 'selected' : ''}>${REPORTS[k].label}</option>`).join('')}</select><span class="help" id="exDesc"></span></div>
      <div class="field"><span class="flabel">Format</span><div class="pick-chips" id="exFmt"></div></div>
      <div class="field" id="exPer"><label for="exPeriod">Periode</label><select id="exPeriod" class="select"><option value="month">Bulan ini</option><option value="prev">Bulan lalu</option><option value="30d">30 hari terakhir</option><option value="year">Tahun ini</option><option value="custom">Kustom…</option></select>
        <div class="row mt-8" id="exCustom" hidden><input type="date" id="exFrom" class="input" value="${isoDate(now() - 29 * DAY)}"><span class="muted">s/d</span><input type="date" id="exTo" class="input" value="${isoDate(now())}"></div></div>
      <div class="field" id="exSrc"><label for="exSource">Sumber</label><select id="exSource" class="select"><option>Semua</option>${markets().map(m => `<option>${esc(m)}</option>`).join('')}</select></div>
      <label class="check"><input type="checkbox" id="exDrive"> Simpan juga ke Google Drive (ROVELO/Dokumen/Laporan)</label>
      <div id="exErr" class="banner banner-danger" hidden>${I('error')}<p></p></div></div>`,
    onMount: b => {
      draw(b);
      b.addEventListener('change', e => { if (e.target.id === 'exType') st.type = e.target.value; if (e.target.id === 'exPeriod') st.period = e.target.value; if (e.target.id === 'exSource') st.src = e.target.value; draw(b); });
      b.addEventListener('click', e => { const x = e.target.closest('[data-exf]'); if (x) { st.fmt = x.dataset.exf; draw(b); } });
    },
    onOk: async b => {
      try {
        const rg = periodRange(st.period, $('#exFrom', b).value, $('#exTo', b).value);
        const spec = await buildReport(st.type, rg, st.src);
        const file = await produceFile(spec, st.fmt);
        download(file.blob, file.name);
        if ($('#exDrive', b).checked) {
          const b64 = await blobToB64(file.blob);
          const r = await callApi('file.saveExport', { name: file.name, mime: file.blob.type, b64: b64 });
          toast(r.success ? 'Tersimpan di Drive' : 'Gagal simpan ke Drive', r.message, r.success ? 'success' : 'danger');
        }
        toast('Laporan diunduh', file.name, 'success');
      } catch (e) { showFormErr('#exErr', e.message); return false; }
    }
  });
}
function blobToB64(blob) { return new Promise(res => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.readAsDataURL(blob); }); }
function periodText(rg) { return fmtDate(rg[0]) + ' – ' + fmtDate(Math.min(rg[1], now())); }
function txReportRows(cols, rows) { return rows.map(r => { const o = {}; cols.forEach((k, i) => { o[k] = r[i]; }); return o; }); }
async function buildReport(type, rg, src) {
  const R = REPORTS[type];
  const base = { key: type, title: 'Laporan ' + R.label, desc: R.desc, period: R.period ? periodText(rg) : 'Posisi per ' + fmtDT(now()) };
  const v = vid => IX.v[vid] || { Warna: '', Ukuran: '' };
  if (type === 'produk') {
    const rows = S.variants.slice().sort(sortVariants).map(x => { const p = IX.p[x.SKU] || {}; return ['Varian', x.VariantID, x.SKU, p.NamaProduk || '', p.BrandCode || '', IX.c[p.CategoryID] ? IX.c[p.CategoryID].NamaKategori : '', x.Warna, x.Ukuran, x.BatasMinimum, stockOf(x.VariantID), x.Aktif && p.Aktif ? 'Aktif' : 'Nonaktif']; })
      .concat(S.bundles.map(b => ['Bundle', b.BundleSKU, (IX.bItems[b.BundleSKU] || [])[0] ? IX.bItems[b.BundleSKU][0].SKU : '', b.NamaBundle, '', 'Bundle', (IX.bItems[b.BundleSKU] || []).map(i => i.Warna + ' x' + i.Jumlah).join(' + '), 'Per paket', '', '', b.Aktif ? 'Aktif' : 'Nonaktif']));
    return Object.assign(base, { head: ['Tipe', 'Kode', 'SKU', 'Nama', 'Brand', 'Kategori', 'Warna / Resep', 'Ukuran', 'Batas Min', 'Stok', 'Status'], rows: rows, num: [8, 9] });
  }
  if (type === 'stok') {
    const rows = activeVariants().sort(sortVariants).map(x => { const st = vStatus(x); const t = S.stockTotals[x.VariantID] || [0, 0]; return [x.VariantID, vName(x.VariantID), IX.c[(IX.p[x.SKU] || {}).CategoryID] ? IX.c[IX.p[x.SKU].CategoryID].NamaKategori : '', x.Warna, x.Ukuran, stockOf(x.VariantID), x.BatasMinimum, st === 'out' ? 'Out of Stock' : st === 'low' ? 'Low Stock' : 'Normal', t[0], t[1]]; });
    return Object.assign(base, { head: ['VariantID', 'Produk', 'Kategori', 'Warna', 'Ukuran', 'Stok', 'Batas Min', 'Status', 'Total Masuk', 'Total Keluar'], rows: rows, num: [5, 6, 8, 9], total: { label: 'Total stok tersedia', col: 5 } });
  }
  if (type === 'masuk' || type === 'keluar') {
    const r = await callApi('report.get', { type: type, from: rg[0], to: rg[1], sumber: src });
    if (!r.success) throw new Error(r.message);
    const rows = txReportRows(r.data.cols, r.data.rows).sort((a, b) => a.Tanggal - b.Tanggal).map(t => [fmtDT(t.Tanggal), (JENIS[t.Jenis] || {}).label || t.Jenis, t.VariantID, vName(t.VariantID), v(t.VariantID).Warna, v(t.VariantID).Ukuran, Math.abs(t.Jumlah), t.Sumber, t.Referensi, t.BundleSKU || '', userName(t.DikonfirmasiOleh)]);
    return Object.assign(base, { desc: R.desc + (type === 'keluar' && src !== 'Semua' ? ' · sumber ' + src : ''), head: ['Tanggal', 'Jenis', 'VariantID', 'Produk', 'Warna', 'Ukuran', 'Jumlah', 'Sumber', 'Referensi', 'Bundle', 'Dikonfirmasi'], rows: rows, num: [6], total: { label: 'Total ' + (type === 'masuk' ? 'masuk' : 'keluar') + ' (pcs)', col: 6 } });
  }
  if (type === 'bestseller') {
    const r = await callApi('report.get', { type: 'bestseller', from: rg[0], to: rg[1] });
    if (!r.success) throw new Error(r.message);
    const rows = r.data.variants.map((x, i) => [i + 1, x[0], vName(x[0]), v(x[0]).Warna, v(x[0]).Ukuran, x[1], '']);
    r.data.bundles.forEach((x, i) => { const per = sum(IX.bItems[x[0]] || [], y => y.Jumlah); rows.push(['B' + (i + 1), x[0], IX.b[x[0]] ? IX.b[x[0]].NamaBundle : x[0], 'Paket', '', x[1] * per, x[1]]); });
    return Object.assign(base, { head: ['Peringkat', 'Kode', 'Produk', 'Warna', 'Ukuran', 'Helai Keluar', 'Paket'], rows: rows, num: [5, 6] });
  }
  if (type === 'po') {
    const rows = S.po.slice().sort((a, b) => b.TanggalBuat - a.TanggalBuat).map(p => { const s = poStats(p.PONumber); return [p.PONumber, fmtDate(p.TanggalBuat), p.Vendor || '', p.Status, p.TanggalTarget ? fmtDate(p.TanggalTarget) : '', s.items.length, s.pesan, s.terima, p.Status === 'Cancelled' ? 0 : s.sisa]; });
    const detail = S.poItems.map(i => [i.PONumber, i.VariantID, vName(i.VariantID), i.JumlahPesan, i.JumlahDiterima, i.Sisa]);
    return Object.assign(base, { head: ['No. PO', 'Tanggal', 'Pemasok', 'Status', 'Target', 'Item', 'Dipesan', 'Diterima', 'Sisa'], rows: rows, num: [5, 6, 7, 8], extra: { name: 'Item PO', head: ['No. PO', 'VariantID', 'Produk', 'Dipesan', 'Diterima', 'Sisa'], rows: detail } });
  }
  if (type === 'rts') {
    const ST = { PENDING_STOCK: 'Pending Stock', STOCKED: 'Stocked', NOT_RESTOCKED: 'Tidak Dimasukkan' };
    const rows = S.rts.slice().sort((a, b) => b.TanggalRetur - a.TanggalRetur).map(r => [r.RTSID, r.NomorPesanan, r.Sumber, r.VariantID, vName(r.VariantID), r.Jumlah, fmtDate(r.TanggalRetur), ST[r.Status] || r.Status, r.Alasan, r.Catatan, userName(r.DiprosesOleh), r.TanggalProses ? fmtDT(r.TanggalProses) : '']);
    return Object.assign(base, { period: 'Data 120 hari terakhir + semua pending', head: ['RTSID', 'No. Pesanan', 'Sumber', 'VariantID', 'Produk', 'Jumlah', 'Tgl Retur', 'Status', 'Alasan', 'Catatan', 'Diproses Oleh', 'Tgl Proses'], rows: rows, num: [5] });
  }
  if (type === 'opname') {
    const r = await callApi('report.get', { type: 'opname', from: rg[0], to: rg[1] });
    if (!r.success) throw new Error(r.message);
    const sm = {}; r.data.sessions.forEach(s => { sm[s.OpnameID] = s; });
    const rows = r.data.items.filter(i => i.StokFisik !== null).map(i => [i.OpnameID, fmtDT((sm[i.OpnameID] || {}).TanggalKonfirmasi), i.VariantID, vName(i.VariantID), i.StokSistem, i.StokFisik, i.Selisih, i.Catatan, userName((sm[i.OpnameID] || {}).DikonfirmasiOleh)]);
    return Object.assign(base, { head: ['Sesi', 'Dikonfirmasi', 'VariantID', 'Produk', 'Stok Sistem', 'Stok Fisik', 'Selisih', 'Catatan', 'Oleh'], rows: rows, num: [4, 5, 6] });
  }
  throw new Error('Jenis laporan tidak dikenal.');
}
function fileName(key, ext) { const n = { produk: 'DataProduk', stok: 'StokTersedia', masuk: 'BarangMasuk', keluar: 'BarangKeluar', bestseller: 'BestSeller', po: 'PurchaseOrders', rts: 'ReturnsRTS', opname: 'StockOpname' }[key] || key; return 'ROVELO_' + n + '_' + stamp() + '.' + ext; }
function toCsv(head, rows) { const q = v => { const s = v === null || v === undefined ? '' : String(v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }; return '﻿' + [head].concat(rows).map(r => r.map(q).join(',')).join('\r\n'); }
async function produceFile(spec, ext) {
  if (ext === 'csv') return { blob: new Blob([toCsv(spec.head, spec.rows)], { type: 'text/csv;charset=utf-8' }), name: fileName(spec.key, 'csv') };
  if (ext === 'xlsx') {
    await loadScript(CDN.xlsx);
    const info = [[(S.settings.NamaBisnis || 'ROVELO') + ' — ' + spec.title], [spec.desc], ['Periode: ' + spec.period], ['Diekspor: ' + fmtDT(now()) + ' oleh ' + S.me.nama], []];
    const aoa = info.concat([spec.head], spec.rows);
    if (spec.total) aoa.push([spec.total.label].concat(new Array(spec.total.col - 1).fill('')).concat([sum(spec.rows, r => Number(r[spec.total.col]) || 0)]));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = spec.head.map((h, i) => ({ wch: Math.min(42, Math.max(String(h).length + 2, ...spec.rows.slice(0, 200).map(r => String(r[i] === undefined ? '' : r[i]).length + 1))) }));
    ws['!freeze'] = { xSplit: 0, ySplit: 6 };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, spec.title.replace('Laporan ', '').slice(0, 28));
    if (spec.extra) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([spec.extra.head].concat(spec.extra.rows)), spec.extra.name);
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return { blob: new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name: fileName(spec.key, 'xlsx') };
  }
  await loadScript(CDN.jspdf); await loadScript(CDN.autotable);
  const { jsPDF } = window.jspdf;
  const wide = spec.head.length > 7;
  const doc = new jsPDF({ orientation: wide ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const logo = await pdfLogo();
  if (logo) { const h = 120 * logo.h / logo.w; doc.addImage(logo.url, 'PNG', 40, 34, 120, h); }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(17, 17, 17); doc.text(spec.title, 40, 78);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90, 95, 105);
  doc.text(spec.desc, 40, 94); doc.text('Periode: ' + spec.period, 40, 107);
  doc.text('Diekspor: ' + fmtDT(now()) + ' WIB oleh ' + S.me.nama, W - 40, 40, { align: 'right' });
  const body = spec.rows.map(r => r.map(c => c === null || c === undefined ? '' : (typeof c === 'number' ? fmt(c) : String(c))));
  const foot = spec.total ? [[{ content: spec.total.label, colSpan: spec.total.col, styles: { halign: 'right' } }, fmt(sum(spec.rows, r => Number(r[spec.total.col]) || 0))].concat(new Array(spec.head.length - spec.total.col - 1).fill(''))] : undefined;
  const colStyles = {}; (spec.num || []).forEach(i => { colStyles[i] = { halign: 'right' }; });
  doc.autoTable({
    head: [spec.head], body: body, foot: foot, startY: 120, margin: { left: 40, right: 40 }, theme: 'grid', showFoot: 'lastPage',
    styles: { font: 'helvetica', fontSize: wide ? 7.5 : 8.5, cellPadding: 4, lineColor: [229, 231, 235], lineWidth: .5, textColor: [17, 17, 17] },
    headStyles: { fillColor: [17, 17, 17], textColor: 255, fontStyle: 'bold' }, footStyles: { fillColor: [244, 245, 247], textColor: [17, 17, 17], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 249, 251] }, columnStyles: colStyles,
    didDrawPage: () => { const n = doc.internal.getNumberOfPages(); doc.setFontSize(8); doc.setTextColor(140); doc.text((S.settings.NamaBisnis || 'ROVELO') + ' Inventory · ' + spec.title, 40, doc.internal.pageSize.getHeight() - 20); doc.text('Halaman ' + n, W - 40, doc.internal.pageSize.getHeight() - 20, { align: 'right' }); }
  });
  return { blob: doc.output('blob'), name: fileName(spec.key, 'pdf') };
}
/** Logo PDF: versi hitam, dikonversi ke PNG via canvas (aman untuk logo WEBP/SVG). */
function pdfLogo() {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = img.naturalWidth || 338; c.height = img.naturalHeight || 53; const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height); try { res({ url: c.toDataURL('image/png'), w: c.width, h: c.height }); } catch (e) { res(null); } };
    img.onerror = () => res(null);
    img.src = logoSrc(false);
  });
}
async function exportXlsx(key, title, head, rows) {
  if (!can('EXPORT') && key !== 'LembarHitung') { toast('Tidak ada akses', 'Export memerlukan izin EXPORT.', 'warning'); return; }
  try {
    await loadScript(CDN.xlsx);
    const ws = XLSX.utils.aoa_to_sheet([[title], ['Diekspor ' + fmtDT(now()) + ' oleh ' + S.me.nama], [], head].concat(rows));
    ws['!cols'] = head.map(h => ({ wch: Math.max(12, String(h).length + 4) }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, key.slice(0, 28));
    download(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'ROVELO_' + key + '_' + stamp() + '.xlsx');
    toast('File diunduh', 'ROVELO_' + key + '_' + stamp() + '.xlsx', 'success');
  } catch (e) { toast('Export gagal', e.message, 'danger'); }
}
Object.assign(ACT, { 'export-open': el => openExport(el.dataset.type) });

// ════════ MULAI ════════
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
