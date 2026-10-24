// home.js — home page: spotlight, disciplines and the original card rows
// (featured professionals, centers, mobile rehab, latest members, classes, trending news).
(function () {
    'use strict';
    const { $, esc, data: D, cards } = RV;

    $('#home-category').insertAdjacentHTML('beforeend', RV.optionList(D.CATEGORIES.map(c => ({ value: c.value, label: c.label }))));
    $('#disciplines').innerHTML = D.CATEGORIES.map(c => `
        <a class="card tile clickable" href="professionals.html?category=${c.value}"><i class='bx ${c.icon}'></i><span>${esc(c.short)}</span></a>`).join('');

    // Placeholders sized for the horizontal card rows
    const rowSkeletons = n => Array.from({ length: n }, () => '<div class="skeleton" style="min-width:220px;margin:8px"></div>').join('');
    ['#featured', '#mobile', '#latest', '#centers'].forEach(id => { $(id).innerHTML = rowSkeletons(4); });
    $('#news').innerHTML = rowSkeletons(3);
    const none = text => `<p class="muted" style="margin:8px auto">${text}</p>`;

    const byPos = (a, b) => (Number(a.pos) || 9999) - (Number(b.pos) || 9999);
    const fb = RV.fb;
    if (!fb) return;
    const get = path => fb.db.ref(path).once('value').then(s => RV.list(s.val())).catch(() => []);

    Promise.all([get('professionals'), get('centers'), get('classes')]).then(([pros, centers, classes]) => {
        pros = pros.filter(RV.isLive);
        centers = centers.filter(RV.isLive);
        const open = classes.filter(c => c.status === 'open');

        $('#stat-pros').textContent = pros.length.toLocaleString();
        $('#stat-centers').textContent = centers.length.toLocaleString();
        $('#stat-classes').textContent = open.length.toLocaleString();
        $('#home-stats').hidden = pros.length + centers.length === 0;

        // Featured first, then verified, then the admin's order
        const featured = pros.slice().sort((a, b) => (b.featured === true) - (a.featured === true) || (b.verified === true) - (a.verified === true) || byPos(a, b)).slice(0, 10);
        $('#featured').innerHTML = featured.length ? featured.map(cards.proMini).join('') : none('No featured professionals found.');

        // Professionals who do home visits
        const mobilePros = pros.filter(p => p.serviceModes && p.serviceModes.home).sort(byPos).slice(0, 10);
        if (mobilePros.length) $('#mobile').innerHTML = mobilePros.map(cards.proMini).join('');
        else $('#mobile-section').hidden = true;

        // Newest members first (original "Latest Members" row)
        const joined = p => RV.ts(p.timestamp) || RV.ts(p.createdAt) || RV.ts(p.updatedAt);
        const latest = pros.map((p, i) => ({ p, i })).sort((a, b) => joined(b.p) - joined(a.p) || b.i - a.i).map(x => x.p).slice(0, 10);
        $('#latest').innerHTML = latest.length ? latest.map(cards.proMini).join('') : none('No featured professionals found.');

        $('#centers').innerHTML = centers.length ? centers.sort(byPos).slice(0, 7).map(c => cards.center(c)).join('') : none('No centers found.');

        if (open.length) {
            $('#classes-section').hidden = false;
            $('#home-classes').innerHTML = open.sort((a, b) => RV.ts(b.createdAt) - RV.ts(a.createdAt)).slice(0, 3).map(c => cards.klass(c)).join('');
        }
    });

    get('blogPosts').then(posts => {
        posts = posts.filter(p => p.published !== false).sort((a, b) => RV.ts(b.timestamp) - RV.ts(a.timestamp)).slice(0, 5);
        if (posts.length) $('#news').innerHTML = posts.map(p => cards.post(p)).join('');
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
