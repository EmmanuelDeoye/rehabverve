// tele.js – Teletherapy page functionality

document.addEventListener('DOMContentLoaded', function() {
    initHeroLottie();
    initFloatingCTA();
    initHowItWorksAnimation();
    initTestimonialsCarousel();
    initFaqAccordion();
    initFooterLottie();
});

// ==================== HERO LOTTIE ANIMATION ====================
function initHeroLottie() {
    const container = document.getElementById('hero-lottie');
    if (!container || typeof lottie === 'undefined') {
        console.warn('Lottie library not loaded or container missing');
        return;
    }

    lottie.loadAnimation({
        container: container,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        // High-quality online therapy/consultation animation
        path: 'https://assets2.lottiefiles.com/packages/lf20_jvxwtdtp.json'
    });
}

// ==================== FLOATING CTA ====================
function initFloatingCTA() {
    const floatingBtn = document.getElementById('floatingCta');
    const mainCTA = document.querySelector('.tele-btn--primary');
    if (!floatingBtn || !mainCTA) return;

    window.addEventListener('scroll', () => {
        const mainCTARect = mainCTA.getBoundingClientRect();
        const isMainCTAVisible = mainCTARect.top < window.innerHeight && mainCTARect.bottom > 0;

        if (!isMainCTAVisible) {
            floatingBtn.classList.add('show');
        } else {
            floatingBtn.classList.remove('show');
        }
    });
}

// ==================== HOW IT WORKS SCROLL ANIMATION ====================
function initHowItWorksAnimation() {
    const steps = document.querySelectorAll('.how-step');
    if (!steps.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // stop observing once animated
            }
        });
    }, {
        threshold: 0.2,
        rootMargin: '0px'
    });

    steps.forEach(step => observer.observe(step));
}

// ==================== TESTIMONIALS CAROUSEL ====================
function initTestimonialsCarousel() {
    const track = document.getElementById('testimonialsTrack');
    const prevBtn = document.getElementById('testimonialsPrev');
    const nextBtn = document.getElementById('testimonialsNext');
    const dotsContainer = document.getElementById('testimonialsDots');

    if (!track || !prevBtn || !nextBtn || !dotsContainer) return;

    const cards = Array.from(track.children);
    if (cards.length === 0) return;

    let currentIndex = 0;
    let cardWidth = cards[0].getBoundingClientRect().width + 24; // include gap (1.5rem = 24px)
    let cardsPerView = getCardsPerView();

    function getCardsPerView() {
        if (window.innerWidth >= 992) return 3;
        if (window.innerWidth >= 768) return 2;
        return 1;
    }

    function updateDots() {
        const totalDots = Math.ceil(cards.length / cardsPerView);
        dotsContainer.innerHTML = '';
        for (let i = 0; i < totalDots; i++) {
            const dot = document.createElement('div');
            dot.className = 'testimonials-dot';
            if (i === Math.floor(currentIndex / cardsPerView)) {
                dot.classList.add('active');
            }
            dot.addEventListener('click', () => {
                currentIndex = i * cardsPerView;
                if (currentIndex + cardsPerView > cards.length) {
                    currentIndex = cards.length - cardsPerView;
                }
                moveTrack();
                updateDots();
            });
            dotsContainer.appendChild(dot);
        }
    }

    function moveTrack() {
        track.style.transform = `translateX(-${currentIndex * cardWidth}px)`;
    }

    function handleResize() {
        cardWidth = cards[0].getBoundingClientRect().width + 24;
        cardsPerView = getCardsPerView();
        if (currentIndex + cardsPerView > cards.length) {
            currentIndex = Math.max(0, cards.length - cardsPerView);
        }
        moveTrack();
        updateDots();
    }

    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex -= 1;
        } else {
            currentIndex = cards.length - cardsPerView;
        }
        moveTrack();
        updateDots();
    });

    nextBtn.addEventListener('click', () => {
        if (currentIndex + cardsPerView < cards.length) {
            currentIndex += 1;
        } else {
            currentIndex = 0;
        }
        moveTrack();
        updateDots();
    });

    // Add touch/swipe support for mobile
    let touchStartX = 0;
    let touchEndX = 0;

    track.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    track.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        const swipeThreshold = 50;
        if (touchEndX < touchStartX - swipeThreshold) {
            // Swipe left - next
            if (currentIndex + cardsPerView < cards.length) {
                currentIndex += 1;
            } else {
                currentIndex = 0;
            }
            moveTrack();
            updateDots();
        }
        if (touchEndX > touchStartX + swipeThreshold) {
            // Swipe right - previous
            if (currentIndex > 0) {
                currentIndex -= 1;
            } else {
                currentIndex = cards.length - cardsPerView;
            }
            moveTrack();
            updateDots();
        }
    }

    window.addEventListener('resize', handleResize);
    
    // Initialize
    handleResize();
    
    // Auto-advance every 5 seconds
    let autoAdvance = setInterval(() => {
        if (currentIndex + cardsPerView < cards.length) {
            currentIndex += 1;
        } else {
            currentIndex = 0;
        }
        moveTrack();
        updateDots();
    }, 5000);

    // Pause auto-advance on hover
    track.addEventListener('mouseenter', () => clearInterval(autoAdvance));
    track.addEventListener('mouseleave', () => {
        autoAdvance = setInterval(() => {
            if (currentIndex + cardsPerView < cards.length) {
                currentIndex += 1;
            } else {
                currentIndex = 0;
            }
            moveTrack();
            updateDots();
        }, 5000);
    });
}

// ==================== FAQ ACCORDION ====================
function initFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    if (!faqItems.length) return;

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (!question) return;

        question.addEventListener('click', () => {
            // Close other items (optional - uncomment if you want auto-close)
            // faqItems.forEach(otherItem => {
            //     if (otherItem !== item && otherItem.classList.contains('active')) {
            //         otherItem.classList.remove('active');
            //     }
            // });
            
            // Toggle current item
            item.classList.toggle('active');
        });

        // Allow keyboard activation (Enter or Space)
        question.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.classList.toggle('active');
            }
        });
    });
}

// ==================== FOOTER LOTTIE ANIMATION ====================
function initFooterLottie() {
    const animationContainer = document.getElementById('lottie-animation');
    if (!animationContainer || typeof lottie === 'undefined') return;

    lottie.loadAnimation({
        container: animationContainer,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'https://assets9.lottiefiles.com/packages/lf20_pz9jz1.json' // Online therapy / consultation
    });
}

// ==================== SMOOTH SCROLL FOR ANCHOR LINKS ====================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#' || href === '#0') return;
        
        const targetElement = document.querySelector(href);
        if (targetElement) {
            e.preventDefault();
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ==================== PRICING CARD HOVER EFFECTS ====================
function enhancePricingCards() {
    const pricingCards = document.querySelectorAll('.pricing-card');
    pricingCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            pricingCards.forEach(c => c.style.opacity = '0.7');
            card.style.opacity = '1';
        });
        card.addEventListener('mouseleave', () => {
            pricingCards.forEach(c => c.style.opacity = '1');
        });
    });
}

// Call this after DOM is ready
document.addEventListener('DOMContentLoaded', enhancePricingCards);

// ==================== SERVICE CARD ANIMATION ON SCROLL ====================
function initServiceCardAnimation() {
    const serviceCards = document.querySelectorAll('.service-card');
    if (!serviceCards.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100); // Stagger effect
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px'
    });

    serviceCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}

// Call this after DOM is ready
document.addEventListener('DOMContentLoaded', initServiceCardAnimation);

// ==================== FORM VALIDATION FOR NEWSLETTER ====================
function initNewsletterForm() {
    const newsletterForm = document.querySelector('.newsletter-form');
    if (!newsletterForm) return;

    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = newsletterForm.querySelector('input[type="email"]');
        const email = emailInput.value.trim();

        if (!email || !isValidEmail(email)) {
            showToast('Please enter a valid email address', 'error');
            return;
        }

        // Here you would typically send to your backend
        showToast('Thank you for subscribing!', 'success');
        emailInput.value = '';
    });
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#28a745' : '#dc3545'};
        color: white;
        padding: 12px 24px;
        border-radius: 50px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideUp 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add toast animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from { opacity: 0; transform: translate(-50%, 20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
    }
    @keyframes slideDown {
        from { opacity: 1; transform: translate(-50%, 0); }
        to { opacity: 0; transform: translate(-50%, 20px); }
    }
`;
document.head.appendChild(style);

// Initialize newsletter form
document.addEventListener('DOMContentLoaded', initNewsletterForm);

// ==================== CTA BUTTON TRACKING (Optional) ====================
function initCTATracking() {
    const ctaButtons = document.querySelectorAll('[data-cta]');
    ctaButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const ctaName = button.getAttribute('data-cta');
            console.log(`CTA clicked: ${ctaName}`);
            // Here you could send analytics events
            // e.g., gtag('event', 'click', { 'event_category': 'CTA', 'event_label': ctaName });
        });
    });
}

document.addEventListener('DOMContentLoaded', initCTATracking);

// ==================== LAZY LOAD IMAGES ====================
function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    if (!images.length) return;

    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.getAttribute('data-src');
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

document.addEventListener('DOMContentLoaded', initLazyLoading);

// ==================== STICKY HEADER BEHAVIOR ====================
function initStickyHeader() {
    const header = document.querySelector('.l-header');
    if (!header) return;

    let lastScroll = 0;
    const scrollThreshold = 50;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll <= 0) {
            header.classList.remove('scroll-up');
            return;
        }

        if (currentScroll > lastScroll && currentScroll > scrollThreshold) {
            // Scrolling down
            header.classList.add('scroll-down');
            header.classList.remove('scroll-up');
        } else if (currentScroll < lastScroll) {
            // Scrolling up
            header.classList.add('scroll-up');
            header.classList.remove('scroll-down');
        }

        lastScroll = currentScroll;
    });
}

document.addEventListener('DOMContentLoaded', initStickyHeader);

// ==================== BACK TO TOP BUTTON ====================
function initBackToTop() {
    // Create button if it doesn't exist
    let backToTop = document.getElementById('back-to-top');
    if (!backToTop) {
        backToTop = document.createElement('button');
        backToTop.id = 'back-to-top';
        backToTop.innerHTML = '<i class="bx bx-chevron-up"></i>';
        backToTop.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #00BCD4;
            color: white;
            border: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            cursor: pointer;
            display: none;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            z-index: 999;
            transition: all 0.3s ease;
        `;
        document.body.appendChild(backToTop);
    }

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTop.style.display = 'flex';
        } else {
            backToTop.style.display = 'none';
        }
    });

    backToTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    backToTop.addEventListener('mouseenter', () => {
        backToTop.style.transform = 'translateY(-5px)';
        backToTop.style.boxShadow = '0 8px 20px rgba(0,188,212,0.4)';
    });

    backToTop.addEventListener('mouseleave', () => {
        backToTop.style.transform = 'translateY(0)';
        backToTop.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    });
}

document.addEventListener('DOMContentLoaded', initBackToTop);

// ==================== EXPORT FOR TESTING (if needed) ====================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initHeroLottie,
        initHowItWorksAnimation,
        initTestimonialsCarousel,
        initFaqAccordion
    };
}
