// tele.js — Teletherapy page: booking flow, audience tabs, stories carousel,
// animated FAQ, scroll-linked progress and the sticky booking dock.
(function () {
    'use strict';

    const WA_NUMBER = '2348132912880';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const waLink = text => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

    const state = { day: null, audience: 'Myself' };

    /* ---------------- WhatsApp links ---------------- */
    function whatsappLinks() {
        $$('[data-wa]').forEach(a => {
            a.href = waLink(a.getAttribute('data-wa'));
            a.target = '_blank';
            a.rel = 'noopener';
        });
    }

    /* ---------------- Preferred day pickers ---------------- */
    function buildDays() {
        const days = [];
        const now = new Date();
        for (let i = 0; i < 5; i++) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
            days.push({
                key: d.toISOString().slice(0, 10),
                top: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-US', { weekday: 'short' }),
                num: d.getDate(),
                label: d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
            });
        }
        state.day = days[1];
        ['heroDays', 'sheetDays'].forEach(id => {
            const host = document.getElementById(id);
            if (!host) return;
            host.innerHTML = days.map(d => `
                <button type="button" class="th-day ${d.key === state.day.key ? 'is-active' : ''}" data-day="${d.key}" aria-pressed="${d.key === state.day.key}">
                    <small>${d.top}</small><b>${d.num}</b>
                </button>`).join('');
        });
        document.addEventListener('click', e => {
            const btn = e.target.closest('.th-day');
            if (!btn) return;
            state.day = days.find(d => d.key === btn.dataset.day);
            $$('.th-day').forEach(b => {
                const on = b.dataset.day === state.day.key;
                b.classList.toggle('is-active', on);
                b.setAttribute('aria-pressed', on);
            });
        });
    }

    /* ---------------- Audience tabs ---------------- */
    const AUDIENCES = {
        individual: {
            icon: 'bx-user', book: 'Book for myself', audience: 'Myself',
            title: 'Support that fits your life',
            text: 'One‑to‑one sessions with a licensed specialist, built around your goals and schedule.',
            list: ['Stress & anxiety', 'Stroke & injury recovery', 'Speech & voice', 'Pain & mobility']
        },
        couple: {
            icon: 'bx-heart', book: 'Book as a couple', audience: 'Couple',
            title: 'Grow closer, communicate better',
            text: 'Guided sessions that help you resolve conflict and rebuild connection — together, from home.',
            list: ['Communication', 'Conflict resolution', 'Trust & intimacy', 'Life transitions']
        },
        family: {
            icon: 'bx-home-heart', book: 'Book for my family', audience: 'Family',
            title: 'Care that includes everyone',
            text: 'Coordinated support for caregivers and loved ones, with a multidisciplinary team when needed.',
            list: ['Caregiver support', 'Family dynamics', 'Home rehab plans', 'Care coordination']
        },
        child: {
            icon: 'bx-child', book: 'Book for my child', audience: 'My child',
            title: 'Helping children thrive',
            text: 'Playful, evidence‑based therapy with specialists who work with children every day.',
            list: ['Speech & language', 'Autism support', 'Learning differences', 'Motor skills']
        }
    };

    function audienceTabs() {
        const tabs = $$('.th-tab');
        const ink = $('.th-tab-ink');
        if (!tabs.length) return;
        const copy = $('.th-aud-copy');

        function moveInk(tab) {
            if (!ink) return;
            ink.style.width = `${tab.offsetWidth}px`;
            ink.style.transform = `translateX(${tab.offsetLeft - 5}px)`;
        }
        function select(tab, animate) {
            const a = AUDIENCES[tab.dataset.aud];
            tabs.forEach(t => { const on = t === tab; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on); });
            moveInk(tab);
            $('#audTitle').textContent = a.title;
            $('#audText').textContent = a.text;
            $('#audList').innerHTML = a.list.map(x => `<li><i class='bx bx-check-circle'></i>${x}</li>`).join('');
            $('#audIcon').className = `bx ${a.icon}`;
            $('#audBtn span').textContent = a.book;
            $('#audBtn').dataset.audience = a.audience;
            if (animate && copy) { copy.classList.remove('th-aud-fade'); void copy.offsetWidth; copy.classList.add('th-aud-fade'); }
        }
        tabs.forEach(t => t.addEventListener('click', () => select(t, true)));
        $('.th-tabs').addEventListener('keydown', e => {
            const i = tabs.findIndex(t => t.classList.contains('is-active'));
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
                next.focus(); select(next, true);
            }
        });
        select(tabs[0], false);
        addEventListener('resize', () => moveInk($('.th-tab.is-active')));
        // fonts can shift widths after load
        if (document.fonts) document.fonts.ready.then(() => moveInk($('.th-tab.is-active')));
    }

    /* ---------------- Steps progress line ---------------- */
    function stepsLine() {
        const wrap = $('#thSteps');
        const line = $('.th-steps-line');
        if (!wrap || !line) return;
        const update = () => {
            const r = wrap.getBoundingClientRect();
            const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.3)));
            line.style.setProperty('--p', p.toFixed(3));
        };
        addEventListener('scroll', update, { passive: true });
        update();
    }

    /* ---------------- Stories carousel ---------------- */
    function stories() {
        const track = $('#tTrack');
        const dotsHost = $('#tDots');
        if (!track) return;
        const cards = $$('.th-story', track);
        dotsHost.innerHTML = cards.map((_, i) => `<button type="button" aria-label="Story ${i + 1}"></button>`).join('');
        const dots = $$('button', dotsHost);

        const step = () => (cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth);
        const current = () => Math.round(track.scrollLeft / step());
        const go = i => {
            const max = cards.length - 1;
            const idx = i > max ? 0 : i < 0 ? max : i;
            track.scrollTo({ left: idx * step(), behavior: reduced ? 'auto' : 'smooth' });
        };
        const sync = () => dots.forEach((d, i) => d.classList.toggle('is-active', i === Math.min(current(), dots.length - 1)));

        dots.forEach((d, i) => d.addEventListener('click', () => go(i)));
        $('#tPrev') && $('#tPrev').addEventListener('click', () => go(current() - 1));
        $('#tNext') && $('#tNext').addEventListener('click', () => go(current() + 1));
        track.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
        track.addEventListener('keydown', e => {
            if (e.key === 'ArrowRight') { e.preventDefault(); go(current() + 1); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); go(current() - 1); }
        });
        sync();

        if (reduced) return;
        let timer = null, visible = false, hovering = false;
        const tick = () => { if (visible && !hovering && !document.hidden) { const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4; go(atEnd ? 0 : current() + 1); } };
        const start = () => { clearInterval(timer); timer = setInterval(tick, 5500); };
        track.addEventListener('pointerenter', () => { hovering = true; });
        track.addEventListener('pointerleave', () => { hovering = false; });
        track.addEventListener('touchstart', () => { hovering = true; start(); }, { passive: true });
        track.addEventListener('touchend', () => { hovering = false; }, { passive: true });
        new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; })).observe(track);
        start();
    }

    /* ---------------- FAQ (animated details) ---------------- */
    function faq() {
        $$('.th-q').forEach(d => {
            const summary = $('summary', d);
            const body = $('.th-a', d);
            summary.addEventListener('click', e => {
                if (reduced) return;
                e.preventDefault();
                if (d.open) {
                    const h = body.offsetHeight;
                    body.animate([{ height: `${h}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' })
                        .onfinish = () => { d.open = false; };
                } else {
                    d.open = true;
                    const h = body.offsetHeight;
                    body.animate([{ height: '0px', opacity: 0 }, { height: `${h}px`, opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
                }
            });
        });
    }

    /* ---------------- Sticky dock ---------------- */
    function dock() {
        const el = $('#thDock');
        const hero = $('.th-actions');
        if (!el || !hero) return;
        new IntersectionObserver(es => es.forEach(e => {
            el.classList.toggle('show', !e.isIntersecting && e.boundingClientRect.top < 0);
        })).observe(hero);
    }

    /* ---------------- Booking sheet ---------------- */
    function booking() {
        const sheet = $('#bookSheet');
        const form = $('#bookForm');
        if (!sheet || !form) return;
        const steppers = $$('.th-stepper', form);
        const done = $('.th-done', form);
        const actions = $('#bookActions');
        const back = $('#bookBack');
        const next = $('#bookNext');
        const bar = $('#bookBar');
        const labels = $$('.th-progress-labels li');
        let step = 1, lastFocus = null;

        function setStep(n) {
            step = n;
            steppers.forEach(s => s.classList.toggle('is-active', Number(s.dataset.step) === n));
            const isDone = n === 4;
            done.hidden = !isDone;
            actions.hidden = isDone;
            back.hidden = n === 1;
            next.innerHTML = n === 3 ? "<i class='bx bxl-whatsapp'></i> Send request" : "Continue <i class='bx bx-right-arrow-alt'></i>";
            next.classList.toggle('vv-btn--whatsapp', n === 3);
            next.classList.toggle('vv-btn--primary', n !== 3);
            bar.style.width = `${Math.min(n, 3) / 3 * 100}%`;
            labels.forEach((l, i) => l.classList.toggle('is-on', i < Math.min(n, 3)));
            if (n === 3) renderSummary();
            $('.th-sheet-panel').scrollTop = 0;
        }

        function values() {
            const fd = new FormData(form);
            return {
                audience: fd.get('audience'),
                service: fd.get('service'),
                plan: fd.get('plan'),
                time: fd.get('time'),
                name: (fd.get('name') || '').trim(),
                phone: (fd.get('phone') || '').trim(),
                notes: (fd.get('notes') || '').trim(),
                day: state.day ? state.day.label : 'Flexible'
            };
        }

        function renderSummary() {
            const v = values();
            $('#bookSummary').innerHTML = `
                <div><b>For:</b> ${v.audience} · <b>Service:</b> ${escapeHTML(v.service)}</div>
                <div><b>Plan:</b> ${v.plan}</div>
                <div><b>Preferred:</b> ${v.day}, ${v.time.toLowerCase()}</div>`;
        }

        function escapeHTML(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

        function validate() {
            let ok = true;
            ['name', 'phone'].forEach(n => {
                const input = form.elements[n];
                const field = input.closest('.th-field');
                const valid = n === 'phone' ? input.value.replace(/\D/g, '').length >= 7 : input.value.trim().length >= 2;
                field.classList.toggle('has-error', !valid);
                if (!valid && ok) { input.focus(); ok = false; }
            });
            return ok;
        }

        function open(ctx = {}) {
            lastFocus = document.activeElement;
            form.reset();
            $$('.th-field.has-error', form).forEach(f => f.classList.remove('has-error'));
            if (ctx.service) {
                const opt = $$('option', $('#bookService')).find(o => o.textContent.trim() === ctx.service);
                if (opt) $('#bookService').value = opt.value;
            }
            if (ctx.plan) { const r = $(`input[name="plan"][value="${ctx.plan}"]`, form); if (r) r.checked = true; }
            if (ctx.audience) { const r = $(`input[name="audience"][value="${ctx.audience}"]`, form); if (r) r.checked = true; }
            setStep(1);
            sheet.hidden = false;
            sheet.classList.remove('is-closing');
            document.body.classList.add('th-lock');
            setTimeout(() => { const first = $('input:checked', form) || $('input', form); if (first) first.focus({ preventScroll: true }); }, 60);
        }

        function close() {
            if (sheet.hidden) return;
            sheet.classList.add('is-closing');
            setTimeout(() => {
                sheet.hidden = true;
                sheet.classList.remove('is-closing');
                document.body.classList.remove('th-lock');
                if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
            }, reduced ? 0 : 340);
        }

        function send() {
            const v = values();
            const msg = [
                'Hello RehabVerve! I\'d like to book a teletherapy session.',
                '',
                `• Name: ${v.name}`,
                `• Phone: ${v.phone}`,
                `• Session for: ${v.audience}`,
                `• Service: ${v.service}`,
                `• Plan: ${v.plan}`,
                `• Preferred time: ${v.day}, ${v.time}`,
                v.notes ? `• Notes: ${v.notes}` : null
            ].filter(line => line !== null).join('\n');
            window.open(waLink(msg), '_blank', 'noopener');
            setStep(4);
            if (window.vvToast) window.vvToast('Booking request prepared — send it on WhatsApp to confirm', 'success', 5000);
        }

        document.addEventListener('click', e => {
            const trigger = e.target.closest('[data-book]');
            if (trigger && !sheet.contains(trigger)) {
                e.preventDefault();
                const service = trigger.closest('[data-service]');
                const plan = trigger.closest('[data-plan]');
                open({
                    service: service && service.dataset.service,
                    plan: plan && plan.dataset.plan,
                    audience: trigger.dataset.audience
                });
            }
            if (e.target.closest('[data-close]') && sheet.contains(e.target)) close();
        });
        next.addEventListener('click', () => {
            if (step < 3) setStep(step + 1);
            else if (validate()) send();
        });
        back.addEventListener('click', () => setStep(Math.max(1, step - 1)));
        form.addEventListener('submit', e => { e.preventDefault(); next.click(); });
        form.addEventListener('input', e => {
            const f = e.target.closest('.th-field');
            if (f) f.classList.remove('has-error');
        });
        document.addEventListener('keydown', e => {
            if (sheet.hidden) return;
            if (e.key === 'Escape') close();
            if (e.key === 'Tab') {
                const focusables = $$('button:not([hidden]), input, select, textarea, a[href]', sheet).filter(el => el.offsetParent !== null);
                const first = focusables[0], last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        });
        // Allow deep links like teletherapy.html#book
        if (location.hash === '#book') setTimeout(() => open(), 400);
    }

    function init() {
        whatsappLinks();
        buildDays();
        audienceTabs();
        stepsLine();
        stories();
        faq();
        dock();
        booking();
    }

    if (document.body) init();
    else document.addEventListener('DOMContentLoaded', init);
})();
