/*===== MENU TOGGLE =====*/
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initializePage();
});

function initializePage() {
    
    animateSections();
    setupNavigation();
}

/*===== MENU SHOW =====*/
const showMenu = (toggleId, navId) =>{
    const toggle = document.getElementById(toggleId),
    nav = document.getElementById(navId)

    if(toggle && nav){
        toggle.addEventListener('click', ()=>{
            nav.classList.toggle('show')
        })
    }
}
showMenu('nav-toggle','profile-image-nav','nav-menu')

/*==================== REMOVE MENU MOBILE ====================*/
const navLink = document.querySelectorAll('.nav__link')

function linkAction(){
    const navMenu = document.getElementById('nav-menu')
    // When we click on each nav__link, we remove the show-menu class
    navMenu.classList.remove('show')
}
navLink.forEach(n => n.addEventListener('click', linkAction))

/*==================== SCROLL SECTIONS ACTIVE LINK ====================*/
const sections = document.querySelectorAll('section[id]')

const scrollActive = () =>{
    const scrollDown = window.scrollY

  sections.forEach(current =>{
        const sectionHeight = current.offsetHeight,
              sectionTop = current.offsetTop - 58,
              sectionId = current.getAttribute('id'),
              sectionsClass = document.querySelector('.nav__menu a[href*=' + sectionId + ']')

        if(scrollDown > sectionTop && scrollDown <= sectionTop + sectionHeight){
            if (sectionsClass) { // Check if sectionsClass exists (is not null)
                sectionsClass.classList.add('active-link')
            }
        }else{
            if (sectionsClass) { // Check if sectionsClass exists (is not null)
                sectionsClass.classList.remove('active-link')
            }
        }
    })
}
window.addEventListener('scroll', scrollActive)


/*===== SECTION ANIMATIONS =====*/
function animateSections() {
    const sections = document.querySelectorAll('.section-animate');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('section-visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    sections.forEach(section => {
        observer.observe(section);
    });
}

/*===== SINGLE PAGE NAVIGATION =====*/
function setupNavigation() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    const navLinks = document.querySelectorAll('.nav__link');
    let previousPage = null;
    
    async function handleNavigation(e) {
        e.preventDefault();
        const targetUrl = this.getAttribute('href');
        
        if (window.location.pathname === new URL(targetUrl, window.location.origin).pathname) {
            return;
        }
        
        previousPage = {
            url: window.location.href,
            content: mainContent.innerHTML
        };
        
        try {
            mainContent.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
            
            const response = await fetch(targetUrl);
            if (!response.ok) throw new Error('Network error');
            
            const text = await response.text();
            const parser = new DOMParser();
            const newDoc = parser.parseFromString(text, 'text/html');
            const newContent = newDoc.getElementById('main-content').innerHTML;
            
            window.history.pushState({}, '', targetUrl);
            mainContent.innerHTML = newContent;
            initializePage();
            
        } catch (error) {
            console.error('Navigation error:', error);
            if (previousPage) {
                window.history.pushState({}, '', previousPage.url);
                mainContent.innerHTML = previousPage.content;
                initializePage();
            }
        }
    }
    
    navLinks.forEach(link => {
        if (link.href.includes(window.location.origin)) {
            link.addEventListener('click', handleNavigation);
        }
    });
    
    window.addEventListener('popstate', function() {
        if (previousPage) {
            mainContent.innerHTML = previousPage.content;
            initializePage();
        }
    });
}





/* ====================
   PWA: Service Worker
==================== */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(reg => {
        console.log("Service Worker registered:", reg.scope);
      })
      .catch(err => {
        console.error("Service Worker registration failed:", err);
      });
  });
}


/* ====================
   PWA: Install Prompt
==================== */
let deferredPrompt;
const installBtn = document.getElementById("installAppBtn");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) {
    installBtn.style.display = "block";
  }
});

if (installBtn) {
  installBtn.addEventListener("click", () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
      installBtn.style.display = "none";
    });
  });
}

/* ====================
   iOS Install Hint
==================== */
if (
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !window.matchMedia("(display-mode: standalone)").matches
) {
  setTimeout(() => {
    alert("To install Rehabverve: Tap Share → Add to Home Screen");
  }, 6000);
}
