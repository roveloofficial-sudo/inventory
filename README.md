# ROVELO Inventory — Frontend

Tampilan web ROVELO Inventory Management System: dashboard stok, barang masuk/keluar, import marketplace (Shopee, TikTok Shop, Lazada), Purchase Order, Returns/RTS, Stock Opname, audit, dan pengaturan.

Situs ini statis (HTML/CSS/JS murni) untuk **GitHub Pages**. Semua data diambil dari **Google Apps Script REST API** (backend terpisah, tidak ada di repository ini).

## Struktur

```
index.html          halaman aplikasi (SPA)
css/style.css       semua gaya (terang & gelap)
js/config.js        ← alamat backend (GAS_URL) — satu-satunya file yang perlu diedit
js/theme.js         tema sebelum render
js/core.js …        logika aplikasi per modul
assets/favicon.svg
```

## Konfigurasi

Isi `js/config.js` dengan URL Web App Apps Script (berakhiran `/exec`):

```js
window.ROVELO_CONFIG = { GAS_URL: 'https://script.google.com/macros/s/XXXX/exec' };
```

## Update

```bash
git add .
git commit -m "Keterangan perubahan"
git push
```

Panduan lengkap (backend + GitHub Pages + pemecahan masalah): lihat `PANDUAN-INSTALASI.md`.

## Keamanan

- Repository ini tidak memuat rahasia apa pun. `GAS_URL` memang alamat publik.
- Sandi, kode pemulihan, kunci sesi, kunci AI, dan ID spreadsheet hanya tersimpan di Script Properties Apps Script.
- Token login hanya dikirim di body permintaan POST, tidak pernah di URL.
- Content-Security-Policy membatasi skrip hanya dari situs ini dan cdn.jsdelivr.net.
