// article.js — a single Rehab update, with a house ad mid-article and related posts.
(function () {
    'use strict';
    const { $, esc, cards } = RV;
    const fb = RV.fb;
    const host = $('#article');
    const id = RV.params.get('id');
    const notFound = () => {
        host.innerHTML = `<div class="empty"><i class='bx bx-news'></i><h2>Update not found</h2><p>It may have been moved or removed.</p><a class="btn btn-primary" href="#/updates">Back to updates</a></div>`;
    };
    if (!id || !fb) { notFound(); return; }

    (async () => {
        let snap = await fb.db.ref('blogPosts/' + id).once('value').catch(() => null);
        if (!snap || !snap.exists()) {
            // Older links use the post's `push` field rather than its key
            const q = await fb.db.ref('blogPosts').orderByChild('push').equalTo(id).limitToFirst(1).once('value').catch(() => null);
            snap = q && q.exists() ? { val: () => Object.values(q.val())[0], key: Object.keys(q.val())[0] } : null;
        }
        const post = snap && snap.val();
        if (!post || post.published === false) { notFound(); return; }
        const key = snap.key;
        const words = String(post.content || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
        document.title = `${post.title || 'Rehab update'} — RehabVerve`;
        const meta = document.querySelector('meta[name="description"]');
        if (meta && post.description) meta.setAttribute('content', String(post.description).slice(0, 160));

        const url = location.href;
        const share = [
            ['bxl-whatsapp', `https://wa.me/?text=${encodeURIComponent(`${post.title} ${url}`)}`, 'WhatsApp'],
            ['bxl-facebook', `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, 'Facebook'],
            ['bxl-twitter', `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post.title || '')}`, 'X'],
            ['bxl-linkedin', `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, 'LinkedIn']
        ];

        host.innerHTML = `
            <a href="#/updates" class="btn btn-sm btn-ghost"><i class='bx bx-arrow-back'></i> Rehab updates</a>
            ${post.category ? `<span class="eyebrow" style="display:block;margin-top:16px">${esc(post.category)}</span>` : ''}
            <h1>${esc(post.title || 'Untitled')}</h1>
            <p class="muted">${esc(post.author || 'RehabVerve Team')} · ${esc(RV.date(post.timestamp) || 'Recent')} · ${Math.max(1, Math.round(words / 220))} min read</p>
            <img class="article-cover" src="${esc(RV.img(post.img, 'assets/img/blog-placeholder.jpg'))}" alt="" onerror="this.src='assets/img/blog-placeholder.jpg'">
            <div class="prose" id="content">${RV.richText(post.content || post.description || '')}</div>
            <div class="ad-slot mt-3" data-ad-slot="article"></div>
            <hr>
            <div class="row-between">
                <strong>Share this update</strong>
                <div class="row">${share.map(([icon, href, label]) => `<a class="btn btn-icon btn-sm" href="${esc(href)}" target="_blank" rel="noopener" aria-label="Share on ${label}"><i class='bx ${icon}'></i></a>`).join('')}
                <button class="btn btn-icon btn-sm" id="copy" aria-label="Copy link"><i class='bx bx-link'></i></button></div>
            </div>`;

        // Place a house ad after the third paragraph of longer articles
        const paras = host.querySelectorAll('#content > p');
        if (paras.length > 5) paras[2].insertAdjacentHTML('afterend', '<div class="ad-slot" data-ad-slot="article"></div>');
        RV.renderAds();

        $('#copy').addEventListener('click', () => navigator.clipboard.writeText(url).then(() => RV.toast('Link copied', 'success'), () => RV.toast(url)));

        const all = await fb.db.ref('blogPosts').once('value').then(s => RV.list(s.val())).catch(() => []);
        const related = all.filter(p => p.id !== key && p.published !== false && (!post.category || p.category === post.category))
            .sort((a, b) => RV.ts(b.timestamp) - RV.ts(a.timestamp)).slice(0, 3);
        if (related.length) {
            $('#related').innerHTML = related.map(cards.post).join('');
            $('#related-wrap').hidden = false;
        }
    })().catch(err => { console.error(err); notFound(); });
})();
