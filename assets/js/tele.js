// tele.js — teletherapy page: audience tabs, services, plans and booking.
(function () {
    'use strict';
    const { $, $$, esc, data: D } = RV;

    const AUDIENCES = {
        individual: { title: 'Support that fits your life', text: 'Private, one-to-one sessions for adults — from stroke and injury recovery to stress, anxiety and life transitions.', list: ['Anxiety, stress and low mood', 'Speech and swallowing after stroke', 'Home exercise programmes for pain and mobility', 'Returning to work and daily routines'], cta: 'Book for myself', audience: 'Myself' },
        couple: { title: 'Grow closer, together', text: 'Guided sessions that help partners communicate, resolve conflict and support each other — including when one partner is living with a disability.', list: ['Communication and conflict', 'Adjusting after illness or injury', 'Caregiver strain', 'Pre-marital and family planning support'], cta: 'Book for us', audience: 'Couple' },
        family: { title: 'Support for the whole family', text: 'Help for families caring for a loved one, with practical guidance from the rehab team.', list: ['Caring for a parent after stroke', 'Living with autism, cerebral palsy or Down syndrome', 'Family routines and behaviour', 'Planning care with several specialists'], cta: 'Book for my family', audience: 'A family member' },
        child: { title: 'Helping children thrive', text: 'Speech, occupational, behaviour and learning support for children — with parents coached to continue at home.', list: ['Speech and language delay', 'Autism and ADHD support', 'Handwriting, sensory and motor skills', 'Learning support and special education'], cta: 'Book for my child', audience: 'My child' }
    };
    const SERVICES = [
        ['bx-chat', 'Instant consultation (15 min)', 'A quick call to understand your needs and point you to the right specialist.'],
        ['bx-message-rounded-dots', 'Speech & language therapy', 'Communication, speech, language and swallowing support.'],
        ['bx-brush', 'Occupational therapy', 'Daily living skills, sensory support and independence for all ages.'],
        ['bx-body', 'Physiotherapy & rehab', 'Guided exercise programmes to rebuild mobility and strength.'],
        ['bx-heart-circle', 'Mental health counselling', 'Support for stress, anxiety, depression and adjustment.'],
        ['bx-group', 'Family & couples therapy', 'Strengthen relationships and resolve conflict with expert guidance.'],
        ['bx-book-open', 'Special education support', 'Personalised learning support for children with additional needs.'],
        ['bx-brain', 'Behaviour therapy', 'Structured behaviour support for children and adults, including autism.']
    ];

    let audience = 'individual';
    function renderAudience() {
        const a = AUDIENCES[audience];
        $$('#aud-tabs [role=tab]').forEach(t => t.setAttribute('aria-selected', String(t.dataset.aud === audience)));
        $('#aud-panel').innerHTML = `
            <div class="grid-2" style="align-items:center">
                <div><h3>${esc(a.title)}</h3><p class="muted">${esc(a.text)}</p>
                <button type="button" class="btn btn-primary" data-book data-audience="${esc(a.audience)}"><i class='bx bx-calendar-plus'></i> ${esc(a.cta)}</button></div>
                <ul class="stack" style="list-style:none;padding:0;margin:0">${a.list.map(x => `<li class="row" style="flex-wrap:nowrap"><i class='bx bx-check-circle' style="color:var(--success);font-size:1.3rem"></i>${esc(x)}</li>`).join('')}</ul>
            </div>`;
    }
    $('#aud-tabs').addEventListener('click', e => {
        const t = e.target.closest('[data-aud]');
        if (t) { audience = t.dataset.aud; renderAudience(); }
    });
    renderAudience();

    $('#services').innerHTML = SERVICES.map(([icon, name, text]) => `
        <article class="card card-pad stack">
            <i class='bx ${icon}' style="font-size:1.8rem;color:var(--primary)"></i>
            <h3 class="mb-0">${esc(name)}</h3><p class="muted mb-0">${esc(text)}</p>
            <button type="button" class="btn btn-sm" data-book data-service="${esc(name)}">Book this <i class='bx bx-right-arrow-alt'></i></button>
        </article>`).join('');

    RV.config().then(cfg => {
        $('#plans').innerHTML = cfg.plans.map(p => `
            <article class="card plan${p.featured ? ' featured' : ''}">
                ${p.featured ? '<span class="badge badge-primary" style="width:fit-content">Best value</span>' : ''}
                <h3 class="mb-0">${esc(p.name)}</h3>
                <div class="amount">${esc(RV.money(p.price, p.currency || 'NGN'))} <small>/ ${esc(D.PRICE_UNITS[p.unit] || p.unit || 'session')}</small></div>
                ${p.note ? `<p class="muted mb-0">${esc(p.note)}</p>` : ''}
                <ul>${(p.features || []).map(f => `<li><i class='bx bx-check'></i>${esc(f)}</li>`).join('')}</ul>
                <button type="button" class="btn ${p.featured ? 'btn-primary' : ''} btn-block" data-book data-plan="${esc(p.name)}">Choose ${esc(p.name)}</button>
            </article>`).join('');
        $('#wa-cta').href = RV.waLink(cfg.whatsapp, 'Hello RehabVerve! I have a question about teletherapy.');
    });

    document.addEventListener('click', e => {
        const b = e.target.closest('[data-book]');
        if (!b) return;
        RV.book({ mode: 'tele', service: b.dataset.service, plan: b.dataset.plan, audience: b.dataset.audience });
    });
    if (location.hash === '#book') RV.book({ mode: 'tele' });
})();
