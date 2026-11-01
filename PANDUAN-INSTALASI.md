# Panduan Instalasi ROVELO Inventory
### Backend di Google Apps Script · Frontend di GitHub Pages

Aplikasi sekarang terdiri dari dua bagian terpisah:

```
Browser pengguna ──► GitHub Pages (tampilan: HTML/CSS/JS)
                         │  fetch() JSON
                         ▼
                 Google Apps Script (REST API) ──► Google Sheets & Drive
```

| Bagian | Berkas | Dipasang di |
|---|---|---|
| **Backend** | `Kode.gs`, `appsscript.json` | Editor Apps Script (script.google.com) |
| **Frontend** | isi `rovelo-inventory.zip` | Repository GitHub → GitHub Pages |

> **Urutan wajib:** pasang **backend dulu** (Bagian A), karena URL backend harus diisi ke frontend (Bagian B) sebelum frontend di-upload (Bagian C).

---

## Bagian A — Backend (Google Apps Script)

Pilih **A1** kalau ROVELO versi lama (yang tampil langsung dari Apps Script) sudah pernah Anda pasang. Pilih **A2** kalau belum pernah.

### A1. Migrasi dari versi lama (data tetap aman)

1. Buka proyek Apps Script ROVELO yang lama di **script.google.com**.
2. Buka file **Kode** → hapus semua isinya → tempel seluruh isi `Kode.gs` yang baru → **Ctrl+S**.
3. Buka `appsscript.json` → ganti isinya dengan `appsscript.json` yang baru → **Ctrl+S**.
   (Kalau file ini tidak terlihat: ikon roda gigi **Project Settings** → centang *Show "appsscript.json" manifest file in editor*.)
4. Hapus file **Index**, **Stylesheet**, dan **JavaScript** (titik tiga di samping nama file → **Delete**). Ketiganya sudah pindah ke GitHub.
5. **Deploy → Manage deployments** → ikon pensil ✏️ → **Version: New version** → **Deploy**.
6. URL `/exec` **tidak berubah** dan semua data tetap ada. Lanjut ke langkah **A3**.

> ⚠️ Setelah migrasi, URL `/exec` tidak lagi menampilkan aplikasi — isinya sekarang data JSON. Kalau URL itu pernah dipasang di Blogger, ganti dengan alamat GitHub Pages (lihat Bagian E).

### A2. Instalasi baru

1. Buka **script.google.com** → **New project** → ganti nama menjadi **ROVELO Inventory API**.
2. **Project Settings** (ikon roda gigi) → centang *Show "appsscript.json" manifest file in editor* → kembali ke **Editor** (ikon `< >`).
3. Buka `appsscript.json` → hapus isinya → tempel isi `appsscript.json` → **Ctrl+S**.
4. Ubah nama `Code.gs` menjadi **Kode** → hapus isinya → tempel seluruh isi `Kode.gs` → **Ctrl+S**.
5. *(Opsional)* Mau langsung kosong tanpa data contoh? Cari `const ISI_DATA_CONTOH = true;` → ubah menjadi `false` → **Ctrl+S**.
6. Pilih fungsi **setupAppEnvironment** di dropdown atas → **▶ Run**.
   - Muncul *Authorization required* → **Review permissions** → pilih akun.
   - Muncul *"Google hasn't verified this app"* → **Advanced** → **Go to ROVELO Inventory API (unsafe)** → centang semua izin → **Allow**. Ini normal untuk skrip milik sendiri.
7. Tunggu log **✅ SETUP ROVELO INVENTORY SELESAI**, lalu **catat sekarang juga** (hanya tampil sekali):
   - Username: `owner`
   - Sandi Owner (12 karakter)
   - 8 kode pemulihan (`XXXX-XXXX`)
8. **Deploy → New deployment** → ikon roda gigi di samping *Select type* → **Web app**:
   - Description: `API v1.1`
   - Execute as: **Me**
   - Who has access: **Anyone** ← wajib, supaya GitHub Pages bisa memanggil API tanpa login Google. Data tetap aman karena setiap aksi memeriksa login aplikasi.
9. **Deploy** → salin **Web app URL** (berakhiran `/exec`).

### A3. Uji backend

Buka URL `/exec` di tab baru browser. Yang benar tampil seperti ini:

```json
{"success":true,"data":{"app":"ROVELO Inventory","version":"1.1.0","ready":true,...},"message":"ROVELO Inventory API aktif."}
```

- `"ready":true` → backend siap.
- `"ready":false` → `setupAppEnvironment` belum dijalankan.
- Muncul halaman login Google → *Who has access* belum **Anyone**. Perbaiki di **Manage deployments → Edit**.

---

## Bagian B — Isi alamat backend di frontend

1. Klik kanan `rovelo-inventory.zip` → **Extract All…** → **Extract**.
   Hasilnya folder **`rovelo-inventory`** yang langsung berisi `index.html`, `README.md`, folder `css`, `js`, dan `assets`.
2. Buka `rovelo-inventory\js\config.js` dengan **Notepad** (klik kanan → *Open with* → Notepad).
3. Ganti `PASTE_URL_WEB_APP_DI_SINI` dengan URL `/exec` dari Bagian A. Tanda kutipnya tetap ada:

```js
window.ROVELO_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbx...panjang.../exec'
};
```

4. **Simpan** (Ctrl+S).

> Ini satu-satunya file yang perlu diedit. URL ini memang publik (dipanggil oleh browser), jadi aman berada di repository publik. Semua rahasia — sandi, kode pemulihan, kunci sesi, kunci AI, ID spreadsheet — hanya ada di Script Properties Apps Script.

---

## Bagian C — Upload frontend ke GitHub Pages

> Selalu lewat terminal. **Jangan** pakai tombol *Upload files* di web GitHub, karena struktur folder `css/` dan `js/` bisa rusak dan situs tampil tanpa gaya.

### C1. Install Git (sekali saja)
- **Windows:** unduh dari https://git-scm.com/download/win → install dengan pilihan default → buka **PowerShell** dari Start Menu.
- **Mac:** buka Terminal → ketik `git --version` → ikuti tawaran instalasi.

Cek:
```bash
git --version
```
Muncul `git version 2.x.x` → berhasil.

### C2. Buat akun GitHub
Daftar di https://github.com. Username Anda akan menjadi bagian alamat situs: `username.github.io`.

### C3. Atur identitas Git (sekali per komputer)
```bash
git config --global user.name "Nama Anda"
git config --global user.email "email-akun-github@contoh.com"
```
`user.name` hanya label di riwayat (bukan username GitHub).

### C4. Buat repository
github.com → tombol **+** (kanan atas) → **New repository**:
- Repository name: `rovelo-inventory`
- **Public** (wajib untuk GitHub Pages gratis)
- **Jangan** centang *Add a README*, *.gitignore*, atau *license*
- **Create repository** → biarkan halaman berikutnya terbuka.

### C5. Masuk ke folder yang BENAR
Folder kerjanya adalah **`rovelo-inventory`** hasil ekstrak di Bagian B — folder yang **langsung berisi `index.html`**.

Cara cepat di Windows: buka folder itu di File Explorer → klik address bar → ketik `powershell` → Enter.

Cek isinya:
```powershell
dir
```
**Wajib terlihat:** `index.html`, `README.md`, `PANDUAN-INSTALASI.md`, folder `css`, `js`, `assets`.
- Kalau yang terlihat justru satu folder `rovelo-inventory` lagi, masuk dulu: `cd rovelo-inventory`, lalu `dir` lagi.
- Jangan ada file `Kode.gs` di sini. File itu hanya untuk Apps Script.

### C6. Kirim ke GitHub
Jalankan satu per satu:
```bash
git init
git add .
git commit -m "Upload pertama ROVELO Inventory"
git branch -M main
git remote add origin https://github.com/USERNAME/rovelo-inventory.git
git push -u origin main
```
- `git add .` → perhatikan **titik** di akhir.
- Ganti `USERNAME` dengan username GitHub Anda.
- Saat `git push` meminta login: kalau muncul jendela browser, login saja. Kalau diminta *Password* di terminal, yang dimasukkan adalah **Personal Access Token** (C7), bukan sandi akun. Saat menempel token, layar memang tidak menampilkan apa pun. Ini normal: tempel (klik kanan) lalu Enter.
- Berhasil bila muncul `Writing objects: 100%` dan `* [new branch] main -> main`.

### C7. Personal Access Token (hanya jika diminta)
1. Buka https://github.com/settings/tokens → **Generate new token** → **Generate new token (classic)**.
2. Note: `rovelo-push` · Expiration: `90 days` · centang **repo**.
3. **Generate token** → salin token `ghp_…` (hanya tampil sekali) → ulangi `git push -u origin main` → tempel token sebagai password.

### C8. Aktifkan GitHub Pages
1. Buka `https://github.com/USERNAME/rovelo-inventory`. Pastikan `index.html` ada di daftar paling atas, bersama folder `css`, `js`, dan `assets`.
2. **Settings** → **Pages** (menu kiri):
   - Source: **Deploy from a branch**
   - Branch: **main** · **/ (root)** → **Save**
3. Tunggu 1–2 menit → refresh. Muncul *"Your site is live at https://USERNAME.github.io/rovelo-inventory/"*.
4. Buka alamat itu → halaman login ROVELO tampil → masuk dengan `owner` dan sandi dari log.

---

## Bagian D — Cara update

**Frontend** (file di folder `rovelo-inventory`): dari folder itu jalankan
```bash
git add .
git commit -m "Keterangan perubahan"
git push
```
Situs diperbarui dalam 1–2 menit. Kalau tampilan masih versi lama, tekan **Ctrl+Shift+R** atau buka jendela Incognito.

**Backend** (`Kode.gs`): tempel kode baru → Ctrl+S → **Deploy → Manage deployments → ✏️ → New version → Deploy**. Jangan memakai *New deployment*, karena URL akan berubah dan `js/config.js` harus diubah lagi.

Fungsi perawatan di editor (pilih fungsinya → ▶ Run) tetap sama:

| Fungsi | Kegunaan |
|---|---|
| `hapusDataContoh` | Kosongkan data operasional; akun, pengaturan, dan kategori tetap (backup dibuat dulu) |
| `resetTotalAplikasi` | Reset total; jalankan **dua kali** dalam 5 menit. Hasilnya Owner baru di log |
| `resetPasswordOwner` | Sandi Owner baru (bila sandi & kode pemulihan hilang) |
| `hitungUlangStok` | Hitung ulang stok dari seluruh transaksi |
| `rotasiSecretSesi` | Paksa semua pengguna login ulang |

---

## Bagian E — (Opsional) Tampilkan di Blogger

Cara paling sederhana: pasang **tautan** ke `https://USERNAME.github.io/rovelo-inventory/` di menu blog.

Kalau ingin tampil di dalam halaman Blogger: **Halaman → Halaman baru → Tampilan HTML**, lalu tempel:
```html
<div style="position:relative;width:100%;height:100vh;min-height:640px">
  <iframe src="https://USERNAME.github.io/rovelo-inventory/"
          style="position:absolute;inset:0;width:100%;height:100%;border:0"
          title="ROVELO Inventory" loading="lazy"></iframe>
</div>
```
Ganti juga kode embed lama yang memakai URL `/exec`.

---

## Masalah umum

| Yang terlihat | Penyebab | Solusi |
|---|---|---|
| "Alamat backend belum diatur" | `GAS_URL` di `js/config.js` belum diisi atau formatnya salah | Isi URL `/exec` (Bagian B) → `git add .` → `git commit -m "isi GAS_URL"` → `git push` |
| "Server tidak dapat dihubungi" | Internet putus, URL salah, atau akses deployment bukan *Anyone* | Buka URL `/exec` di browser (A3). Kalau muncul login Google → set *Anyone* lalu New version |
| "Server mengirim respons yang tidak dikenali" | Deployment belum versi terbaru atau aksesnya salah | Manage deployments → ✏️ → New version → Deploy |
| "Database belum disiapkan" | `setupAppEnvironment` belum dijalankan | Jalankan dari editor, lalu New version |
| Situs 404 | `index.html` tidak berada di root repository | Lihat isi repo di github.com. Kalau yang terlihat folder, push ulang dari folder yang benar (di bawah) |
| Tampilan polos tanpa warna | Folder `css/` / `js/` rusak (biasanya karena upload lewat web) | Push ulang dari terminal dengan struktur asli |
| `Password authentication is not supported` | GitHub menolak sandi akun | Pakai Personal Access Token (C7) |
| `remote origin already exists` | Remote sudah pernah ditambahkan | Lewati, langsung `git push`. URL salah? `git remote set-url origin <url>` |
| `src refspec main does not match any` | Belum ada commit | `git add .` lalu `git commit -m "Upload pertama"` |
| `Updates were rejected` | Repo GitHub sudah berisi file (mis. README) | `git pull --rebase origin main` lalu `git push` |
| `LF will be replaced by CRLF` | Peringatan format baris Windows | Abaikan, bukan error |
| Perubahan tidak muncul | Cache browser | Ctrl+Shift+R atau jendela Incognito |

**Push dari folder yang salah (situs 404):** masuk ke folder yang benar (yang berisi `index.html`), lalu:
```bash
git init
git add .
git commit -m "Perbaiki struktur"
git branch -M main
git remote add origin https://github.com/USERNAME/rovelo-inventory.git
git push -u origin main --force
```
`--force` menimpa isi repository dengan isi folder ini. Aman di sini karena isi lama memang salah.

---

## Istilah singkat
- **Repository (repo):** folder proyek di GitHub.
- **Commit:** menyimpan perubahan beserta catatannya.
- **Push:** mengirim commit dari komputer ke GitHub.
- **Personal Access Token:** "sandi khusus" GitHub untuk terminal.
- **Deployment / New version:** cara menerbitkan kode Apps Script terbaru tanpa mengubah URL.
