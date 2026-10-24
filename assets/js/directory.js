// directory.js — professionals and centers directories with "best match" ranking.
// Matching looks at the discipline, the areas a listing covers, how they work
// (clinic / home visits / online), the client's budget, verification and ratings.
(function () {
    'use strict';
    const { $, esc, lower, data: D, cards } = RV;
    const kind = document.body.dataset.kind; // 'pros' | 'centers'
    const form = $('#filters');
    const results = $('#results');
    const countEl = $('#count');
    const fields = Array.from(form.elements).filter(el => el.name);

    // ---------- fill selects ----------
    if (kind === 'pros') {
        form.category.insertAdjacentHTML('beforeend', RV.optionList(D.CATEGORIES.map(c => ({ value: c.value, label: c.label }))));
        form.country.insertAdjacentHTML('beforeend', RV.optionList(D.COUNTRIES));
        form.cur.innerHTML = RV.optionList(Object.keys(D.CURRENCIES).map(c => ({ value: c, label: `${D.CURRENCIES[c]} ${c}` })), 'NGN');
    } else {
        form.type.insertAdjacentHTML('beforeend', RV.optionList(D.CENTER_TYPES.map(t => t.value)));
    }

    // ---------- read the URL (old ?category=Physiotherapist links still work) ----------
    const p = RV.params;
    fields.forEach(el => {
        const v = p.get(el.name);
        if (v == null) return;
        if (el.type === 'checkbox') el.checked = v === '1';
        else if (el.name === 'category') { const c = D.categoryOf(v); el.value = c ? c.value : ''; }
        else if (el.name === 'type') { el.value = v === 'All' ? '' : D.centerTypeOf(v).value; }
        else el.value = v;
    });
    // Open "More filters" when a link already sets one of them
    const more = $('#more-filters');
    if (more && Array.from(more.querySelectorAll('[name]')).some(el => el.type === 'checkbox' ? el.checked : el.value && el.name !== 'sort')) more.open = true;

    function filters() {
        const f = RV.formValues(form);
        f.max = Number(f.max) || 0;
        return f;
    }

    function syncURL(f) {
        const url = new URL(location.href);
        url.search = '';
        fields.forEach(el => {
            const v = el.type === 'checkbox' ? (el.checked ? '1' : '') : el.value;
            if (v && !(el.name === 'sort' && v === 'match') && !(el.name === 'cur' && v === 'NGN')) url.searchParams.set(el.name, v);
        });
        history.replaceState(null, '', url);
        if (!f) return;
    }

    // ---------- matching ----------
    const tokens = s => lower(s).split(/[,;/]+|\s{2,}/).map(t => t.trim()).filter(Boolean);
    const contains = (hay, needle) => lower(hay).includes(lower(needle));

    function coverageMatch(item, loc) {
        const c = item.coverage || {};
        const cover = [c.areas, c.states, c.countries].join(', ');
        if (cover && tokens(loc).some(t => contains(cover, t))) return 'covers';
        const place = [item.city, item.state, item.country, item.location, item.address].join(' ');
        if (tokens(loc).some(t => contains(place, t))) return 'based';
        return '';
    }

    function scorePro(x, f) {
        const why = [];
        let score = 0;
        if (f.category) {
            const cat = D.listingCategory(x);
            if (!cat || cat.value !== f.category) return null;
        }
        const modes = x.serviceModes || {};
        if (f.mode && !modes[f.mode]) return null;
        if (f.verified && x.verified !== true) return null;
        if (f.country && !contains([x.country, x.location, (x.coverage || {}).countries].join(' '), f.country) && !((x.coverage || {}).nationwide && modes.tele)) return null;
        if (f.q) {
            const hay = [x.name, x.job, x.bio, x.education, x.languages, (x.coverage || {}).areas].join(' ');
            if (!tokens(f.q).every(t => contains(hay, t))) return null;
            score += 5;
        }
        if (f.loc) {
            const m = coverageMatch(x, f.loc);
            if (m === 'covers') { score += 40; why.push(`Covers ${f.loc}`); }
            else if (m === 'based') { score += 30; why.push(`Based in ${f.loc}`); }
            else if (modes.tele && f.mode !== 'home' && f.mode !== 'clinic') { score += 8; why.push('Available online'); }
            else return null;
        }
        if (f.mode === 'home') why.push('Does home visits');
        if (f.max) {
            const sameCur = (x.currency || 'NGN') === f.cur;
            const min = Number(x.priceMin);
            if (sameCur && min > 0) {
                if (min > f.max) return null;
                score += 20;
                why.push('Within budget');
            }
        }
        if (x.verified === true) score += 15;
        if (x.featured === true) score += 5;
        if (Number(x.priceMin) || Number(x.priceMax)) score += 5;
        score += (Number(x.rating) || 0) * 3;
        return { item: x, score, why };
    }

    function scoreCenter(x, f) {
        let score = 0;
        const why = [];
        if (f.type && D.centerTypeOf(x.centerType || x.category).value !== f.type) return null;
        const modes = x.serviceModes || {};
        const mobile = /mobile|home/i.test(x.centerType || '');
        if (f.mode === 'home' && !(modes.home || mobile)) return null;
        if (f.mode && f.mode !== 'home' && !modes[f.mode]) return null;
        if (f.q && !tokens(f.q).every(t => contains([x.centerName, x.description, x.centerType, x.accreditations].join(' '), t))) return null;
        if (f.loc) {
            const m = coverageMatch(x, f.loc);
            if (m === 'covers') { score += 40; why.push(`Covers ${f.loc}`); }
            else if (m === 'based') { score += 30; why.push(`In ${f.loc}`); }
            else return null;
        }
        if (x.verified === true) score += 15;
        if (x.featured === true) score += 5;
        score += (Number(x.rating) || 0) * 3;
        return { item: x, score, why };
    }

    const byPos = (a, b) => (Number(a.item.pos) || 9999) - (Number(b.item.pos) || 9999);
    function sortResults(list, sort) {
        const price = r => Number(r.item.priceMin) || Number(r.item.priceMax) || Infinity;
        const exp = r => parseFloat(r.item.experience) || 0;
        const sorters = {
            match: (a, b) => b.score - a.score || byPos(a, b),
            price: (a, b) => price(a) - price(b) || b.score - a.score,
            rating: (a, b) => (Number(b.item.rating) || 0) - (Number(a.item.rating) || 0) || b.score - a.score,
            experience: (a, b) => exp(b) - exp(a) || b.score - a.score
        };
        return list.sort(sorters[sort] || sorters.match);
    }

    // ---------- render ----------
    let all = null;
    function render() {
        if (!all) return;
        const f = filters();
        syncURL(f);
        const scored = all.map(x => (kind === 'pros' ? scorePro(x, f) : scoreCenter(x, f))).filter(Boolean);
        const list = sortResults(scored, f.sort);
        const noun = kind === 'pros' ? 'professional' : 'center';
        countEl.innerHTML = `<strong>${list.length}</strong> ${noun}${list.length === 1 ? '' : 's'}${f.loc ? ` for ${esc(f.loc)}` : ''}`;
        results.innerHTML = list.length
            ? list.map(r => (kind === 'pros' ? cards.pro(r.item, { why: r.why }) : cards.center(r.item))).join('')
            : RV.empty(kind === 'pros'
                ? 'No one matches every filter yet. Try a nearby area, remove the budget, or choose “Teletherapy” to see people who work online.'
                : 'No centers match these filters yet. Try a nearby area or another type.');
    }

    form.addEventListener('input', RV.debounce(render, 180));
    form.addEventListener('change', render);
    form.addEventListener('submit', e => { e.preventDefault(); render(); });
    $('#reset').addEventListener('click', () => {
        form.reset();
        if (form.cur) form.cur.value = 'NGN';
        render();
    });

    RV.config().then(cfg => {
        const wa = $('#ask-wa');
        if (wa) wa.href = RV.waLink(cfg.whatsapp, 'Hello RehabVerve! Please recommend a rehab professional for my needs.');
    });

    results.innerHTML = RV.skeletons(6);
    const fb = RV.fb;
    if (!fb) { results.innerHTML = RV.empty('We could not load the directory. Check your connection and refresh.'); return; }
    fb.db.ref(kind === 'pros' ? 'professionals' : 'centers').once('value').then(snap => {
        all = RV.list(snap.val()).filter(RV.isLive);
        render();
    }).catch(err => {
        console.error(err);
        results.innerHTML = RV.empty('We could not load the directory right now. Please refresh to try again.');
        countEl.textContent = '';
    });
})();
