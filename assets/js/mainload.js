// mainload.js - Updated for Centers Directory and Designs Section

const CACHE_EXPIRATION = 1800000; // 30 minutes 

// App state management
const appState = {
    professionals: null,
    professionals22: null, 
    products: null,
    centers: null,
    blogPosts: null,
    designs: [],
    designsSlider: {
        slides: [],
        currentSlide: 0,
        isAutoSliding: true
    },
    courses: null,
    slider: {
        slides: [],
        currentSlide: 0,
        isAutoSliding: true
    },
    lastUpdated: null,
    isLoggedIn: false
}; 

// DOM elements
const profilesContainer = document.querySelector('.profiles-container');
const productsContainer = document.querySelector('.products-container');
const centersContainer = document.querySelector('.centers-container');
const profilesContainer22 = document.querySelector('.profiles-container22');
const sliderContainer = document.getElementById('slider-container');
const sliderDotsContainer = document.querySelector('.slider-dots');
const coursesContainer = document.querySelector('.courses-container');
const toolsContainer = document.querySelector('.tools-container');
const blogsContainer = document.querySelector('.blogs-container'); // Add this line
const designsSlider = document.getElementById('designs-slider');
const designsDotsContainer = document.querySelector('.designs-dots');

// Database references
const professionalsRef = database.ref().child('professionals');
const productsRef = database.ref().child('products');
const centersRef = database.ref().child('centers');
const designsRef = database.ref('designs');
const sliderRef = database.ref('slider');
const coursesRef = database.ref('cert');
const toolsRef = database.ref('equip');
const blogPostsRef = database.ref().child('blogPosts');

// Design slider functions
let designsSlideInterval;

function updateDesignsSliderPosition() {
    if (!designsSlider) return;
    
    designsSlider.style.transform = `translateX(${-appState.designsSlider.currentSlide * 100}%)`;
    
    document.querySelectorAll('.designs-dot').forEach((dot, index) => {
        dot.classList.toggle('active', index === appState.designsSlider.currentSlide);
    });
}

function nextDesignSlide() {
    if (appState.designsSlider.slides.length === 0) return;
    
    appState.designsSlider.currentSlide = 
        (appState.designsSlider.currentSlide + 1) % appState.designsSlider.slides.length;
    updateDesignsSliderPosition();
}

function prevDesignSlide() {
    if (appState.designsSlider.slides.length === 0) return;
    
    appState.designsSlider.currentSlide = 
        (appState.designsSlider.currentSlide - 1 + appState.designsSlider.slides.length) % 
        appState.designsSlider.slides.length;
    updateDesignsSliderPosition();
}

function goToDesignSlide(index) {
    if (appState.designsSlider.slides.length === 0) return;
    
    appState.designsSlider.currentSlide = index;
    updateDesignsSliderPosition();
}

function startDesignsAutoSlide() {
    stopDesignsAutoSlide();
    if (appState.designsSlider.isAutoSliding && appState.designsSlider.slides.length > 0) {
        designsSlideInterval = setInterval(nextDesignSlide, 5000);
    }
}

function stopDesignsAutoSlide() {
    clearInterval(designsSlideInterval);
}

// WhatsApp redirection functions
function redirectToWhatsApp() {
    const message = "Hello, I'm interested in viewing more of your design ideas for sensory rooms, creche rooms, or rehab centers.";
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/2348132912880?text=${encodedMessage}`, '_blank');
}

function redirectToWhatsAppWithDesign(design) {
    const message = `Hello, I'm interested in this design: ${design.title || 'Design Idea'}. ${design.description ? 'Details: ' + design.description : ''}`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/2348132912880?text=${encodedMessage}`, '_blank');
}

// Function to show loading animation
function showLoading(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const loadingOverlay = section.querySelector('.loading-overlay');
        const contentContainer = section.querySelector(
            sectionId === 'featured-professionals' ? '.profiles-container' :
            sectionId === 'featured-products' ? '.products-container' :
            sectionId === 'featured-professionals22' ? '.profiles-container22' :
            sectionId === 'centers-section' ? '.centers-container' :
            sectionId === 'designs-section' ? '.designs-slider' :
            sectionId === 'courses-section' ? '.courses-container' :
            sectionId === 'tools-section' ? '.tools-container' :
            sectionId === 'blog-section' ? '.blogs-container' : null // Add blog section
        );
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        if (contentContainer) contentContainer.classList.add('loading');
    }
} 

// Function to hide loading animation
function hideLoading(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const loadingOverlay = section.querySelector('.loading-overlay');
        const contentContainer = section.querySelector(
            sectionId === 'featured-professionals' ? '.profiles-container' :
            sectionId === 'featured-products' ? '.products-container' :
            sectionId === 'featured-professionals22' ? '.profiles-container22' :
            sectionId === 'centers-section' ? '.centers-container' :
            sectionId === 'courses-section' ? '.courses-container' :
            sectionId === 'tools-section' ? '.tools-container' :
            sectionId === 'blog-section' ? '.blogs-container' : null // Add blog section
        );
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        if (contentContainer) contentContainer.classList.remove('loading');
    }
} 

// State management functions
function saveAppState() {
    try {
        appState.lastUpdated = Date.now();
        appState.isLoggedIn = !!firebase.auth().currentUser;
        sessionStorage.setItem('appState', JSON.stringify(appState));
    } catch (e) {
        console.error("Error saving app state:", e);
    }
} 

function restoreAppState() {
    try {
        const savedState = sessionStorage.getItem('appState');
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            if (parsedState.lastUpdated && (Date.now() - parsedState.lastUpdated < CACHE_EXPIRATION)) {
                Object.assign(appState, parsedState);
                return true;
            }
        }
    } catch (e) {
        console.error("Error restoring app state:", e);
    }
    return false;
}

// Slider functions
let slideInterval;

function renderSlides() {
    if (!sliderContainer || !sliderDotsContainer) return;
    
    sliderContainer.innerHTML = '';
    sliderDotsContainer.innerHTML = '';
    
    appState.slider.slides.forEach((slide, index) => {
        const slideElement = document.createElement('div');
        slideElement.className = 'slide';
        slideElement.innerHTML = `
            <img src="${slide.imageUrl || slide.image}" alt="${slide.title || ''}">
            ${slide.title ? `
            <div class="slide-content">
                <h2>${slide.title}</h2>
                ${slide.description ? `<p>${slide.description}</p>` : ''}
            </div>` : ''}
        `;
        
        if (slide.link) {
            slideElement.addEventListener('click', () => {
                saveAppState();
                window.location.href = slide.link;
            });
        }
        
        sliderContainer.appendChild(slideElement);
        
        const dot = document.createElement('div');
        dot.className = 'slider-dot';
        if (index === appState.slider.currentSlide) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(index));
        sliderDotsContainer.appendChild(dot);
    });
    
    updateSliderPosition();
}

function updateSliderPosition() {
    if (!sliderContainer) return;
    sliderContainer.style.transform = `translateX(${-appState.slider.currentSlide * 100}%)`;
    
    document.querySelectorAll('.slider-dot').forEach((dot, index) => {
        dot.classList.toggle('active', index === appState.slider.currentSlide);
    });
}

function startAutoSlide() {
    stopAutoSlide();
    if (appState.slider.isAutoSliding) {
        slideInterval = setInterval(nextSlide, 5000);
    }
}

function stopAutoSlide() {
    clearInterval(slideInterval);
}

function nextSlide() {
    appState.slider.currentSlide = (appState.slider.currentSlide + 1) % appState.slider.slides.length;
    updateSliderPosition();
    saveAppState();
}

function prevSlide() {
    appState.slider.currentSlide = (appState.slider.currentSlide - 1 + appState.slider.slides.length) % appState.slider.slides.length;
    updateSliderPosition();
    saveAppState();
}

function goToSlide(index) {
    appState.slider.currentSlide = index;
    updateSliderPosition();
    saveAppState();
}

function getDefaultSlides() {
    return [
        {
            image: 'assets/img/work1.png',
            title: 'Quality Healthcare',
            description: 'Connecting you with trusted professionals',
            link: 'professionals.html'
        },
        {
            image: 'assets/img/work2.png',
            title: 'Medical Equipment',
            description: 'Find quality healthcare products',
            link: 'marketplace.html'
        }
    ];
}

// Professional functions
function displayProfessionals(professionalsData) {
    if (!profilesContainer) return;
    
    appState.professionals = professionalsData;
    profilesContainer.innerHTML = '';
    
    if (professionalsData) {
        const professionalsArray = Object.keys(professionalsData).map(key => ({
            id: key,
            ...professionalsData[key],
            pos: professionalsData[key].pos || 9999
        })).sort((a, b) => a.pos - b.pos);
        
        const featuredProfessionals = professionalsArray.slice(0, 10);
        
        if (featuredProfessionals.length > 0) {
            featuredProfessionals.forEach(professional => {
                const profileCard = document.createElement('div');
                
                const displayName = professional.name.length > 20 
    ? professional.name.substring(0, 14) + '...' 
    : professional.name;
                profileCard.classList.add('profile-card');
                profileCard.innerHTML = `
                    <img src="${professional.img || 'assets/img/profile.png'}" 
                         alt="${professional.name}"
                         class="profile-image">
                    <p2>${displayName}</p2>
                    <p class="specialty">${professional.job || 'Healthcare Professional'}</p>
                    ${professional.specialty ? `<p class="specialty">${professional.specialty}</p>` : ''}
                `;
                
                profileCard.addEventListener('click', () => {
                    saveAppState();
                    window.location.href = `users.html?id=${professional.id}`;
                });
                
                profilesContainer.appendChild(profileCard);
            });
        } else {
            profilesContainer.innerHTML = '<p>No featured professionals found.</p>';
        }
    } else {
        profilesContainer.innerHTML = '<p>No featured professionals found.</p>';
    }
    
    hideLoading('featured-professionals');
}



// Product functions
function displayFeaturedProducts(productsData) {
    if (!productsContainer) return;
    
    appState.products = productsData;
    productsContainer.innerHTML = '';
    
    const productArray = Object.values(productsData || {}).sort((a, b) => (b.time || 0) - (a.time || 0)).slice(0, 4);
    
    if (productArray.length > 0) {
        productArray.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <img src="${product.img}" alt="${product.title}">
                <p2>${product.title}</p2>
                <p>${product.price || 'Brief description of product.'}</p>
            `;
            
            productCard.addEventListener('click', () => {
                saveAppState();
                window.location.href = `display.html?title=${encodeURIComponent(product.title)}&img=${encodeURIComponent(product.img)}&price=${encodeURIComponent(product.price)}&push=${encodeURIComponent(product.push)}&description=${encodeURIComponent(product.description)}&delivery=${encodeURIComponent(product.delivery)}`;
            });
            
            productsContainer.appendChild(productCard);
        });
        
        const viewMoreContainer = document.querySelector('.view-more-container');
        if (viewMoreContainer) {
            viewMoreContainer.style.display = Object.keys(productsData || {}).length > 4 ? 'block' : 'none';
        }
    } else {
        productsContainer.innerHTML = '<p>No featured products found.</p>';
        const viewMoreContainer = document.querySelector('.view-more-container');
        if (viewMoreContainer) viewMoreContainer.style.display = 'none';
    }
    
    hideLoading('featured-products');
}

// Centers functions
function displayFeaturedCenters(centersData) {
    if (!centersContainer) return;
    
    appState.centers = centersData;
    centersContainer.innerHTML = '';
    
    const centersArray = Object.keys(centersData).map(key => ({
            id: key,
            ...centersData[key],
            pos: centersData[key].pos || 9999
        })).sort((a, b) => a.pos - b.pos).slice(0, 7);
    
    if (centersArray.length > 0) {
        centersArray.forEach(center => {
            const centerCard = document.createElement('div');
            centerCard.className = 'center-card';
                centerCard.innerHTML = `
                    <img src="${center.img || 'assets/img/center-placeholder.jpg'}" alt="${center.centerName}">
                    <div class="center-card-content">
                        <h3>${center.centerName}</h3>
                        <p class="center-date">${center.centerType}</p>
                        
                        <a href="center_details.html?id=${center.userId}" class="read-more">View Details</a>
                    </div>
                `;
            
            centerCard.addEventListener('click', () => {
                saveAppState();
                window.location.href = `users.html?id=${center.userId}`;
            });
            
            centersContainer.appendChild(centerCard);
        });
    } else {
        centersContainer.innerHTML = '<p>No centers found.</p>';
    }
    
    hideLoading('centers-section');
}

// Design functions
function displayDesigns(designsData) {
    if (!designsSlider || !designsDotsContainer) return;
    
    appState.designs = designsData;
    designsSlider.innerHTML = '';
    designsDotsContainer.innerHTML = '';
    
    if (designsData) {
        const designsArray = Object.values(designsData);
        
        if (designsArray.length > 0) {
            appState.designsSlider.slides = designsArray;
            
            designsArray.forEach((design, index) => {
                const slideElement = document.createElement('div');
                slideElement.className = 'design-slide';
                slideElement.innerHTML = `
                    <img src="${design.imageUrl}" alt="${design.title || 'Design Idea'}">
                `;
                
                // Add click event to redirect to WhatsApp
                slideElement.addEventListener('click', () => {
                    redirectToWhatsAppWithDesign(design);
                });
                
                designsSlider.appendChild(slideElement);
                
                const dot = document.createElement('div');
                dot.className = 'designs-dot';
                if (index === appState.designsSlider.currentSlide) dot.classList.add('active');
                dot.addEventListener('click', () => goToDesignSlide(index));
                designsDotsContainer.appendChild(dot);
            });
            
            updateDesignsSliderPosition();
        } else {
            designsSlider.innerHTML = '<p>No design ideas available at the moment.</p>';
        }
    } else {
        designsSlider.innerHTML = '<p>No design ideas available at the moment.</p>';
    }
    
    hideLoading('designs-section');
}

// Professional22 functions
function displayProfessionals22(professionalsData22) {
    if (!profilesContainer22) return;
    
    appState.professionals22 = professionalsData22;
    profilesContainer22.innerHTML = '';
    
    if (professionalsData22) {
        const professionalsArray = Object.keys(professionalsData22).map(key => ({
            id: key,
            ...professionalsData22[key],
            timestamp: professionalsData22[key].timestamp || 0
        })).sort((a, b) => b.timestamp - a.timestamp);
        
        const featuredProfessionals22 = professionalsArray.slice(0, 10);
        
        if (featuredProfessionals22.length > 0) {
            featuredProfessionals22.forEach(professional => {
                const profileCard = document.createElement('div');
               
               const displayName = professional.name.length > 20 
    ? professional.name.substring(0, 14) + '...' 
    : professional.name;
                profileCard.classList.add('profile-card');
                profileCard.innerHTML = `
                    <img src="${professional.img || 'assets/img/profile.png'}" 
                         alt="${professional.name}"
                         class="profile-image">
                    <p2>${displayName}</p2>
                    <p class="specialty">${professional.job || 'Healthcare Professional'}</p>
                    ${professional.specialty ? `<p class="specialty">${professional.specialty}</p>` : ''}
                `;
                
                profileCard.addEventListener('click', () => {
                    saveAppState();
                    window.location.href = `users.html?id=${professional.id}`;
                });
                
                profilesContainer22.appendChild(profileCard);
            });
        } else {
            profilesContainer22.innerHTML = '<p>No featured professionals found.</p>';
        }
    } else {
        profilesContainer22.innerHTML = '<p>No featured professionals found.</p>';
    }
    
    hideLoading('featured-professionals22');
}



// Blog functions
function displayLatestBlogPosts(blogPostsData) {
    if (!blogsContainer) return;
    
    appState.blogPosts = blogPostsData;
    blogsContainer.innerHTML = '';
    
    if (blogPostsData) {
        // Convert to array and sort by timestamp (newest first)
        const blogPostsArray = Object.keys(blogPostsData).map(key => ({
            id: key,
            ...blogPostsData[key],
            timestamp: blogPostsData[key].timestamp || 0
        })).sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
        
        if (blogPostsArray.length > 0) {
            blogPostsArray.forEach(blogPost => {
                const blogCard = document.createElement('div');
                blogCard.className = 'blog-card';
                
                // Format date if available
                const postDate = blogPost.timestamp ? 
                    new Date(blogPost.timestamp).toLocaleDateString() : 
                    'Recent';
                
                blogCard.innerHTML = `
                    <img src="${blogPost.img || 'assets/img/blog-placeholder.jpg'}" alt="${blogPost.title}">
                    <div class="blog-card-content">
                        <h3>${blogPost.title || 'Untitled Post'}</h3>
                        <p class="blog-date">${postDate}</p>
                        <p>${(blogPost.description || '').substring(0, 100)}...</p>
                        
                    </div>
                `;
                
                blogCard.addEventListener('click', () => {
                    saveAppState();
                    window.location.href = `fullgist.html?id=${blogPost.id}`;
                });
                
                blogsContainer.appendChild(blogCard);
            });
        } else {
            blogsContainer.innerHTML = '<p>No blog posts found.</p>';
        }
    } else {
        blogsContainer.innerHTML = '<p>No blog posts found.</p>';
    }
    
    hideLoading('blog-section');
}

// Course functions
function displayCourses(coursesData) {
    if (!coursesContainer) return;
    
    appState.courses = coursesData;
    coursesContainer.innerHTML = '';
    
    const coursesArray = Object.values(coursesData || {}).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 4);
    
    if (coursesArray.length > 0) {
        coursesArray.forEach(course => {
            const courseCard = document.createElement('div');
            courseCard.className = 'course-card';
            courseCard.innerHTML = `
                <img src="${course.img}" alt="${course.title}">
                <h3>${course.title}</h3>
                <p>${course.description.substring(0, 100)}...</p>
            `;
            
            courseCard.addEventListener('click', () => {
                saveAppState();
                window.location.href = `course_details.html?id=${course.push}`;
            });
            
            coursesContainer.appendChild(courseCard);
        });
    } else {
        coursesContainer.innerHTML = '<p>No courses available.</p>';
    }
    
    hideLoading('courses-section');
}

// Tools functions
function displayTools(toolsData) {
    if (!toolsContainer) return;
    
    appState.tools = toolsData;
    toolsContainer.innerHTML = '';
    
    const toolsArray = Object.values(toolsData || {}).sort((a, b) => (b.time || 0) - (a.time || 0)).slice(0, 4);
    
    if (toolsArray.length > 0) {
        // Show the tools section
        document.getElementById('tools-section');
        
        toolsArray.forEach(tool => {
            const toolCard = document.createElement('div');
            toolCard.className = 'tool-card';
            toolCard.innerHTML = `
                
                <h3>${tool.title}</h3>
                
                 <div class="tool-actions">
          <button class="btn btn-secondary view-btn" data-url="${tool.pdfUrl}">
            <i class='bx bx-download'></i> Download
          </button>
          ${tool.pdfUrl ? `
         ` : ''}
        </div>
            `;
            
            // Add event listeners to download buttons
            document.querySelectorAll('.download-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const toolId = this.getAttribute('data-id');
                    const tool = toolsData.find(t => t.push === toolId);
                    if (tool) {
                        generateToolDocument(tool);
                    }
                });
            });
            
            // Add event listeners to view buttons
            document.querySelectorAll('.view-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const pdfUrl = this.getAttribute('data-url');
                    window.open(pdfUrl, '_blank');
                });
            });

            toolsContainer.appendChild(toolCard);
        });
    } else {
        // Hide the tools section if no tools
        document.getElementById('tools-section').style.display = 'none';
    }
    
    hideLoading('tools-section');
}

// Error handler function
function handleProfessionalError(sectionId) {
    return error => {
        console.error(`Error loading ${sectionId}:`, error);
        const container = document.querySelector(
            sectionId === 'featured-professionals' ? '.profiles-container' :
            sectionId === 'featured-professionals22' ? '.profiles-container22' : null
        );
        if (container) container.innerHTML = '<p class="error">Error loading professionals. Showing cached data.</p>';
        hideLoading(sectionId);
    };
}

// Initialize the application
function initializeApp() {
    const stateRestored = restoreAppState();
    
    // Check navigation type
    const navigationEntries = performance.getEntriesByType("navigation");
    const navigationType = navigationEntries.length > 0 ? navigationEntries[0].type : '';
    const isBackNavigation = navigationType === 'back_forward';
    
    // Use cached data for back navigation
    if (stateRestored && isBackNavigation) {
        if (appState.professionals) displayProfessionals(appState.professionals);
        if (appState.professionals22) displayProfessionals22(appState.professionals22);
        if (appState.products) displayFeaturedProducts(appState.products);
        if (appState.centers) displayFeaturedCenters(appState.centers);
        if (appState.designs.length > 0) {
            displayDesigns(appState.designs);
            startDesignsAutoSlide();
        }
        if (appState.courses) displayCourses(appState.courses);
        if (appState.designs) displayDesigns(appState.designs);
        if (appState.blogPosts) displayLatestBlogPosts(appState.blogPosts);
        if (appState.tools) displayTools(appState.tools);
   
        if (appState.slider.slides.length > 0) {
            renderSlides();
            if (appState.slider.isAutoSliding) startAutoSlide();
        }
        
        
        
        // Update authentication state if needed
        if (appState.isLoggedIn && !firebase.auth().currentUser) {
            firebase.auth().onAuthStateChanged(user => {
                if (user) handleAuthenticatedState(user);
            });
        }
        
        return; // Skip fetching new data
    }
    
    // Initialize slider
    if (stateRestored && appState.slider.slides.length > 0) {
        renderSlides();
        if (appState.slider.isAutoSliding) startAutoSlide();
    } else {
        sliderRef.once('value').then(snapshot => {
            const sliderData = snapshot.val();
            appState.slider.slides = sliderData ? Object.values(sliderData) : getDefaultSlides();
            renderSlides();
            startAutoSlide();
        }).catch(error => {
            console.error("Error loading slider:", error);
            appState.slider.slides = getDefaultSlides();
            renderSlides();
            startAutoSlide();
        });
    }
    
    // Initialize professionals for both sections
    if (stateRestored) {
        if (appState.professionals) displayProfessionals(appState.professionals);
        if (appState.professionals22) displayProfessionals22(appState.professionals22);
    } else {
        // Original professionals section
        showLoading('featured-professionals');
        professionalsRef.once('value').then(snapshot => {
            displayProfessionals(snapshot.val());
            hideLoading('featured-professionals');
        }).catch(handleProfessionalError('featured-professionals'));

        // New professionals22 section
        showLoading('featured-professionals22');
        professionalsRef.orderByChild('timestamp').limitToLast(10).once('value').then(snapshot => {
            displayProfessionals22(snapshot.val());
            hideLoading('featured-professionals22');
        }).catch(handleProfessionalError('featured-professionals22'));
    }
    
    // Initialize products
    if (stateRestored && appState.products) {
        displayFeaturedProducts(appState.products);
    } else {
        showLoading('featured-products');
        productsRef.once('value').then(snapshot => {
            displayFeaturedProducts(snapshot.val());
        }).catch(error => {
            console.error("Error loading products:", error);
            if (productsContainer) {
                productsContainer.innerHTML = '<p class="error">Error loading products. Showing cached data.</p>';
            }
            hideLoading('featured-products');
        });
    }
    
    // Initialize centers
    if (stateRestored && appState.centers) {
        displayFeaturedCenters(appState.centers);
    } else {
        showLoading('centers-section');
        centersRef.once('value').then(snapshot => {
            displayFeaturedCenters(snapshot.val());
        }).catch(error => {
            console.error("Error loading centers:", error);
            if (centersContainer) {
                centersContainer.innerHTML = '<p class="error">Error loading centers. Showing cached data.</p>';
            }
            hideLoading('centers-section');
        });
    }
    
    // Initialize designs
    if (stateRestored && appState.designs.length > 0) {
        displayDesigns(appState.designs);
        startDesignsAutoSlide();
    } else {
        showLoading('designs-section');
        designsRef.once('value').then(snapshot => {
            displayDesigns(snapshot.val());
            startDesignsAutoSlide();
        }).catch(error => {
            console.error("Error loading designs:", error);
            if (designsSlider) {
                designsSlider.innerHTML = '<p class="error">Error loading designs.</p>';
            }
            hideLoading('designs-section');
        });
    }
    
    // Initialize blogs
if (stateRestored && appState.blogPosts) {
    displayLatestBlogPosts(appState.blogPosts);
} else {
    showLoading('blog-section');
    blogPostsRef.once('value').then(snapshot => {
        displayLatestBlogPosts(snapshot.val());
    }).catch(error => {
        console.error("Error loading blog posts:", error);
        if (blogsContainer) {
            blogsContainer.innerHTML = '<p class="error">Error loading blog posts.</p>';
        }
        hideLoading('blog-section');
    });
}
    
    // Initialize courses
    if (stateRestored && appState.courses) {
        displayCourses(appState.courses);
    } else {
        showLoading('courses-section');
        coursesRef.once('value').then(snapshot => {
            displayCourses(snapshot.val());
        }).catch(error => {
            console.error("Error loading courses:", error);
            if (coursesContainer) {
                coursesContainer.innerHTML = '<p class="error">Error loading courses.</p>';
            }
            hideLoading('courses-section');
        });
    }
    
    // Initialize tools
    if (stateRestored && appState.tools) {
        displayTools(appState.tools);
    } else {
        showLoading('tools-section');
        toolsRef.once('value').then(snapshot => {
            displayTools(snapshot.val());
        }).catch(error => {
            console.error("Error loading tools:", error);
            if (toolsContainer) {
                toolsContainer.innerHTML = '<p class="error">Error loading tools.</p>';
            }
            hideLoading('tools-section');
        });
    }
    
    // Set up event listeners
    if (sliderContainer) {
        sliderContainer.addEventListener('mouseenter', stopAutoSlide);
        sliderContainer.addEventListener('mouseleave', () => {
            appState.slider.isAutoSliding = true;
            startAutoSlide();
        });
    }
    
    document.querySelector('.slider-prev')?.addEventListener('click', () => {
        prevSlide();
        appState.slider.isAutoSliding = false;
        startAutoSlide();
    });
    
    document.querySelector('.slider-next')?.addEventListener('click', () => {
        nextSlide();
        appState.slider.isAutoSliding = false;
        startAutoSlide();
    });
    
    // Set up event listeners for designs controls
    document.querySelector('.designs-prev')?.addEventListener('click', () => {
        prevDesignSlide();
        appState.designsSlider.isAutoSliding = false;
        startDesignsAutoSlide();
    });
    
    document.querySelector('.designs-next')?.addEventListener('click', () => {
        nextDesignSlide();
        appState.designsSlider.isAutoSliding = false;
        startDesignsAutoSlide();
    });
    
    const designsContainer = document.querySelector('.designs-slider-container');
    if (designsContainer) {
        designsContainer.addEventListener('mouseenter', stopDesignsAutoSlide);
        designsContainer.addEventListener('mouseleave', () => {
            appState.designsSlider.isAutoSliding = true;
            startDesignsAutoSlide();
        });
    }
    
    // Save state before unload
    window.addEventListener('beforeunload', saveAppState);
    window.addEventListener('pagehide', saveAppState);
}

// Start the application
document.addEventListener('DOMContentLoaded', initializeApp);