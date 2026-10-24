// app.js — the shared RehabVerve shell and helpers.
// Header, drawer, tab bar, footer, sign-in dialog, theme switch, announcements,
// house ads, page-view counts, toasts and safe-rendering helpers.
(function () {
    'use strict';
    const RV = window.RV = window.RV || {};
    const D = RV.data;
    // Firebase arrives after the shell is drawn: firebase-init.js calls RV._fbReady().
    let fb = null;
    let fbResolve;
    RV.ready = new Promise(resolve => { fbResolve = resolve; });

    /* ================================================================== */
    /* Small helpers                                                       */
    /* ================================================================== */
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    RV.$ = $;
    RV.$$ = $$;

    const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    RV.esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ESC[c]);

    // Only web links, local pages and local assets — never javascript: or data: URLs.
    RV.safeUrl = (value, fallback = '') => {
        const s = String(value == null ? '' : value).trim();
        if (/^https?:\/\/[^\s"'<>]+$/i.test(s)) return s;
        if (/^(mailto|tel):[^\s"'<>]+$/i.test(s)) return s;
        if (/^(\.\/)?(assets\/|[a-z0-9_-]+\.html)[^\s"'<>]*$/i.test(s)) return s;
        if (/^#[\w-]*$/.test(s)) return s;
        return fallback;
    };
    RV.img = (value, fallback = 'assets/img/profile.png') => {
        const u = RV.safeUrl(value);
        return /^(https:|assets\/|\.\/assets\/)/i.test(u) ? u : fallback;
    };

    RV.params = new URLSearchParams(location.search);
    RV.debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
    RV.lower = v => String(v == null ? '' : v).toLowerCase();
    RV.store = {
        get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
        set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
    };
    RV.list = obj => Object.entries(obj || {}).filter(([, v]) => v && typeof v === 'object').map(([id, v]) => ({ ...v, id }));
    RV.ts = v => { const n = Number(v); return n > 0 ? n : (v ? Date.parse(v) || 0 : 0); };
    RV.date = (v, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
        const t = RV.ts(v);
        return t ? new Date(t).toLocaleDateString('en-GB', opts) : '';
    };
    RV.dateTime = v => {
        const t = RV.ts(v);
        return t ? new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    };
    RV.today = () => new Date().toISOString().slice(0, 10);
    RV.digits = v => String(v || '').replace(/[^\d]/g, '');

    RV.money = (amount, currency = 'NGN') => {
        const n = Number(amount);
        if (!isFinite(n) || n <= 0) return '';
        const sym = D.CURRENCIES[currency] || (currency + ' ');
        return sym + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    };
    // "₦10,000 – ₦25,000 / session" for any listing with priceMin / priceMax
    RV.priceRange = p => {
        if (!p) return '';
        const cur = p.currency || 'NGN';
        const lo = RV.money(p.priceMin, cur), hi = RV.money(p.priceMax, cur);
        const unit = D.PRICE_UNITS[p.priceUnit] ? ' / ' + D.PRICE_UNITS[p.priceUnit] : '';
        if (lo && hi && Number(p.priceMax) > Number(p.priceMin)) return `${lo} – ${hi}${unit}`;
        if (lo) return `From ${lo}${unit}`;
        if (hi) return `Up to ${hi}${unit}`;
        return '';
    };
    RV.coverageText = p => {
        const c = (p && p.coverage) || {};
        const parts = [c.areas, c.states].filter(Boolean).join(' · ');
        if (c.nationwide) return parts ? `${parts} · nationwide online` : 'Nationwide (online)';
        return parts;
    };
    RV.place = p => [p && p.city, p && p.state, p && p.country].filter(Boolean).join(', ') || (p && (p.location || p.address)) || '';
    RV.waLink = (number, text) => {
        const n = RV.digits(number);
        return n ? `https://wa.me/${n}${text ? '?text=' + encodeURIComponent(text) : ''}` : '';
    };
    RV.stars = n => {
        const v = Math.round(Number(n) || 0);
        return '★★★★★'.slice(0, v) + '☆☆☆☆☆'.slice(0, 5 - v);
    };
    RV.optionList = (items, selected) => items.map(i => {
        const value = typeof i === 'string' ? i : i.value;
        const label = typeof i === 'string' ? i : (i.label || i.value);
        return `<option value="${RV.esc(value)}"${String(selected) === String(value) ? ' selected' : ''}>${RV.esc(label)}</option>`;
    }).join('');

    /* ---------- safe HTML ---------- */
    const PROFILES = {
        article: {
            tags: 'p br strong b em i u s h2 h3 h4 ul ol li blockquote a img figure figcaption hr span div table thead tbody tr td th code pre small sup sub',
            attrs: 'href src alt title colspan rowspan'
        },
        form: {
            tags: 'h2 h3 h4 p br strong em ul ol li div span small label input textarea',
            attrs: 'type name value rows min max step placeholder class',
            classes: 'q q-text q-options intro privacy'
        },
        report: {
            tags: 'h3 h4 p br strong em ul ol li a span',
            attrs: 'href class',
            classes: 'referral privacy'
        }
    };
    const DROP = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'template', 'noscript', 'link', 'meta', 'base', 'frame', 'frameset', 'button', 'select', 'option', 'form']);

    RV.sanitize = (html, profileName = 'article') => {
        const prof = PROFILES[profileName];
        const tags = new Set(prof.tags.split(' '));
        const attrs = new Set(prof.attrs.split(' '));
        const classes = new Set((prof.classes || '').split(' ').filter(Boolean));
        const doc = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html');
        const out = document.createElement('div');
        (function walk(src, dest) {
            src.childNodes.forEach(node => {
                if (node.nodeType === 3) { dest.appendChild(document.createTextNode(node.textContent)); return; }
                if (node.nodeType !== 1) return;
                const tag = node.tagName.toLowerCase();
                if (DROP.has(tag)) return;
                if (!tags.has(tag)) { walk(node, dest); return; }
                const el = document.createElement(tag);
                Array.from(node.attributes).forEach(({ name, value }) => {
                    const n = name.toLowerCase();
                    if (!attrs.has(n)) return;
                    if (n === 'href' || n === 'src') {
                        const u = RV.safeUrl(value);
                        if (u && !(n === 'src' && /^(mailto|tel):/i.test(u))) el.setAttribute(n, u);
                    } else if (n === 'class') {
                        const keep = value.split(/\s+/).filter(c => classes.has(c));
                        if (keep.length) el.setAttribute('class', keep.join(' '));
                    } else {
                        el.setAttribute(n, value.slice(0, 300));
                    }
                });
                if (tag === 'a' && /^https?:/i.test(el.getAttribute('href') || '')) {
                    el.setAttribute('target', '_blank');
                    el.setAttribute('rel', 'noopener noreferrer nofollow');
                }
                if (tag === 'img') el.setAttribute('loading', 'lazy');
                if (tag === 'input' && !['radio', 'checkbox', 'text', 'number', 'range'].includes((el.getAttribute('type') || 'text').toLowerCase())) {
                    el.setAttribute('type', 'text');
                }
                walk(node, el);
                dest.appendChild(el);
            });
        })(doc.body, out);
        return out.innerHTML;
    };

    // Plain text with light formatting (**bold**, *italic*, >>quote<<, links) → safe HTML.
    RV.formatText = text => {
        const safe = RV.esc(String(text || '').replace(/\r/g, '')).trim();
        if (!safe) return '';
        return safe.split(/\n{2,}/).map(block => {
            let b = block
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
                .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" target="_blank" rel="noopener noreferrer nofollow">$1</a>')
                .replace(/\n/g, '<br>');
            if (/^&gt;&gt;([\s\S]*)&lt;&lt;$/.test(b)) return `<blockquote>${b.slice(8, -8)}</blockquote>`;
            if (/^#{2,3}\s/.test(b)) return `<h3>${b.replace(/^#{2,3}\s/, '')}</h3>`;
            return `<p>${b}</p>`;
        }).join('');
    };
    // Rich content stored either as HTML or as plain text.
    RV.richText = content => (/<\/?(p|h[1-6]|ul|ol|li|br|strong|em|a|img|blockquote|div)\b/i.test(content || '')
        ? RV.sanitize(content, 'article')
        : RV.formatText(content));

    /* ---------- toasts & dialogs ---------- */
    RV.toast = (message, type = 'info', ms = 3800) => {
        let host = $('.toasts');
        if (!host) {
            host = document.createElement('div');
            host.className = 'toasts';
            host.setAttribute('role', 'status');
            host.setAttribute('aria-live', 'polite');
            document.body.appendChild(host);
        }
        const icon = type === 'success' ? 'bx-check-circle' : type === 'error' ? 'bx-error-circle' : 'bx-info-circle';
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.innerHTML = `<i class='bx ${icon}'></i><span></span>`;
        t.lastChild.textContent = message;
        host.appendChild(t);
        setTimeout(() => t.remove(), ms);
    };

    // Opens a <dialog>. `body` is an HTML string (already escaped by the caller) or a node.
    RV.dialog = ({ title, body, wide = false, onClose } = {}) => {
        const dlg = document.createElement('dialog');
        dlg.className = 'modal' + (wide ? ' wide' : '');
        dlg.innerHTML = `<div class="modal-head"><h3></h3><button type="button" class="modal-close" aria-label="Close"><i class='bx bx-x'></i></button></div><div class="modal-body"></div>`;
        dlg.querySelector('h3').textContent = title || '';
        const bodyEl = dlg.querySelector('.modal-body');
        if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
        dlg.querySelector('.modal-close').addEventListener('click', () => dlg.close());
        dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
        dlg.addEventListener('close', () => { if (onClose) onClose(); dlg.remove(); });
        document.body.appendChild(dlg);
        dlg.showModal();
        return dlg;
    };

    RV.confirm = (message, { ok = 'Confirm', danger = false } = {}) => new Promise(resolve => {
        let answer = false;
        const dlg = RV.dialog({
            title: 'Please confirm',
            body: `<p>${RV.esc(message)}</p><div class="form-actions"><button type="button" class="btn" data-no>Cancel</button><button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes>${RV.esc(ok)}</button></div>`,
            onClose: () => resolve(answer)
        });
        dlg.querySelector('[data-no]').onclick = () => dlg.close();
        dlg.querySelector('[data-yes]').onclick = () => { answer = true; dlg.close(); };
    });

    RV.busy = (btn, on, label) => {
        if (!btn) return;
        if (on) {
            btn.dataset.label = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> ${RV.esc(label || 'Please wait…')}`;
        } else {
            btn.disabled = false;
            if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
        }
    };

    RV.formValues = form => {
        const out = {};
        Array.from(form.elements).forEach(el => {
            if (!el.name || el.disabled) return;
            if (el.type === 'checkbox') {
                if (form.querySelectorAll(`[name="${CSS.escape(el.name)}"]`).length > 1) {
                    out[el.name] = out[el.name] || [];
                    if (el.checked) out[el.name].push(el.value);
                } else out[el.name] = el.checked;
            } else if (el.type === 'radio') {
                if (el.checked) out[el.name] = el.value;
            } else if (el.type !== 'file' && el.type !== 'submit' && el.type !== 'button') {
                out[el.name] = el.value.trim();
            }
        });
        return out;
    };

    RV.errorMessage = err => {
        const code = (err && err.code) || '';
        const map = {
            'auth/invalid-email': 'That email address is not valid.',
            'auth/user-not-found': 'No account uses that email address.',
            'auth/wrong-password': 'The password is incorrect.',
            'auth/invalid-credential': 'The email or password is incorrect.',
            'auth/invalid-login-credentials': 'The email or password is incorrect.',
            'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
            'auth/weak-password': 'Choose a password with at least 6 characters.',
            'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
            'auth/network-request-failed': 'You seem to be offline. Check your connection and try again.',
            'auth/requires-recent-login': 'For your security, please sign in again and retry.',
            PERMISSION_DENIED: 'You do not have permission to do that.',
            'storage/unauthorized': 'That file type or size is not allowed.'
        };
        if (map[code]) return map[code];
        if (/permission_denied/i.test((err && err.message) || '')) return map.PERMISSION_DENIED;
        return (err && err.message) || 'Something went wrong. Please try again.';
    };

    // Upload a file to Firebase Storage and return its download URL.
    RV.upload = (path, file, onProgress) => new Promise((resolve, reject) => {
        if (!fb || !fb.storage) { reject(new Error('File uploads are not available on this page.')); return; }
        const task = fb.storage.ref(path).put(file, { contentType: file.type });
        task.on('state_changed',
            s => onProgress && onProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
            reject,
            () => task.snapshot.ref.getDownloadURL().then(resolve, reject));
    });
    RV.fileName = file => `${Date.now()}_${String(file.name || 'file').replace(/[^\w.-]+/g, '_').slice(-80)}`;
    RV.checkFile = (file, { maxMb = 5, types = /^image\// } = {}) => {
        if (!file) return null;
        if (file.size > maxMb * 1024 * 1024) return `Files must be smaller than ${maxMb} MB.`;
        if (!types.test(file.type)) return 'That file type is not supported.';
        return null;
    };

    /* ================================================================== */
    /* Site config (admin-editable contacts and plans)                     */
    /* ================================================================== */
    let configPromise;
    RV.config = () => {
        if (configPromise) return configPromise;
        const cached = (() => { try { return JSON.parse(sessionStorage.getItem('rv-config') || 'null'); } catch (e) { return null; } })();
        const merge = c => ({ ...D.DEFAULT_CONFIG, ...(c || {}), social: { ...D.DEFAULT_CONFIG.social, ...((c && c.social) || {}) }, plans: (c && Array.isArray(c.plans) && c.plans.length) ? c.plans : D.DEFAULT_CONFIG.plans });
        if (cached && Date.now() - cached.t < 600000) { configPromise = Promise.resolve(merge(cached.c)); return configPromise; }
        configPromise = RV.ready.then(f => (f ? f.db.ref('siteConfig').once('value') : null))
            .then(s => {
                if (!s) return merge(null);
                const c = s.val();
                try { sessionStorage.setItem('rv-config', JSON.stringify({ t: Date.now(), c })); } catch (e) { /* ignore */ }
                return merge(c);
            })
            .catch(() => merge(null));
        return configPromise;
    };

    /* ================================================================== */
    /* Theme                                                                */
    /* ================================================================== */
    RV.theme = {
        get: () => { try { return localStorage.getItem('rv-theme') || 'system'; } catch (e) { return 'system'; } },
        set(choice) {
            try { localStorage.setItem('rv-theme', choice); } catch (e) { /* ignore */ }
            const dark = choice === 'dark' || (choice === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
            document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
            const meta = $('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', dark ? '#0b1120' : '#ffffff');
            $$('[data-theme-toggle] .bx').forEach(i => { i.className = 'bx ' + (dark ? 'bx-sun' : 'bx-moon'); });
            document.dispatchEvent(new CustomEvent('rv:theme', { detail: choice }));
        },
        toggle() { RV.theme.set(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); }
    };
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (RV.theme.get() === 'system') RV.theme.set('system'); });

    /* ================================================================== */
    /* Auth state                                                           */
    /* ================================================================== */
    const state = { ready: false, user: null, profile: null, isAdmin: false };
    RV.state = state;
    const listeners = [];
    RV.onAuth = cb => { listeners.push(cb); if (state.ready) cb(state); };
    const emit = () => listeners.forEach(cb => { try { cb(state); } catch (e) { console.error(e); } });

    let pendingAuth = [];
    RV.requireAuth = (reason) => {
        if (state.user) return Promise.resolve(state.user);
        return new Promise((resolve, reject) => {
            pendingAuth.push({ resolve, reject });
            RV.openAuth('signin', reason);
        });
    };

    async function loadAccount(user) {
        const db = fb.db;
        const [profileSnap, adminSnap] = await Promise.all([
            db.ref('userdata/' + user.uid).once('value').catch(() => null),
            db.ref('admins/' + user.uid).once('value').catch(() => null)
        ]);
        let profile = profileSnap && profileSnap.val();
        if (!profile) {
            profile = { name: user.displayName || (user.email || '').split('@')[0], email: user.email || '', role: 'regular', createdAt: Date.now() };
            db.ref('userdata/' + user.uid).set(profile).catch(err => console.warn('Could not create profile', err));
        }
        state.profile = profile;
        state.isAdmin = !!(adminSnap && adminSnap.val() === true);
    }

    function startPresence(uid) {
        const ref = fb.db.ref('status/' + uid);
        fb.db.ref('.info/connected').on('value', snap => {
            if (snap.val() !== true || !state.user || state.user.uid !== uid) return;
            ref.onDisconnect().set({ state: 'offline', last_changed: fb.TIMESTAMP })
                .then(() => ref.set({ state: 'online', last_changed: fb.TIMESTAMP }))
                .catch(() => { /* rules or offline */ });
        });
    }

    function watchAuth() {
        fb.auth.onAuthStateChanged(async user => {
            state.user = user;
            state.profile = null;
            state.isAdmin = false;
            if (user) {
                await loadAccount(user);
                startPresence(user.uid);
                pendingAuth.forEach(p => p.resolve(user));
                pendingAuth = [];
            }
            state.ready = true;
            renderAccount();
            emit();
        });
    }

    RV.signOut = async () => {
        if (state.user) {
            try { await fb.db.ref('status/' + state.user.uid).set({ state: 'offline', last_changed: fb.TIMESTAMP }); } catch (e) { /* ignore */ }
        }
        await fb.auth.signOut();
        RV.toast('You are signed out.');
    };

    /* ================================================================== */
    /* Shell markup                                                         */
    /* ================================================================== */
    const LOGO = `<svg viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="rv-logo-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00BCD4"/><stop offset="1" stop-color="#28a745"/></linearGradient></defs><rect x="2" y="2" width="36" height="36" rx="11" fill="url(#rv-logo-g)"/><path d="M8 21h5.5l3-7.5 5 15 4-10h6.5" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    RV.logo = LOGO;

    const NAV = [
        { id: 'home', href: 'index.html', icon: 'bx-home-alt-2', label: 'Home' },
        { id: 'professionals', href: 'professionals.html', icon: 'bx-search-alt', label: 'Find care' },
        { id: 'teletherapy', href: 'teletherapy.html', icon: 'bx-video', label: 'Teletherapy' },
        { id: 'classes', href: 'classes.html', icon: 'bx-book-open', label: 'Kids classes' },
        { id: 'centers', href: 'centers.html', icon: 'bx-buildings', label: 'Centers' },
        { id: 'news', href: 'blogs.html', icon: 'bx-news', label: 'Updates' }
    ];
    const page = document.body.dataset.page || '';
    const current = id => (id === page ? ' aria-current="page"' : '');

    function headerHTML() {
        return `
        <a class="skip-link" href="#main">Skip to content</a>
        <div class="announce" id="rv-announce" hidden></div>
        <header class="site-header">
            <div class="container">
                <a href="index.html" class="brand" aria-label="RehabVerve home">${LOGO}<span>Rehab<b>Verve</b></span></a>
                <nav class="main-nav" aria-label="Main">${NAV.map(n => `<a href="${n.href}"${current(n.id)}>${n.label}</a>`).join('')}</nav>
                <div class="header-actions">
                    <a href="assessment.html" class="btn btn-sm btn-ghost hide-md"><i class='bx bx-bot'></i> AI assessment</a>
                    <button type="button" class="btn btn-icon btn-sm btn-ghost" data-theme-toggle aria-label="Switch light or dark theme"><i class='bx bx-moon'></i></button>
                    <div id="rv-account" class="row" style="gap:8px"></div>
                    <button type="button" class="btn btn-icon btn-sm btn-ghost menu-toggle" id="rv-menu" aria-label="Open menu" aria-controls="rv-drawer" aria-expanded="false"><i class='bx bx-menu'></i></button>
                </div>
            </div>
        </header>
        <div class="drawer-backdrop" id="rv-backdrop" hidden></div>
        <aside class="drawer" id="rv-drawer" aria-label="Menu">
            <div class="drawer-head">
                <span class="brand">${LOGO}<span>Rehab<b>Verve</b></span></span>
                <button type="button" class="modal-close" id="rv-drawer-close" aria-label="Close menu"><i class='bx bx-x'></i></button>
            </div>
            <nav>${NAV.map(n => `<a href="${n.href}"${current(n.id)}><i class='bx ${n.icon}'></i>${n.label}</a>`).join('')}
                <a href="assessment.html"${current('assessment')}><i class='bx bx-bot'></i>AI assessment</a>
                <a href="registration.html"${current('register')}><i class='bx bx-user-plus'></i>Join as a professional</a>
            </nav>
            <div class="drawer-section" id="rv-drawer-account"></div>
        </aside>`;
    }

    function tabbarHTML() {
        const tabs = [
            { id: 'home', href: 'index.html', icon: 'bx-home-alt-2', label: 'Home' },
            { id: 'professionals', href: 'professionals.html', icon: 'bx-search-alt', label: 'Find' },
            { id: 'teletherapy', href: 'teletherapy.html', icon: 'bx-video', label: 'Teletherapy' },
            { id: 'classes', href: 'classes.html', icon: 'bx-book-open', label: 'Classes' },
            { id: 'settings', href: 'settings.html', icon: 'bx-user-circle', label: 'Me' }
        ];
        return `<nav class="tabbar" aria-label="Quick links">${tabs.map(t => `<a href="${t.href}"${current(t.id)}><i class='bx ${t.icon}'></i><span>${t.label}</span></a>`).join('')}</nav>`;
    }

    function footerHTML(cfg) {
        const s = cfg.social || {};
        const social = [['facebook', 'bxl-facebook'], ['instagram', 'bxl-instagram'], ['x', 'bxl-twitter'], ['linkedin', 'bxl-linkedin']]
            .filter(([k]) => RV.safeUrl(s[k]))
            .map(([k, icon]) => `<a href="${RV.esc(RV.safeUrl(s[k]))}" target="_blank" rel="noopener" aria-label="${k}"><i class='bx ${icon}'></i></a>`).join('');
        const wa = RV.waLink(cfg.whatsapp, 'Hello RehabVerve!');
        return `
        <footer class="site-footer">
            <div class="container">
                <div class="footer-grid">
                    <div>
                        <a href="index.html" class="brand">${LOGO}<span>Rehab<b>Verve</b></span></a>
                        <p class="muted mt-1">The rehabilitation network for Africa — therapists, rehab centers, mobile rehab, teletherapy and classes for children, in one place.</p>
                        <div class="socials">${social}${wa ? `<a href="${wa}" target="_blank" rel="noopener" aria-label="WhatsApp"><i class='bx bxl-whatsapp'></i></a>` : ''}</div>
                    </div>
                    <div><h4>Find care</h4><ul>
                        <li><a href="professionals.html">Rehab professionals</a></li>
                        <li><a href="professionals.html?mode=home">Mobile & home visits</a></li>
                        <li><a href="centers.html">Rehab centers</a></li>
                        <li><a href="teletherapy.html">Teletherapy</a></li>
                        <li><a href="classes.html">Classes for children</a></li>
                    </ul></div>
                    <div><h4>RehabVerve</h4><ul>
                        <li><a href="blogs.html">Rehab updates</a></li>
                        <li><a href="assessment.html">AI assessment</a></li>
                        <li><a href="registration.html">Join as a professional or center</a></li>
                        <li><a href="settings.html">My account</a></li>
                    </ul></div>
                    <div><h4>Contact</h4><ul>
                        ${cfg.address ? `<li class="muted">${RV.esc(cfg.address)}</li>` : ''}
                        ${cfg.phone ? `<li><a href="tel:${RV.esc(RV.digits(cfg.phone) ? '+' + RV.digits(cfg.phone) : '')}">${RV.esc(cfg.phone)}</a></li>` : ''}
                        ${cfg.email ? `<li><a href="mailto:${RV.esc(cfg.email)}">${RV.esc(cfg.email)}</a></li>` : ''}
                        ${wa ? `<li><a href="${wa}" target="_blank" rel="noopener">Chat on WhatsApp</a></li>` : ''}
                    </ul></div>
                </div>
                <div class="footer-bottom">
                    <span>© ${new Date().getFullYear()} RehabVerve</span>
                    <nav><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a></nav>
                </div>
            </div>
        </footer>`;
    }

    function authDialogHTML() {
        return `
        <dialog class="modal" id="rv-auth" aria-labelledby="rv-auth-title">
            <div class="modal-head"><h3 id="rv-auth-title">Welcome to RehabVerve</h3><button type="button" class="modal-close" data-close aria-label="Close"><i class='bx bx-x'></i></button></div>
            <div class="modal-body">
                <p class="muted mb-0" id="rv-auth-reason" hidden></p>
                <div class="tabs mt-2" role="tablist">
                    <button type="button" role="tab" aria-selected="true" data-tab="signin">Sign in</button>
                    <button type="button" role="tab" aria-selected="false" data-tab="signup">Create account</button>
                </div>
                <form id="rv-auth-form" class="stack mt-2" novalidate>
                    <div class="form-msg error" id="rv-auth-error" hidden></div>
                    <label class="field" data-only="signup" hidden><span>Full name</span><input name="name" autocomplete="name" maxlength="120"></label>
                    <label class="field"><span>Email address</span><input name="email" type="email" autocomplete="email" required></label>
                    <label class="field"><span>Password</span>
                        <span class="password-wrap"><input name="password" type="password" autocomplete="current-password" minlength="6" required><button type="button" data-peek aria-label="Show password"><i class='bx bx-show'></i></button></span>
                    </label>
                    <p class="hint mb-0" data-only="signup" hidden>By creating an account you agree to our <a href="terms.html" target="_blank">Terms</a> and <a href="privacy.html" target="_blank">Privacy Policy</a>.</p>
                    <button type="submit" class="btn btn-primary btn-block" id="rv-auth-submit">Sign in</button>
                    <p class="center mb-0" data-only="signin"><a href="forgot-password.html">Forgot your password?</a></p>
                </form>
            </div>
        </dialog>`;
    }

    let authMode = 'signin';
    function setAuthMode(mode) {
        authMode = mode;
        const dlg = $('#rv-auth');
        $$('[data-tab]', dlg).forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === mode)));
        $$('[data-only]', dlg).forEach(el => { el.hidden = el.dataset.only !== mode; });
        $('#rv-auth-submit').textContent = mode === 'signin' ? 'Sign in' : 'Create account';
        $('#rv-auth-form [name=password]').autocomplete = mode === 'signin' ? 'current-password' : 'new-password';
        $('#rv-auth-error').hidden = true;
    }

    RV.openAuth = (mode = 'signin', reason = '') => {
        const dlg = $('#rv-auth');
        if (!dlg) return;
        setAuthMode(mode);
        const r = $('#rv-auth-reason');
        r.textContent = reason || '';
        r.hidden = !reason;
        if (!dlg.open) dlg.showModal();
        setTimeout(() => $('#rv-auth-form [name=email]').focus(), 30);
    };

    function wireAuthDialog() {
        const dlg = $('#rv-auth');
        const form = $('#rv-auth-form');
        const err = $('#rv-auth-error');
        dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
        dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
        dlg.addEventListener('close', () => {
            if (!state.user && pendingAuth.length) {
                pendingAuth.forEach(p => p.reject(new Error('Sign-in cancelled')));
                pendingAuth = [];
            }
        });
        $$('[data-tab]', dlg).forEach(b => b.addEventListener('click', () => setAuthMode(b.dataset.tab)));
        $('[data-peek]', dlg).addEventListener('click', e => {
            const input = form.password;
            input.type = input.type === 'password' ? 'text' : 'password';
            e.currentTarget.innerHTML = `<i class='bx ${input.type === 'password' ? 'bx-show' : 'bx-hide'}'></i>`;
        });
        form.addEventListener('submit', async e => {
            e.preventDefault();
            err.hidden = true;
            const { name, email, password } = RV.formValues(form);
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = 'Enter a valid email address.'; err.hidden = false; return; }
            if (password.length < 6) { err.textContent = 'Passwords have at least 6 characters.'; err.hidden = false; return; }
            if (authMode === 'signup' && !name) { err.textContent = 'Please enter your name.'; err.hidden = false; return; }
            const btn = $('#rv-auth-submit');
            RV.busy(btn, true, authMode === 'signin' ? 'Signing in…' : 'Creating account…');
            try {
                if (authMode === 'signin') {
                    await fb.auth.signInWithEmailAndPassword(email, password);
                } else {
                    const cred = await fb.auth.createUserWithEmailAndPassword(email, password);
                    await cred.user.updateProfile({ displayName: name }).catch(() => {});
                    await fb.db.ref('userdata/' + cred.user.uid).set({ name, email, role: 'regular', createdAt: Date.now() });
                }
                form.reset();
                dlg.close();
                RV.toast(authMode === 'signin' ? 'Welcome back!' : 'Your account is ready — welcome to RehabVerve!', 'success');
            } catch (error) {
                err.textContent = RV.errorMessage(error);
                err.hidden = false;
            } finally {
                RV.busy(btn, false);
            }
        });
    }

    function renderAccount() {
        const host = $('#rv-account');
        const drawer = $('#rv-drawer-account');
        if (!host) return;
        const u = state.user;
        if (!u) {
            host.innerHTML = `<button type="button" class="btn btn-primary btn-sm" data-signin>Sign in</button>`;
            drawer.innerHTML = `<button type="button" class="btn btn-primary btn-block" data-signin>Sign in or create account</button>
                <button type="button" class="btn btn-block" data-theme-toggle><i class='bx bx-moon'></i> Light / dark theme</button>
                <button type="button" class="btn btn-block" data-install hidden><i class='bx bx-download'></i> Install the app</button>`;
        } else {
            const p = state.profile || {};
            const name = p.name || u.displayName || u.email;
            const links = [
                ['bx-user', 'My profile', `users.html?id=${encodeURIComponent(u.uid)}`],
                ['bx-calendar-check', 'My bookings', 'settings.html#bookings'],
                ['bx-book-open', 'My classes', 'classes.html#mine'],
                ['bx-cog', 'Settings', 'settings.html']
            ];
            if (state.isAdmin) links.unshift(['bx-shield-quarter', 'Admin console', 'admin.html']);
            const menuLinks = links.map(([i, l, h]) => `<a href="${h}"><i class='bx ${i}'></i>${l}</a>`).join('');
            host.innerHTML = `
                <div class="user-menu">
                    <button type="button" class="avatar-btn" id="rv-user-btn" aria-haspopup="true" aria-expanded="false" aria-label="Account menu">
                        <img class="avatar" src="${RV.esc(RV.img(p.img))}" alt="" onerror="this.src='assets/img/profile.png'">
                    </button>
                    <div class="user-menu-panel" id="rv-user-panel" hidden>
                        <div class="menu-head"><strong>${RV.esc(name)}</strong><small>${RV.esc(u.email || '')}</small></div>
                        ${menuLinks}
                        <button type="button" data-signout><i class='bx bx-log-out'></i>Sign out</button>
                    </div>
                </div>`;
            drawer.innerHTML = `${links.map(([i, l, h]) => `<a class="btn btn-block" href="${h}"><i class='bx ${i}'></i> ${l}</a>`).join('')}
                <button type="button" class="btn btn-block" data-theme-toggle><i class='bx bx-moon'></i> Light / dark theme</button>
                <button type="button" class="btn btn-block" data-install hidden><i class='bx bx-download'></i> Install the app</button>
                <button type="button" class="btn btn-block" data-signout><i class='bx bx-log-out'></i> Sign out</button>`;
            const btn = $('#rv-user-btn'), panel = $('#rv-user-panel');
            btn.addEventListener('click', e => {
                e.stopPropagation();
                panel.hidden = !panel.hidden;
                btn.setAttribute('aria-expanded', String(!panel.hidden));
            });
        }
        RV.theme.set(RV.theme.get());
        updateInstallButtons();
    }

    function wireShell() {
        const drawer = $('#rv-drawer'), backdrop = $('#rv-backdrop'), toggle = $('#rv-menu');
        const open = on => {
            drawer.classList.toggle('open', on);
            backdrop.hidden = !on;
            toggle.setAttribute('aria-expanded', String(on));
            document.body.style.overflow = on ? 'hidden' : '';
        };
        toggle.addEventListener('click', () => open(true));
        backdrop.addEventListener('click', () => open(false));
        $('#rv-drawer-close').addEventListener('click', () => open(false));
        document.addEventListener('keydown', e => { if (e.key === 'Escape') open(false); });
        // Close the account menu when clicking anywhere else
        document.addEventListener('click', e => {
            const panel = $('#rv-user-panel');
            if (panel && !panel.hidden && !e.target.closest('.user-menu')) {
                panel.hidden = true;
                $('#rv-user-btn').setAttribute('aria-expanded', 'false');
            }
        });

        document.addEventListener('click', e => {
            const t = e.target.closest('[data-signin], [data-signout], [data-theme-toggle], [data-install]');
            if (!t) return;
            if (t.matches('[data-signin]')) { open(false); RV.openAuth('signin'); }
            else if (t.matches('[data-signout]')) { open(false); RV.signOut(); }
            else if (t.matches('[data-theme-toggle]')) RV.theme.toggle();
            else if (t.matches('[data-install]')) RV.install();
        });
    }

    /* ================================================================== */
    /* Announcements & house ads                                            */
    /* ================================================================== */
    const live = item => {
        if (!item || item.active === false) return false;
        const now = Date.now();
        const start = RV.ts(item.startAt), end = RV.ts(item.endAt);
        return (!start || start <= now) && (!end || end >= now);
    };

    function loadAnnouncement() {
        fb.db.ref('announcements').once('value').then(snap => {
            const dismissed = RV.store.get('rv-dismissed', []);
            const item = RV.list(snap.val()).filter(live).filter(a => !dismissed.includes(a.id))
                .sort((a, b) => (b.priority || 0) - (a.priority || 0) || RV.ts(b.createdAt) - RV.ts(a.createdAt))[0];
            if (!item) return;
            const bar = $('#rv-announce');
            const link = RV.safeUrl(item.link);
            bar.dataset.type = ['info', 'success', 'warning'].includes(item.type) ? item.type : 'info';
            bar.innerHTML = `<div class="container"><span>${RV.esc(item.text)}</span>${link ? `<a href="${RV.esc(link)}">${RV.esc(item.linkText || 'Learn more')}</a>` : ''}<button type="button" aria-label="Dismiss">×</button></div>`;
            bar.hidden = false;
            bar.querySelector('button').addEventListener('click', () => {
                bar.hidden = true;
                RV.store.set('rv-dismissed', dismissed.concat(item.id).slice(-30));
            });
        }).catch(() => { /* offline */ });
    }

    // Renders admin-managed house ads into every [data-ad-slot="placement"] on the page.
    let adsPromise;
    RV.loadAds = () => {
        if (!adsPromise) {
            adsPromise = RV.ready.then(f => (f ? f.db.ref('ads').once('value').then(s => RV.list(s.val()).filter(live)) : []))
                .catch(() => []);
        }
        return adsPromise;
    };
    RV.adHTML = ad => {
        const link = RV.safeUrl(ad.link);
        const img = RV.img(ad.img, '');
        const inner = `${img ? `<img src="${RV.esc(img)}" alt="" loading="lazy">` : ''}<div><span class="ad-label">Sponsored${ad.advertiser ? ' · ' + RV.esc(ad.advertiser) : ''}</span><h4>${RV.esc(ad.title)}</h4>${ad.body ? `<p>${RV.esc(ad.body)}</p>` : ''}</div>`;
        return link
            ? `<a class="card ad-card clickable${img ? '' : ' no-img'}" href="${RV.esc(link)}" data-ad="${RV.esc(ad.id)}"${/^https?:/i.test(link) ? ' target="_blank" rel="noopener sponsored"' : ''}>${inner}</a>`
            : `<div class="card ad-card${img ? '' : ' no-img'}">${inner}</div>`;
    };
    RV.renderAds = () => {
        const slots = $$('[data-ad-slot]');
        if (!slots.length) return;
        RV.loadAds().then(ads => {
            slots.forEach(slot => {
                const place = slot.dataset.adSlot;
                const pick = ads.filter(a => a.placement === place || a.placement === 'all');
                if (!pick.length) return;
                const ad = pick[Math.floor(Math.random() * pick.length)];
                slot.innerHTML = RV.adHTML(ad);
            });
        });
    };
    document.addEventListener('click', e => {
        const a = e.target.closest('[data-ad]');
        if (a && fb) fb.db.ref(`adStats/${a.dataset.ad}/clicks`).set(fb.increment(1)).catch(() => {});
    });

    // Anonymous daily page-view counters (no personal data).
    function countView() {
        const key = (page || 'other').replace(/[^a-z0-9-]/gi, '').slice(0, 40) || 'other';
        fb.db.ref('analytics/daily/' + RV.today()).update({ views: fb.increment(1), ['pages/' + key]: fb.increment(1) }).catch(() => {});
    }

    /* ================================================================== */
    /* PWA                                                                  */
    /* ================================================================== */
    let installEvent = null;
    function updateInstallButtons() { $$('[data-install]').forEach(b => { b.hidden = !installEvent; }); }
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; updateInstallButtons(); });
    RV.install = () => {
        if (installEvent) { installEvent.prompt(); installEvent = null; updateInstallButtons(); }
        else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) RV.toast('On iPhone: tap Share, then “Add to Home Screen”.', 'info', 6000);
    };
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
        window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    }

    /* ================================================================== */
    /* Boot                                                                 */
    /* ================================================================== */
    document.body.insertAdjacentHTML('afterbegin', headerHTML());
    if (!document.body.hasAttribute('data-no-footer')) {
        document.body.insertAdjacentHTML('beforeend', footerHTML(D.DEFAULT_CONFIG));
        RV.config().then(cfg => { const f = $('.site-footer'); if (f) f.outerHTML = footerHTML(cfg); });
    }
    document.body.insertAdjacentHTML('beforeend', tabbarHTML() + authDialogHTML());
    wireShell();
    wireAuthDialog();
    renderAccount();
    RV.theme.set(RV.theme.get());
    RV.renderAds();

    RV._fbReady = () => {
        fb = RV.fb;
        fbResolve(fb);
        if (!fb) {
            state.ready = true;
            emit();
            RV.toast('We could not reach our servers. Check your connection and refresh.', 'error', 8000);
            return;
        }
        watchAuth();
        loadAnnouncement();
        countView();
    };
})();
