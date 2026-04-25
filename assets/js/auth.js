// auth.js - Edited for Redirection to account.html
const DEBUG = true;

function initializeApp() {
    if (DEBUG) console.log("Initializing application...");

    auth.onAuthStateChanged(async user => {
        if (user) {
            if (DEBUG) console.log("User authenticated:", user.uid);
            await handleAuthenticatedState(user);
            
            // Hide "Join our Network" section for logged-in users
            const joinSection = document.querySelector('.join-practitioner22');
            if (joinSection) joinSection.style.display = 'none';
        } else {
            if (DEBUG) console.log("User not authenticated");
            handleUnauthenticatedState();
            
            // Show "Join our Network" section for logged-out users
            const joinSection = document.querySelector('.join-practitioner22');
            if (joinSection) joinSection.style.display = 'block';
        }
    });

    setupEventListeners();
    setupAuthForms();
    setupPasswordToggles(); 

    // Add AI Assistant button event listener
    const aiAssistantButton = document.querySelector('.floating-ai-button');
    if (aiAssistantButton) {
        aiAssistantButton.addEventListener('click', function(e) {
            const user = auth.currentUser;
            if (!user) {
                e.preventDefault();
                sessionStorage.setItem('postAuthRedirect', 'ai-assistant');
                showModal('auth-modal');
            }
        });
    }

    window.addEventListener('resize', () => {
        if (auth.currentUser) {
            handleAuthenticatedState(auth.currentUser);
        } else {
            handleUnauthenticatedState();
        }
    });
}

function setupEventListeners() {
    if (DEBUG) console.log("Setting up event listeners...");

    document.querySelectorAll('.modal .close, .modal .modal-close').forEach(btn => {
        btn.addEventListener('click', hideAllModals);
    }); 

    // Login button
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (DEBUG) console.log("Login button clicked.");
            showModal('auth-modal');
        });
    }

    // Modal background click
    window.addEventListener('click', (event) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (event.target === modal) hideAllModals();
        });
    });

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                if (DEBUG) console.log("User signed out successfully.");
            }).catch(error => {
                console.error("Logout error:", error);
            });
        });
    }

    // Profile image click
    const profileImageNav = document.querySelector('.profile-image-nav');
    if (profileImageNav) {
        profileImageNav.addEventListener('click', () => {
            const user = auth.currentUser;
            if (user) {
                const navMenu = document.getElementById('nav-menu');
                if (window.innerWidth <= 991) {
                    if (navMenu) {
                        navMenu.classList.toggle('show');
                    }
                } else {
                    window.location.href = `users.html?id=${user.uid}`;
                }
            } else {
                showModal('auth-modal');
            }
        });
    }

    // Nav toggle
    const navToggle = document.getElementById('nav-toggle');
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            const navMenu = document.getElementById('nav-menu');
            if (navMenu) {
                navMenu.classList.toggle('show');
            }
        });
    }

    // --- UPDATED NAVIGATION LOGIC ---
    
    // "Don't have an account? Register" link
    document.getElementById('show-register')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'account.html';
    });

    // "Already have an account? Login" link 
    // (Per your request: this now redirects to account.html)
    document.getElementById('show-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'account.html';
    });
}

// Modal Management
function showModal(modalId) {
    if (DEBUG) console.log("Showing modal:", modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function hideAllModals() {
    if (DEBUG) console.log("Hiding all modals");
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
        if (modal.id === 'auth-modal') {
            document.getElementById('login-form').reset();
            showError('login-error', '');
            document.getElementById('register-form').reset();
            showError('register-error', '');
        }
    });
    
    hideAuthSpinner();
}

// Show/hide auth spinner
function showAuthSpinner() {
    const spinner = document.getElementById('auth-spinner');
    if (!spinner) {
        const spinnerDiv = document.createElement('div');
        spinnerDiv.id = 'auth-spinner';
        spinnerDiv.className = 'spinner';
        spinnerDiv.style.cssText = 'border: 4px solid rgba(0,0,0,0.1); border-top: 4px solid #00BCD4; align-self: center; border-radius: 50%; width: 35px; height: 35px; animation: spin 1s linear infinite; margin: 20px auto;';
        document.querySelector('.modal-content').appendChild(spinnerDiv);
    } else {
        spinner.style.display = 'block';
    }
}

function hideAuthSpinner() {
    const spinner = document.getElementById('auth-spinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
}

// Auth Forms
function setupAuthForms() {
    if (DEBUG) console.log("Setting up auth forms...");
    
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const formToShow = tab.dataset.form;

            // --- UPDATED: Redirect if Register tab is clicked ---
            if (formToShow === 'register') {
                window.location.href = 'account.html';
                return; 
            }

            // Normal logic for Login tab
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(`${formToShow}-form`).classList.add('active');
        });
    });

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showError('login-error', '');
            showAuthSpinner();
            
            const email = loginForm['login-email'].value;
            const password = loginForm['login-password'].value;

            try {
                await auth.signInWithEmailAndPassword(email, password);
                if (DEBUG) console.log("Login successful!");
                hideAuthSpinner();
                
                const redirectTarget = sessionStorage.getItem('postAuthRedirect');
                if (redirectTarget === 'ai-assistant') {
                    sessionStorage.removeItem('postAuthRedirect');
                    window.location.href = '/ai-assistant/';
                } else {
                    handlePostLogin();
                }
            } catch (error) {
                hideAuthSpinner();
                if (DEBUG) console.error("Login error:", error.message);
                showError('login-error', error.message);
            }
        });
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showError('register-error', '');
            showAuthSpinner();

            const name = registerForm['register-name'].value;
            const email = registerForm['register-email'].value;
            const password = registerForm['register-password'].value;

            try {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;

                await database.ref('userdata/' + user.uid).set({
                    name: name,
                    email: email,
                    role: 'regular',
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });

                hideAuthSpinner();
                if (DEBUG) console.log("Registration successful! User:", user.uid);
                hideAllModals();
                alert('Account created successfully! You are now logged in.');

                const redirectTarget = sessionStorage.getItem('postAuthRedirect');
                if (redirectTarget === 'ai-assistant') {
                    sessionStorage.removeItem('postAuthRedirect');
                    window.location.href = '/ai-assistant/';
                } else {
                    redirectToPreviousPage();
                }
            } catch (error) {
                hideAuthSpinner();
                if (DEBUG) console.error("Registration error:", error.message);
                showError('register-error', error.message);
            }
        });
    }
}

// Password Toggles
function togglePasswordVisibility(inputElement, toggleElement) {
    const type = inputElement.getAttribute('type') === 'password' ? 'text' : 'password';
    inputElement.setAttribute('type', type);
    
    const icon = toggleElement.querySelector('i');
    if (icon) {
        if (type === 'text') {
            icon.classList.remove('bx-hide');
            icon.classList.add('bx-show');
        } else {
            icon.classList.remove('bx-show');
            icon.classList.add('bx-hide');
        }
    }
}

function setupPasswordToggles() {
    if (DEBUG) console.log("Setting up password toggles...");

    const loginPasswordToggle = document.getElementById('login-password-toggle');
    const loginPasswordInput = document.getElementById('login-password');
    
    if (loginPasswordToggle && loginPasswordInput) {
        loginPasswordToggle.addEventListener('click', function() {
            togglePasswordVisibility(loginPasswordInput, this);
        });
    }

    const registerPasswordToggle = document.getElementById('register-password-toggle');
    const registerPasswordInput = document.getElementById('register-password');
    
    if (registerPasswordToggle && registerPasswordInput) {
        registerPasswordToggle.addEventListener('click', function() {
            togglePasswordVisibility(registerPasswordInput, this);
        });
    }
    
    const registerConfirmPasswordToggle = document.getElementById('register-confirm-password-toggle');
    const registerConfirmPasswordInput = document.getElementById('register-confirm-password');
    
    if (registerConfirmPasswordToggle && registerConfirmPasswordInput) {
        registerConfirmPasswordToggle.addEventListener('click', function() {
            togglePasswordVisibility(registerConfirmPasswordInput, this);
        });
    }
}

// Helper Functions
async function handlePostLogin() {
    if (DEBUG) console.log("Handling post-login actions");
    hideAllModals();
    await handleAuthenticatedState(auth.currentUser);
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = message ? 'block' : 'none';
        if (message) {
            setTimeout(() => {
                errorElement.style.display = 'none';
                errorElement.textContent = '';
            }, 5000);
        }
    }
}

async function updateUIVisibilityBasedOnRole(userId) {
    if (DEBUG) console.log("Updating UI based on role for user:", userId);

    const aiAssistantBtn = document.querySelector('.floating-ai-button');
    const aiTherapistBtn = document.querySelector('.floating-ai-button22');
    const toolsNavItem = document.querySelector('a[href="tools.html"]')?.parentElement;
    const toolsSection = document.getElementById('tools-section');
    
    try {
        const professionalRef = database.ref('professionals').orderByChild('userID').equalTo(userId);
        const centerRef = database.ref('centers').orderByChild('userId').equalTo(userId);

        const [professionalSnapshot, centerSnapshot] = await Promise.all([
            professionalRef.once('value'),
            centerRef.once('value')
        ]);

        const isProfessionalOrCenter = professionalSnapshot.exists() || centerSnapshot.exists();

        if (isProfessionalOrCenter) {
            if (aiAssistantBtn) aiAssistantBtn.style.display = 'flex';
            if (aiTherapistBtn) aiTherapistBtn.style.display = 'none';
            if (toolsNavItem) toolsNavItem.style.display = 'none';
            if (toolsSection) toolsSection.style.display = 'none';
        } else {
            if (aiAssistantBtn) aiAssistantBtn.style.display = 'none';
            if (aiTherapistBtn) aiTherapistBtn.style.display = 'flex';
            if (toolsNavItem) toolsNavItem.style.display = 'none';
            if (toolsSection) toolsSection.style.display = 'none';
        }
    } catch (error) {
        console.error("Error checking user role:", error);
        if (aiAssistantBtn) aiAssistantBtn.style.display = 'none';
        if (aiTherapistBtn) aiTherapistBtn.style.display = 'flex';
        if (toolsNavItem) toolsNavItem.style.display = 'none';
        if (toolsSection) toolsSection.style.display = 'none';
    }
}

// Auth State Management
async function handleAuthenticatedState(user) {
    if (DEBUG) console.log("Handling authenticated state for user:", user.uid);

    const loginBtn = document.getElementById('login-btn');
    const profileImageNav = document.querySelector('.profile-image-nav');
    const navToggle = document.getElementById('nav-toggle');
    const myProfileNavItem = document.getElementById('my-profile-nav-item');
    const navMenu = document.getElementById('nav-menu');
    
    const joinSection = document.querySelector('.join-practitioner22');
    if (joinSection) joinSection.style.display = 'none';

    if (loginBtn) loginBtn.style.display = 'none';
    
    database.ref('userdata/' + user.uid).once('value')
        .then(snapshot => {
            const userData = snapshot.val();
            const profileImageUrl = (userData && userData.img) ? userData.img : 'assets/img/profile.png';

            const profileImageElement = profileImageNav?.querySelector('img');
            if (profileImageElement) {
                profileImageElement.src = profileImageUrl;
            }

            const myProfileLink = myProfileNavItem?.querySelector('a');
            if (myProfileLink) {
                myProfileLink.href = `users.html?id=${user.uid}`;
            }

            if (window.innerWidth <= 991) {
                if (navToggle) navToggle.style.display = 'none';
                if (profileImageNav) profileImageNav.style.display = 'block';
                if (myProfileNavItem) myProfileNavItem.style.display = 'block';
                if (navMenu) navMenu.classList.add('logged-in-mobile');
            } else {
                if (navToggle) navToggle.style.display = 'none';
                if (profileImageNav) profileImageNav.style.display = 'block';
                if (myProfileNavItem) myProfileNavItem.style.display = 'none';
                if (navMenu) navMenu.classList.remove('logged-in-mobile');
            }
        })
        .catch(error => {
            const profileImageElement = profileImageNav?.querySelector('img');
            if (profileImageElement) {
                profileImageElement.src = 'assets/img/default-profile.png';
            }
            if (window.innerWidth <= 991) {
                if (navToggle) navToggle.style.display = 'none';
                if (profileImageNav) profileImageNav.style.display = 'block';
                if (myProfileNavItem) myProfileNavItem.style.display = 'block';
            } else {
                if (navToggle) navToggle.style.display = 'none';
                if (profileImageNav) profileImageNav.style.display = 'block';
                if (myProfileNavItem) myProfileNavItem.style.display = 'none';
            }
        });

    await updateUIVisibilityBasedOnRole(user.uid);
    document.body.classList.add('logged-in');
}

function handleUnauthenticatedState() {
    if (DEBUG) console.log("Handling unauthenticated state.");
    
    const aiAssistantBtn = document.querySelector('.floating-ai-button');
    const aiTherapistBtn = document.querySelector('.floating-ai-button22');
    const toolsNavItem = document.querySelector('a[href="tools.html"]')?.parentElement;
    const toolsSection = document.getElementById('tools-section');

    if (aiAssistantBtn) aiAssistantBtn.style.display = 'none';
    if (aiTherapistBtn) aiTherapistBtn.style.display = 'flex';
    if (toolsNavItem) toolsNavItem.style.display = 'none';
    if (toolsSection) toolsSection.style.display = 'none';

    const joinSection = document.querySelector('.join-practitioner22');
    if (joinSection) joinSection.style.display = 'block';

    const loginBtn = document.getElementById('login-btn');
    const profileImageNav = document.querySelector('.profile-image-nav');
    const navToggle = document.getElementById('nav-toggle');
    const myProfileNavItem = document.getElementById('my-profile-nav-item');
    const navMenu = document.getElementById('nav-menu');

    if (loginBtn) loginBtn.style.display = 'block';
    
    if (window.innerWidth <= 991) {
        if (navToggle) navToggle.style.display = 'block';
        if (profileImageNav) profileImageNav.style.display = 'none';
        if (myProfileNavItem) myProfileNavItem.style.display = 'none';
    } else {
        if (navToggle) navToggle.style.display = 'none';
        if (profileImageNav) profileImageNav.style.display = 'none';
        if (myProfileNavItem) myProfileNavItem.style.display = 'none';
    }

    document.body.classList.remove('logged-in');
    if (navMenu) navMenu.classList.remove('logged-in-mobile');
}

document.addEventListener('DOMContentLoaded', initializeApp);
