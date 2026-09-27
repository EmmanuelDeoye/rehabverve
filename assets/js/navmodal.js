// navmodal.js — injects the shared app shell (header, drawer, mobile tab bar,
// auth modal, footer) on every page. Must load before auth.js.
(function() {
    'use strict';

    const WHATSAPP = 'https://wa.me/2348132912880';

    // ========== GET CURRENT PAGE ==========
    function getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';

        const pageMap = {
            'index.html': 'home',
            '': 'home',
            'professionals.html': 'professionals',
            'centers.html': 'centers',
            'teletherapy.html': 'teletherapy',
            'form.html': 'teletherapy',
            'blogs.html': 'blogs',
            'fullgist.html': 'blogs',
            'users.html': 'profile',
            'settings.html': 'profile',
            'assessment.html': 'assessment',
            'account.html': 'account',
            'registration.html': 'registration',
            'forgot-password.html': 'forgot-password',
            'terms.html': 'terms',
            'privacy.html': 'privacy'
        };

        return pageMap[page] || 'other';
    }

    function logoSVG() {
        return `<svg viewBox="0 0 40 40" aria-hidden="true">
            <defs><linearGradient id="vv-logo-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#22d3ee"/><stop offset=".55" stop-color="#8b5cf6"/><stop offset="1" stop-color="#34d399"/>
            </linearGradient></defs>
            <rect x="2" y="2" width="36" height="36" rx="11" fill="url(#vv-logo-g)"/>
            <rect x="2.5" y="2.5" width="35" height="35" rx="10.5" fill="none" stroke="rgba(255,255,255,.35)"/>
            <path class="pulse" d="M8 21h5.5l3-7.5 5 15 4-10h6.5" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
    }
    window.vvLogoSVG = logoSVG;

    const NAV = [
        { id: 'home', href: 'index.html', icon: 'bx-home-alt-2', label: 'Home' },
        { id: 'professionals', href: 'professionals.html?category=All', icon: 'bx-group', label: 'Professionals' },
        { id: 'teletherapy', href: 'teletherapy.html', icon: 'bx-video', label: 'Teletherapy' },
        { id: 'centers', href: 'centers.html', icon: 'bx-buildings', label: 'Centers' },
        { id: 'blogs', href: 'blogs.html', icon: 'bx-news', label: 'News' }
    ];

    // ========== HTML TEMPLATES ==========
    function getHeaderHTML() {
        const current = getCurrentPage();
        const links = NAV.map(n => `
            <li class="nav__item"><a href="${n.href}" class="nav__link ${current === n.id ? 'active-link' : ''}" data-nav="${n.id}"><i class='bx ${n.icon}'></i><span>${n.label}</span></a></li>`).join('');

        return `
        <header class="l-header" id="vv-header">
            <nav class="nav vv-nav" aria-label="Main">
                <a href="index.html" class="vv-brand" aria-label="RehabVerve home">
                    <span class="vv-logo">${logoSVG()}</span>
                    <span class="vv-word">Rehab<b>Verve</b></span>
                </a>
                <div class="nav__menu" id="nav-menu">
                    <div class="vv-drawer-head">
                        <span class="vv-brand"><span class="vv-logo">${logoSVG()}</span><span class="vv-word">Rehab<b>Verve</b></span></span>
                        <button class="vv-drawer-close" id="vv-drawer-close" aria-label="Close menu"><i class='bx bx-x'></i></button>
                    </div>
                    <ul class="nav__list">
                        ${links}
                        <li class="nav__item" id="my-profile-nav-item" style="display: none;">
                            <a href="users.html" class="nav__link ${current === 'profile' ? 'active-link' : ''}" data-nav="profile"><i class='bx bx-user-circle'></i><span>My Profile</span></a>
                        </li>
                    </ul>
                    <div class="vv-drawer-extra">
                        <a href="assessment.html" class="vv-btn vv-btn--violet"><i class='bx bx-bot'></i> AI Quick Assessment</a>
                        <a href="registration.html" class="vv-btn"><i class='bx bx-user-plus'></i> Join the Network</a>
                        <div class="vv-drawer-legal">
                            <a href="terms.html">Terms</a><a href="privacy.html">Privacy</a><a href="${WHATSAPP}" target="_blank" rel="noopener">Support</a>
                        </div>
                    </div>
                </div>
                <div class="vv-scrim" id="vv-scrim"></div>
                <div class="vv-actions">
                    <a href="assessment.html" class="vv-btn vv-btn--ghost vv-btn--sm vv-hide-mobile"><i class='bx bx-bot'></i> AI Assessment</a>
                    <div class="auth-buttons">
                        <button id="login-btn" class="vv-btn vv-btn--primary vv-btn--sm" type="button">Sign in</button>
                    </div>
                    <div class="profile-image-nav" id="profile-image-nav" title="My profile">
                        <img src="assets/img/profile.png" alt="My profile" class="nav-profile-img">
                    </div>
                    <button class="nav__toggle" id="nav-toggle" type="button" aria-label="Open menu" aria-controls="nav-menu"><i class='bx bx-menu-alt-right'></i></button>
                </div>
            </nav>
        </header>`;
    }

    function getTabbarHTML() {
        const current = getCurrentPage();
        return `
        <nav class="vv-tabbar" id="vv-tabbar" aria-label="Quick navigation">
            ${NAV.map(n => `
            <a href="${n.href}" class="vv-tab ${n.id === 'teletherapy' ? 'vv-tab--fab' : ''} ${current === n.id ? 'is-active' : ''}" data-nav="${n.id}">
                <i class='bx ${n.icon}'></i><span>${n.id === 'professionals' ? 'Network' : n.label}</span>
            </a>`).join('')}
        </nav>`;
    }

    const authModalHTML = `
        <div id="auth-modal" class="modal" role="dialog" aria-modal="true" aria-labelledby="vv-auth-title">
            <div class="modal-content">
                <span class="modal-close" role="button" aria-label="Close">&times;</span>
                <div class="vv-auth-head">
                    <span class="vv-logo">${logoSVG()}</span>
                    <h3 id="vv-auth-title">Welcome back</h3>
                    <p>Sign in to your RehabVerve network</p>
                </div>
                <div class="auth-tabs">
                    <div class="auth-tab active" data-form="login">Sign in</div>
                    <div class="auth-tab" data-form="register">Create account</div>
                </div>
                <form id="login-form" class="auth-form active">
                    <div class="error-message" id="login-error"></div>
                    <div class="form-group">
                        <input type="email" id="login-email" placeholder="Email address" autocomplete="email" required>
                    </div>
                    <div class="form-group password-group">
                        <input type="password" id="login-password" placeholder="Password" autocomplete="current-password" required>
                        <span class="password-toggle" id="login-password-toggle"><i class='bx bx-hide'></i></span>
                    </div>
                    <div class="forgot-password"><a href="forgot-password.html">Forgot your password?</a></div>
                    <div class="terms-agreement">
                        <label>By signing in, you agree to our <a href="terms.html" target="_blank">Terms</a> and <a href="privacy.html" target="_blank">Privacy Policy</a>.</label>
                    </div>
                    <button type="submit">Sign in</button>
                    <div class="auth-switch">New to RehabVerve? <a href="#" id="show-register">Create an account</a></div>
                </form>
                <form id="register-form" class="auth-form">
                    <div class="error-message" id="register-error"></div>
                    <div class="form-group"><input type="text" id="register-name" placeholder="Full name" autocomplete="name" required></div>
                    <div class="form-group"><input type="email" id="register-email" placeholder="Email address" autocomplete="email" required></div>
                    <div class="form-group password-group">
                        <input type="password" id="register-password" placeholder="Password (min. 6 characters)" autocomplete="new-password" required>
                        <span class="password-toggle" id="register-password-toggle"><i class='bx bx-hide'></i></span>
                    </div>
                    <div class="terms-agreement">
                        <label>By creating an account, you agree to our <a href="terms.html" target="_blank">Terms</a> and <a href="privacy.html" target="_blank">Privacy Policy</a>.</label>
                    </div>
                    <button type="submit">Create account</button>
                    <div class="auth-switch">Already a member? <a href="#" id="show-login">Sign in</a></div>
                    <div id="auth-spinner" class="spinner" style="display: none;"></div>
                </form>
            </div>
        </div>`;

    const footerHTML = `
        <footer class="modern-footer">
            <div class="footer-grid">
                <div class="footer-column">
                    <div class="footer-brand-row">
                        <span class="vv-logo">${logoSVG()}</span>
                        <span class="vv-word">Rehab<b>Verve</b></span>
                    </div>
                    <p>The professional network for rehabilitation — connecting patients, families, therapists and care centers across Nigeria and beyond.</p>
                    <div class="social-links">
                        <a href="#" aria-label="Facebook"><i class='bx bxl-facebook'></i></a>
                        <a href="#" aria-label="X / Twitter"><i class='bx bxl-twitter'></i></a>
                        <a href="#" aria-label="Instagram"><i class='bx bxl-instagram'></i></a>
                        <a href="#" aria-label="LinkedIn"><i class='bx bxl-linkedin'></i></a>
                    </div>
                </div>
                <div class="footer-column">
                    <h4>Explore</h4>
                    <ul>
                        <li><a href="professionals.html?category=All">Professionals</a></li>
                        <li><a href="teletherapy.html">Teletherapy</a></li>
                        <li><a href="centers.html">Centers</a></li>
                        <li><a href="blogs.html">Health News</a></li>
                        <li><a href="assessment.html">AI Assessment</a></li>
                        <li><a href="registration.html">Join the Network</a></li>
                    </ul>
                </div>
                <div class="footer-column">
                    <h4>Contact</h4>
                    <div class="contact-info">
                        <p><i class='bx bx-map'></i> 44, Shonola Street, Ogba, Lagos State</p>
                        <p><i class='bx bx-phone'></i> <a href="tel:+2348132912880">+234 813 291 2880</a></p>
                        <p><i class='bx bx-envelope'></i> <a href="mailto:info@rehabconnect.com">info@rehabconnect.com</a></p>
                    </div>
                </div>
                <div class="footer-column">
                    <h4>Stay in the loop</h4>
                    <p>Care insights, new specialists and teletherapy openings — monthly.</p>
                    <form class="newsletter-form" novalidate>
                        <div class="vv-nl-row">
                            <input type="email" placeholder="you@email.com" aria-label="Email address" required>
                            <button type="submit">Subscribe</button>
                        </div>
                    </form>
                </div>
            </div>
            <div class="vv-footer-mega" aria-hidden="true">REHABVERVE</div>
            <div class="footer-bottom">
                <p>&copy; ${new Date().getFullYear()} RehabVerve. All rights reserved.</p>
                <div class="legal-links">
                    <a href="privacy.html">Privacy Policy</a>
                    <a href="terms.html">Terms of Service</a>
                    <a href="${WHATSAPP}" target="_blank" rel="noopener">Support</a>
                </div>
            </div>
        </footer>`;

    // ========== INJECTION ==========
    function injectElements() {
        // Remove any legacy hard-coded shell so there is exactly one of each
        document.querySelectorAll('body > header.l-header, body > footer.modern-footer, #auth-modal').forEach(el => el.remove());

        const noChrome = document.body.hasAttribute('data-no-chrome');
        document.body.insertAdjacentHTML('afterbegin', getHeaderHTML());
        document.body.insertAdjacentHTML('beforeend', authModalHTML);
        if (!noChrome) {
            document.body.insertAdjacentHTML('beforeend', footerHTML);
            document.body.insertAdjacentHTML('beforeend', getTabbarHTML());
        }

        setupMenuToggle();
        setupProfileLinkObserver();
        setupNewsletter();
    }

    function setupMenuToggle() {
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');
        const scrim = document.getElementById('vv-scrim');
        const closeBtn = document.getElementById('vv-drawer-close');

        const close = () => navMenu && navMenu.classList.remove('show');

        if (navToggle && navMenu) {
            navToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                navMenu.classList.toggle('show');
            });
        }
        if (scrim) scrim.addEventListener('click', close);
        if (closeBtn) closeBtn.addEventListener('click', close);

        document.querySelectorAll('.nav__link').forEach(link => link.addEventListener('click', close));
        document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

        // Profile avatar: auth.js toggles the drawer on mobile and opens the profile on desktop.
    }

    function setupNewsletter() {
        document.querySelectorAll('.modern-footer .newsletter-form').forEach(form => {
            form.addEventListener('submit', e => {
                e.preventDefault();
                const input = form.querySelector('input[type="email"]');
                const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
                if (window.vvToast) {
                    window.vvToast(ok ? 'You\'re on the list — welcome aboard!' : 'Please enter a valid email address', ok ? 'success' : 'error');
                }
                if (ok) input.value = '';
            });
        });
    }

    // ========== DYNAMIC PROFILE LINK ==========
    function setupProfileLinkObserver() {
        const checkAuth = setInterval(() => {
            if (typeof firebase !== 'undefined' && firebase.auth && firebase.apps && firebase.apps.length) {
                clearInterval(checkAuth);
                firebase.auth().onAuthStateChanged(user => {
                    const profileLink = document.querySelector('#my-profile-nav-item a');
                    if (profileLink && user) profileLink.href = `users.html?id=${user.uid}`;
                });
            }
        }, 100);
        setTimeout(() => clearInterval(checkAuth), 10000);
    }

    // ========== UPDATE ACTIVE LINK ON NAVIGATION ==========
    window.updateActiveNavLink = function(pageId) {
        document.querySelectorAll('.nav__link, .vv-tab').forEach(link => {
            link.classList.remove('active-link', 'is-active');
        });
        document.querySelectorAll(`.nav__link[data-nav="${pageId}"]`).forEach(l => l.classList.add('active-link'));
        document.querySelectorAll(`.vv-tab[data-nav="${pageId}"]`).forEach(l => l.classList.add('is-active'));
    };

    // Loaded at the end of <body>, so the page markup already exists: inject right
    // away instead of waiting for slower scripts (e.g. the Firebase SDK).
    if (document.body) {
        injectElements();
    } else {
        document.addEventListener('DOMContentLoaded', injectElements);
    }

    window.reinitNavModal = function() {
        setupMenuToggle();
        window.updateActiveNavLink(getCurrentPage());
    };
})();
