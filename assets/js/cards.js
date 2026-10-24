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
    // Icon-only version for cards; the label is kept for screen readers and as a tooltip
    function modeIcons(modes, labels) {
        return Object.keys(labels).filter(k => modes && modes[k])
            .map(k => `<span class="mode-ico" title="${esc(labels[k])}"><i class='bx ${D.MODE_ICONS[k]}' aria-hidden="true"></i><span class="sr-only">${esc(labels[k])}</span></span>`).join('');
    }
    RV.modeIcons = modeIcons;

    const shortPlace = p => [p && p.city, p && p.state].filter(Boolean).join(', ') || RV.place(p);
    const ratingChip = p => {
        const r = Number(p.rating);
        return r ? `<span class="rate"><i class='bx bxs-star'></i>${r.toFixed(1)}</span>` : '';
    };
    const unitOf = p => (D.PRICE_UNITS[p.priceUnit] ? `<small>/${esc(D.PRICE_UNITS[p.priceUnit])}</small>` : '');
    // "₦10,000 – ₦25,000" without the unit, which the card shows smaller
    const priceOnly = p => {
        const cur = p.currency || 'NGN';
        const lo = RV.money(p.priceMin, cur), hi = RV.money(p.priceMax, cur);
        if (lo && hi && Number(p.priceMax) > Number(p.priceMin)) return `${lo} – ${hi}`;
        return lo ? `From ${lo}` : hi ? `Up to ${hi}` : '';
    };

    function pro(p, opts = {}) {
        const cat = D.listingCategory(p);
        const href = `#/profile?id=${encodeURIComponent(p.id)}`;
        const price = priceOnly(p);
        const place = shortPlace(p);
        const why = (opts.why || []).map(w => `<span class="badge badge-success"><i class='bx bx-check'></i>${esc(w)}</span>`).join('');
        return `
        <article class="card pro-card clickable" data-href="${href}">
            <div class="pro-top">
                <img src="${esc(RV.img(p.img || p.ing))}" alt="" loading="lazy" onerror="this.src='assets/img/profile.png'">
                <div class="pro-id">
                    <h3><a href="${href}">${esc(p.name || 'RehabVerve professional')}</a>${p.verified === true ? `<i class='bx bxs-badge-check verified' title="Verified by RehabVerve"></i>` : ''}</h3>
                    <p>${esc(p.job || (cat && cat.label) || 'Rehabilitation professional')}</p>
                    <div class="pro-sub">${place ? `<span><i class='bx bx-map'></i>${esc(place)}</span>` : ''}${ratingChip(p)}</div>
                    <div class="modes">${modeIcons(p.serviceModes, D.PRO_MODES)}</div>
                </div>
            </div>
            ${why ? `<div class="match-why">${why}</div>` : ''}
            <div class="pro-foot">
                <span class="${price ? 'price' : 'muted'}">${price ? `${esc(price)}${unitOf(p)}` : 'Fees on request'}</span>
                <a class="btn btn-sm btn-primary" href="${href}&book=1">Book</a>
            </div>
        </article>`;
    }

    function center(c) {
        const type = D.centerTypeOf(c.centerType || c.category);
        const href = `#/profile?id=${encodeURIComponent(c.id)}`;
        const price = priceOnly(c);
        const place = shortPlace(c) || c.address;
        return `
        <article class="card media-card clickable" data-href="${href}">
            <div class="media">
                <img src="${esc(RV.img(c.img || c.ing, 'assets/img/center.jpg'))}" alt="" loading="lazy" onerror="this.src='assets/img/center.jpg'">
                <span class="tag"><i class='bx ${type.icon}'></i>${esc(c.centerType || type.value)}</span>
            </div>
            <div class="body">
                <h3><a href="${href}">${esc(c.centerName || 'Care center')}</a>${c.verified === true ? ` <i class='bx bxs-badge-check verified' title="Verified by RehabVerve"></i>` : ''}</h3>
                ${place ? `<div class="meta"><i class='bx bx-map'></i>${esc(String(place).slice(0, 60))}</div>` : ''}
                <div class="foot"><span class="${price ? 'price' : 'muted'}">${price ? `${esc(price)}${unitOf(c)}` : 'Fees on request'}</span><span class="modes">${modeIcons(c.serviceModes, D.CENTER_MODES)}</span></div>
            </div>
        </article>`;
    }

    const postId = p => p.push || p.id;
    function post(p) {
        const href = `#/article?id=${encodeURIComponent(postId(p))}`;
        return `
        <article class="card media-card post-card clickable" data-href="${href}">
            <div class="media">
                <img src="${esc(RV.img(p.img, 'assets/img/blog-placeholder.jpg'))}" alt="" loading="lazy" onerror="this.src='assets/img/blog-placeholder.jpg'">
                ${p.category ? `<span class="tag">${esc(p.category)}</span>` : ''}
            </div>
            <div class="body">
                <h3><a href="${href}">${esc(p.title || 'Untitled')}</a></h3>
                <div class="meta"><i class='bx bx-calendar'></i>${esc(RV.date(p.timestamp) || 'Recent')}</div>
            </div>
        </article>`;
    }

    function klass(c, opts = {}) {
        const href = `#/class?id=${encodeURIComponent(c.id)}`;
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
                <div class="row-between"><h3><a href="${href}">${esc(c.title || 'Class')}</a></h3>${status}</div>
                <div class="meta"><i class='bx bx-child'></i>${esc(c.ageGroup || 'All ages')}${c.schedule ? ` <i class='bx bx-time-five'></i>${esc(c.schedule)}` : ''}</div>
                <div class="foot">
                    <span class="${price ? 'price' : 'muted'}">${price ? `${esc(price)}${c.priceUnit ? `<small>/${esc(D.PRICE_UNITS[c.priceUnit] || c.priceUnit)}</small>` : ''}` : 'Free'}</span>
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
        RV.go(card.dataset.href);
    });

    RV.skeletons = (n = 4) => Array.from({ length: n }, () => '<div class="skeleton"></div>').join('');
    RV.empty = (text, icon = 'bx-search-alt') => `<div class="empty" style="grid-column:1/-1"><i class='bx ${icon}'></i>${text}</div>`;
})();
