document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. HANDLE "CREATE USER ACCOUNT" CLICK ---
    const practitionerCard = document.querySelector('.role-card[data-role="practitioner"]');

    if (practitionerCard) {
        // Find the <a> tag wrapping the card
        const linkElement = practitionerCard.closest('a');

        if (linkElement) {
            linkElement.addEventListener('click', (e) => {
                e.preventDefault(); // Stop navigation to documentation.html
                
                // Open the modal (using function from auth.js)
                if (typeof showModal === 'function') {
                    showModal('auth-modal');
                } else {
                    document.getElementById('auth-modal').style.display = 'block';
                }

                // Switch to Register Tab (using function from auth.js)
                if (typeof switchToRegisterForm === 'function') {
                    switchToRegisterForm();
                } else {
                    // Fallback manual DOM manipulation if function isn't accessible
                    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
                    
                    const regTab = document.querySelector('.auth-tab[data-form="register"]');
                    const regForm = document.getElementById('register-form');
                    
                    if(regTab) regTab.classList.add('active');
                    if(regForm) regForm.classList.add('active');
                }
            });
        }
    }

    // --- 2. SETUP PREVIOUS PAGE TRACKING ---
    // Store where the user came from when they land on account.html
    const referrer = document.referrer;
    
    // Only store if referrer exists and it's not a reload of the same page
    if (referrer && referrer !== window.location.href) {
        sessionStorage.setItem('returnToPage', referrer);
    }
});

// --- 3. DEFINE REDIRECT FUNCTION ---
// This function is called by auth.js inside the registration success block
window.redirectToPreviousPage = function() {
    const returnUrl = sessionStorage.getItem('returnToPage');
    
    // Clean up storage
    sessionStorage.removeItem('returnToPage');

    if (returnUrl && returnUrl !== window.location.href) {
        // Go back to where they came from
        window.location.href = returnUrl;
    } else {
        // Default fallback if no history exists
        window.location.href = 'index.html'; 
    }
};
