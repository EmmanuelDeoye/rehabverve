// motion.js — subtle reveal-on-scroll for cards and sections inside the app.
// Elements rise and fade in once as they first come into view. Off for people who ask their
// device for reduced motion, and content is never left hidden: if anything here is missing,
// nothing is hidden in the first place.
(function () {
    'use strict';
    const main = document.getElementById('main');
    if (!main || !('IntersectionObserver' in window) || !('MutationObserver' in window)) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const SELECTOR = [
        '.page-head h1', '.section-head', '.card', '.disc', '.pz', '.promo', '.action', '.svc',
        '.steps-row li', '.feature-post', '.chips.quick', '.rail', '.filter-bar', '.mode-pills', '.puzzle'
    ].join(',');
    // Things that move on their own or sit in overlays are left alone
    const SKIP = 'dialog, .drawer, .chat-panel, .admin-nav, .rail, .user-menu-panel, .tabbar';
    let screenShownAt = performance.now();

    const finish = el => {
        el.classList.remove('rv-reveal', 'in');
        el.style.removeProperty('--d');
    };
    const io = new IntersectionObserver(entries => {
        let order = 0;
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            const el = e.target;
            io.unobserve(el);
            const delay = Math.min(order++, 6) * 55;
            el.style.setProperty('--d', `${delay}ms`);
            el.classList.add('in');
            // Hand the element back to its normal styles (hover lifts etc.) once it has arrived
            setTimeout(() => finish(el), 650 + delay);
        });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });

    function watch(root) {
        const found = root.matches(SELECTOR) ? [root] : [];
        found.push(...root.querySelectorAll(SELECTOR));
        const settled = performance.now() - screenShownAt > 1200;
        found.forEach(el => {
            if (el.classList.contains('rv-reveal') || (el.parentElement && el.parentElement.closest(SKIP))) return;
            // Content that changes later in plain view (e.g. new search results) just appears
            if (settled) {
                const r = el.getBoundingClientRect();
                if (r.top < innerHeight && r.bottom > 0) return;
            }
            el.classList.add('rv-reveal');
            io.observe(el);
        });
    }

    new MutationObserver(records => records.forEach(rec => rec.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.parentElement === main) screenShownAt = performance.now(); // a new screen
        watch(node);
    }))).observe(main, { childList: true, subtree: true });

    document.documentElement.classList.add('motion');
    watch(main);
})();
