// classes.js — class catalogue, "My classes" for parents and "Classes I teach" for tutors.
(function () {
    'use strict';
    const { $, esc, lower, data: D, cards } = RV;
    const fb = RV.fb;
    let all = [];

    $('#subject').insertAdjacentHTML('beforeend', RV.optionList(D.CLASS_SUBJECTS));
    $('#age').insertAdjacentHTML('beforeend', RV.optionList(D.AGE_GROUPS));
    $('#request-tutor').addEventListener('click', () => RV.book({ tutoring: true, mode: 'tele' }));

    function render() {
        const subject = $('#subject').value, age = $('#age').value, q = lower($('#q').value.trim()), open = $('#open-only').checked;
        const list = all.filter(c => (!subject || c.subject === subject) && (!age || c.ageGroup === age || c.ageGroup === 'All ages') &&
            (!open || c.status === 'open') && (!q || lower([c.title, c.tutorName, c.description, c.subject].join(' ')).includes(q)));
        $('#count').textContent = `${list.length} class${list.length === 1 ? '' : 'es'}`;
        $('#list').innerHTML = list.length ? list.map(c => cards.klass(c)).join('')
            : RV.empty('No classes match yet. <button type="button" class="link-btn" data-tutor>Request a private tutor</button> and we will find one for your child.', 'bx-book-open');
    }
    ['subject', 'age', 'open-only'].forEach(id => $('#' + id).addEventListener('change', render));
    $('#q').addEventListener('input', RV.debounce(render, 160));
    $('#list').addEventListener('click', e => { if (e.target.closest('[data-tutor]')) RV.book({ tutoring: true, mode: 'tele' }); });

    $('#list').innerHTML = RV.skeletons(3);
    if (!fb) return;
    const loaded = fb.db.ref('classes').once('value').then(s => {
        all = RV.list(s.val()).sort((a, b) => RV.ts(b.createdAt) - RV.ts(a.createdAt));
        render();
        return all;
    }).catch(() => { $('#list').innerHTML = RV.empty('Classes could not be loaded. Please refresh.'); return []; });

    RV.onAuth(async s => {
        $('#mine').hidden = true;
        $('#teaching').hidden = true;
        if (!s.user) return;
        const classes = await loaded;
        const teaching = classes.filter(c => c.tutorId === s.user.uid);
        if (teaching.length) {
            $('#teaching').hidden = false;
            $('#teaching-list').innerHTML = teaching.map(c => cards.klass(c, { action: `<a class="btn btn-sm btn-primary" href="#/class?id=${encodeURIComponent(c.id)}">Manage</a>` })).join('');
        }
        const mine = RV.list((await fb.db.ref('userEnrollments/' + s.user.uid).once('value').catch(() => null))?.val());
        if (!mine.length) return;
        const statuses = await Promise.all(mine.map(m => fb.db.ref(`enrollments/${m.id}/${s.user.uid}`).once('value').then(x => x.val()).catch(() => null)));
        $('#mine').hidden = false;
        $('#mine-list').innerHTML = mine.map((m, i) => {
            const e = statuses[i] || {};
            const c = classes.find(x => x.id === m.id) || {};
            const badge = e.status === 'active' ? 'badge-success' : e.status === 'rejected' ? 'badge-danger' : 'badge-warning';
            return `<a class="card list-item clickable" href="#/class?id=${encodeURIComponent(m.id)}" style="color:inherit">
                <div><h4>${esc(c.title || m.title || 'Class')}</h4><p>${esc(e.childName || '')}${c.schedule ? ' · ' + esc(c.schedule) : ''}</p></div>
                <span class="badge ${badge}">${esc(e.status === 'active' ? 'Enrolled' : e.status || 'Removed')}</span></a>`;
        }).join('');
        if (RV.route.sub === 'mine') $('#mine').scrollIntoView();
    });
})();
