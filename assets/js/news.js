// news.js — Rehab updates list: categories, search, featured story.
(function () {
    'use strict';
    const { $, esc, lower, cards } = RV;
    const fb = RV.fb;
    let all = [];
    let cat = RV.params.get('category') || 'All';

    function render() {
        const q = lower($('#q').value.trim());
        const list = all.filter(p => (cat === 'All' || lower(p.category) === lower(cat)) &&
            (!q || lower(p.title).includes(q) || lower(p.description).includes(q) || lower(p.content).includes(q)));
        const feature = cat === 'All' && !q ? list[0] : null;
        $('#featured').innerHTML = feature ? `
            <a class="card feature-post clickable" href="#/article?id=${encodeURIComponent(cards.postId(feature))}">
                <img src="${esc(RV.img(feature.img, 'assets/img/blog-placeholder.jpg'))}" alt="" onerror="this.src='assets/img/blog-placeholder.jpg'">
                <div class="feature-copy"><span class="tag">${esc(feature.category || 'Latest')}</span><h2>${esc(feature.title || '')}</h2><span>${esc(RV.date(feature.timestamp))}</span></div>
            </a>` : '';
        const rest = feature ? list.slice(1) : list;
        $('#count').textContent = `${list.length} update${list.length === 1 ? '' : 's'}`;
        $('#posts').innerHTML = rest.length ? rest.map(cards.post).join('') : (feature ? '' : RV.empty('No updates match your search.', 'bx-news'));
    }

    function renderCats() {
        const cats = ['All', ...new Set(all.map(p => String(p.category || '').trim()).filter(Boolean))];
        $('#cats').innerHTML = cats.map(c => `<button type="button" class="chip" aria-pressed="${c === cat}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
    }

    $('#cats').addEventListener('click', e => {
        const b = e.target.closest('[data-cat]');
        if (!b) return;
        cat = b.dataset.cat;
        renderCats();
        render();
    });
    $('#q').addEventListener('input', RV.debounce(render, 160));

    $('#posts').innerHTML = RV.skeletons(6);
    if (!fb) return;
    fb.db.ref('blogPosts').once('value').then(snap => {
        all = RV.list(snap.val()).filter(p => p.published !== false).sort((a, b) => RV.ts(b.timestamp) - RV.ts(a.timestamp));
        renderCats();
        render();
    }).catch(() => { $('#posts').innerHTML = RV.empty('Updates could not be loaded. Please refresh.', 'bx-news'); });
})();
