// news.js — blog list (original "Latest Gist" layout): search, category filter, cards.
(function () {
    'use strict';
    const { $, esc, lower, cards } = RV;
    const fb = RV.fb;
    let all = [];
    const select = $('#cats');

    function render() {
        const cat = select.value || 'All';
        const q = lower($('#q').value.trim());
        const list = all.filter(p => (cat === 'All' || lower(p.category) === lower(cat)) &&
            (!q || lower(p.title).includes(q) || lower(p.description).includes(q) || lower(p.content).includes(q)));
        $('#count').textContent = `${list.length} post${list.length === 1 ? '' : 's'}`;
        $('#posts').innerHTML = list.length ? list.map(p => cards.post(p, { full: true })).join('')
            : '<p class="no-results muted" style="grid-column:1/-1;text-align:center;padding:2rem">No blog posts found matching your criteria.</p>';
    }

    function fillCategories() {
        const wanted = RV.params.get('category') || 'All';
        const cats = [...new Set(all.map(p => String(p.category || '').trim()).filter(Boolean))];
        select.innerHTML = RV.optionList([{ value: 'All', label: 'All Categories' }, ...cats], cats.includes(wanted) ? wanted : 'All');
    }

    select.addEventListener('change', render);
    $('#q').addEventListener('input', RV.debounce(render, 160));

    $('#posts').innerHTML = RV.skeletons(6);
    if (!fb) return;
    fb.db.ref('blogPosts').once('value').then(snap => {
        all = RV.list(snap.val()).filter(p => p.published !== false).sort((a, b) => RV.ts(b.timestamp) - RV.ts(a.timestamp));
        fillCategories();
        render();
    }).catch(() => { $('#posts').innerHTML = '<p class="error" style="grid-column:1/-1;text-align:center;padding:2rem">Error loading blog posts. Please try again later.</p>'; });
})();
