// cards.js — card templates shared by the home page, directories and profiles.
// Every value from the database goes through RV.esc / RV.safeUrl.
(function () {
    'use strict';
    const RV = window.RV;
    const D = RV.data;
    const esc = RV.esc;

    const isLive = item => item && item.status !== 'suspended';
    RV.isLive = isLive;

    function modeBadges(modes, labels) {
        return Object.keys(labels).filter(k => modes && modes[k])
            .map(k => `<span class="badge badge-primary"><i class='bx ${D.MODE_ICONS[k]}'></i>${esc(labels[k])}</span>`).join('');
    }
    RV.modeBadges = modeBadges;

    function ratingLine(p) {
        const r = Number(p.rating);
        if (!r) return '';
        const n = Number(p.ratingCount) || 0;
        return `<div><i class='bx bxs-star' style="color:#f59e0b"></i><span>${r.toFixed(1)}${n ? ` · ${n} review${n === 1 ? '' : 's'}` : ''}</span></div>`;
    }

    function pro(p, opts = {}) {
        const cat = D.listingCategory(p);
        const href = `users.html?id=${encodeURIComponent(p.id)}`;
        const price = RV.priceRange(p);
        const cover = RV.coverageText(p);
        const place = RV.place(p);
        const why = (opts.why || []).map(w => `<span class="badge badge-success"><i class='bx bx-check'></i>${esc(w)}</span>`).join('');
        return `
        <article class="card pro-card">
            <div class="pro-top">
                <img src="${esc(RV.img(p.img || p.ing))}" alt="" loading="lazy" onerror="this.src='assets/img/profile.png'">
                <div>
                    <h3><a href="${href}">${esc(p.name || 'RehabVerve professional')}</a>${p.verified === true ? `<i class='bx bxs-badge-check verified' title="Verified by RehabVerve"></i>` : ''}</h3>
                    <p>${esc(p.job || (cat && cat.label) || 'Rehabilitation professional')}</p>
                </div>
            </div>
            <div class="pro-meta">
                ${place ? `<div><i class='bx bx-map'></i><span>${esc(place)}</span></div>` : ''}
                ${cover ? `<div><i class='bx bx-current-location'></i><span>Covers ${esc(cover)}</span></div>` : ''}
                <div><i class='bx bx-wallet'></i><span class="${price ? 'price' : 'muted'}">${esc(price || 'Fees on request')}</span></div>
                ${ratingLine(p)}
            </div>
            <div class="chips">${modeBadges(p.serviceModes, D.PRO_MODES)}</div>
            ${why ? `<div class="match-why">${why}</div>` : ''}
            <div class="actions">
                <a class="btn btn-sm" href="${href}">View profile</a>
                <a class="btn btn-sm btn-primary" href="${href}&book=1">Book</a>
            </div>
        </article>`;
    }

    function center(c) {
        const type = D.centerTypeOf(c.centerType || c.category);
        const href = `users.html?id=${encodeURIComponent(c.id)}`;
        const price = RV.priceRange(c);
        const place = RV.place(c) || c.address;
        return `
        <article class="card media-card clickable" data-href="${href}">
            <div class="media">
                <img src="${esc(RV.img(c.img || c.ing, 'assets/img/center.jpg'))}" alt="" loading="lazy" onerror="this.src='assets/img/center.jpg'">
                <span class="tag">${esc(c.centerType || type.value)}</span>
            </div>
            <div class="body">
                <h3><a href="${href}">${esc(c.centerName || 'Care center')}</a>${c.verified === true ? ` <i class='bx bxs-badge-check verified' title="Verified by RehabVerve"></i>` : ''}</h3>
                ${place ? `<div class="meta"><i class='bx bx-map'></i>${esc(String(place).slice(0, 90))}</div>` : ''}
                <p>${esc(String(c.description || '').slice(0, 140))}</p>
                <div class="chips">${modeBadges(c.serviceModes, D.CENTER_MODES)}</div>
                <div class="foot"><span class="${price ? 'price' : 'muted'}">${esc(price || 'Fees on request')}</span><span class="link-btn">View <i class='bx bx-right-arrow-alt'></i></span></div>
            </div>
        </article>`;
    }

    const postId = p => p.push || p.id;
    function post(p) {
        const href = `fullgist.html?id=${encodeURIComponent(postId(p))}`;
        return `
        <article class="card media-card clickable" data-href="${href}">
            <div class="media">
                <img src="${esc(RV.img(p.img, 'assets/img/blog-placeholder.jpg'))}" alt="" loading="lazy" onerror="this.src='assets/img/blog-placeholder.jpg'">
                ${p.category ? `<span class="tag">${esc(p.category)}</span>` : ''}
            </div>
            <div class="body">
                <div class="meta"><i class='bx bx-calendar'></i>${esc(RV.date(p.timestamp) || 'Recent')}</div>
                <h3><a href="${href}">${esc(p.title || 'Untitled')}</a></h3>
                <p>${esc(String(p.description || '').slice(0, 150))}</p>
            </div>
        </article>`;
    }

    function klass(c, opts = {}) {
        const href = `class.html?id=${encodeURIComponent(c.id)}`;
        const price = RV.money(c.price, c.currency || 'NGN');
        const status = c.status === 'open' ? '<span class="badge badge-success">Enrolling</span>'
            : c.status === 'full' ? '<span class="badge badge-warning">Full</span>' : '<span class="badge">Closed</span>';
        return `
        <article class="card media-card">
            <div class="media">
                <img src="${esc(RV.img(c.img, 'assets/img/blog-placeholder.jpg'))}" alt="" loading="lazy" onerror="this.src='assets/img/blog-placeholder.jpg'">
                ${c.subject ? `<span class="tag">${esc(c.subject)}</span>` : ''}
            </div>
            <div class="body">
                <div class="row-between"><span class="meta"><i class='bx bx-child'></i>${esc(c.ageGroup || 'All ages')}</span>${status}</div>
                <h3><a href="${href}">${esc(c.title || 'Class')}</a></h3>
                ${c.schedule ? `<div class="meta"><i class='bx bx-time-five'></i>${esc(c.schedule)}</div>` : ''}
                ${c.tutorName ? `<div class="meta"><i class='bx bx-chalkboard'></i>With ${esc(c.tutorName)}</div>` : ''}
                <p>${esc(String(c.description || '').slice(0, 130))}</p>
                <div class="foot">
                    <span class="${price ? 'price' : 'muted'}">${price ? `${esc(price)}${c.priceUnit ? ' / ' + esc(D.PRICE_UNITS[c.priceUnit] || c.priceUnit) : ''}` : 'Free'}</span>
                    ${opts.action || `<a class="btn btn-sm btn-primary" href="${href}">${c.status === 'open' ? 'Enrol' : 'View'}</a>`}
                </div>
            </div>
        </article>`;
    }

    RV.cards = { pro, center, post, klass, postId };

    // Whole-card clicks for cards marked with data-href (links inside still work normally)
    document.addEventListener('click', e => {
        const card = e.target.closest('[data-href]');
        if (!card || e.target.closest('a, button')) return;
        location.href = card.dataset.href;
    });

    RV.skeletons = (n = 4) => Array.from({ length: n }, () => '<div class="skeleton"></div>').join('');
    RV.empty = (text, icon = 'bx-search-alt') => `<div class="empty" style="grid-column:1/-1"><i class='bx ${icon}'></i>${text}</div>`;
})();
