// blogs.js — Health news: featured story, category chips, search, grid.
(function () {
    'use strict';

    const grid = document.getElementById('blogs-container');
    const featured = document.getElementById('blog-featured');
    const searchInput = document.getElementById('blog-search-input');
    const chipsHost = document.getElementById('category-chips');
    const countEl = document.getElementById('blogs-count');
    if (!grid) return;

    let all = [];
    let category = 'All';
    let term = '';
    const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const lower = v => String(v || '').toLowerCase();

    // Timestamps are stored as numeric strings
    function formatDate(ts) {
        const n = Number(ts);
        if (!n) return 'Recent';
        return new Date(n).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    function readTime(post) {
        const words = String(post.content || post.description || '').split(/\s+/).length;
        return `${Math.max(1, Math.round(words / 220))} min read`;
    }
    const idOf = p => p.push || p.id;

    function renderChips() {
        const cats = ['All', ...Array.from(new Set(all.map(p => String(p.category || '').trim()).filter(Boolean)))];
        chipsHost.hidden = cats.length < 2;
        chipsHost.innerHTML = cats.map(c => `
            <button type="button" class="vv-chip ${c === category ? 'is-active' : ''}" data-cat="${esc(c)}" aria-pressed="${c === category}">${esc(c)}</button>`).join('');
    }

    function card(p) {
        return `
        <article class="blog-card" data-id="${esc(idOf(p))}" tabindex="0" role="link" aria-label="${esc(p.title)}">
            <div class="cc-media">
                <img src="${esc(p.img || 'assets/img/blog-placeholder.jpg')}" alt="${esc(p.title)}" loading="lazy" onerror="this.src='assets/img/blog-placeholder.jpg'">
                ${p.category ? `<span class="cc-tag">${esc(p.category)}</span>` : ''}
            </div>
            <div class="cc-body">
                <div class="cc-meta"><i class='bx bx-calendar'></i><span>${formatDate(p.timestamp)} · ${readTime(p)}</span></div>
                <h3>${esc(p.title || 'Untitled')}</h3>
                <p>${esc(String(p.description || '').slice(0, 160))}</p>
                <span class="cc-link">Read story <i class='bx bx-right-arrow-alt'></i></span>
            </div>
        </article>`;
    }

    function render() {
        const q = lower(term);
        const list = all.filter(p =>
            (category === 'All' || lower(p.category) === lower(category)) &&
            (!q || lower(p.title).includes(q) || lower(p.description).includes(q)));

        // Feature the newest story when browsing everything
        const showFeature = category === 'All' && !q && list.length > 2;
        const lead = showFeature ? list[0] : null;
        const rest = showFeature ? list.slice(1) : list;

        if (featured) {
            featured.hidden = !lead;
            if (lead) {
                featured.dataset.id = idOf(lead);
                featured.innerHTML = `
                    <div class="bf-media"><img src="${esc(lead.img || 'assets/img/blog-placeholder.jpg')}" alt="${esc(lead.title)}" onerror="this.src='assets/img/blog-placeholder.jpg'"></div>
                    <div class="bf-body">
                        <span class="vv-eyebrow">Latest story${lead.category ? ' · ' + esc(lead.category) : ''}</span>
                        <h2>${esc(lead.title)}</h2>
                        <p>${esc(String(lead.description || '').slice(0, 220))}</p>
                        <div class="cc-meta"><i class='bx bx-calendar'></i><span>${formatDate(lead.timestamp)} · ${readTime(lead)}</span></div>
                        <span class="vv-btn vv-btn--primary">Read the story <i class='bx bx-right-arrow-alt'></i></span>
                    </div>`;
            }
        }
        if (countEl) countEl.innerHTML = `<b>${list.length}</b> ${list.length === 1 ? 'story' : 'stories'}${term ? ` matching “${esc(term)}”` : ''}`;
        grid.innerHTML = rest.length ? rest.map(card).join('') : (lead ? '' : '<p class="no-results">No stories match that search yet.</p>');
    }

    const open = id => { location.href = `fullgist.html?id=${encodeURIComponent(id)}`; };
    [grid, featured].forEach(host => {
        if (!host) return;
        host.addEventListener('click', e => {
            const c = e.target.closest('[data-id]');
            if (c) open(c.dataset.id);
        });
        host.addEventListener('keydown', e => {
            const c = e.target.closest('[data-id]');
            if (c && e.target === c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(c.dataset.id); }
        });
    });
    chipsHost.addEventListener('click', e => {
        const b = e.target.closest('[data-cat]');
        if (!b) return;
        category = b.dataset.cat; renderChips(); render();
    });
    let debounce;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => { term = searchInput.value.trim(); render(); }, 160);
    });

    function load() {
        firebase.database().ref('blogPosts').once('value').then(snapshot => {
            const data = snapshot.val() || {};
            all = Object.keys(data).map(id => ({ id, ...data[id] }))
                .sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
            renderChips();
            render();
        }).catch(err => {
            console.error('Error loading blog posts:', err);
            grid.innerHTML = '<p class="error">We couldn’t load stories right now. Please refresh to try again.</p>';
        });
    }

    if (typeof firebase !== 'undefined') load();
    else document.addEventListener('DOMContentLoaded', load);
})();
