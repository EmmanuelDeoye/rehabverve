// Runs in <head> before the page paints, so the chosen theme never flashes.
// Stored choice: 'light' | 'dark' | 'system' (default).
(function () {
    var choice = 'system';
    try { choice = localStorage.getItem('rv-theme') || 'system'; } catch (e) { /* storage blocked */ }
    var dark = choice === 'dark' || (choice === 'system' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0b1120' : '#ffffff');
})();
