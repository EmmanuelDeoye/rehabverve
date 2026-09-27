// home.js — hero "network projection": fills the orbit with live professional
// avatars and animates the network stats once Firebase data arrives.
(function () {
    'use strict';

    const RINGS = [
        { id: 'orbit-1', count: 4 },
        { id: 'orbit-2', count: 6 },
        { id: 'orbit-3', count: 8 }
    ];
    const ICONS = ['bx-user', 'bx-body', 'bx-brain', 'bx-heart', 'bx-child', 'bx-plus-medical', 'bx-accessibility', 'bx-message-rounded-dots'];

    function buildOrbit(images) {
        let n = 0;
        RINGS.forEach((ring, r) => {
            const spin = document.getElementById(ring.id);
            if (!spin) return;
            spin.innerHTML = '';
            for (let i = 0; i < ring.count; i++) {
                const angle = (i / ring.count) * Math.PI * 2 + r * 0.6;
                const node = document.createElement('div');
                node.className = 'orbit-node';
                node.style.left = `${50 + 50 * Math.cos(angle)}%`;
                node.style.top = `${50 + 50 * Math.sin(angle)}%`;
                const src = images[n++];
                node.innerHTML = `<div class="nd"><span>${src
                    ? `<img src="${src}" alt="" decoding="async" onerror="this.src='assets/img/profile.png'">`
                    : `<i class="ph bx ${ICONS[(i + r) % ICONS.length]}"></i>`}</span></div>`;
                spin.appendChild(node);
            }
            // Restart ring + counter-rotation together so avatars stay upright
            const nodes = spin.querySelectorAll('.nd');
            [spin, ...nodes].forEach(el => { el.style.animation = 'none'; });
            void spin.offsetWidth;
            [spin, ...nodes].forEach(el => { el.style.animation = ''; });
        });
    }

    function init() {
        const core = document.getElementById('core-logo');
        if (core && window.vvLogoSVG) core.innerHTML = window.vvLogoSVG();
        buildOrbit([]);
    }

    document.addEventListener('vv:professionals', e => {
        const data = e.detail || {};
        const list = Object.values(data);
        const imgs = list.map(p => p && p.img).filter(src => typeof src === 'string' && /^https?:/.test(src));
        // shuffle lightly so the orbit feels alive between visits
        for (let i = imgs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [imgs[i], imgs[j]] = [imgs[j], imgs[i]]; }
        buildOrbit(imgs.slice(0, 18));
        const el = document.getElementById('stat-pros');
        if (el && window.vvCount) window.vvCount(el, list.length);
    });

    document.addEventListener('vv:centers', e => {
        const el = document.getElementById('stat-centers');
        if (el && window.vvCount) window.vvCount(el, Object.keys(e.detail || {}).length);
    });

    if (document.body) init();
    else document.addEventListener('DOMContentLoaded', init);
})();
