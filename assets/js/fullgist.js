// fullgist.js - Blog Details Page Functionality

// Get blog ID from URL parameters
function getBlogIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Format date for display
function formatDate(timestamp) {
    if (!timestamp) return '...';
    
    let date;
    
    // Handle different timestamp formats
    if (typeof timestamp === 'number') {
        // If it's a numeric timestamp (like Firebase timestamp)
        date = new Date(timestamp);
    } else if (timestamp.seconds) {
        // If it's a Firebase Timestamp object {seconds: xxx, nanoseconds: xxx}
        date = new Date(timestamp.seconds * 1000);
    } else if (typeof timestamp === 'string') {
        // If it's a date string
        date = new Date(timestamp);
    } else {
        // If it's already a Date object or other format
        date = new Date(timestamp);
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp:', timestamp);
        return 'Date not available';
    }
    
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Function to load and display blog post
function loadBlogPost() {
    const blogId = getBlogIdFromURL();
    const blogDetailsContainer = document.getElementById('blog-details-container');
    
    if (!blogId) {
        blogDetailsContainer.innerHTML = `
            <div class="error-message">
                <h3>Blog Post Not Found</h3>
                <p>Sorry, the blog post you're looking for doesn't exist.</p>
                <a href="blogs.html" class="read-more-btn">Back to Blogs</a>
            </div>
        `;
        return;
    }
    
    // Show loading state
    showLoading('blog-details-container');
    
    // Fetch blog post from Firebase
    const blogPostRef = firebase.database().ref(`blogPosts/${blogId}`);
    blogPostRef.once('value').then(snapshot => {
        const blogPost = snapshot.val();
        
        if (!blogPost) {
            blogDetailsContainer.innerHTML = `
                <div class="error-message">
                    <h3>Blog Post Not Found</h3>
                    <p>Sorry, the blog post you're looking for doesn't exist.</p>
                    <a href="blogs.html" class="read-more-btn">Back to Blogs</a>
                </div>
            `;
            return;
        }
        
        // Display blog post
        displayBlogPost(blogPost, blogId);
        
        // Load related posts
        loadRelatedPosts(blogPost.category, blogId);
        
        // Set up social sharing
        setupSocialSharing(blogPost.title, window.location.href);
        
        hideLoading('blog-details-container');
        
        // Load additional ads after content is loaded
        setTimeout(loadAdditionalAds, 1000);
    }).catch(error => {
        console.error("Error loading blog post:", error);
        blogDetailsContainer.innerHTML = `
            <div class="error-message">
                <h3>Error Loading Blog Post</h3>
                <p>There was an error loading the blog post. Please try again later.</p>
                <a href="blogs.html" class="read-more-btn">Back to Blogs</a>
            </div>
        `;
        hideLoading('blog-details-container');
    });
}

// Function to display blog post content
function displayBlogPost(blogPost, blogId) {
    const blogDetailsContainer = document.getElementById('blog-details-container');
    
    // Format content with proper HTML structure
    const formattedContent = formatBlogContent(blogPost.content || '');
    
    blogDetailsContainer.innerHTML = `
        <img src="${blogPost.img || 'assets/img/blog-placeholder.jpg'}" alt="${blogPost.title}" class="blog-header-image">
        <div class="blog-content">
            <h1 class="blog-title">${blogPost.title}</h1>
            <div class="blog-meta">
                <div class="blog-date">
                    <i class='bx bx-calendar'></i>
                    <span>${formatDate(blogPost.timestamp)}</span>
                </div>
                <div class="blog-author">
                    <i class='bx bx-user'></i>
                    <span>${blogPost.author || 'RehabVerve Team'}</span>
                </div>
                <div class="blog-category">
                    <i class='bx bx-category'></i>
                    <span>${blogPost.category || 'General'}</span>
                </div>
            </div>
            <div class="blog-text">
                ${formattedContent}
            </div>
        </div>
    `;
}

// Function to format blog content with proper HTML structure
function formatBlogContent(content) {
    // This is a basic formatter - you can extend it based on your content structure
    // For example, if you store content with markdown-like syntax
    
    // Replace line breaks with paragraphs
    let formattedContent = content.replace(/\n\n/g, '</p><p>');
    formattedContent = formattedContent.replace(/\n/g, '<br>');
    
    // Wrap in paragraph tags if not already
    if (!formattedContent.startsWith('<p>')) {
        formattedContent = `<p>${formattedContent}</p>`;
    }
    
    // Add some sample formatting for demonstration
    // In a real implementation, you might store formatted content in your database
    formattedContent = formattedContent
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic text
        .replace(/&gt;&gt;(.*?)&lt;&lt;/g, '<blockquote>$1</blockquote>') // Blockquotes
        // Make URLs clickable
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="blog-content-link">$1</a>')
        // Make www URLs clickable (without http)
        .replace(/(^|\s)(www\.[^\s]+)/g, '$1<a href="https://$2" target="_blank" rel="noopener noreferrer" class="blog-content-link">$2</a>')
        // Make email addresses clickable
        .replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi, '<a href="mailto:$1" class="blog-content-link">$1</a>');
    
    // Insert banner ads at strategic positions in the content
    const contentBannerAd = `
        <div class="content-banner-ad">
            <!-- Banner Ad 1: Desktop (728x90) -->
            <div class="banner-ad-desktop">
                <script type="text/javascript">
                    atOptions = {
                        'key' : 'e6b690fb2b3ac42d67756768c4284562',
                        'format' : 'iframe',
                        'height' : 90,
                        'width' : 728,
                        'params' : {}
                    };
                </script>
                <script type="text/javascript" src="//www.highperformanceformat.com/e6b690fb2b3ac42d67756768c4284562/invoke.js"></script>
            </div>
            <!-- Banner Ad 2: Mobile (320x50) -->
            <div class="banner-ad-mobile">
                <script type="text/javascript">
                    atOptions = {
                        'key' : 'e3590448e3b2e4da076d2042b6e8c162',
                        'format' : 'iframe',
                        'height' : 50,
                        'width' : 320,
                        'params' : {}
                    };
                </script>
                <script type="text/javascript" src="//www.highperformanceformat.com/e3590448e3b2e4da076d2042b6e8c162/invoke.js"></script>
            </div>
        </div>
    `;
    
    // Split the content and insert ads at strategic positions
    const paragraphs = formattedContent.split('</p>');
    
    if (paragraphs.length > 6) {
        // Insert ads after 1/3 and 2/3 of content
        const firstAdPosition = Math.floor(paragraphs.length / 3);
        const secondAdPosition = Math.floor(paragraphs.length * 2 / 3);
        
        const firstPart = paragraphs.slice(0, firstAdPosition).join('</p>') + '</p>';
        const middlePart = paragraphs.slice(firstAdPosition, secondAdPosition).join('</p>') + '</p>';
        const lastPart = paragraphs.slice(secondAdPosition).join('</p>');
        
        formattedContent = firstPart + contentBannerAd + middlePart + contentBannerAd + lastPart;
    } else if (paragraphs.length > 3) {
        // If content is medium length, insert ad in the middle
        const middleIndex = Math.floor(paragraphs.length / 2);
        const firstHalf = paragraphs.slice(0, middleIndex).join('</p>') + '</p>';
        const secondHalf = paragraphs.slice(middleIndex).join('</p>');
        formattedContent = firstHalf + contentBannerAd + secondHalf;
    } else {
        // If content is short, just append ad at the end
        formattedContent += contentBannerAd;
    }
    
    return formattedContent;
}

// Function to load additional ads after page load
function loadAdditionalAds() {
    // This ensures ads load properly after DOM is ready
    console.log('Loading additional ads...');
    
    // You can add any additional ad loading logic here
    // The ads in the HTML should automatically load
}

// Function to load related posts
function loadRelatedPosts(category, currentBlogId) {
    const relatedPostsGrid = document.getElementById('related-posts-grid');
    
    // Fetch all blog posts
    const blogPostsRef = firebase.database().ref('blogPosts');
    blogPostsRef.once('value').then(snapshot => {
        const blogPostsData = snapshot.val();
        const blogPostsArray = blogPostsData ? Object.entries(blogPostsData) : [];
        
        // Filter related posts by category, excluding current post
        const relatedPosts = blogPostsArray
            .filter(([id, post]) => id !== currentBlogId && post.category === category)
            .slice(0, 4) // Limit to 3 related posts
            .map(([id, post]) => ({ id, ...post }));
        
        displayRelatedPosts(relatedPosts);
    }).catch(error => {
        console.error("Error loading related posts:", error);
        relatedPostsGrid.innerHTML = '<p>Unable to load related posts.</p>';
    });
}

// Function to display related posts
function displayRelatedPosts(relatedPosts) {
    const relatedPostsGrid = document.getElementById('related-posts-grid');
    
    if (relatedPosts.length === 0) {
        relatedPostsGrid.innerHTML = '<p>No related posts found.</p>';
        return;
    }
    
    relatedPostsGrid.innerHTML = relatedPosts.map(post => `
        <div class="related-post-card" onclick="window.location.href='fullgist.html?id=${post.id}'">
            <img src="${post.img || 'assets/img/blog-placeholder.jpg'}" alt="${post.title}">
            <div class="related-post-content">
                <h4 class="related-post-title">${post.title}</h4>
                <p class="related-post-excerpt">${post.description.substring(0, 100)}...</p>
                <a href="fullgist.html?id=${post.id}" class="read-more-btn">Read More</a>
            </div>
        </div>
    `).join('');
}

// Function to set up social sharing
function setupSocialSharing(title, url) {
    const encodedTitle = encodeURIComponent(title);
    const encodedUrl = encodeURIComponent(url);
    
    // Facebook share
    document.querySelector('.social-share-btn.facebook').href = 
        `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    
    // Twitter share
    document.querySelector('.social-share-btn.twitter').href = 
        `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
    
    // LinkedIn share
    document.querySelector('.social-share-btn.linkedin').href = 
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    
    // WhatsApp share
    document.querySelector('.social-share-btn.whatsapp').href = 
        `https://api.whatsapp.com/send?text=${encodedTitle} ${encodedUrl}`;
}

// Helper function to show loading state
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.classList.add('loading');
    }
}

// Helper function to hide loading state
function hideLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.classList.remove('loading');
    }
}

// Initialize the blog details page
document.addEventListener('DOMContentLoaded', () => {
    loadBlogPost();
});