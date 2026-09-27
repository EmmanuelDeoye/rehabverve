// centers.js — Care centers directory: search, type chips, cards.
(function () {
    'use strict';

    const TYPES = [
        { value: 'All', label: 'All', icon: 'bx-grid-alt', match: '' },
        { value: 'Rehabilitation Centers', label: 'Rehab centers', icon: 'bx-plus-medical', match: 'rehab' },
        { value: 'Hospitals', label: 'Hospitals', icon: 'bx-clinic', match: 'hospital' },
        { value: 'Schools', label: 'Schools', icon: 'bx-book-reader', match: 'school' },
        { value: 'Homes', label: 'Home care', icon: 'bx-home-heart', match: 'home' },
        { value: 'NGO', label: 'NGOs', icon: 'bx-donate-heart', match: 'non-governmental' },
        { value: 'Technology', label: 'Technology', icon: 'bx-chip', match: 'technolog' }
    ];

    const grid = document.getElementById('centers-container');
    const searchInput = document.getElementById('center-search-input');
    const chipsHost = document.getElementById('category-chips');
    const countEl = document.getElementById('centers-count');
    if (!grid) return;

    let all = [];
    let type = 'All';
    let term = '';
    const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const lower = v => String(v || '').toLowerCase();

    function renderChips() {
        chipsHost.innerHTML = TYPES.map(t => `
            <button type="button" class="vv-chip ${t.value === type ? 'is-active' : ''}" data-type="${esc(t.value)}" aria-pressed="${t.value === type}"><i class='bx ${t.icon}'></i>${t.label}</button>`).join('');
    }

    function render() {
        const t = TYPES.find(x => x.value === type) || TYPES[0];
        const q = lower(term);
        const list = all.filter(c => {
            const kind = lower(c.centerType) + ' ' + lower(c.category);
            const okType = !t.match || kind.includes(t.match);
            const okTerm = !q || lower(c.centerName).includes(q) || lower(c.description).includes(q) || lower(c.address).includes(q);
            return okType && okTerm;
        }).sort((a, b) => (a.pos || 9999) - (b.pos || 9999));

        if (countEl) countEl.innerHTML = `<b>${list.length}</b> center${list.length === 1 ? '' : 's'}${term ? ` matching “${esc(term)}”` : ''}`;

        grid.innerHTML = list.length ? list.map(c => `
            <article class="center-card" data-id="${esc(c.userId || c.id)}" tabindex="0" role="link" aria-label="View ${esc(c.centerName)}">
                <div class="cc-media">
                    <img src="${esc(c.img || 'assets/img/center.jpg')}" alt="${esc(c.centerName)}" loading="lazy" onerror="this.src='assets/img/center.jpg'">
                    ${c.centerType ? `<span class="cc-tag">${esc(c.centerType)}</span>` : ''}
                </div>
                <div class="cc-body">
                    <h3>${esc(c.centerName || 'Care center')}</h3>
                    ${c.address ? `<div class="cc-meta"><i class='bx bx-map'></i><span>${esc(String(c.address).slice(0, 70))}</span></div>` : ''}
                    <p>${esc(String(c.description || '').slice(0, 160))}</p>
                    <span class="cc-link">View center <i class='bx bx-right-arrow-alt'></i></span>
                </div>
            </article>`).join('')
            : `<p class="no-results">No centers match that search yet. Try a different type or keyword.</p>`;
    }

    const open = id => { location.href = `users.html?id=${encodeURIComponent(id)}`; };
    grid.addEventListener('click', e => { const c = e.target.closest('.center-card'); if (c) open(c.dataset.id); });
    grid.addEventListener('keydown', e => {
        const c = e.target.closest('.center-card');
        if (c && e.target === c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(c.dataset.id); }
    });
    chipsHost.addEventListener('click', e => {
        const b = e.target.closest('[data-type]');
        if (!b) return;
        type = b.dataset.type; renderChips(); render();
    });
    let debounce;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => { term = searchInput.value.trim(); render(); }, 160);
    });

    function load() {
        renderChips();
        firebase.database().ref('centers').once('value').then(snapshot => {
            const data = snapshot.val() || {};
            all = Object.keys(data).map(id => ({ id, ...data[id] }));
            render();
        }).catch(err => {
            console.error('Error loading centers:', err);
            grid.innerHTML = '<p class="error">We couldn’t load centers right now. Please refresh to try again.</p>';
        });
    }

    if (typeof firebase !== 'undefined') load();
    else document.addEventListener('DOMContentLoaded', load);
})();
