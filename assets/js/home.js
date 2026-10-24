// home.js — home page: disciplines, spotlight, featured and mobile professionals, classes, centers, news.
(function () {
    'use strict';
    const { $, esc, data: D, cards } = RV;

    $('#home-category').insertAdjacentHTML('beforeend', RV.optionList(D.CATEGORIES.map(c => ({ value: c.value, label: c.label }))));
    $('#disciplines').innerHTML = D.CATEGORIES.map(c => `
        <a class="disc" href="#/professionals?category=${c.value}"><i class='bx ${c.icon}'></i><span>${esc(c.short.replace(/ & .*/, ''))}</span></a>`).join('');
    // Phones show the first eight; the rest open on request
    const more = $('#disc-more');
    more.hidden = D.CATEGORIES.length <= 8;
    more.addEventListener('click', () => { $('#disciplines').classList.add('open'); more.hidden = true; });

    ['#featured', '#mobile', '#centers'].forEach(id => { $(id).innerHTML = RV.skeletons(4); });
    $('#news').innerHTML = RV.skeletons(3);

    const byPos = (a, b) => (Number(a.pos) || 9999) - (Number(b.pos) || 9999);
    const fb = RV.fb;
    if (!fb) return;
    const get = path => fb.db.ref(path).once('value').then(s => RV.list(s.val())).catch(() => []);

    Promise.all([get('professionals'), get('centers'), get('classes')]).then(([pros, centers, classes]) => {
        pros = pros.filter(RV.isLive);
        centers = centers.filter(RV.isLive);
        const open = classes.filter(c => c.status === 'open');

        // Featured first, then verified, then the admin's order
        const featured = pros.slice().sort((a, b) => (b.featured === true) - (a.featured === true) || (b.verified === true) - (a.verified === true) || byPos(a, b)).slice(0, 10);
        $('#featured').innerHTML = featured.length ? featured.map(p => cards.pro(p)).join('') : `<div class="container">${RV.empty('Professionals will appear here soon.')}</div>`;

        const mobilePros = pros.filter(p => p.serviceModes && p.serviceModes.home).sort(byPos);
        const mobileCenters = centers.filter(c => (c.serviceModes && c.serviceModes.home) || /mobile|home/i.test(c.centerType || ''));
        const mobile = mobilePros.slice(0, 8).map(p => cards.pro(p)).concat(mobileCenters.slice(0, 4).map(c => cards.center(c)));
        if (mobile.length) $('#mobile').innerHTML = mobile.join('');
        else $('#mobile-section').hidden = true;

        $('#centers').innerHTML = centers.length ? centers.sort(byPos).slice(0, 8).map(cards.center).join('') : `<div class="container">${RV.empty('Centers will appear here soon.', 'bx-buildings')}</div>`;

        if (open.length) {
            $('#classes-section').hidden = false;
            $('#home-classes').innerHTML = open.sort((a, b) => RV.ts(b.createdAt) - RV.ts(a.createdAt)).slice(0, 3).map(c => cards.klass(c)).join('');
        }
    });

    get('blogPosts').then(posts => {
        posts = posts.filter(p => p.published !== false).sort((a, b) => RV.ts(b.timestamp) - RV.ts(a.timestamp)).slice(0, 3);
        if (posts.length) $('#news').innerHTML = posts.map(cards.post).join('');
        else $('#news-section').hidden = true;
    });

    // Spotlight carousel (admin-managed slides)
    get('slider').then(slides => {
        slides = slides.filter(s => s.active !== false && RV.img(s.imageUrl || s.image, '')).sort(byPos);
        if (!slides.length) return;
        const track = $('#spotlight');
        track.innerHTML = slides.map(s => {
            const link = RV.safeUrl(s.link);
            const tag = link ? 'a' : 'div';
            return `<${tag} class="slide"${link ? ` href="${esc(link)}"` : ''}>
                <img src="${esc(RV.img(s.imageUrl || s.image))}" alt="${esc(s.title || '')}" loading="lazy">
                ${s.title ? `<div class="slide-copy"><h3>${esc(s.title)}</h3>${s.description ? `<p>${esc(s.description)}</p>` : ''}</div>` : ''}
            </${tag}>`;
        }).join('');
        $('#spotlight-section').hidden = false;
        const go = dir => track.scrollBy({ left: dir * track.clientWidth, behavior: 'smooth' });
        document.querySelectorAll('.spotlight-nav button').forEach(b => b.addEventListener('click', () => go(Number(b.dataset.dir))));
        if (slides.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
            let paused = false;
            track.addEventListener('pointerenter', () => { paused = true; });
            track.addEventListener('pointerleave', () => { paused = false; });
            setInterval(() => {
                if (paused || document.hidden) return;
                const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
                if (atEnd) track.scrollTo({ left: 0, behavior: 'smooth' }); else go(1);
            }, 6000);
        }
    });

    // Signed-in professionals don't need the "join" pitch
    RV.onAuth(s => { $('#join-section').hidden = !!(s.profile && /practitioner|center|tutor/.test(s.profile.role || '')); });
})();
