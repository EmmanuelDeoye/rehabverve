// register.js — apply to join as a professional/tutor, center/mobile service or supplier.
// Applications go to /applications/{uid} for admin review. Passwords only go to Firebase Auth.
(function () {
    'use strict';
    const { $, esc, data: D } = RV;
    const fb = RV.fb;
    const form = $('#apply');
    const msg = form.querySelector('.form-msg');
    const back = form.querySelector('[data-back]');
    const next = form.querySelector('[data-next]');
    let step = 1;
    let existing = null;
    let submitting = false;

    form.category.insertAdjacentHTML('beforeend', RV.optionList(D.CATEGORIES.map(c => ({ value: c.value, label: c.label }))));

    const role = () => RV.formValues(form).role || 'practitioner';
    const kindOf = r => (r === 'center' ? 'centers' : 'pros');

    const unflatten = flat => {
        const out = {};
        Object.entries(flat).forEach(([path, value]) => {
            if (value === null || value === '' || value === false) return;
            const parts = path.split('/');
            let t = out;
            parts.slice(0, -1).forEach(p => { t = t[p] = t[p] || {}; });
            t[parts[parts.length - 1]] = value;
        });
        return out;
    };

    function renderFields() {
        const r = role();
        $('#pro-extra').hidden = r !== 'practitioner';
        $('#supplier-fields').hidden = r !== 'supplier';
        const prefill = (existing && existing.role === r && existing.listing) || {};
        if (!prefill.name && r === 'practitioner') prefill.name = form.accName.value || (RV.state.profile && RV.state.profile.name) || '';
        $('#listing-fields').innerHTML = r === 'supplier' ? '' : RV.listingFormHTML(kindOf(r), prefill);
        form.querySelectorAll('[data-for]').forEach(el => { el.hidden = !el.dataset.for.split(' ').includes(r); });
        $('#doc-label').textContent = r === 'center' ? 'Registration certificate or accreditation (optional)' : 'Licence or practising certificate *';
        if (existing && existing.role === r) {
            if (existing.category) form.category.value = existing.category;
            if (existing.licenseNo) form.licenseNo.value = existing.licenseNo;
            const sup = existing.supplier || {};
            ['orgName', 'productsOffered'].forEach(k => { if (sup[k]) form[k].value = sup[k]; });
            if (sup.phone) form.supPhone.value = sup.phone;
            if (sup.location) form.supLocation.value = sup.location;
        }
    }
    $('#roles').addEventListener('change', renderFields);

    function show(n) {
        step = n;
        form.querySelectorAll('fieldset').forEach(f => { f.hidden = Number(f.dataset.step) !== n; });
        form.querySelectorAll('.steps-bar i').forEach((b, i) => b.classList.toggle('on', i < n));
        back.hidden = n === 1;
        next.innerHTML = n === 3 ? "<i class='bx bx-send'></i> Submit application" : "Continue <i class='bx bx-right-arrow-alt'></i>";
        msg.hidden = true;
        form.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    const fail = text => { msg.textContent = text; msg.hidden = false; return false; };

    function validate(n) {
        const v = RV.formValues(form);
        const r = role();
        if (n === 1 && !RV.state.user) {
            if (!v.accName) return fail('Please enter your full name.');
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.accEmail)) return fail('Please enter a valid email address.');
            if ((form.accPassword.value || '').length < 6) return fail('Choose a password with at least 6 characters.');
        }
        if (n === 2) {
            if (r === 'supplier') {
                if (!v.orgName || !v.productsOffered || RV.digits(v.supPhone).length < 7) return fail('Please fill in your organisation, phone and products.');
                return true;
            }
            if (r === 'practitioner' && !v.category) return fail('Please choose your discipline.');
            const { updates, error } = RV.readListingForm(form, kindOf(r), {});
            if (error) return fail(error);
            if (!updates.phone && !updates.whatsapp) return fail('Please add a phone or WhatsApp number so clients can reach you.');
            if (!Object.keys(updates).some(k => k.startsWith('serviceModes/'))) return fail('Choose at least one way you see clients (clinic, home visits or online).');
            if (!updates['coverage/states'] && !updates['coverage/areas'] && !updates['coverage/nationwide']) return fail('Tell clients which states or areas you cover.');
        }
        if (n === 3) {
            const lic = form.license.files[0], photo = form.photo.files[0];
            if (r === 'practitioner' && !lic && !(existing && existing.licenseUrl)) return fail('Please attach your licence or practising certificate.');
            const bad = RV.checkFile(lic, { maxMb: 5, types: /^(application\/pdf|image\/(jpeg|png|webp)|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/ }) ||
                RV.checkFile(photo, { maxMb: 3, types: /^image\/(jpeg|png|webp)$/ });
            if (bad) return fail(bad);
            if (!form.terms.checked) return fail('Please confirm your details and accept the terms.');
        }
        return true;
    }

    back.addEventListener('click', () => show(step - 1));
    next.addEventListener('click', async () => {
        if (!validate(step)) return;
        if (step === 1) {
            // Carry the account name into the listing if it is still empty
            const nameField = $('#listing-fields [name=name]');
            if (nameField && !nameField.value) nameField.value = form.accName.value.trim() || (RV.state.profile && RV.state.profile.name) || '';
        }
        if (step < 3) { show(step + 1); return; }
        RV.busy(next, true, 'Submitting…');
        try {
            await submit();
        } catch (err) {
            console.error(err);
            fail(RV.errorMessage(err));
            if (err && err.code === 'auth/email-already-in-use') RV.openAuth('signin', 'Sign in with your existing account, then submit your application.');
        } finally {
            RV.busy(next, false);
        }
    });

    async function submit() {
        submitting = true;
        try { await doSubmit(); } finally { submitting = false; }
    }

    async function doSubmit() {
        // Read everything before the account is created: signing in re-renders the page.
        const v = RV.formValues(form);
        const r = role();
        const listing = r === 'supplier' ? null : unflatten(RV.readListingForm(form, kindOf(r), {}).updates);
        let user = RV.state.user;
        if (!user) {
            const cred = await fb.auth.createUserWithEmailAndPassword(v.accEmail, form.accPassword.value);
            user = cred.user;
            await user.updateProfile({ displayName: v.accName }).catch(() => {});
            await fb.db.ref('userdata/' + user.uid).set({ name: v.accName, email: v.accEmail, role: r, createdAt: Date.now() });
            form.accPassword.value = '';
        }
        const uid = user.uid;
        const lic = form.license.files[0], photo = form.photo.files[0];
        const app = {
            role: r,
            userId: uid,
            status: 'pending',
            timestamp: fb.TIMESTAMP,
            applicantName: (v.accName || (RV.state.profile && RV.state.profile.name) || user.displayName || '').slice(0, 120),
            applicantEmail: user.email || ''
        };
        if (lic) app.licenseUrl = await RV.upload(`applications/${uid}/${RV.fileName(lic)}`, lic);
        else if (existing && existing.licenseUrl) app.licenseUrl = existing.licenseUrl;
        if (photo) app.photoUrl = await RV.upload(`profile-images/${uid}/${RV.fileName(photo)}`, photo);
        else if (existing && existing.photoUrl) app.photoUrl = existing.photoUrl;

        if (r === 'supplier') {
            app.supplier = { orgName: v.orgName, phone: v.supPhone, location: v.supLocation || '', productsOffered: v.productsOffered, email: user.email || '' };
        } else {
            app.listing = listing;
            if (r === 'practitioner') {
                app.category = v.category;
                if (v.licenseNo) app.licenseNo = v.licenseNo;
            }
        }
        await fb.db.ref('applications/' + uid).set(app);
        await fb.db.ref(`userdata/${uid}/role`).set(r).catch(() => {});
        form.hidden = true;
        $('#status').innerHTML = `
            <div class="card card-pad center stack">
                <i class='bx bx-check-circle' style="font-size:3.5rem;color:var(--success)"></i>
                <h2>Application received</h2>
                <p class="muted">Thank you! Our team reviews applications within a few working days. We will contact you at <strong>${esc(user.email || '')}</strong>. Once approved, your profile goes live with your fees and coverage areas.</p>
                <div class="row" style="justify-content:center"><a class="btn btn-primary" href="#/">Back to home</a><a class="btn" href="#/settings">My account</a></div>
            </div>`;
        window.scrollTo({ top: 0 });
    }

    RV.onAuth(async s => {
        if (submitting) return;
        $('#account-new').hidden = !!s.user;
        $('#account-signed').hidden = !s.user;
        if (!s.user) { existing = null; $('#status').innerHTML = ''; form.hidden = false; renderFields(); return; }
        $('#acc-email').textContent = s.user.email || '';
        const [appSnap, proSnap] = await Promise.all([
            fb.db.ref('applications/' + s.user.uid).once('value').catch(() => null),
            fb.db.ref('professionals/' + s.user.uid).once('value').catch(() => null)
        ]);
        existing = appSnap && appSnap.val();
        const status = $('#status');
        if (existing && existing.status === 'approved' || (proSnap && proSnap.exists())) {
            form.hidden = true;
            status.innerHTML = `<div class="card card-pad center stack"><i class='bx bx-badge-check' style="font-size:3rem;color:var(--primary)"></i><h2>You are listed on RehabVerve</h2><p class="muted">Update your fees, coverage and details from your profile.</p><a class="btn btn-primary" href="#/profile?id=${encodeURIComponent(s.user.uid)}">Go to my profile</a></div>`;
            return;
        }
        form.hidden = false;
        if (existing) {
            const checked = form.querySelector(`[name=role][value="${CSS.escape(existing.role || 'practitioner')}"]`);
            if (checked) checked.checked = true;
            status.innerHTML = existing.status === 'rejected'
                ? `<div class="notice warn mb-0" style="margin-bottom:16px"><i class='bx bx-error'></i><span>Your last application was not approved${existing.reviewNote ? `: ${esc(existing.reviewNote)}` : '.'} You can update it and submit again.</span></div>`
                : `<div class="notice" style="margin-bottom:16px"><i class='bx bx-time-five'></i><span>Your application (sent ${esc(RV.date(existing.timestamp) || 'recently')}) is being reviewed. You can update it below.</span></div>`;
        } else status.innerHTML = '';
        renderFields();
    });

    renderFields();
    show(1);
})();
