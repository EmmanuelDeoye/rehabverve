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

    const dateOf = ts => { const n = RV.ts(ts); return n ? new Date(n) : null; };

    // ----- Home page professional card (original .profile-card) -----
    function proMini(p) {
        const href = `users.html?id=${encodeURIComponent(p.id)}`;
        const name = String(p.name || 'RehabVerve member');
        const display = name.length > 20 ? name.substring(0, 14) + '...' : name;
        return `
        <div class="profile-card" data-href="${href}" role="link" tabindex="0" aria-label="${esc(name)}">
            <img src="${esc(RV.img(p.img || p.ing))}" alt="${esc(name)}" class="profile-image" loading="lazy" onerror="this.src='assets/img/profile.png'">
            <span class="p2">${esc(display)}${p.verified === true ? ` <i class='bx bxs-badge-check verified' title="Verified by RehabVerve"></i>` : ''}</span>
            <p class="specialty">${esc(p.job || 'Healthcare Professional')}</p>
        </div>`;
    }

    // ----- Directory professional card (original .profile-header card) -----
    function pro(p, opts = {}) {
        const href = `users.html?id=${encodeURIComponent(p.id)}`;
        const name = p.name || 'RehabVerve professional';
        const phone = String(p.phone || '');
        const wa = RV.waLink(p.whatsapp || phone);
        const tel = RV.digits(phone) ? phone.replace(/[^\d+]/g, '') : '';
        const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email || '') ? p.email : '';
        const price = RV.priceRange(p);
        const place = RV.place(p);
        const cover = RV.coverageText(p);
        const r = Number(p.rating);
        const why = (opts.why || []).map(w => `<span class="badge badge-success"><i class='bx bx-check'></i>${esc(w)}</span>`).join('');
        return `
        <div class="profile-card detailed-profile profile-header" data-href="${href}" role="link" tabindex="0" aria-label="${esc(name)}">
            <div class="profile-image-container">
                <img src="${esc(RV.img(p.img || p.ing))}" class="profile-image" alt="${esc(name)}" loading="lazy" onerror="this.src='assets/img/profile.png'">
            </div>
            <h3 class="user-name">${esc(name)}${p.verified === true ? ` <i class='bx bxs-badge-check verified' title="Verified by RehabVerve"></i>` : ''}</h3>
            <p class="user-title">${esc(p.job || 'Healthcare Professional')}</p>
            <div class="contact-icons">
                ${wa ? `<a href="${esc(wa)}" class="contact-icon whatsapp" target="_blank" rel="noopener" aria-label="WhatsApp ${esc(name)}"><i class='bx bxl-whatsapp'></i></a>` : ''}
                ${email ? `<a href="mailto:${esc(email)}" class="contact-icon email" aria-label="Email ${esc(name)}"><i class='bx bx-envelope'></i></a>` : ''}
                ${tel ? `<a href="tel:${esc(tel)}" class="contact-icon phone" aria-label="Call ${esc(name)}"><i class='bx bx-phone'></i></a>` : ''}
            </div>
            <div class="pro-extra">
                <p class="pro-fee"><i class='bx bx-wallet'></i> ${esc(price || 'Fees on request')}</p>
                ${place || cover ? `<p class="pro-cover"><i class='bx bx-map'></i> ${esc([place, cover ? 'Covers ' + cover : ''].filter(Boolean).join(' · '))}</p>` : ''}
                ${r ? `<p class="pro-cover"><i class='bx bxs-star'></i> ${r.toFixed(1)}${Number(p.ratingCount) ? ` (${Number(p.ratingCount)})` : ''}</p>` : ''}
                <div class="pro-badges">${modeBadges(p.serviceModes, D.PRO_MODES)}</div>
                ${why ? `<div class="pro-badges">${why}</div>` : ''}
                <a class="pro-book" href="${href}&book=1">Book</a>
            </div>
        </div>`;
    }

    // ----- Center card (original .center-card) -----
    function center(c, opts = {}) {
        const href = `users.html?id=${encodeURIComponent(c.id)}`;
        const name = c.centerName || 'Care center';
        const price = RV.priceRange(c);
        const modes = Object.keys(D.CENTER_MODES).filter(k => c.serviceModes && c.serviceModes[k]).map(k => D.CENTER_MODES[k]);
        const desc = String(c.description || '');
        return `
        <div class="center-card" data-href="${href}" role="link" tabindex="0" aria-label="${esc(name)}">
            <img src="${esc(RV.img(c.img || c.ing, 'assets/img/center.jpg'))}" alt="${esc(name)}" loading="lazy" onerror="this.src='assets/img/center.jpg'">
            <div class="center-card-content">
                <h3>${esc(name)}${c.verified === true ? ` <i class='bx bxs-badge-check verified' title="Verified by RehabVerve"></i>` : ''}</h3>
                <p class="center-date">${esc(c.centerType || D.centerTypeOf(c.category).value)}</p>
                ${opts.full && desc ? `<p>${esc(desc.substring(0, 150))}${desc.length > 150 ? '...' : ''}</p>` : ''}
                ${opts.full && (price || modes.length) ? `<p class="center-extra">${esc([price, modes.join(' · ')].filter(Boolean).join(' — '))}</p>` : ''}
                <a href="${href}" class="read-more">View Details</a>
            </div>
        </div>`;
    }

    // ----- Blog card (original .blog-card) -----
    const postId = p => p.push || p.id;
    function post(p, opts = {}) {
        const href = `fullgist.html?id=${encodeURIComponent(postId(p))}`;
        const d = dateOf(p.timestamp);
        const date = d ? (opts.full ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : d.toLocaleDateString()) : (opts.full ? 'Date not available' : 'Recent');
        const desc = String(p.description || '');
        const max = opts.full ? 150 : 100;
        return `
        <div class="blog-card" data-href="${href}" role="link" tabindex="0" aria-label="${esc(p.title || 'Post')}">
            <img src="${esc(RV.img(p.img, 'assets/img/blog-placeholder.jpg'))}" alt="${esc(p.title || '')}" loading="lazy" onerror="this.src='assets/img/blog-placeholder.jpg'">
            <div class="blog-card-content">
                <h3>${esc(p.title || 'Untitled Post')}</h3>
                <p class="blog-date">${esc(date)}</p>
                ${desc ? `<p>${esc(desc.substring(0, max))}...</p>` : ''}
            </div>
        </div>`;
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

    RV.cards = { pro, proMini, center, post, klass, postId };

    // Whole-card clicks for cards marked with data-href (links inside still work normally)
    document.addEventListener('click', e => {
        const card = e.target.closest('[data-href]');
        if (!card || e.target.closest('a, button')) return;
        location.href = card.dataset.href;
    });
    document.addEventListener('keydown', e => {
        const card = e.target.closest && e.target.closest('[data-href]');
        if (card && e.target === card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); location.href = card.dataset.href; }
    });

    RV.skeletons = (n = 4) => Array.from({ length: n }, () => '<div class="skeleton"></div>').join('');
    RV.empty = (text, icon = 'bx-search-alt') => `<div class="empty" style="grid-column:1/-1"><i class='bx ${icon}'></i>${text}</div>`;
})();
