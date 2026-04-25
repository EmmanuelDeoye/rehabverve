// registration.js - Corrected Implementation
const DEBUG = true;

function initializeRegistrationApp() {
    if (DEBUG) console.log("Initializing registration application...");

    auth.onAuthStateChanged(user => {
        if (user) {
            if (DEBUG) console.log("User authenticated:", user.uid);
            handleAuthenticatedRegistrationState(user);
        } else {
            if (DEBUG) console.log("User not authenticated");
            handleUnauthenticatedRegistrationState();
        }
    });

    setupRegistrationEventListeners();
    setupRegistrationForms();
    
    // Check if user just completed registration
    const registrationComplete = sessionStorage.getItem('registrationComplete');
    if (registrationComplete) {
        showRegistrationStatus();
        sessionStorage.removeItem('registrationComplete');
    }
}

function setupRegistrationEventListeners() {
    if (DEBUG) console.log("Setting up registration event listeners...");

    // Modal close buttons
    document.querySelectorAll('.modal .close, .modal .modal-close').forEach(btn => {
        btn.addEventListener('click', hideAllModals);
    });

    // Practitioner registration
    const joinButton = document.getElementById('join-button');
    if (joinButton) {
        joinButton.addEventListener('click', (e) => {
            e.preventDefault();
            showModal('practitioner-modal');
        });
    }

    // Center registration
    const centerButton = document.getElementById('center-button');
    if (centerButton) {
        centerButton.addEventListener('click', (e) => {
            e.preventDefault();
            showModal('center-modal');
        });
    }

    // Supplier registration
    const supplierCtaBtn = document.getElementById('supplier-cta-btn');
    if (supplierCtaBtn) {
        supplierCtaBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showModal('supplier-modal');
        });
    }

    // Profile button
    const userProfileBtn = document.getElementById('user-profile-btn');
    if (userProfileBtn) {
        userProfileBtn.addEventListener('click', () => {
            const user = auth.currentUser;
            if (user) {
                window.location.href = `users.html?id=${user.uid}`;
            }
        });
    }

    // Window click to close modals
    window.addEventListener('click', (event) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (event.target === modal) hideAllModals();
        });
    });
}

function setupRegistrationForms() {
    if (DEBUG) console.log("Setting up registration forms...");

    // Practitioner Form
    const practitionerForm = document.getElementById('practitioner-form');
    if (practitionerForm) {
        practitionerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showError('practitioner-error', '');
            
            const email = practitionerForm['prof-email'].value;
            const password = practitionerForm['prof-password'].value;
            const name = practitionerForm['prof-name'].value;
            
            if (password.length < 6) {
                showError('practitioner-error', 'Password should be at least 6 characters.');
                return;
            }

            try {
                // Create user account
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                if (DEBUG) console.log("Practitioner account created:", user.uid);

                // Handle file uploads
                let licenseUrl = '';
                let profileImageUrl = '';

                // Upload license file
                const licenseFile = practitionerForm['prof-license'].files[0];
                if (licenseFile) {
                    if (licenseFile.size > 5 * 1024 * 1024) {
                        showError('practitioner-error', 'License file size exceeds 5MB limit.');
                        return;
                    }
                    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
                    if (!allowedTypes.includes(licenseFile.type)) {
                        showError('practitioner-error', 'Only JPG, PNG, GIF, PDF, DOC, DOCX files are allowed for license.');
                        return;
                    }
                    
                    const licenseRef = storage.ref('licenses/' + user.uid + '/' + licenseFile.name);
                    const licenseSnapshot = await licenseRef.put(licenseFile);
                    licenseUrl = await licenseSnapshot.ref.getDownloadURL();
                }

                // Upload profile picture
                const profileFile = practitionerForm['prof-picture'].files[0];
                if (profileFile) {
                    if (profileFile.size > 2 * 1024 * 1024) {
                        showError('practitioner-error', 'Profile picture size exceeds 2MB limit.');
                        return;
                    }
                    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
                    if (!allowedTypes.includes(profileFile.type)) {
                        showError('practitioner-error', 'Only JPG, PNG, GIF images are allowed for profile picture.');
                        return;
                    }
                    
                    const profileRef = storage.ref('profiles/' + user.uid + '/' + profileFile.name);
                    const profileSnapshot = await profileRef.put(profileFile);
                    profileImageUrl = await profileSnapshot.ref.getDownloadURL();
                }

                // Save user data
                await database.ref('userdata/' + user.uid).set({
                    email: email,
                    name: name,
                    phone: practitionerForm['prof-phone'].value,
                    userType: 'practitioner',
                    specialty: practitionerForm['prof-specialty'].value,
                    img: profileImageUrl,
                    createdAt: Date.now(),
                    status: 'pending'
                });

                // Save application data
                const practitionerData = {
                    fullName: name,
                    contactEmail: email,
                    contactPhone: practitionerForm['prof-phone'].value,
                    specialty: practitionerForm['prof-specialty'].value,
                    yearsExperience: parseInt(practitionerForm['prof-experience'].value, 10),
                    bio: practitionerForm['prof-bio'].value,
                    licenseUrl: licenseUrl,
                    profileImage: profileImageUrl,
                    userId: user.uid,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    status: 'pending',
                    applicationType: 'practitioner'
                };

                await database.ref('applications').push(practitionerData);

                // Success
                alert('Your practitioner application has been submitted successfully! We will review it shortly.');
                hideAllModals();
                practitionerForm.reset();
                sessionStorage.setItem('registrationComplete', 'true');
                showRegistrationStatus();
                
            } catch (error) {
                if (DEBUG) console.error("Practitioner registration failed:", error.message);
                showError('practitioner-error', 'Registration failed: ' + error.message);
            }
        });
    }

    // Center Form
    const centerForm = document.getElementById('center-form');
    if (centerForm) {
        centerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showError('center-error', '');
            
            const email = centerForm['center-email'].value;
            const password = centerForm['center-password'].value;
            const name = centerForm['center-name'].value;
            
            if (password.length < 6) {
                showError('center-error', 'Password should be at least 6 characters.');
                return;
            }

            try {
                // Create user account
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                if (DEBUG) console.log("Center account created:", user.uid);

                // Handle logo upload
                let logoUrl = '';
                const logoFile = centerForm['center-logo'].files[0];
                if (logoFile) {
                    if (logoFile.size > 2 * 1024 * 1024) {
                        showError('center-error', 'Logo file size exceeds 2MB limit.');
                        return;
                    }
                    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
                    if (!allowedTypes.includes(logoFile.type)) {
                        showError('center-error', 'Only JPG, PNG, GIF images are allowed for logo.');
                        return;
                    }
                    
                    const logoRef = storage.ref('centers/' + user.uid + '/' + logoFile.name);
                    const logoSnapshot = await logoRef.put(logoFile);
                    logoUrl = await logoSnapshot.ref.getDownloadURL();
                }

                // Save user data
                await database.ref('userdata/' + user.uid).set({
                    email: email,
                    name: name,
                    phone: centerForm['center-phone'].value,
                    userType: 'center',
                    centerType: centerForm['center-type'].value,
                    img: logoUrl,
                    createdAt: Date.now(),
                    status: 'pending'
                });

                // Save center data
                const centerData = {
                    centerName: name,
                    centerType: centerForm['center-type'].value,
                    address: centerForm['center-address'].value,
                    phone: centerForm['center-phone'].value,
                    email: email,
                    website: centerForm['center-website'].value,
                    description: centerForm['center-description'].value,
                    logo: logoUrl,
                    userId: user.uid,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    status: 'pending',
                    applicationType: 'center'
                };

                await database.ref('applications').push(centerData);

                // Success
                alert('Your center registration has been submitted successfully! We will review it shortly.');
                hideAllModals();
                centerForm.reset();
                sessionStorage.setItem('registrationComplete', 'true');
                showRegistrationStatus();
                
            } catch (error) {
                if (DEBUG) console.error("Center registration failed:", error.message);
                showError('center-error', 'Registration failed: ' + error.message);
            }
        });
    }

    // Supplier Form
    const supplierForm = document.getElementById('supplier-form');
    if (supplierForm) {
        supplierForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showError('supplier-error', '');
            
            const email = supplierForm['contact-email'].value;
            const password = supplierForm['supplier-password'].value;
            const orgName = supplierForm['org-name'].value;
            
            if (password.length < 6) {
                showError('supplier-error', 'Password should be at least 6 characters.');
                return;
            }

            try {
                // Create user account
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                if (DEBUG) console.log("Supplier account created:", user.uid);

                // Save user data
                await database.ref('userdata/' + user.uid).set({
                    email: email,
                    name: orgName,
                    phone: supplierForm['contact-phone'].value,
                    userType: 'supplier',
                    img: '',
                    createdAt: Date.now(),
                    status: 'pending'
                });

                // Save supplier data
                const supplierData = {
                    orgName: orgName,
                    contactEmail: email,
                    contactPhone: supplierForm['contact-phone'].value,
                    productsOffered: supplierForm['products-offered'].value,
                    userId: user.uid,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    status: 'pending',
                    applicationType: 'supplier'
                };

                await database.ref('applications').push(supplierData);

                // Success
                alert('Your supplier application has been submitted successfully! We will review it shortly.');
                hideAllModals();
                supplierForm.reset();
                sessionStorage.setItem('registrationComplete', 'true');
                showRegistrationStatus();
                
            } catch (error) {
                if (DEBUG) console.error("Supplier registration failed:", error.message);
                showError('supplier-error', 'Registration failed: ' + error.message);
            }
        });
    }
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
        // Reset forms and clear errors
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            const errorElement = modal.querySelector('.error-message');
            if (errorElement) {
                errorElement.textContent = '';
                errorElement.style.display = 'none';
            }
        }
    });
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

// Registration Status Management
function showRegistrationStatus() {
    const statusMessage = document.getElementById('registration-status-message');
    if (statusMessage) {
        statusMessage.style.display = 'block';
        statusMessage.innerHTML = `
            <div class="registration-success">
                <h3>Application Submitted Successfully!</h3>
                <p>Your application has been received and is under review. You will be notified once it's approved.</p>
                <button id="user-profile-btn" class="whatsapp-button22">Check Your Profile</button>
            </div>
        `;
        
        // Re-attach event listener to the new button
        const profileBtn = document.getElementById('user-profile-btn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                const user = auth.currentUser;
                if (user) {
                    window.location.href = `users.html?id=${user.uid}`;
                }
            });
        }
    }
}

function handleAuthenticatedRegistrationState(user) {
    if (DEBUG) console.log("Handling authenticated state for user:", user.uid);
    
    // Show registration status if user just registered
    showRegistrationStatus();
    
    // Hide registration sections if user already has an application
    checkExistingApplications(user.uid);
}

function handleUnauthenticatedRegistrationState() {
    if (DEBUG) console.log("Handling unauthenticated state.");
    // Keep all registration sections visible for new users
}

function checkExistingApplications(userId) {
    database.ref('applications').orderByChild('userId').equalTo(userId).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                // User already has applications, hide registration sections
                const practitionerSection = document.querySelector('.join-practitioner');
                const centerSection = document.querySelector('.my-center');
                const supplierSection = document.querySelector('.become-supplier');
                
                if (practitionerSection) practitionerSection.style.display = 'none';
                if (centerSection) centerSection.style.display = 'none';
                if (supplierSection) supplierSection.style.display = 'none';
            }
        })
        .catch(error => {
            console.error("Error checking applications:", error);
        });
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeRegistrationApp);