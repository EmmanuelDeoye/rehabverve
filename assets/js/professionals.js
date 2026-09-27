// professionals.js — Professionals directory: search, category chips, cards.
(function () {
    'use strict';

    const CATEGORIES = [
        { value: 'All', label: 'All', icon: 'bx-grid-alt', match: '' },
        { value: 'Physiotherapist', label: 'Physiotherapy', icon: 'bx-body', match: 'physio' },
        { value: 'Speech', label: 'Speech', icon: 'bx-message-rounded-dots', match: 'speech' },
        { value: 'Occupational', label: 'Occupational', icon: 'bx-brush', match: 'occupational' },
        { value: 'Psychologist', label: 'Psychology', icon: 'bx-brain', match: 'psycholog' },
        { value: 'Behavioural', label: 'Behavioural', icon: 'bx-happy-alt', match: 'behavio' },
        { value: 'Nurses', label: 'Nursing', icon: 'bx-plus-medical', match: 'nurs' },
        { value: 'Doctor', label: 'Doctors', icon: 'bx-first-aid', match: 'doctor' },
        { value: 'Consultant', label: 'Consultants', icon: 'bx-briefcase-alt', match: 'consultant' },
        { value: 'Prosthesis and Orthosis', label: 'Prosthetics', icon: 'bx-accessibility', match: 'prosthe' }
    ];

    const grid = document.getElementById('pro-grid');
    const searchInput = document.getElementById('search-input');
    const chipsHost = document.getElementById('category-chips');
    const countEl = document.getElementById('category-title');
    if (!grid) return;

    let all = [];
    const params = new URLSearchParams(location.search);
    let category = params.get('category') || 'All';
    let term = (params.get('q') || '').trim();
    if (!CATEGORIES.some(c => c.value === category)) category = 'All';

    const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const lower = v => String(v || '').toLowerCase();

    function renderChips() {
        chipsHost.innerHTML = CATEGORIES.map(c => `
            <button type="button" class="vv-chip ${c.value === category ? 'is-active' : ''}" data-cat="${esc(c.value)}" aria-pressed="${c.value === category}">
                <i class='bx ${c.icon}'></i>${c.label}
            </button>`).join('');
    }

    function filtered() {
        const cat = CATEGORIES.find(c => c.value === category) || CATEGORIES[0];
        const t = lower(term);
        return all.filter(p => {
            const job = lower(p.job);
            const okCat = !cat.match || job.includes(cat.match);
            const okTerm = !t || lower(p.name).includes(t) || job.includes(t) || lower(p.bio).includes(t) || lower(p.location).includes(t);
            return okCat && okTerm;
        }).sort((a, b) => (a.pos || 9999) - (b.pos || 9999));
    }

    function card(p) {
        const phone = String(p.phone || '').replace(/[^\d+]/g, '');
        const wa = phone.replace(/^\+/, '');
        return `
        <article class="profile-card" data-id="${esc(p.id)}" tabindex="0" role="link" aria-label="View ${esc(p.name)}'s profile">
            <div class="pc-cover"></div>
            <div class="pc-avatar">
                <img src="${esc(p.img || 'assets/img/profile.png')}" alt="${esc(p.name)}" loading="lazy" onerror="this.src='assets/img/profile.png'">
                <span class="pc-verified" title="Verified"><i class='bx bxs-badge-check'></i></span>
            </div>
            <h3 class="pc-name">${esc(p.name || 'RehabVerve member')}</h3>
            <p class="pc-role">${esc(p.job || 'Healthcare Professional')}</p>
            <p class="pc-bio">${esc(p.bio || 'Licensed specialist on the RehabVerve network.')}</p>
            <div class="pc-actions">
                ${wa ? `<a class="pc-icon wa" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener" aria-label="WhatsApp ${esc(p.name)}"><i class='bx bxl-whatsapp'></i></a>` : ''}
                ${p.email ? `<a class="pc-icon" href="mailto:${esc(p.email)}" aria-label="Email ${esc(p.name)}"><i class='bx bx-envelope'></i></a>` : ''}
                <span class="pc-cta">Profile <i class='bx bx-right-arrow-alt'></i></span>
            </div>
        </article>`;
    }

    function render() {
        const list = filtered();
        const cat = CATEGORIES.find(c => c.value === category);
        if (countEl) {
            countEl.innerHTML = `<b>${list.length}</b> ${category === 'All' ? '' : esc(cat.label.toLowerCase()) + ' '}specialist${list.length === 1 ? '' : 's'}${term ? ` matching “${esc(term)}”` : ''}`;
        }
        grid.innerHTML = list.length
            ? list.map(card).join('')
            : `<p class="no-results"><i class='bx bx-search-alt' style="font-size:28px;display:block;margin-bottom:8px;color:var(--cyan)"></i>No specialists match that search yet. Try another category — or <a href="https://wa.me/2348132912880?text=${encodeURIComponent('Hello! Please recommend a professional for my needs.')}" target="_blank" rel="noopener">ask us for a recommendation</a>.</p>`;
    }

    function syncURL() {
        const url = new URL(location.href);
        url.searchParams.set('category', category);
        if (term) url.searchParams.set('q', term); else url.searchParams.delete('q');
        history.replaceState({}, '', url);
    }

    function openProfile(id) {
        try {
            sessionStorage.setItem('professionalsState', JSON.stringify({ category, searchTerm: term, professionals: all, t: Date.now() }));
        } catch (e) { /* storage full or blocked */ }
        location.href = `users.html?id=${encodeURIComponent(id)}`;
    }

    grid.addEventListener('click', e => {
        if (e.target.closest('a')) return;
        const c = e.target.closest('.profile-card');
        if (c) openProfile(c.dataset.id);
    });
    grid.addEventListener('keydown', e => {
        const c = e.target.closest('.profile-card');
        if (c && (e.key === 'Enter' || e.key === ' ') && e.target === c) { e.preventDefault(); openProfile(c.dataset.id); }
    });
    chipsHost.addEventListener('click', e => {
        const b = e.target.closest('[data-cat]');
        if (!b) return;
        category = b.dataset.cat;
        renderChips(); render(); syncURL();
    });
    let debounce;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => { term = searchInput.value.trim(); render(); syncURL(); }, 160);
    });

    function load() {
        renderChips();
        searchInput.value = term;

        // Returning from a profile: reuse the list we already had (for 10 minutes)
        try {
            const saved = JSON.parse(sessionStorage.getItem('professionalsState') || 'null');
            sessionStorage.removeItem('professionalsState');
            if (saved && saved.professionals && saved.professionals.length && Date.now() - (saved.t || 0) < 600000) {
                all = saved.professionals;
                if (!params.get('category')) category = saved.category || category;
                if (!params.get('q')) term = saved.searchTerm || term;
                searchInput.value = term;
                renderChips(); render();
                return;
            }
        } catch (e) { /* ignore */ }

        firebase.database().ref('professionals').once('value').then(snapshot => {
            const data = snapshot.val() || {};
            all = Object.keys(data).map(id => ({ ...data[id], id }));
            render();
        }).catch(err => {
            console.error('Error fetching professionals:', err);
            grid.innerHTML = '<p class="error">We couldn’t load the directory right now. Please refresh to try again.</p>';
        });
    }

    if (typeof firebase !== 'undefined') load();
    else document.addEventListener('DOMContentLoaded', load);
})();
