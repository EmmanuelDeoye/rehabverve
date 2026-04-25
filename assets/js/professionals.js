
// Function to get the value of a specific query parameter from the URL
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Function to filter professionals based on search term and category
function filterProfessionals() {
    return allProfessionals.filter(professional => {
        const matchesCategory = currentCategory === 'All' || 
            (professional.job && professional.job.toLowerCase().includes(currentCategory.toLowerCase()));
        
        const matchesSearch = currentSearchTerm === '' || 
            (professional.name && professional.name.toLowerCase().includes(currentSearchTerm.toLowerCase())) || 
            (professional.job && professional.job.toLowerCase().includes(currentSearchTerm.toLowerCase())) || 
            (professional.bio && professional.bio.toLowerCase().includes(currentSearchTerm.toLowerCase()));
        
        return matchesCategory && matchesSearch;
    });
}

// Function to display professional profiles
function displayProfessionalProfiles(professionals) {
    if (!professionalGrid) return;
    professionalGrid.innerHTML = ''; // Clear any existing profiles

    // Sort professionals by their 'pos' value (ascending)
    const sortedProfessionals = [...professionals].sort((a, b) => {
        const posA = a.pos || 9999; // Default to high number if pos doesn't exist
        const posB = b.pos || 9999;
        return posA - posB;
    });

    // Update category title
    if (categoryTitle) {
        const displayCategory = currentCategory === 'All' ? 'All Healthcare' : currentCategory;
        const displaySearch = currentSearchTerm ? ` matching "${currentSearchTerm}"` : '';
        categoryTitle.textContent = `${displayCategory} Professionals${displaySearch}`;
    }

    // Display professionals or "not found" message
if (sortedProfessionals.length > 0) {
    sortedProfessionals.forEach(professional => {
        const profileCard = document.createElement('div');
        profileCard.classList.add('profile-card', 'detailed-profile', 'profile-header');
        
        profileCard.innerHTML = `
            <div class="profile-image-container">
                <img src="${professional.img || 'assets/img/profile.png'}" 
                     class="profile-image" 
                     alt="${professional.name}">
                
            </div>
            <h3 class="user-name">${professional.name}</h3>
            <p class="user-title">${professional.job || 'Healthcare Professional'}</p>
            <div class="contact-icons">
                ${professional.phone ? `
                    <a href="https://wa.me/${professional.phone.replace(/[^\d]/g, '')}" 
                       class="contact-icon whatsapp" 
                       target="_blank">
                        <i class='bx bxl-whatsapp'></i>
                    </a>` : ''}
                ${professional.email ? `
                    <a href="mailto:${professional.email}" 
                       class="contact-icon email">
                        <i class='bx bx-envelope'></i>
                    </a>` : ''}
                ${professional.phone ? `
                    <a href="tel:${professional.phone}" 
                       class="contact-icon phone">
                        <i class='bx bx-phone'></i>
                    </a>` : ''}
            </div>
        `;

        // Add click handler if ID exists
        if (professional.id) {
            profileCard.addEventListener('click', () => {
                sessionStorage.setItem('professionalsState', JSON.stringify({
                    category: currentCategory,
                    searchTerm: currentSearchTerm,
                    professionals: allProfessionals
                }));
                window.location.href = `users.html?id=${professional.id}`;
            });
            profileCard.style.cursor = 'pointer';
        }

        professionalGrid.appendChild(profileCard);
    });
} else {
        professionalGrid.innerHTML = '<p class="no-results">No professionals found matching your criteria.</p>';
    }
}

// Helper function to truncate bio
function truncateBio(bio, maxLength = 100) {
    return bio.length > maxLength ? `${bio.substring(0, maxLength)}...` : bio;
}

// Initialize the page
function initPage() {
    // Check if we're returning from profile page with saved state
    const savedState = sessionStorage.getItem('professionalsState');
    if (savedState) {
        const state = JSON.parse(savedState);
        currentCategory = state.category || 'All';
        currentSearchTerm = state.searchTerm || '';
        allProfessionals = state.professionals || [];
        
        // Set UI elements to match saved state
        if (categoryFilter) categoryFilter.value = currentCategory;
        if (searchInput) searchInput.value = currentSearchTerm;
        
        // Display filtered professionals
        const filtered = filterProfessionals();
        displayProfessionalProfiles(filtered);
        
        // Clear the saved state
        sessionStorage.removeItem('professionalsState');
        return;
    }

    // If no saved state, load from Firebase
    const category = getQueryParam('category');
    currentCategory = category || 'All';
    if (categoryFilter && category) categoryFilter.value = category;

    professionalsRef.once('value').then(snapshot => {
        const professionalsData = snapshot.val();
        // Convert to array and add IDs
        allProfessionals = [];
        for (const key in professionalsData) {
            allProfessionals.push({
                ...professionalsData[key],
                id: key
            });
        }
        
        const filtered = filterProfessionals();
        displayProfessionalProfiles(filtered);
    }).catch(error => {
        console.error("Error fetching professionals:", error);
        professionalGrid.innerHTML = '<p class="error">Error loading professionals. Please try again later.</p>';
    });
}

// Event listeners
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value.trim().toLowerCase();
        const filtered = filterProfessionals();
        displayProfessionalProfiles(filtered);
    });
}

if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
        currentCategory = e.target.value;
        const filtered = filterProfessionals();
        displayProfessionalProfiles(filtered);
        
        // Update URL without reloading
        const url = new URL(window.location);
        if (currentCategory === 'All') {
            url.searchParams.delete('category');
        } else {
            url.searchParams.set('category', currentCategory);
        }
        window.history.pushState({}, '', url);
    });
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', initPage);

// Handle back/forward navigation
window.addEventListener('popstate', () => {
    const category = getQueryParam('category');
    if (category !== currentCategory) {
        currentCategory = category || 'All';
        if (categoryFilter) categoryFilter.value = currentCategory;
        const filtered = filterProfessionals();
        displayProfessionalProfiles(filtered);
    }
});
