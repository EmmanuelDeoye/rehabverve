// Track user visits
function trackUserVisit() {
    const user = firebase.auth().currentUser;

    const visitData = {
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        page: window.location.pathname,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        userId: user ? user.uid : 'anonymous',
        userEmail: user ? user.email : 'anonymous'
    };

    // Push data to the 'visits' node in Firebase
    const visitsRef = firebase.database().ref('visits');
    visitsRef.push(visitData)
        .catch(error => {
            console.error('Error recording visit:', error);
        });
}

// Call this function when Firebase Auth state changes
firebase.auth().onAuthStateChanged(function(user) {
    // Track visit regardless of login state
    trackUserVisit();
});

// Also track visit on initial page load in case Auth state is already known
document.addEventListener('DOMContentLoaded', function() {
    if (typeof firebase !== 'undefined') {
        trackUserVisit();
    }
});