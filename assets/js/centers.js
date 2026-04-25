document.addEventListener('DOMContentLoaded', () => {
    const centerSearchInput = document.getElementById('center-search-input');
    const categoryFilter = document.getElementById('category-filter');
    const centersContainer = document.getElementById('centers-container');
    
    function displayCenters(centers, searchTerm = '', category = 'All') {
        centersContainer.innerHTML = '';
        
        const filteredCenters = centers.filter(center => {
            const matchesSearch = searchTerm === '' || 
                (center.centerName && center.centerName.toLowerCase().includes(searchTerm.toLowerCase())) || 
                (center.description && center.description.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesCategory = category === 'All' || 
                (center.category && center.category.toLowerCase() === category.toLowerCase());
            
            return matchesSearch && matchesCategory;
        });
        
        if (filteredCenters.length > 0) {
            filteredCenters.forEach(center => {
                const centerCard = document.createElement('div');
                centerCard.className = 'center-card';
                centerCard.innerHTML = `
                    <img src="${center.img || 'assets/img/center.jpg'}" alt="${center.centerName}">
                    <div class="center-card-content">
                        <h3>${center.centerName}</h3>
                        <p class="center-date">${center.centerType}</p>
                        <p>${center.description.substring(0, 150)}...</p>
                        <a href="users.html?id=${center.userId}" class="read-more">View Details</a>
                    </div>
                `;
                centersContainer.appendChild(centerCard);
            });
        } else {
            centersContainer.innerHTML = '<p class="no-results">No centers found matching your criteria.</p>';
        }
    }

    function loadCenters() {
        const loadingOverlay = centersContainer.querySelector('.loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        
        const centersRef = firebase.database().ref('centers');
        centersRef.once('value').then(snapshot => {
            const centersData = snapshot.val();
            const centersArray = centersData ? Object.keys(centersData).map(key => ({
                id: key,
                ...centersData[key]
            })) : [];
            
            displayCenters(centersArray);
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            
            // Setup event listeners
            centerSearchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.trim();
                const category = categoryFilter.value;
                displayCenters(centersArray, searchTerm, category);
            });
            
            categoryFilter.addEventListener('change', (e) => {
                const searchTerm = centerSearchInput.value.trim();
                const category = e.target.value;
                displayCenters(centersArray, searchTerm, category);
            });
        }).catch(error => {
            console.error("Error loading centers:", error);
            centersContainer.innerHTML = '<p class="error">Error loading centers. Please try again later.</p>';
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        });
    }

    loadCenters();
});
