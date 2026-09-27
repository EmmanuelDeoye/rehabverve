// verve.js — RehabVerve motion & interaction engine.
// Background (aurora + live network canvas + perspective grid), reveal-on-scroll,
// split-text headlines, 3D tilt + cursor spotlight, magnetic buttons, counters,
// ripples, toasts, header behaviour, page transitions and the session intro.
(function () {
    'use strict';

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

    // Cards rendered by page scripts that should animate in automatically
    const AUTO_CARDS = [
        '.profile-card', '.center-card', '.blog-card', '.related-post-card',
        '.detail-card', '.setting-card', '.role-card', '.vv-auto'
    ].join(',');

    /* ------------------------------------------------------------------ */
    /* Session intro                                                        */
    /* ------------------------------------------------------------------ */
    function intro() {
        let seen = false;
        try { seen = sessionStorage.getItem('vv-intro') === '1'; sessionStorage.setItem('vv-intro', '1'); } catch (e) { seen = true; }
        if (seen || reduced || !window.vvLogoSVG) return;
        const el = document.createElement('div');
        el.className = 'vv-intro';
        el.innerHTML = `<span class="vv-logo">${window.vvLogoSVG()}</span><span class="vv-word">Rehab<b>Verve</b></span><span class="vv-intro-bar"></span>`;
        document.body.appendChild(el);
        const done = () => { el.classList.add('is-done'); setTimeout(() => el.remove(), 800); };
        setTimeout(done, 1350);
    }

    /* ------------------------------------------------------------------ */
    /* Background                                                           */
    /* ------------------------------------------------------------------ */
    function background() {
        const bg = document.createElement('div');
        bg.className = 'vv-bg';
        bg.setAttribute('aria-hidden', 'true');
        bg.innerHTML = '<div class="vv-aurora"><i></i><i></i><i></i></div><canvas id="vv-net"></canvas><div class="vv-grid"></div><div class="vv-noise"></div>';
        document.body.prepend(bg);

        const progress = document.createElement('div');
        progress.className = 'vv-progress';
        document.body.appendChild(progress);

        if (finePointer && !reduced) {
            const glow = document.createElement('div');
            glow.className = 'vv-glow';
            document.body.appendChild(glow);
            let tx = innerWidth / 2, ty = innerHeight / 3, x = tx, y = ty;
            addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
            (function loop() {
                x += (tx - x) * 0.12; y += (ty - y) * 0.12;
                glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
                requestAnimationFrame(loop);
            })();
        }

        networkCanvas($('#vv-net'));
    }

    function networkCanvas(canvas) {
        if (!canvas || !canvas.getContext) return;
        const ctx = canvas.getContext('2d');
        const COLORS = ['34,211,238', '139,92,246', '52,211,153'];
        let w, h, dpr, pts = [], mouse = { x: -9999, y: -9999 }, running = true, raf;

        function resize() {
            dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            w = canvas.clientWidth; h = canvas.clientHeight;
            canvas.width = w * dpr; canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const n = Math.max(22, Math.min(78, Math.round((w * h) / 17000)));
            pts = Array.from({ length: n }, () => ({
                x: Math.random() * w, y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
                r: Math.random() * 1.4 + 0.6,
                c: COLORS[Math.floor(Math.random() * COLORS.length)],
                p: Math.random() * Math.PI * 2
            }));
        }

        function frame() {
            ctx.clearRect(0, 0, w, h);
            const LINK = w < 600 ? 95 : 130;
            for (let i = 0; i < pts.length; i++) {
                const a = pts[i];
                a.x += a.vx; a.y += a.vy; a.p += 0.02;
                if (a.x < -20) a.x = w + 20; else if (a.x > w + 20) a.x = -20;
                if (a.y < -20) a.y = h + 20; else if (a.y > h + 20) a.y = -20;

                const mdx = mouse.x - a.x, mdy = mouse.y - a.y, md = Math.hypot(mdx, mdy);
                if (md < 170) {
                    a.x += mdx * 0.004; a.y += mdy * 0.004;
                    ctx.strokeStyle = `rgba(${a.c},${(1 - md / 170) * 0.5})`;
                    ctx.lineWidth = 0.8;
                    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
                }
                for (let j = i + 1; j < pts.length; j++) {
                    const b = pts[j];
                    const dx = a.x - b.x, dy = a.y - b.y;
                    if (Math.abs(dx) > LINK || Math.abs(dy) > LINK) continue;
                    const d = Math.hypot(dx, dy);
                    if (d < LINK) {
                        ctx.strokeStyle = `rgba(${a.c},${(1 - d / LINK) * 0.22})`;
                        ctx.lineWidth = 0.6;
                        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                    }
                }
                const glow = 0.55 + Math.sin(a.p) * 0.35;
                ctx.fillStyle = `rgba(${a.c},${glow})`;
                ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
            }
            if (running && !reduced) raf = requestAnimationFrame(frame);
        }

        resize();
        let rt;
        addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { resize(); if (reduced) frame(); }, 200); });
        if (finePointer) {
            addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
            document.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
        }
        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running && !reduced) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
        });
        frame();
    }

    /* ------------------------------------------------------------------ */
    /* Header, progress, back-to-top                                        */
    /* ------------------------------------------------------------------ */
    function chrome() {
        const header = $('.l-header');
        const progress = $('.vv-progress');
        const top = document.createElement('button');
        top.className = 'vv-top';
        top.type = 'button';
        top.setAttribute('aria-label', 'Back to top');
        top.innerHTML = "<i class='bx bx-up-arrow-alt'></i>";
        top.addEventListener('click', () => scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));
        document.body.appendChild(top);

        let last = scrollY, ticking = false;
        function update() {
            const y = scrollY;
            const max = document.documentElement.scrollHeight - innerHeight;
            if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
            if (header) {
                header.classList.toggle('is-scrolled', y > 10);
                const menuOpen = $('#nav-menu.show');
                if (!menuOpen && y > last + 6 && y > 160) header.classList.add('is-hidden');
                else if (y < last - 6 || y < 160) header.classList.remove('is-hidden');
            }
            top.classList.toggle('show', y > 900);
            last = y;
            ticking = false;
        }
        addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
        update();

        // Tuck floating actions away while the footer is on screen
        const footer = $('.modern-footer');
        if (footer) {
            new IntersectionObserver(es => es.forEach(e => document.body.classList.toggle('vv-at-footer', e.isIntersecting)), { threshold: 0.15 }).observe(footer);
        }
    }

    /* ------------------------------------------------------------------ */
    /* Reveal                                                               */
    /* ------------------------------------------------------------------ */
    let io;
    function reveal(el) {
        if (!el || el.__vvReveal) return;
        el.__vvReveal = true;
        if (reduced) return;
        el.classList.add('vv-reveal');
        io.observe(el);
    }

    function setupReveal() {
        io = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                io.unobserve(el);
                const show = () => {
                    if (document.documentElement.classList.contains('vv-prep')) { setTimeout(show, 50); return; }
                    el.classList.add('is-in');
                    const i = parseFloat(getComputedStyle(el).getPropertyValue('--i')) || 0;
                    // Drop the reveal classes afterwards so hover/tilt transitions are instant
                    setTimeout(() => el.classList.remove('vv-reveal', 'is-in'), 1000 + i * 70);
                };
                show();
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        $$('[data-stagger]').forEach(parent => {
            Array.from(parent.children).forEach((c, i) => {
                c.style.setProperty('--i', i % 10);
                if (!c.hasAttribute('data-reveal')) c.setAttribute('data-reveal', parent.getAttribute('data-stagger') || 'up');
            });
        });
        // Apply the hidden starting state without animating *into* it (avoids a
        // visible → hidden flicker for content that was already painted).
        const root = document.documentElement;
        root.classList.add('vv-prep');
        $$('[data-reveal]').forEach(reveal);
        $$(AUTO_CARDS).forEach(enhanceCard);
        void document.body.offsetHeight;
        setTimeout(() => root.classList.remove('vv-prep'), 60);

        // Safety net: never leave on-screen content hidden if the observer is
        // throttled (background tabs, embedded webviews).
        setTimeout(() => {
            $$('.vv-reveal:not(.is-in)').forEach(el => {
                if (el.getBoundingClientRect().top < innerHeight) {
                    el.classList.add('is-in');
                    setTimeout(() => el.classList.remove('vv-reveal', 'is-in'), 1200);
                }
            });
            $$('.vv-split:not(.is-in)').forEach(el => {
                if (el.getBoundingClientRect().top < innerHeight) el.classList.add('is-in');
            });
        }, 2500);

        // Cards injected later by Firebase-driven page scripts
        new MutationObserver(muts => {
            muts.forEach(m => m.addedNodes.forEach(n => {
                if (n.nodeType !== 1) return;
                if (n.matches && n.matches(AUTO_CARDS)) enhanceCard(n);
                if (n.querySelectorAll) n.querySelectorAll(AUTO_CARDS).forEach(enhanceCard);
                if (n.querySelectorAll) n.querySelectorAll('[data-reveal]').forEach(reveal);
            }));
        }).observe(document.body, { childList: true, subtree: true });
    }

    function enhanceCard(el) {
        if (el.__vvCard) return;
        el.__vvCard = true;
        el.classList.add('vv-tilt');
        const siblings = el.parentElement ? Array.from(el.parentElement.children) : [];
        el.style.setProperty('--i', Math.max(0, siblings.indexOf(el)) % 8);
        reveal(el);
    }

    /* ------------------------------------------------------------------ */
    /* Split-text headlines                                                  */
    /* ------------------------------------------------------------------ */
    function splitText() {
        $$('[data-split]').forEach(el => {
            if (el.__vvSplit) return;
            el.__vvSplit = true;
            let wi = 0;
            const wrap = inner => {
                const w = document.createElement('span');
                w.className = 'w';
                const s = document.createElement('span');
                s.style.setProperty('--wi', wi++);
                s.appendChild(inner);
                w.appendChild(s);
                return w;
            };
            Array.from(el.childNodes).forEach(node => {
                if (node.nodeType === 3) {
                    const frag = document.createDocumentFragment();
                    node.textContent.split(/(\s+)/).forEach(part => {
                        if (!part) return;
                        if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(' '));
                        else frag.appendChild(wrap(document.createTextNode(part)));
                    });
                    el.replaceChild(frag, node);
                } else if (node.nodeType === 1 && node.tagName !== 'BR') {
                    const placeholder = document.createComment('');
                    el.replaceChild(placeholder, node);
                    el.replaceChild(wrap(node), placeholder);
                }
            });
            el.classList.add('vv-split');
            if (reduced) { el.classList.add('is-in'); return; }
            const o = new IntersectionObserver(es => es.forEach(e => {
                if (e.isIntersecting) { el.classList.add('is-in'); o.disconnect(); }
            }), { threshold: 0.2 });
            o.observe(el);
        });
    }

    /* ------------------------------------------------------------------ */
    /* Tilt + spotlight, magnetic, ripple                                   */
    /* ------------------------------------------------------------------ */
    function pointerFX() {
        if (!finePointer || reduced) return;
        let active = null;
        document.addEventListener('pointermove', e => {
            const card = e.target.closest && e.target.closest('.vv-tilt');
            if (active && active !== card) { active.style.transform = ''; active = null; }
            if (!card) return;
            const r = card.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
            card.style.setProperty('--mx', `${px * 100}%`);
            card.style.setProperty('--my', `${py * 100}%`);
            if (card.hasAttribute('data-flat')) return;
            const max = r.width > 520 ? 3 : 7;
            card.style.transform = `perspective(900px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) translateY(-4px)`;
            active = card;
        }, { passive: true });
        document.addEventListener('pointerleave', () => { if (active) active.style.transform = ''; active = null; });

        $$('.vv-magnetic').forEach(el => {
            el.addEventListener('pointermove', e => {
                const r = el.getBoundingClientRect();
                const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
                el.style.transform = `translate(${x * 0.22}px, ${y * 0.3}px)`;
            });
            el.addEventListener('pointerleave', () => { el.style.transform = ''; });
        });
    }

    function ripples() {
        document.addEventListener('pointerdown', e => {
            const btn = e.target.closest && e.target.closest('.vv-btn, .vv-chip, .auth-form button[type="submit"]');
            if (!btn || reduced) return;
            const r = btn.getBoundingClientRect();
            const s = Math.max(r.width, r.height);
            const dot = document.createElement('span');
            dot.className = 'vv-ripple';
            dot.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
            if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
            btn.style.overflow = 'hidden';
            btn.appendChild(dot);
            setTimeout(() => dot.remove(), 700);
        });
    }

    /* ------------------------------------------------------------------ */
    /* Counters                                                             */
    /* ------------------------------------------------------------------ */
    function animateCount(el) {
        const target = parseFloat(el.getAttribute('data-count')) || 0;
        const decimals = (el.getAttribute('data-count').split('.')[1] || '').length;
        const prefix = el.getAttribute('data-prefix') || '';
        const suffix = el.getAttribute('data-suffix') || '';
        const fmt = v => prefix + v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
        if (reduced) { el.textContent = fmt(target); return; }
        const t0 = performance.now(), dur = 1800;
        // Guarantee the final number even if animation frames are throttled
        clearTimeout(el.__vvCountDone);
        el.__vvCountDone = setTimeout(() => { el.textContent = fmt(target); }, dur + 150);
        (function step(t) {
            const p = Math.min(1, (t - t0) / dur);
            const eased = 1 - Math.pow(1 - p, 4);
            el.textContent = fmt(target * eased);
            if (p < 1) requestAnimationFrame(step);
        })(t0);
    }
    function counters(root = document) {
        const o = new IntersectionObserver(es => es.forEach(e => {
            if (e.isIntersecting) { animateCount(e.target); o.unobserve(e.target); }
        }), { threshold: 0.4 });
        $$('[data-count]', root).forEach(el => o.observe(el));
    }
    window.vvCount = function (el, value) {
        el.setAttribute('data-count', value);
        animateCount(el);
    };

    /* ------------------------------------------------------------------ */
    /* Toasts                                                               */
    /* ------------------------------------------------------------------ */
    window.vvToast = function (message, type = 'info', ms = 3600) {
        let host = $('.vv-toasts');
        if (!host) { host = document.createElement('div'); host.className = 'vv-toasts'; host.setAttribute('role', 'status'); document.body.appendChild(host); }
        const icon = type === 'success' ? 'bx-check-circle' : type === 'error' ? 'bx-error-circle' : 'bx-info-circle';
        const t = document.createElement('div');
        t.className = `vv-toast is-${type}`;
        t.innerHTML = `<i class='bx ${icon}'></i><span></span>`;
        t.querySelector('span').textContent = message;
        host.appendChild(t);
        setTimeout(() => { t.classList.add('is-out'); setTimeout(() => t.remove(), 350); }, ms);
    };

    /* ------------------------------------------------------------------ */
    /* Navigation                                                           */
    /* ------------------------------------------------------------------ */
    function navigation() {
        const crossDocVT = 'CSSViewTransitionRule' in window;
        document.addEventListener('click', e => {
            const a = e.target.closest && e.target.closest('a[href]');
            if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            if (a.target === '_blank' || a.hasAttribute('download')) return;
            const url = new URL(a.href, location.href);
            if (url.origin !== location.origin) return;
            if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
            if (typeof window.saveAppState === 'function') { try { window.saveAppState(); } catch (err) { /* ignore */ } }
            if (crossDocVT || reduced) return;
            e.preventDefault();
            document.documentElement.classList.add('vv-leaving');
            setTimeout(() => { location.href = a.href; }, 220);
        });
        addEventListener('pageshow', () => document.documentElement.classList.remove('vv-leaving'));
        const s = document.createElement('style');
        s.textContent = 'html.vv-leaving body{opacity:0;transform:scale(.99);filter:blur(3px);transition:all .22s cubic-bezier(.22,1,.36,1)}';
        document.head.appendChild(s);
    }

    /* ------------------------------------------------------------------ */
    function init() {
        if (reduced) document.documentElement.classList.add('vv-reduced');
        background();
        intro();
        chrome();
        setupReveal();
        splitText();
        pointerFX();
        ripples();
        counters();
        navigation();
    }

    window.vvRefresh = function () { splitText(); counters(); $$('[data-reveal]').forEach(reveal); };

    // Runs from the end of <body>: start immediately so motion and reveals don't
    // wait on the Firebase SDK download.
    if (document.body) init();
    else document.addEventListener('DOMContentLoaded', init);
})();
