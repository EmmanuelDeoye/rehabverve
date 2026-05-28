// navmodal.js
(function() {
    'use strict';

    // ========== GET CURRENT PAGE ==========
    function getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        
        // Map filenames to nav IDs
        const pageMap = {
            'index.html': 'home',
            '': 'home',
            '/': 'home',
            'professionals.html': 'professionals',
            'centers.html': 'centers',
            'teletherapy.html': 'teletherapy',
            'blogs.html': 'blogs',
            'users.html': 'profile',
            'marketplace.html': 'marketplace',
            'tools.html': 'tools',
            'ai.html': 'ai',
            'assessment.html': 'assessment',
            'courses.html': 'courses',
            'account.html': 'account',
            'registration.html': 'registration',
            'forgot-password.html': 'forgot-password',
            'terms.html': 'terms',
            'privacy.html': 'privacy'
        };
        
        return pageMap[page] || 'home';
    }

    // ========== HTML TEMPLATES ==========
    function getHeaderHTML() {
        const currentPage = getCurrentPage();
        
        return `
        <header class="l-header">
            <nav class="nav bd-grid">
                <div>
                    <h2><span class="home__title-color">REHAB</span>VERVE</h2>
                </div>
                <div class="nav__menu" id="nav-menu">
                    <ul class="nav__list">
                        <li class="nav__item"><a href="index.html" class="nav__link ${currentPage === 'home' ? 'active-link' : ''}" data-nav="home">Home</a></li>
                        <li class="nav__item"><a href="professionals.html?category=All" onclick="saveAppState()" class="nav__link ${currentPage === 'professionals' ? 'active-link' : ''}" data-nav="professionals">Professionals</a></li>
                        <li class="nav__item"><a href="centers.html" onclick="saveAppState()" class="nav__link ${currentPage === 'centers' ? 'active-link' : ''}" data-nav="centers">Centers</a></li>
                        
                        <li class="nav__item"><a href="blogs.html" onclick="saveAppState()" class="nav__link ${currentPage === 'blogs' ? 'active-link' : ''}" data-nav="blogs">Blogs</a></li>
                        <li class="nav__item" id="my-profile-nav-item" style="display: none;">
                            <a href="/users.html" onclick="saveAppState()" class="nav__link" data-nav="profile">My Profile</a>
                        </li>
                        <div class="auth-buttons">
                            <li class="nav_item"><button id="login-btn" class="nav__link">Login</button></li>
                        </div>
                    </ul>
                </div>
                <div class="nav__toggle" id="nav-toggle">
                    <i class='bx bx-menu'></i>
                </div>
                <div class="profile-image-nav" id="profile-image-nav" style="display: none;">
                    <img src="" alt="" class="nav-profile-img">
                </div>
            </nav>
        </header>
        `;
    }

    const authModalHTML = `
        <div id="auth-modal" class="modal">
            <div class="modal-content">
                <span class="modal-close">&times;</span>
                <div class="auth-tabs">
                    <div class="auth-tab active" data-form="login">Login</div>
                    <div class="auth-tab" data-form="register">Register</div>
                </div>
                <form id="login-form" class="auth-form active">
                    <div class="error-message" id="login-error"></div>
                    <div class="form-group">
                        <input type="email" id="login-email" placeholder="Email" required>
                    </div>
                    <div class="form-group password-group">
                        <input type="password" id="login-password" placeholder="Password" required>
                        <span class="password-toggle" id="login-password-toggle">
                            <i class='bx bx-hide'></i>
                        </span>
                    </div>
                    <div class="forgot-password">
                        <a href="/forgot-password.html">Forgot your password?</a>
                    </div>
                    <div class="form-group terms-agreement">
                        <label>By clicking the login button, you agree to our <a href="/terms.html" target="_blank">Terms</a> and <a href="/privacy.html" target="_blank">Privacy policy</a></label>
                    </div>
                    <button type="submit">Login</button>
                    <div class="auth-switch">
                        Don't have an account? <a href="#" id="show-register">Register</a>
                    </div>
                </form>
                <form id="register-form" class="auth-form">
                    <div class="error-message" id="register-error"></div>
                    <div class="form-group">
                        <input type="text" id="register-name" placeholder="Name" required>
                    </div>
                    <div class="form-group">
                        <input type="email" id="register-email" placeholder="Email" required>
                    </div>
                    <div class="form-group password-group">
                        <input type="password" id="register-password" placeholder="Password (min. 6 characters)" required>
                        <span class="password-toggle" id="register-password-toggle">
                            <i class='bx bx-hide'></i>
                        </span>
                    </div>
                    <div class="form-group terms-agreement">
                        <label>By clicking the register button, you agree to our <a href="/terms.html" target="_blank">Terms</a> and <a href="/privacy.html" target="_blank">Privacy policy</a></label>
                    </div>
                    <button type="submit">Create Account</button>
                    <div class="auth-switch">
                        Already have an account? <a href="#" id="show-login">Login</a>
                    </div>
                    <div id="auth-spinner" class="spinner" style="display: none;"></div>
                </form>
            </div>
        </div>
    `;

    const footerHTML = `
        <footer class="modern-footer">
            <div class="footer-grid">
                <div class="footer-column">
                    <h3>REHABVERVE</h3>
                    <p>Connecting patients with top healthcare professionals</p>
                    <div class="social-links">
                        <a href="#"><i class='bx bxl-facebook'></i></a>
                        <a href="#"><i class='bx bxl-twitter'></i></a>
                        <a href="#"><i class='bx bxl-instagram'></i></a>
                        <a href="#"><i class='bx bxl-linkedin'></i></a>
                    </div>
                </div>
                <div class="footer-column">
                    <h4>Quick Links</h4>
                    <ul>
                        <li><a href="/">Home</a></li>
                        <li><a href="#about">About Us</a></li>
                        <li><a href="professionals.html" onclick="saveAppState()">Professionals</a></li>
                        <li><a href="blogs.html" onclick="saveAppState()">Health News</a></li>
                        <li><a href="centers.html" onclick="saveAppState()">Centers</a></li>
                    </ul>
                </div>
                <div class="footer-column">
                    <h4>Contact Us</h4>
                    <div class="contact-info">
                        <p><i class='bx bx-map'></i> 44, Shonola Street, Ogba, Lagos state</p>
                        <p><i class='bx bx-phone'></i> + (234) 8132-912-880</p>
                        <p><i class='bx bx-envelope'></i> info@rehabconnect.com</p>
                    </div>
                </div>
                <div class="footer-column">
                    <h4>Newsletter</h4>
                    <form class="newsletter-form">
                        <input type="email" placeholder="rehabverve@gmail.com" required>
                        <button type="submit">Subscribe</button>
                    </form>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; ${new Date().getFullYear()} REHABVERVE. All rights reserved.</p>
                <div class="legal-links">
                    <a href="terms.html">Privacy Policy</a>
                    <a href="terms.html">Terms of Service</a>
                    <a href="#">Cookie Policy</a>
                </div>
            </div>
        </footer>
    `;

    // ========== INJECTION ==========
    function injectElements() {
        // Insert header at the very beginning of body
        document.body.insertAdjacentHTML('afterbegin', getHeaderHTML());
        
        // Insert auth modal after header
        document.body.insertAdjacentHTML('beforeend', authModalHTML);
        
        // Insert footer at the end of body
        document.body.insertAdjacentHTML('beforeend', footerHTML);
        
        // Set up menu toggle
        setupMenuToggle();
        
        // Update profile link href with user ID when auth state changes
        setupProfileLinkObserver();
    }

    function setupMenuToggle() {
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');
        const profileImageNav = document.getElementById('profile-image-nav');
        
        // Menu toggle button click
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                navMenu.classList.toggle('show');
            });
        }
        
        // Profile image click (for mobile)
        if (profileImageNav && navMenu) {
            profileImageNav.addEventListener('click', function(e) {
                e.stopPropagation();
                const user = firebase.auth().currentUser;
                if (user) {
                    // On mobile, clicking profile image toggles menu when logged in
                    if (window.innerWidth <= 991) {
                        navMenu.classList.toggle('show');
                    } else {
                        // On desktop, navigate to profile
                        window.location.href = `/users.html?id=${user.uid}`;
                    }
                }
            });
        }
        
        // Close menu when a nav link is clicked (mobile)
        document.querySelectorAll('.nav__link').forEach(link => {
            link.addEventListener('click', function() {
                if (navMenu) {
                    navMenu.classList.remove('show');
                }
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (navMenu && navMenu.classList.contains('show')) {
                const isClickInside = navMenu.contains(e.target) || 
                                     (navToggle && navToggle.contains(e.target)) ||
                                     (profileImageNav && profileImageNav.contains(e.target));
                if (!isClickInside) {
                    navMenu.classList.remove('show');
                }
            }
        });
    }

    // ========== DYNAMIC PROFILE LINK ==========
    function setupProfileLinkObserver() {
        // Wait for auth to set up
        const checkAuth = setInterval(() => {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                clearInterval(checkAuth);
                
                firebase.auth().onAuthStateChanged(user => {
                    const profileLink = document.querySelector('#my-profile-nav-item a');
                    if (profileLink && user) {
                        profileLink.href = `/users.html?id=${user.uid}`;
                        
                        // Also update the active state if on profile page
                        const currentPage = getCurrentPage();
                        if (currentPage === 'profile') {
                            profileLink.classList.add('active-link');
                        }
                    }
                });
            }
        }, 100);
    }

    // ========== UPDATE ACTIVE LINK ON NAVIGATION ==========
    window.updateActiveNavLink = function(pageId) {
        document.querySelectorAll('.nav__link').forEach(link => {
            link.classList.remove('active-link');
        });
        
        const activeLink = document.querySelector(`.nav__link[data-nav="${pageId}"]`);
        if (activeLink) {
            activeLink.classList.add('active-link');
        }
    };

    // Run injection when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectElements);
    } else {
        injectElements();
    }

    // Expose functions for SPA navigation
    window.reinitNavModal = function() {
        setupMenuToggle();
        // Re-evaluate active link after SPA navigation
        const currentPage = getCurrentPage();
        window.updateActiveNavLink(currentPage);
    };

})();
