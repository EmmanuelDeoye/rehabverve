// booking.js — one booking flow for teletherapy, home visits, clinic visits and tutoring.
// Bookings are saved to /bookings (so the admin console and the professional can manage them);
// WhatsApp stays available as a follow-up, not as the only record.
(function () {
    'use strict';
    const { esc, data: D } = RV;

    const SERVICES = [
        'Not sure — help me choose', 'Instant consultation (15 min)', 'Physiotherapy & rehab', 'Occupational therapy',
        'Speech & language therapy', 'Mental health counselling', 'Family & couples therapy', 'Behaviour therapy',
        'Special education support', 'Private tutoring', 'Prosthetics & orthotics', 'Hearing / audiology', 'Nutrition', 'Nursing care at home'
    ];
    const AUDIENCE = ['Myself', 'My child', 'A family member', 'Couple'];
    const TYPES = {
        tele: { type: 'teletherapy', label: 'Online (video)', icon: 'bx-video' },
        home: { type: 'home-visit', label: 'Home visit', icon: 'bx-car' },
        clinic: { type: 'clinic', label: 'In clinic', icon: 'bx-clinic' },
        onsite: { type: 'clinic', label: 'At the center', icon: 'bx-buildings' }
    };

    function serviceFor(listing) {
        const cat = listing && D.listingCategory(listing);
        if (!cat) return SERVICES[0];
        const map = {
            physiotherapy: 'Physiotherapy & rehab', 'occupational-therapy': 'Occupational therapy', 'speech-therapy': 'Speech & language therapy',
            psychology: 'Mental health counselling', 'behaviour-therapy': 'Behaviour therapy', 'special-education': 'Special education support',
            'prosthetics-orthotics': 'Prosthetics & orthotics', audiology: 'Hearing / audiology', dietetics: 'Nutrition', nursing: 'Nursing care at home'
        };
        return map[cat.value] || SERVICES[0];
    }

    // opts: { listing, listingKind: 'pros'|'centers', service, plan, mode, tutoring }
    RV.book = async (opts = {}) => {
        const cfg = await RV.config();
        const L = opts.listing || null;
        const modes = L ? Object.keys(L.serviceModes || {}).filter(m => L.serviceModes[m] && TYPES[m]) : ['tele', 'home', 'clinic'];
        const available = modes.length ? modes : ['tele', 'home', 'clinic'];
        const startMode = available.includes(opts.mode) ? opts.mode : available[0];
        const who = L ? (L.name || L.centerName) : '';
        const plans = !L && !opts.tutoring ? cfg.plans : [];
        const p = (RV.state && RV.state.profile) || {};
        const minDate = RV.today();
        const service = opts.service || (opts.tutoring ? 'Private tutoring' : serviceFor(L));
        const serviceList = SERVICES.includes(service) ? SERVICES : [service, ...SERVICES];
        const audience = AUDIENCE.includes(opts.audience) ? opts.audience : (opts.tutoring ? 'My child' : 'Myself');

        const body = `
        <form id="bk-form" novalidate>
            ${who ? `<div class="notice"><i class='bx bx-user-check'></i><span>Booking with <strong>${esc(who)}</strong>${RV.priceRange(L) ? ` · ${esc(RV.priceRange(L))}` : ''}</span></div>` : ''}
            <div class="steps-bar" aria-hidden="true"><i class="on"></i><i></i><i></i></div>
            <fieldset data-step="1" style="border:0;padding:0;margin:0" class="stack">
                <legend class="step-title">What do you need?</legend>
                <div class="field"><span>How would you like to be seen?</span>
                    <div class="options">${available.map(m => `<label><input type="radio" name="mode" value="${m}" ${m === startMode ? 'checked' : ''}><span><i class='bx ${TYPES[m].icon}'></i>${TYPES[m].label}</span></label>`).join('')}</div>
                </div>
                <div class="field"><span>Who is it for?</span>
                    <div class="checks">${AUDIENCE.map(a => `<label><input type="radio" name="audience" value="${a}" ${a === audience ? 'checked' : ''}> ${a}</label>`).join('')}</div>
                </div>
                <label class="field"><span>Service</span><select name="service">${RV.optionList(serviceList, service)}</select></label>
                ${plans.length ? `<div class="field"><span>Plan</span><div class="options">${plans.map((pl, i) => `<label><input type="radio" name="plan" value="${esc(pl.name)}" ${(opts.plan ? pl.name === opts.plan : i === 0) ? 'checked' : ''}><span>${esc(pl.name)}<small>${esc(RV.money(pl.price, pl.currency))} / ${esc(D.PRICE_UNITS[pl.unit] || pl.unit)}</small></span></label>`).join('')}</div></div>` : ''}
            </fieldset>
            <fieldset data-step="2" hidden style="border:0;padding:0;margin:0" class="stack">
                <legend class="step-title">When suits you?</legend>
                <label class="field"><span>Preferred date</span><input type="date" name="preferredDate" min="${minDate}"></label>
                <div class="field"><span>Time of day</span>
                    <div class="checks">${['Morning', 'Afternoon', 'Evening', 'Any time'].map((t, i) => `<label><input type="radio" name="timeOfDay" value="${t}" ${i === 0 ? 'checked' : ''}> ${t}</label>`).join('')}</div>
                </div>
                <label class="field" data-home><span>Address for the home visit *</span><textarea name="location" rows="2" maxlength="300" placeholder="Street, area, city"></textarea></label>
            </fieldset>
            <fieldset data-step="3" hidden style="border:0;padding:0;margin:0" class="stack">
                <legend class="step-title">Your details</legend>
                <label class="field"><span>Full name *</span><input name="name" autocomplete="name" maxlength="120" value="${esc(p.name || '')}"></label>
                <label class="field"><span>Phone / WhatsApp *</span><input name="phone" type="tel" autocomplete="tel" maxlength="40" value="${esc(p.phone || '')}" placeholder="e.g. 0801 234 5678"></label>
                <label class="field"><span>Anything we should know? <em>(optional)</em></span><textarea name="notes" rows="3" maxlength="3000" placeholder="Goals, concerns, diagnosis, questions"></textarea></label>
                <p class="hint mb-0">Your request is shared only with the RehabVerve care team${who ? ' and ' + esc(who) : ''}.</p>
            </fieldset>
            <div class="form-msg error mt-2" hidden></div>
            <div class="form-actions">
                <button type="button" class="btn" data-back hidden><i class='bx bx-chevron-left'></i> Back</button>
                <button type="button" class="btn btn-primary" data-next>Continue <i class='bx bx-right-arrow-alt'></i></button>
            </div>
        </form>`;

        const dlg = RV.dialog({ title: opts.tutoring ? 'Request a tutor' : 'Book a session', body });
        const form = dlg.querySelector('#bk-form');
        const msg = form.querySelector('.form-msg');
        const back = form.querySelector('[data-back]'), next = form.querySelector('[data-next]');
        let step = 1;
        const homeField = form.querySelector('[data-home]');
        const syncHome = () => { homeField.hidden = RV.formValues(form).mode !== 'home'; };
        form.addEventListener('change', syncHome);
        syncHome();

        const show = n => {
            step = n;
            form.querySelectorAll('fieldset').forEach(f => { f.hidden = Number(f.dataset.step) !== n; });
            form.querySelectorAll('.steps-bar i').forEach((b, i) => b.classList.toggle('on', i < n));
            back.hidden = n === 1;
            next.innerHTML = n === 3 ? "<i class='bx bx-send'></i> Send request" : "Continue <i class='bx bx-right-arrow-alt'></i>";
            msg.hidden = true;
        };
        const fail = text => { msg.textContent = text; msg.hidden = false; };

        back.addEventListener('click', () => show(step - 1));
        next.addEventListener('click', async () => {
            const v = RV.formValues(form);
            if (step === 2 && v.mode === 'home' && !v.location) return fail('Please add the address for the home visit.');
            if (step < 3) return show(step + 1);
            if (!v.name) return fail('Please enter your name.');
            if (RV.digits(v.phone).length < 7) return fail('Please enter a phone number we can reach you on.');

            try {
                await RV.requireAuth('Sign in or create a free account to send your booking and follow its progress.');
            } catch (e) {
                return fail('Please sign in to send your booking.');
            }
            const u = RV.state.user;
            const booking = {
                userId: u.uid,
                userEmail: u.email || '',
                type: opts.tutoring ? 'tutoring' : TYPES[v.mode].type,
                service: v.service || '',
                audience: v.audience || '',
                preferredDate: v.preferredDate || '',
                timeOfDay: v.timeOfDay || '',
                name: v.name,
                phone: v.phone,
                notes: v.notes || '',
                status: 'new',
                createdAt: RV.fb.TIMESTAMP
            };
            if (v.plan) booking.plan = v.plan;
            if (v.mode === 'home') booking.location = v.location;
            if (L && opts.listingKind === 'pros') { booking.proId = L.id; booking.proName = L.name || ''; }
            if (L && opts.listingKind === 'centers') { booking.proId = L.userId || L.id; booking.proName = L.centerName || ''; }
            if (L && RV.priceRange(L)) booking.price = RV.priceRange(L);

            RV.busy(next, true, 'Sending…');
            try {
                const ref = await RV.fb.db.ref('bookings').push(booking);
                if (!p.phone) RV.fb.db.ref(`userdata/${u.uid}/phone`).set(v.phone).catch(() => {});
                const ref6 = ref.key.slice(-6).toUpperCase();
                const lines = [
                    `Hello RehabVerve! I just sent booking request #${ref6}.`,
                    who ? `With: ${who}` : '', `Service: ${booking.service}`, `How: ${opts.tutoring ? 'Tutoring' : TYPES[v.mode].label}`,
                    v.plan ? `Plan: ${v.plan}` : '', v.preferredDate ? `Preferred: ${v.preferredDate} (${v.timeOfDay})` : `Time: ${v.timeOfDay}`,
                    `Name: ${v.name}`, `Phone: ${v.phone}`
                ].filter(Boolean).join('\n');
                dlg.querySelector('.modal-body').innerHTML = `
                    <div class="center stack">
                        <i class='bx bx-check-circle' style="font-size:3.5rem;color:var(--success)"></i>
                        <h3>Request sent — reference #${esc(ref6)}</h3>
                        <p class="muted">Our care team will confirm your specialist and time shortly. You can follow this booking under <strong>My bookings</strong>.</p>
                        <div class="row" style="justify-content:center">
                            <a class="btn btn-whatsapp" href="${esc(RV.waLink(cfg.whatsapp, lines))}" target="_blank" rel="noopener"><i class='bx bxl-whatsapp'></i> Also message us</a>
                            <a class="btn btn-primary" href="settings.html#bookings">My bookings</a>
                        </div>
                    </div>`;
            } catch (err) {
                RV.busy(next, false);
                fail(RV.errorMessage(err));
            }
        });
        show(1);
        return dlg;
    };
})();
