// settings.js — account details, theme, bookings, listing status, password and account deletion.
(function () {
    'use strict';
    const { $, $$, esc } = RV;
    const fb = RV.fb;

    // ---------- theme ----------
    const current = RV.theme.get();
    $$('#theme-choice input').forEach(r => { r.checked = r.value === current; });
    $('#theme-choice').addEventListener('change', e => { RV.theme.set(e.target.value); RV.toast('Theme updated'); });
    document.addEventListener('rv:theme', e => $$('#theme-choice input').forEach(r => { r.checked = r.value === e.detail; }));

    const STATUS = { new: ['badge-warning', 'Received'], contacted: ['badge-accent', 'Contacted'], confirmed: ['badge-primary', 'Confirmed'], completed: ['badge-success', 'Completed'], cancelled: ['badge-danger', 'Cancelled'] };

    RV.onAuth(s => {
        const signed = !!s.user;
        $('#signed-out').hidden = signed;
        $$('[data-auth]').forEach(el => { el.hidden = !signed; });
        if (!signed || !fb) return;
        fillAccount(s);
        loadBookings(s.user.uid);
        loadListing(s);
        if (RV.route.sub === 'bookings') setTimeout(() => $('#bookings').scrollIntoView(), 200);
    });

    function fillAccount(s) {
        const f = $('#account-form');
        const p = s.profile || {};
        f.name.value = p.name || s.user.displayName || '';
        f.phone.value = p.phone || '';
        f.location.value = p.location || '';
        f.email.value = s.user.email || '';
        $('#acc-photo').src = RV.img(p.img);
    }

    $('#account-form').addEventListener('change', e => {
        if (e.target.name === 'photo' && e.target.files[0]) $('#acc-photo').src = URL.createObjectURL(e.target.files[0]);
    });
    $('#account-form').addEventListener('submit', async e => {
        e.preventDefault();
        const f = e.target;
        const s = RV.state;
        const v = RV.formValues(f);
        if (!v.name) { RV.toast('Please enter your name.', 'error'); return; }
        const photo = f.photo.files[0];
        const bad = RV.checkFile(photo, { maxMb: 3, types: /^image\/(jpeg|png|webp)$/ });
        if (bad) { RV.toast(bad, 'error'); return; }
        const btn = f.querySelector('[type=submit]');
        RV.busy(btn, true, 'Saving…');
        try {
            const update = { name: v.name, phone: v.phone, location: v.location };
            if (photo) update.img = await RV.upload(`profile-images/${s.user.uid}/${RV.fileName(photo)}`, photo);
            await fb.db.ref('userdata/' + s.user.uid).update(update);
            await s.user.updateProfile({ displayName: v.name }).catch(() => {});
            Object.assign(s.profile || {}, update);
            RV.renderAccount(); // new photo / name in the header straight away
            RV.toast('Account saved', 'success');
        } catch (err) { RV.toast(RV.errorMessage(err), 'error'); }
        finally { RV.busy(btn, false); f.photo.value = ''; }
    });

    function loadBookings(uid) {
        const host = $('#bookings-list');
        fb.db.ref('bookings').orderByChild('userId').equalTo(uid).once('value').then(snap => {
            const list = RV.list(snap.val()).sort((a, b) => RV.ts(b.createdAt) - RV.ts(a.createdAt));
            if (!list.length) {
                host.innerHTML = `<p class="muted mb-0">No bookings yet. <a href="#/professionals">Find a professional</a> or <a href="#/teletherapy">book teletherapy</a>.</p>`;
                return;
            }
            host.innerHTML = list.map(b => {
                const [cls, label] = STATUS[b.status] || STATUS.new;
                const link = RV.safeUrl(b.meetingLink);
                return `<div class="card list-item" data-id="${esc(b.id)}">
                    <div>
                        <h4>${esc(b.service || b.type)}${b.proName ? ` · ${esc(b.proName)}` : ''}</h4>
                        <p>#${esc(b.id.slice(-6).toUpperCase())} · ${esc([b.type, b.plan, b.preferredDate, b.timeOfDay].filter(Boolean).join(' · '))}</p>
                        ${b.scheduledAt ? `<p><i class='bx bx-calendar'></i> Scheduled: <strong>${esc(b.scheduledAt)}</strong></p>` : ''}
                        <p><span class="badge ${cls}">${label}</span> <small class="muted">${esc(RV.dateTime(b.createdAt))}</small></p>
                    </div>
                    <div class="row">
                        ${link && b.status === 'confirmed' ? `<a class="btn btn-sm btn-primary" href="${esc(link)}" target="_blank" rel="noopener"><i class='bx bx-video'></i> Join</a>` : ''}
                        ${['new', 'contacted', 'confirmed'].includes(b.status) ? `<button class="btn btn-sm" data-cancel>Cancel</button>` : ''}
                    </div>
                </div>`;
            }).join('');
            host.querySelectorAll('[data-cancel]').forEach(btn => btn.addEventListener('click', async () => {
                if (!(await RV.confirm('Cancel this booking?', { ok: 'Cancel booking', danger: true }))) return;
                const id = btn.closest('[data-id]').dataset.id;
                try {
                    await fb.db.ref('bookings/' + id).update({ status: 'cancelled', updatedAt: fb.TIMESTAMP });
                    RV.toast('Booking cancelled');
                    loadBookings(uid);
                } catch (err) { RV.toast(RV.errorMessage(err), 'error'); }
            }));
        }).catch(() => { host.innerHTML = '<p class="muted mb-0">Your bookings could not be loaded.</p>'; });
    }

    async function loadListing(s) {
        const host = $('#pro-status');
        const uid = s.user.uid;
        const [pro, center, app] = await Promise.all([
            fb.db.ref('professionals/' + uid).once('value').catch(() => null),
            fb.db.ref('centers').orderByChild('userId').equalTo(uid).limitToFirst(1).once('value').catch(() => null),
            fb.db.ref('applications/' + uid).once('value').catch(() => null)
        ]);
        const a = app && app.val();
        if ((pro && pro.exists()) || (center && center.exists())) {
            const key = pro && pro.exists() ? uid : Object.keys(center.val())[0];
            host.innerHTML = `<p>Your listing is live. Keep your fees, coverage areas and availability up to date so clients can match with you.</p><a class="btn btn-primary" href="#/profile?id=${encodeURIComponent(key)}">View and edit my listing</a>`;
        } else if (a) {
            const label = { pending: 'Under review', rejected: 'Not approved', approved: 'Approved' }[a.status] || a.status;
            host.innerHTML = `<p>Application status: <strong>${esc(label)}</strong>${a.reviewNote ? ` — ${esc(a.reviewNote)}` : ''}</p><a class="btn" href="#/join">View or update application</a>`;
        } else {
            host.innerHTML = `<p class="muted">Are you a rehab professional, center, mobile service or tutor? Get listed so clients can find and book you.</p><a class="btn btn-primary" href="#/join">Apply to join</a>`;
        }
    }

    async function reauth(password) {
        const u = RV.state.user;
        const cred = firebase.auth.EmailAuthProvider.credential(u.email, password);
        await u.reauthenticateWithCredential(cred);
    }

    $('#password-form').addEventListener('submit', async e => {
        e.preventDefault();
        const f = e.target;
        if ((f.next.value || '').length < 6) { RV.toast('New password needs at least 6 characters.', 'error'); return; }
        const btn = f.querySelector('[type=submit]');
        RV.busy(btn, true, 'Updating…');
        try {
            await reauth(f.current.value);
            await RV.state.user.updatePassword(f.next.value);
            f.reset();
            RV.toast('Password changed', 'success');
        } catch (err) { RV.toast(RV.errorMessage(err), 'error'); }
        finally { RV.busy(btn, false); }
    });

    $('#delete-account').addEventListener('click', () => {
        const dlg = RV.dialog({
            title: 'Delete your account',
            body: `<p>This permanently deletes your sign-in and account details. Booking records are kept by our care team for safety and legal reasons, and any public listing is removed by our team on request.</p>
                <label class="field"><span>Enter your password to confirm</span><input class="input" type="password" id="del-pw" autocomplete="current-password"></label>
                <div class="form-actions"><button class="btn" data-no>Keep my account</button><button class="btn btn-danger" data-yes>Delete permanently</button></div>`
        });
        dlg.querySelector('[data-no]').onclick = () => dlg.close();
        dlg.querySelector('[data-yes]').onclick = async e => {
            const btn = e.currentTarget;
            RV.busy(btn, true, 'Deleting…');
            try {
                await reauth(dlg.querySelector('#del-pw').value);
                const uid = RV.state.user.uid;
                await fb.db.ref().update({ [`userdata/${uid}`]: null, [`userEnrollments/${uid}`]: null, [`status/${uid}`]: null }).catch(() => {});
                await RV.state.user.delete();
                dlg.close();
                RV.toast('Your account has been deleted.');
                setTimeout(() => RV.go('#/'), 1200);
            } catch (err) {
                RV.busy(btn, false);
                RV.toast(RV.errorMessage(err), 'error');
            }
        };
    });
})();
