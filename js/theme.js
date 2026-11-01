/* Terapkan tema terang/gelap sebelum halaman dirender (tanpa kedip). */
(function () {
  try {
    var t = localStorage.getItem('rovelo_theme');
    if (t) t = JSON.parse(t);
    if (t === 'dark' || (!t && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.setAttribute('data-theme', 'dark');
  } catch (e) { }
})();
