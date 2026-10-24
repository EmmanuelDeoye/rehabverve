// profile.js — public profile for professionals, centers and suppliers.
// Shows fees, coverage and service modes; owners can edit their listing and handle booking requests.
(function () {
    'use strict';
    const { $, esc, data: D } = RV;
    const fb = RV.fb;
    const head = $('#profile-head');
    const body = $('#profile-body');
    const id = RV.params.get('id');
    let autoBooked = false;

    if (!fb) { head.innerHTML = RV.empty('We could not load this profile. Check your connection and refresh.'); return; }

    RV.onAuth(s => {
        if (!id) {
            if (s.user) RV.go(`#/profile?id=${encodeURIComponent(s.user.uid)}`, { replace: true });
            else {
                head.innerHTML = `<div class="card card-pad center"><h1>Your RehabVerve profile</h1><p class="muted">Sign in to see and edit your profile.</p><button class="btn btn-primary" data-signin>Sign in</button></div>`;
                body.innerHTML = '';
            }
            return;
        }
        load(s).catch(err => {
            console.error(err);
            head.innerHTML = RV.empty('We could not load this profile right now. Please refresh to try again.');
        });
    });

    async function find() {
        const db = fb.db;
        const [pro, center, merchants] = await Promise.all([
            db.ref('professionals/' + id).once('value'),
            db.ref('centers/' + id).once('value'),
            db.ref('merchants').orderByChild('userId').equalTo(id).once('value').catch(() => null)
        ]);
        if (pro.exists()) return { kind: 'pros', node: 'professionals', key: id, L: { ...pro.val(), id } };
        if (center.exists()) return { kind: 'centers', node: 'centers', key: id, L: { ...center.val(), id } };
        const byOwner = await db.ref('centers').orderByChild('userId').equalTo(id).limitToFirst(1).once('value');
        if (byOwner.exists()) {
            const [key, v] = Object.entries(byOwner.val())[0];
            return { kind: 'centers', node: 'centers', key, L: { ...v, id: key } };
        }
        if (merchants && merchants.exists()) {
            const [key, v] = Object.entries(merchants.val())[0];
            return { kind: 'supplier', node: 'merchants', key, L: { ...v, id: key } };
        }
        return { kind: null };
    }

    async function load(s) {
        const found = await find();
        const uid = s.user && s.user.uid;
        const { kind, L, key } = found;

        if (!kind) {
            if (uid === id) return renderAccountOnly(s);
            document.title = 'Profile not found — RehabVerve';
            head.innerHTML = `<div class="card card-pad center"><h1>Profile not available</h1><p class="muted">This profile is private or no longer listed.</p><a class="btn btn-primary" href="#/professionals">Find a professional</a></div>`;
            body.innerHTML = '';
            return;
        }

        const owner = !!uid && (kind === 'pros' ? uid === key : uid === L.userId || uid === key);
        if (L.status === 'suspended' && !owner && !s.isAdmin) {
            head.innerHTML = `<div class="card card-pad center"><h1>Profile not available</h1><p class="muted">This listing is currently not active.</p></div>`;
            body.innerHTML = '';
            return;
        }

        const [ratingsSnap, statusSnap, viewsSnap] = await Promise.all([
            fb.db.ref('ratings/' + key).once('value').catch(() => null),
            fb.db.ref('status/' + (kind === 'pros' ? key : (L.userId || key))).once('value').catch(() => null),
            owner ? fb.db.ref('profileViews/' + key).once('value').catch(() => null) : null
        ]);
        const reviews = RV.list(ratingsSnap && ratingsSnap.val()).filter(r => typeof r.stars === 'number')
            .sort((a, b) => RV.ts(b.createdAt) - RV.ts(a.createdAt));
        const online = statusSnap && statusSnap.val() && statusSnap.val().state === 'online';

        if (uid && !owner) fb.db.ref('profileViews/' + key).set(fb.increment(1)).catch(() => {});

        render({ kind, L, key, owner, reviews, online, views: viewsSnap ? viewsSnap.val() || 0 : null, s });

        if (!autoBooked && RV.params.get('book') === '1' && kind !== 'supplier' && !owner) {
            autoBooked = true;
            RV.book({ listing: L, listingKind: kind });
        }
    }

    function renderAccountOnly(s) {
        const p = s.profile || {};
        document.title = 'My profile — RehabVerve';
        head.innerHTML = `
            <div class="card profile-card">
                <img class="photo" src="${esc(RV.img(p.img))}" alt="" onerror="this.src='assets/img/profile.png'">
                <div><h1>${esc(p.name || 'My account')}</h1><p class="sub">${esc(s.user.email || '')}</p><p class="muted mb-0"><i class='bx bx-lock-alt'></i> Only you</p></div>
                <div class="profile-actions"><a class="btn" href="#/settings"><i class='bx bx-cog'></i> Settings</a></div>
            </div>`;
        body.innerHTML = `
            <a class="promo promo-green mt-3" href="#/join">
                <span class="promo-ico"><i class='bx bx-extension'></i></span>
                <span class="promo-text"><strong>Get listed</strong><span>For professionals, centers and tutors</span></span>
                <i class='bx bx-chevron-right promo-go'></i>
            </a>`;
    }

    function render({ kind, L, key, owner, reviews, online, views, s }) {
        const isPro = kind === 'pros', isCenter = kind === 'centers';
        const name = isPro ? L.name : isCenter ? L.centerName : L.orgName;
        const title = isPro ? (L.job || (D.listingCategory(L) || {}).label || 'Rehabilitation professional')
            : isCenter ? (L.centerType || 'Care center') : 'Supplier';
        const place = RV.place(L) || L.address || L.location || '';
        const avg = reviews.length ? reviews.reduce((a, r) => a + r.stars, 0) / reviews.length : Number(L.rating) || 0;
        const phone = L.phone || L.contactPhone || '';
        const wa = RV.waLink(L.whatsapp || phone, `Hello ${name || ''}, I found you on RehabVerve.`);
        const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(L.email || '') ? L.email : '';
        const website = /^https:\/\//i.test(L.website || '') ? RV.safeUrl(L.website) : '';
        const modesLabels = isPro ? D.PRO_MODES : D.CENTER_MODES;
        const price = RV.priceRange(L);
        document.title = `${name || 'Profile'} — RehabVerve`;

        head.innerHTML = `
            <div class="card profile-card">
                <img class="photo" src="${esc(RV.img(L.img || L.ing, isCenter ? 'assets/img/center.jpg' : 'assets/img/profile.png'))}" alt="" onerror="this.src='assets/img/profile.png'">
                <div>
                    <h1>${esc(name || 'RehabVerve member')}${L.verified === true ? `<span class="badge badge-primary"><i class='bx bxs-badge-check'></i>Verified</span>` : ''}${L.status === 'suspended' ? '<span class="badge badge-danger">Suspended</span>' : ''}</h1>
                    <p class="sub">${esc(title)}${place ? ' · ' + esc(place) : ''}</p>
                    <div class="row" style="gap:10px">
                        ${avg ? `<span><span class="stars" aria-hidden="true">${RV.stars(avg)}</span> ${avg.toFixed(1)} (${reviews.length || Number(L.ratingCount) || 0})</span>` : '<span class="muted">No reviews yet</span>'}
                        <span class="presence${online ? ' on' : ''}"><i></i>${online ? 'Online now' : 'Offline'}</span>
                    </div>
                </div>
                <div class="profile-actions">
                    ${owner ? `<button class="btn btn-primary" data-edit><i class='bx bx-edit'></i> Edit profile</button>${views != null ? `<span class="badge"><i class='bx bx-show'></i>${Number(views) || 0} views</span>` : ''}`
                        : kind !== 'supplier' ? `<button class="btn btn-primary" data-book><i class='bx bx-calendar-plus'></i> Book</button>` : ''}
                    ${wa ? `<a class="btn btn-whatsapp btn-icon" href="${esc(wa)}" target="_blank" rel="noopener" aria-label="WhatsApp"><i class='bx bxl-whatsapp'></i></a>` : ''}
                    ${RV.digits(phone) ? `<a class="btn btn-icon" href="tel:${esc(phone.replace(/[^\d+]/g, ''))}" aria-label="Call"><i class='bx bx-phone'></i></a>` : ''}
                    ${email ? `<a class="btn btn-icon" href="mailto:${esc(email)}" aria-label="Email"><i class='bx bx-envelope'></i></a>` : ''}
                    <button class="btn btn-icon" data-share aria-label="Share profile"><i class='bx bx-share-alt'></i></button>
                </div>
            </div>`;

        const c = L.coverage || {};
        const feesCard = kind === 'supplier' ? '' : `
            <div class="card card-pad">
                <h3><i class='bx bx-wallet'></i> Fees and coverage</h3>
                <dl class="dl">
                    <dt>Fees</dt><dd class="${price ? 'price' : 'muted'}">${esc(price || 'On request')}</dd>
                    <dt>Sees clients</dt><dd><div class="chips">${RV.modeBadges(L.serviceModes, modesLabels) || '<span class="muted">Not specified</span>'}</div></dd>
                    ${c.states ? `<dt>States</dt><dd>${esc(c.states)}</dd>` : ''}
                    ${c.areas ? `<dt>Areas</dt><dd>${esc(c.areas)}</dd>` : ''}
                    ${c.countries ? `<dt>Also serves</dt><dd>${esc(c.countries)}</dd>` : ''}
                    ${c.nationwide ? `<dt>Online</dt><dd>Takes clients from anywhere online</dd>` : ''}
                    ${L.availability ? `<dt>Availability</dt><dd>${esc(L.availability)}</dd>` : ''}
                    ${L.operatingHours ? `<dt>Hours</dt><dd>${esc(L.operatingHours)}</dd>` : ''}
                    ${L.languages ? `<dt>Languages</dt><dd>${esc(L.languages)}</dd>` : ''}
                </dl>
            </div>`;

        const about = isPro ? L.bio : isCenter ? L.description : (L.description || L.productsOffered || L.products);
        const details = isPro ? [['Experience', L.experience !== undefined && L.experience !== '' ? `${L.experience}${/^\d+(\.\d+)?$/.test(String(L.experience)) ? ' years' : ''}` : ''], ['Qualifications', L.education], ['Discipline', (D.listingCategory(L) || {}).label]]
            : isCenter ? [['Type', L.centerType], ['Address', L.address], ['Accreditations', L.accreditations]]
            : [['Organisation', L.orgName], ['Products', L.productsOffered || L.products]];
        const detailRows = details.filter(([, v]) => v).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
        const cvUrl = L.cv && /^https:\/\//i.test(L.cv.url || '') ? RV.safeUrl(L.cv.url) : '';

        const canReview = s.user && !owner && kind !== 'supplier';
        const mine = s.user && reviews.find(r => r.id === s.user.uid);

        body.innerHTML = `
            <div class="profile-grid">
                <div class="stack">
                    ${feesCard}
                    <div class="card card-pad"><h3>About</h3><div class="prose" style="font-size:1rem">${RV.formatText(about) || '<p class="muted">No description yet.</p>'}</div></div>
                    ${detailRows ? `<div class="card card-pad"><h3>Details</h3><dl class="dl">${detailRows}</dl></div>` : ''}
                    ${cvUrl ? `<div class="card card-pad row-between"><div><h3 class="mb-0"><i class='bx bx-file'></i> Curriculum vitae</h3><p class="muted mb-0">${esc(L.cv.name || 'CV')}</p></div><a class="btn" href="${esc(cvUrl)}" target="_blank" rel="noopener"><i class='bx bx-download'></i> Open CV</a></div>` : ''}
                    ${owner ? `<div class="card card-pad" id="requests"><h3><i class='bx bx-calendar-check'></i> Booking requests for you</h3><div id="requests-list"><div class="spinner"></div></div></div>` : ''}
                </div>
                <div class="stack">
                    <div class="card card-pad">
                        <h3>Reviews</h3>
                        <div id="reviews">${reviews.length ? reviews.slice(0, 20).map(r => `
                            <div class="review"><div class="row-between"><strong>${esc(r.name || 'RehabVerve member')}</strong><span class="stars" aria-label="${r.stars} stars">${RV.stars(r.stars)}</span></div>
                            ${r.comment ? `<p class="mb-0">${esc(r.comment)}</p>` : ''}<small class="muted">${esc(RV.date(r.createdAt))}</small></div>`).join('') : '<p class="muted">No reviews yet.</p>'}</div>
                        ${canReview ? `
                        <form id="review-form" class="stack mt-2">
                            <span class="label">${mine ? 'Update your review' : 'Leave a review'}</span>
                            <div class="star-input" role="radiogroup" aria-label="Rating">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-star="${n}" aria-label="${n} star${n > 1 ? 's' : ''}" class="${mine && mine.stars >= n ? 'on' : ''}">★</button>`).join('')}</div>
                            <textarea class="input" name="comment" rows="3" maxlength="1000" placeholder="How was your experience?">${esc(mine ? mine.comment || '' : '')}</textarea>
                            <button type="submit" class="btn btn-primary">Post review</button>
                        </form>` : (!s.user && kind !== 'supplier' ? '<p class="muted mb-0"><button class="link-btn" data-signin>Sign in</button> to leave a review.</p>' : '')}
                    </div>
                    <div class="card card-pad">
                        <h3>Contact</h3>
                        <dl class="dl">
                            ${phone ? `<dt>Phone</dt><dd>${esc(phone)}</dd>` : ''}
                            ${email ? `<dt>Email</dt><dd>${esc(email)}</dd>` : ''}
                            ${website ? `<dt>Website</dt><dd><a href="${esc(website)}" target="_blank" rel="noopener nofollow">${esc(website.replace(/^https:\/\//, ''))}</a></dd>` : ''}
                            ${place ? `<dt>Location</dt><dd>${esc(place)}</dd>` : ''}
                        </dl>
                        ${!phone && !email ? '<p class="muted mb-0">Contact details are shared after booking.</p>' : ''}
                    </div>
                    <div class="ad-slot" data-ad-slot="profile"></div>
                </div>
            </div>`;
        RV.renderAds();

        head.querySelector('[data-book]') && head.querySelector('[data-book]').addEventListener('click', () => RV.book({ listing: L, listingKind: kind }));
        head.querySelector('[data-share]').addEventListener('click', () => share(name));
        if (owner) {
            head.querySelector('[data-edit]').addEventListener('click', () => openEditor({ kind, L, key, s }));
            loadRequests(s.user.uid);
        }
        if (canReview) wireReview(key, s, mine);
    }

    function share(name) {
        const url = location.href.replace(/[?&]book=1/, '');
        if (navigator.share) navigator.share({ title: `${name} on RehabVerve`, url }).catch(() => {});
        else navigator.clipboard.writeText(url).then(() => RV.toast('Profile link copied', 'success'), () => RV.toast(url));
    }

    function wireReview(key, s, mine) {
        const form = $('#review-form');
        let stars = mine ? mine.stars : 0;
        form.querySelectorAll('[data-star]').forEach(b => b.addEventListener('click', () => {
            stars = Number(b.dataset.star);
            form.querySelectorAll('[data-star]').forEach(x => x.classList.toggle('on', Number(x.dataset.star) <= stars));
        }));
        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (!stars) { RV.toast('Choose a star rating first.', 'error'); return; }
            const btn = form.querySelector('[type=submit]');
            RV.busy(btn, true, 'Posting…');
            try {
                await fb.db.ref(`ratings/${key}/${s.user.uid}`).set({
                    stars, comment: form.comment.value.trim().slice(0, 1000),
                    name: ((s.profile && s.profile.name) || s.user.displayName || 'RehabVerve member').slice(0, 120),
                    createdAt: fb.TIMESTAMP
                });
                RV.toast('Thank you for your review!', 'success');
                load(RV.state);
            } catch (err) {
                RV.busy(btn, false);
                RV.toast(RV.errorMessage(err), 'error');
            }
        });
    }

    const STATUS_BADGE = { new: 'badge-warning', contacted: 'badge-accent', confirmed: 'badge-primary', completed: 'badge-success', cancelled: 'badge-danger' };
    RV.statusBadge = st => `<span class="badge ${STATUS_BADGE[st] || ''}">${esc(st || 'new')}</span>`;

    function loadRequests(uid) {
        const host = $('#requests-list');
        fb.db.ref('bookings').orderByChild('proId').equalTo(uid).once('value').then(snap => {
            const list = RV.list(snap.val()).sort((a, b) => RV.ts(b.createdAt) - RV.ts(a.createdAt));
            if (!list.length) { host.innerHTML = '<p class="muted mb-0">No requests yet. They will appear here when clients book you.</p>'; return; }
            host.innerHTML = `<div class="list">${list.map(b => `
                <div class="card list-item" data-id="${esc(b.id)}">
                    <div><h4>${esc(b.name || 'Client')} · ${esc(b.service || b.type)}</h4>
                    <p>${esc([b.type, b.audience, b.preferredDate, b.timeOfDay].filter(Boolean).join(' · '))}</p>
                    ${b.location ? `<p><i class='bx bx-map'></i> ${esc(b.location)}</p>` : ''}
                    ${b.notes ? `<p>${esc(b.notes)}</p>` : ''}
                    <p>${RV.statusBadge(b.status)} <small class="muted">${esc(RV.dateTime(b.createdAt))}</small></p></div>
                    <div class="row">
                        ${RV.digits(b.phone) ? `<a class="btn btn-sm btn-whatsapp" href="${esc(RV.waLink(b.phone, `Hello ${b.name || ''}, this is about your RehabVerve booking.`))}" target="_blank" rel="noopener"><i class='bx bxl-whatsapp'></i></a>` : ''}
                        ${['new', 'contacted'].includes(b.status) ? `<button class="btn btn-sm btn-primary" data-set="confirmed">Confirm</button>` : ''}
                        ${b.status === 'confirmed' ? `<button class="btn btn-sm" data-set="completed">Mark completed</button>` : ''}
                    </div>
                </div>`).join('')}</div>`;
            host.querySelectorAll('[data-set]').forEach(btn => btn.addEventListener('click', async () => {
                const bid = btn.closest('[data-id]').dataset.id;
                try {
                    await fb.db.ref('bookings/' + bid).update({ status: btn.dataset.set, updatedAt: fb.TIMESTAMP });
                    RV.toast('Booking updated', 'success');
                    loadRequests(uid);
                } catch (err) { RV.toast(RV.errorMessage(err), 'error'); }
            }));
        }).catch(() => { host.innerHTML = '<p class="muted mb-0">Requests could not be loaded.</p>'; });
    }

    function openEditor({ kind, L, key, s }) {
        if (kind === 'supplier') { RV.toast('Supplier listings are edited by our team. Message us to update yours.'); return; }
        const node = kind === 'pros' ? 'professionals' : 'centers';
        const html = `
            <form id="edit-form" novalidate>
                <div class="row" style="align-items:center">
                    <img id="edit-photo" class="avatar" style="width:72px;height:72px" src="${esc(RV.img(L.img || L.ing))}" alt="" onerror="this.src='assets/img/profile.png'">
                    <label class="field grow"><span>${kind === 'pros' ? 'Profile photo' : 'Logo or photo'}</span><input type="file" name="photo" accept="image/jpeg,image/png,image/webp"><em>JPG, PNG or WebP, up to 3 MB</em></label>
                </div>
                ${RV.listingFormHTML(kind, L)}
                ${kind === 'pros' ? `
                <h4 class="mt-3">CV</h4>
                ${L.cv && L.cv.url ? `<p class="muted">Current: ${esc(L.cv.name || 'CV')} <label class="check" style="display:inline-flex"><input type="checkbox" name="removeCv"> Remove</label></p>` : ''}
                <label class="field"><span>Upload a CV</span><input type="file" name="cv" accept="application/pdf,.doc,.docx"><em>PDF or Word, up to 5 MB — shown publicly on your profile</em></label>` : ''}
                <div class="form-msg error mt-2" hidden></div>
                <div class="form-actions"><button type="button" class="btn" data-cancel>Cancel</button><button type="submit" class="btn btn-primary">Save changes</button></div>
            </form>`;
        const dlg = RV.dialog({ title: 'Edit your profile', body: html, wide: true });
        const form = dlg.querySelector('#edit-form');
        const msg = form.querySelector('.form-msg');
        dlg.querySelector('[data-cancel]').addEventListener('click', () => dlg.close());
        form.photo.addEventListener('change', () => {
            const f = form.photo.files[0];
            if (f) $('#edit-photo').src = URL.createObjectURL(f);
        });
        form.addEventListener('submit', async e => {
            e.preventDefault();
            msg.hidden = true;
            const { updates, error } = RV.readListingForm(form, kind, L);
            if (error) { msg.textContent = error; msg.hidden = false; return; }
            const photo = form.photo.files[0];
            const cv = form.cv && form.cv.files[0];
            const bad = RV.checkFile(photo, { maxMb: 3, types: /^image\/(jpeg|png|webp)$/ }) ||
                RV.checkFile(cv, { maxMb: 5, types: /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/ });
            if (bad) { msg.textContent = bad; msg.hidden = false; return; }
            const btn = form.querySelector('[type=submit]');
            RV.busy(btn, true, 'Saving…');
            try {
                const uid = s.user.uid;
                if (photo) updates.img = await RV.upload(`profile-images/${uid}/${RV.fileName(photo)}`, photo);
                if (cv) {
                    const url = await RV.upload(`cvs/${uid}/${RV.fileName(cv)}`, cv);
                    updates.cv = { name: cv.name.slice(0, 200), size: cv.size, type: cv.type.slice(0, 120), url, uploadedAt: new Date().toISOString() };
                } else if (form.removeCv && form.removeCv.checked) updates.cv = null;
                if (!Object.keys(updates).length) { dlg.close(); return; }
                updates.updatedAt = fb.TIMESTAMP;
                await fb.db.ref(`${node}/${key}`).update(updates);
                const mirror = {};
                if (updates.img) mirror.img = updates.img;
                if (updates.name || updates.centerName) mirror.name = updates.name || updates.centerName;
                if (updates.phone) mirror.phone = updates.phone;
                if (Object.keys(mirror).length) await fb.db.ref('userdata/' + uid).update(mirror).catch(() => {});
                dlg.close();
                RV.toast('Profile updated', 'success');
                load(RV.state);
            } catch (err) {
                RV.busy(btn, false);
                msg.textContent = RV.errorMessage(err);
                msg.hidden = false;
            }
        });
    }
})();
