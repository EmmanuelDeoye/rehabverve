// router.js — RehabVerve as a single-page app.
// Every screen is a fragment in pages/ that loads into <main id="main"> of index.html.
// Deep links look like  #/professionals?loc=Ikeja , #/profile?id=… or #/admin/bookings.
// Old addresses (users.html?id=…, admin.html#bookings) still work: the old files redirect here,
// and links to them inside the app are caught below.
(function () {
    'use strict';
    const RV = window.RV;
    const main = document.getElementById('main');

    // name → fragment, nav id, shared libraries, page script, Firebase extras
    const ROUTES = {
        '': { file: 'home', page: 'home', libs: ['cards'], js: 'home', title: 'RehabVerve — Rehabilitation care across Africa' },
        professionals: { page: 'professionals', libs: ['cards'], js: 'directory', title: 'Find rehab professionals' },
        centers: { page: 'centers', libs: ['cards'], js: 'directory', title: 'Rehab centers and mobile rehab' },
        profile: { page: 'profile', libs: ['cards', 'listing-form', 'booking'], js: 'profile', sdk: ['storage'], title: 'Profile' },
        teletherapy: { page: 'teletherapy', libs: ['booking'], js: 'tele', title: 'Teletherapy' },
        classes: { page: 'classes', libs: ['cards', 'booking'], js: 'classes', title: 'Classes for children' },
        class: { page: 'classes', js: 'classroom', sdk: ['storage'], title: 'Class' },
        updates: { page: 'news', libs: ['cards'], js: 'news', title: 'Rehab updates' },
        article: { page: 'news', libs: ['cards'], js: 'article', title: 'Rehab update' },
        join: { page: 'register', libs: ['listing-form'], js: 'register', sdk: ['storage'], title: 'Join RehabVerve' },
        settings: { page: 'settings', js: 'settings', sdk: ['storage'], title: 'My account' },
        assessment: { page: 'assessment', js: 'assessment', sdk: ['functions'], title: 'AI assessment' },
        signin: { page: 'account', js: 'signin', title: 'Sign in' },
        'forgot-password': { page: 'account', js: 'forgot', title: 'Reset your password' },
        intake: { page: 'teletherapy', js: 'intake', title: 'Teletherapy intake' },
        privacy: { page: 'legal', title: 'Privacy Policy' },
        terms: { page: 'legal', title: 'Terms of Service' },
        admin: { page: 'admin', libs: ['cards', 'listing-form'], js: 'admin', sdk: ['storage'], footer: false, sticky: true, title: 'Admin console' },
        404: { page: '404', title: 'Page not found' }
    };
    // Old page files → routes
    const LEGACY = {
        index: '', professionals: 'professionals', centers: 'centers', users: 'profile', teletherapy: 'teletherapy',
        classes: 'classes', class: 'class', blogs: 'updates', fullgist: 'article', registration: 'join', settings: 'settings',
        assessment: 'assessment', account: 'signin', 'forgot-password': 'forgot-password', form: 'intake', privacy: 'privacy',
        terms: 'terms', admin: 'admin', 404: '404'
    };
    const LEGACY_RE = /^(?:\.\/)?([a-z0-9-]+)\.html(\?[^#\s"'<>]*)?(?:#([\w-]*))?$/i;

    /* ---------- addresses ---------- */
    // Any internal address (route or old page link) → "#/route/sub?query", or '' when it isn't one.
    RV.safeRoute = value => {
        const s = String(value == null ? '' : value).trim();
        if (/^#\/[\w\-/]*(\?[^\s"'<>#]*)?$/.test(s)) return s;
        const m = s.match(LEGACY_RE);
        if (!m || !(m[1].toLowerCase() in LEGACY)) return '';
        const name = LEGACY[m[1].toLowerCase()];
        return '#/' + name + (m[3] && name ? '/' + m[3] : '') + (m[2] && m[2].length > 1 ? m[2] : '');
    };

    function parse(hash) {
        const raw = /^#\//.test(hash || '') ? hash.slice(2) : '';
        const q = raw.indexOf('?');
        const path = (q < 0 ? raw : raw.slice(0, q)).split('/').filter(Boolean);
        let name = path[0] || '';
        try { name = decodeURIComponent(name); } catch (e) { /* keep as is */ }
        if (!Object.prototype.hasOwnProperty.call(ROUTES, name)) name = '404';
        return { name, sub: path[1] || '', params: new URLSearchParams(q < 0 ? '' : raw.slice(q + 1)), key: '#/' + raw };
    }
    const href = (name, sub, params) => {
        const qs = params.toString();
        return '#/' + name + (sub ? '/' + sub : '') + (qs ? '?' + qs : '');
    };

    // Navigate inside the app. `target` is a route ("#/classes") or an old page link ("classes.html").
    RV.go = (target, { replace = false } = {}) => {
        const to = RV.safeRoute(target);
        if (!to) { if (/^https?:/i.test(String(target))) location.href = target; return; }
        if (replace) history.replaceState(null, '', to); else history.pushState(null, '', to);
        render();
    };
    // Rewrite the current address's query (filters) without reloading the screen.
    RV.setQuery = params => {
        if (!current) return;
        const p = new URLSearchParams(params);
        const to = href(current.name, current.sub, p);
        history.replaceState(history.state, '', to);
        current.key = to;
        current.params = p;
        RV.params = new URLSearchParams(p);
    };

    /* ---------- loading fragments and scripts ---------- */
    const cache = new Map();
    const getText = url => {
        if (!cache.has(url)) {
            cache.set(url, fetch(url, { credentials: 'same-origin' }).then(r => {
                if (!r.ok) throw new Error(`${url}: ${r.status}`);
                return r.text();
            }).catch(err => { cache.delete(url); throw err; }));
        }
        return cache.get(url);
    };
    const fragmentUrl = name => `pages/${(ROUTES[name].file || name)}.html`;
    const scriptUrl = name => `assets/js/${name}.js`;

    // Runs a script synchronously so we know exactly when its top-level code has finished.
    function execute(name, code) {
        const s = document.createElement('script');
        s.textContent = `${code}\n//# sourceURL=${location.origin}/${scriptUrl(name)}`;
        document.body.appendChild(s);
        s.remove();
    }
    const libsDone = new Set();
    async function loadLibs(names) {
        const codes = await Promise.all(names.map(n => (libsDone.has(n) ? null : getText(scriptUrl(n)))));
        names.forEach((n, i) => { if (!libsDone.has(n) && codes[i] != null) { libsDone.add(n); execute(n, codes[i]); } });
    }

    /* ---------- page lifecycle ---------- */
    // While a screen is open, listeners it adds to document/window, its intervals and its
    // RV.onAuth callbacks are recorded here and removed when the visitor leaves the screen.
    // Listeners the Firebase SDK adds while a screen is open (for example when someone signs in)
    // belong to the SDK, not the screen, so they are left alone (checked from the call stack).
    let scope = null;
    const keep = fn => {
        if (!scope) return;
        if (/\/firebasejs\//.test(new Error().stack || '')) return;
        scope.push(fn);
    };
    [document, window].forEach(target => {
        const add = target.addEventListener;
        target.addEventListener = function (type, fn, opts) {
            add.call(this, type, fn, opts);
            keep(() => this.removeEventListener(type, fn, opts));
        };
    });
    const nativeInterval = window.setInterval;
    window.setInterval = function () {
        const id = nativeInterval.apply(window, arguments);
        keep(() => clearInterval(id));
        return id;
    };
    RV._track = keep; // used by RV.onAuth

    // Page scripts get a `$` that, once the visitor has left, only looks inside the screen they
    // were written for — so late answers from the server never land in the next screen.
    const global$ = RV.$, global$$ = RV.$$;
    function scoped(view, isLive) {
        return {
            $: (sel, root) => (root ? root.querySelector(sel) : isLive() ? document.querySelector(sel) : view.querySelector(sel)),
            $$: (sel, root) => Array.from((root || (isLive() ? document : view)).querySelectorAll(sel))
        };
    }

    function leave() {
        if (current) positions[current.id] = window.scrollY;
        const fns = scope || [];
        scope = null;
        fns.reverse().forEach(fn => { try { fn(); } catch (e) { /* already gone */ } });
        document.querySelectorAll('dialog[open]').forEach(d => d.close());
        if (RV.closeDrawer) RV.closeDrawer();
    }

    /* ---------- rendering ---------- */
    let current = null, gen = 0, entry = 0;
    const positions = {};
    history.scrollRestoration = 'manual';

    function setMeta(cfg) {
        document.title = cfg.title.includes('RehabVerve') ? cfg.title : `${cfg.title} — RehabVerve`;
    }

    async function render() {
        // A plain anchor (#reviews) is a spot on the current screen, not a new screen
        if (current && location.hash && !location.hash.startsWith('#/')) {
            const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
            history.replaceState(history.state, '', current.key);
            if (el) el.scrollIntoView({ block: 'start' });
            return;
        }
        const r = parse(location.hash);
        if (current && r.key === current.key) return;
        const cfg = ROUTES[r.name];

        // Sub-sections of the admin console switch without reloading the console
        if (current && cfg.sticky && current.name === r.name) {
            Object.assign(current, { sub: r.sub, params: r.params, key: r.key });
            RV.route = current;
            RV.params = r.params;
            document.dispatchEvent(new CustomEvent('rv:subroute', { detail: r.sub }));
            return;
        }

        const my = ++gen;
        leave();
        if (!history.state || history.state.rv == null) history.replaceState({ rv: ++entry + Date.now() }, '', location.href);
        const id = history.state.rv;
        const restoreY = positions[id];
        current = { ...r, id };
        RV.route = current;
        RV.params = new URLSearchParams(r.params);
        setMeta(cfg);
        if (RV.markNav) RV.markNav(cfg.page, cfg.footer !== false);
        document.body.dataset.route = r.name || 'home';
        document.body.classList.add('is-loading');

        let html;
        try {
            [html] = await Promise.all([getText(fragmentUrl(r.name)), cfg.js ? getText(scriptUrl(cfg.js)) : null]);
        } catch (err) {
            if (my !== gen) return;
            document.body.classList.remove('is-loading');
            main.innerHTML = `<div class="view section"><div class="container narrow"><div class="empty"><i class='bx bx-wifi-off'></i><h2>You seem to be offline</h2><p>Check your connection and try again.</p><button class="btn btn-primary" type="button" data-retry>Try again</button></div></div></div>`;
            main.querySelector('[data-retry]').addEventListener('click', () => { current = null; render(); });
            return;
        }
        if (my !== gen) return;

        main.innerHTML = html;
        const view = main.firstElementChild || main;
        window.scrollTo(0, restoreY || 0);
        if (RV.renderAds) RV.renderAds();

        // Scripts need Firebase (and sometimes Storage / Functions) before they run
        const fb = await RV.ready;
        await Promise.all([loadLibs(cfg.libs || []), fb && RV.loadSdk ? RV.loadSdk(cfg.sdk || []) : null]).catch(err => console.error(err));
        if (my !== gen) return;
        document.body.classList.remove('is-loading');
        if (RV._countView) RV._countView(cfg.page);
        if (cfg.js) {
            scope = [];
            const sc = scoped(view, () => my === gen);
            RV.$ = sc.$; RV.$$ = sc.$$;
            try { execute(cfg.js, await getText(scriptUrl(cfg.js))); } finally { RV.$ = global$; RV.$$ = global$$; }
        }
        if (restoreY) setTimeout(() => { if (my === gen) window.scrollTo(0, restoreY); }, 350);
        document.dispatchEvent(new CustomEvent('rv:route', { detail: current }));
    }

    /* ---------- links, forms and history ---------- */
    document.addEventListener('click', e => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = e.target.closest('a[href]');
        if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
        const raw = a.getAttribute('href');
        if (raw.startsWith('#/')) {
            // Same address again: still close the menu and go back to the top
            if (raw === location.hash) { e.preventDefault(); if (RV.closeDrawer) RV.closeDrawer(); window.scrollTo(0, 0); }
            return;
        }
        if (raw.startsWith('#')) {
            // In-screen anchor such as #main or #reviews
            e.preventDefault();
            const el = raw.length > 1 && document.getElementById(raw.slice(1));
            if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); if (el.tabIndex < 0 && !/^(a|button|input|select|textarea)$/i.test(el.tagName)) el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
            return;
        }
        const to = RV.safeRoute(raw);
        if (to) { e.preventDefault(); RV.go(to); }
    });
    // Forms that search inside the app (e.g. the home search) open the matching screen
    document.addEventListener('submit', e => {
        const form = e.target;
        const action = RV.safeRoute(form.getAttribute('action'));
        if (!action || (form.method || 'get').toLowerCase() !== 'get') return;
        e.preventDefault();
        const p = new URLSearchParams();
        new FormData(form).forEach((v, k) => { if (typeof v === 'string' && v.trim()) p.append(k, v.trim()); });
        const qs = p.toString();
        RV.go(action + (qs ? (action.includes('?') ? '&' : '?') + qs : ''));
    });
    window.addEventListener('popstate', render);
    window.addEventListener('hashchange', render);

    // Fetch the main screens in the background so the tab bar feels instant
    const warm = () => ['', 'professionals', 'teletherapy', 'classes', 'settings', 'centers', 'updates'].forEach(n => {
        getText(fragmentUrl(n)).catch(() => {});
        if (ROUTES[n].js) getText(scriptUrl(ROUTES[n].js)).catch(() => {});
        (ROUTES[n].libs || []).forEach(l => getText(scriptUrl(l)).catch(() => {}));
    });

    RV.routes = ROUTES;
    render();
    RV.ready.then(() => (window.requestIdleCallback || setTimeout)(warm, { timeout: 4000 }));
})();
