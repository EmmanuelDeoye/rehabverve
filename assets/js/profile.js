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

    // Full-width messages (not found, signed out…) replace the two-column profile layout
    const message = html => {
        head.hidden = true;
        body.innerHTML = `<div class="container narrow section">${html}</div>`;
    };
    const showProfile = () => { head.hidden = false; body.innerHTML = ''; };

    if (!fb) { message(RV.empty('We could not load this profile. Check your connection and refresh.')); return; }

    RV.onAuth(s => {
        if (!id) {
            if (s.user) location.replace(`users.html?id=${encodeURIComponent(s.user.uid)}`);
            else message(`<div class="detail-card center"><h1>Your RehabVerve profile</h1><p class="muted">Sign in to see and edit your profile.</p><button class="btn btn-primary" data-signin>Login</button></div>`);
            return;
        }
        load(s).catch(err => {
            console.error(err);
            message(RV.empty('We could not load this profile right now. Please refresh to try again.'));
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
            message(`<div class="detail-card center"><h1>Profile not available</h1><p class="muted">This profile is private or no longer listed.</p><a class="btn btn-primary" href="professionals.html">Find a professional</a></div>`);
            return;
        }

        const owner = !!uid && (kind === 'pros' ? uid === key : uid === L.userId || uid === key);
        if (L.status === 'suspended' && !owner && !s.isAdmin) {
            message(`<div class="detail-card center"><h1>Profile not available</h1><p class="muted">This listing is currently not active.</p></div>`);
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

    const infoItem = (icon, label, value, raw) => `
        <div class="info-item"><i class='bx ${icon}'></i><div><p class="info-label">${esc(label)}</p><p class="info-value">${raw ? value : esc(value)}</p></div></div>`;

    function renderAccountOnly(s) {
        const p = s.profile || {};
        document.title = 'My profile — RehabVerve';
        document.body.classList.remove('center-profile');
        showProfile();
        head.innerHTML = `
            <div class="profile-header">
                <div class="profile-image-container"><img src="${esc(RV.img(p.img))}" class="profile-image" alt="" onerror="this.src='assets/img/profile.png'"><div class="online-status on"></div></div>
                <h1 class="user-name">${esc(p.name || 'My account')}</h1>
                <p class="user-title">${esc(s.user.email || '')}</p>
                <p class="muted">Only you can see this page.</p>
                <a class="settings-btn" href="settings.html"><i class='bx bx-cog'></i> Settings</a>
            </div>
            <div class="profile-details">
                <div class="detail-card">
                    <h2 class="section-title">Are you a rehab professional, center or tutor?</h2>
                    <p class="bio-text">Create a public listing with your fees and the areas you cover so patients can find and book you.</p>
                    <a class="btn btn-primary" href="registration.html">Apply to join</a>
                </div>
            </div>`;
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
        const photo = RV.img(L.img || L.ing, isCenter ? 'assets/img/center.jpg' : 'assets/img/profile.png');
        document.title = `${name || 'Profile'} — RehabVerve`;
        document.body.classList.toggle('center-profile', isCenter);
        showProfile();

        const c = L.coverage || {};
        const modes = RV.modeBadges(L.serviceModes, modesLabels);
        const feesCard = kind === 'supplier' ? '' : `
            <div class="detail-card">
                <h2 class="section-title">Fees &amp; Coverage</h2>
                ${infoItem('bx-wallet', 'Fees', price || 'On request')}
                ${infoItem('bx-clinic', 'Sees clients', modes || esc('Not specified'), true)}
                ${c.states ? infoItem('bx-map-alt', 'States covered', c.states) : ''}
                ${c.areas ? infoItem('bx-current-location', 'Areas covered', c.areas) : ''}
                ${c.countries ? infoItem('bx-world', 'Also serves', c.countries) : ''}
                ${c.nationwide ? infoItem('bx-video', 'Online', 'Takes clients from anywhere online') : ''}
                ${L.availability ? infoItem('bx-calendar', 'Availability', L.availability) : ''}
                ${L.languages ? infoItem('bx-conversation', 'Languages', L.languages) : ''}
            </div>`;

        const ratingText = avg ? `${avg.toFixed(1)}/5 (${reviews.length || Number(L.ratingCount) || 0} review${(reviews.length || Number(L.ratingCount) || 0) === 1 ? '' : 's'})` : 'No ratings';
        const exp = L.experience !== undefined && L.experience !== '' ? `${L.experience}${/^\d+(\.\d+)?$/.test(String(L.experience)) ? ' years' : ''}` : 'Not specified';
        let detailsCard;
        if (isPro) {
            detailsCard = `
            <div class="detail-card professional">
                <h2 class="section-title">Professional Details</h2>
                <div class="info-grid">
                    ${infoItem('bx-briefcase', 'Experience', exp)}
                    ${infoItem('bx-star', 'Rating', ratingText)}
                    ${infoItem('bx-graduation', 'Qualification(s)', L.education || 'Not specified')}
                    ${(D.listingCategory(L) || {}).label ? infoItem('bx-id-card', 'Discipline', D.listingCategory(L).label) : ''}
                </div>
                <div class="bio-section"><h3>Professional Bio</h3><div class="bio-text">${RV.formatText(L.bio) || '<p>No bio available</p>'}</div></div>
            </div>`;
        } else if (isCenter) {
            detailsCard = `
            <div class="detail-card center">
                <h2 class="section-title">Center Details</h2>
                ${infoItem('bx-clinic', 'Center Type', L.centerType || 'Not specified')}
                ${infoItem('bx-map-pin', 'Address', L.address || 'Not specified')}
                <div class="info-grid">
                    ${infoItem('bx-time-five', 'Operating Hours', L.operatingHours || 'Not specified')}
                    ${infoItem('bx-certification', 'Accreditations', L.accreditations || 'Not specified')}
                </div>
                <div class="bio-section"><h3>Center Description</h3><div class="bio-text">${RV.formatText(L.description) || '<p>No description available</p>'}</div></div>
            </div>`;
        } else {
            detailsCard = `
            <div class="detail-card supplier">
                <h2 class="section-title">Supplier Details</h2>
                ${infoItem('bx-buildings', 'Organization', L.orgName || 'Not specified')}
                ${infoItem('bx-category', 'Products/Services', L.productsOffered || L.products || 'Not specified')}
                ${L.description ? `<div class="bio-section"><div class="bio-text">${RV.formatText(L.description)}</div></div>` : ''}
            </div>`;
        }

        const cvUrl = L.cv && /^https:\/\//i.test(L.cv.url || '') ? RV.safeUrl(L.cv.url) : '';
        const cvCard = cvUrl ? `
            <div class="detail-card cv-section">
                <h2 class="section-title">Curriculum Vitae</h2>
                <div class="cv-info">
                    <i class='bx bx-file'></i>
                    <div class="cv-details">
                        <h3>${esc(L.cv.name || 'My CV')}</h3>
                        <p class="cv-meta">${L.cv.uploadedAt ? esc('Uploaded ' + RV.date(L.cv.uploadedAt)) : ''}</p>
                        <a href="${esc(cvUrl)}" target="_blank" rel="noopener" class="cv-download-btn"><i class='bx bx-download'></i> Download CV</a>
                    </div>
                </div>
            </div>` : '';

        const canReview = s.user && !owner && kind !== 'supplier';
        const mine = s.user && reviews.find(r => r.id === s.user.uid);
        const reviewsCard = kind === 'supplier' ? '' : `
            <div class="detail-card">
                <h2 class="section-title">Ratings &amp; Reviews</h2>
                <div id="reviews">${reviews.length ? reviews.slice(0, 20).map(r => `
                    <div class="review"><div class="row-between"><strong>${esc(r.name || 'RehabVerve member')}</strong><span class="review-stars" aria-label="${r.stars} stars">${RV.stars(r.stars)}</span></div>
                    ${r.comment ? `<p class="mb-0">${esc(r.comment)}</p>` : ''}<small class="muted">${esc(RV.date(r.createdAt))}</small></div>`).join('') : '<p class="muted">No reviews yet.</p>'}</div>
                ${canReview ? `
                <form id="review-form" class="mt-2">
                    <p class="info-label">${mine ? 'Update your review' : 'Rate this ' + (isCenter ? 'center' : 'professional')}</p>
                    <div class="rating-stars" role="radiogroup" aria-label="Rating">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-star="${n}" aria-label="${n} star${n > 1 ? 's' : ''}" class="${mine && mine.stars >= n ? 'on' : ''}"><i class='bx bxs-star'></i></button>`).join('')}</div>
                    <textarea name="comment" rows="3" maxlength="1000" placeholder="Add your review comment...">${esc(mine ? mine.comment || '' : '')}</textarea>
                    <button type="submit" class="submit-rating">Submit Rating</button>
                </form>` : (!s.user ? '<p class="muted mb-0"><button class="link-btn" data-signin>Login</button> to leave a review.</p>' : '')}
            </div>`;

        head.innerHTML = `
            <div class="profile-header">
                ${owner ? `<button type="button" class="edit-profile-icon" data-edit aria-label="Edit profile"><i class='bx bx-edit'></i></button>` : ''}
                <div class="profile-image-container" data-zoom role="button" tabindex="0" aria-label="View photo">
                    <img src="${esc(photo)}" class="profile-image" alt="${esc(name || '')}" onerror="this.src='assets/img/profile.png'">
                    <div class="online-status${online ? ' on' : ''}" title="${online ? 'Online now' : 'Offline'}"></div>
                </div>
                <h1 class="user-name">${esc(name || 'RehabVerve member')}${L.verified === true ? ` <i class='bx bxs-badge-check verified' title="Verified by RehabVerve"></i>` : ''}</h1>
                <p class="user-title">${esc(title)}</p>
                ${avg ? `<p class="profile-rating"><i class='bx bxs-star'></i> ${avg.toFixed(1)} · ${reviews.length || Number(L.ratingCount) || 0} review${(reviews.length || Number(L.ratingCount) || 0) === 1 ? '' : 's'}</p>` : ''}
                ${L.status === 'suspended' ? '<p><span class="badge badge-danger">Suspended</span></p>' : ''}
                <div class="contact-icons">
                    ${wa ? `<a href="${esc(wa)}" class="contact-icon whatsapp" target="_blank" rel="noopener" aria-label="WhatsApp"><i class='bx bxl-whatsapp'></i></a>` : ''}
                    ${email ? `<a href="mailto:${esc(email)}" class="contact-icon email" aria-label="Email"><i class='bx bx-envelope'></i></a>` : ''}
                    ${RV.digits(phone) ? `<a href="tel:${esc(phone.replace(/[^\d+]/g, ''))}" class="contact-icon phone" aria-label="Call"><i class='bx bx-phone'></i></a>` : ''}
                    <button type="button" class="contact-icon" data-share aria-label="Share profile"><i class='bx bx-share-alt'></i></button>
                </div>
                ${owner ? `${views != null ? `<div class="views-badge"><i class='bx bx-show'></i> Profile Views: <strong>${Number(views) || 0}</strong></div>` : ''}<div><a class="settings-btn" href="settings.html"><i class='bx bx-cog'></i> Settings</a></div>`
                    : kind !== 'supplier' ? `<button type="button" class="settings-btn" data-book><i class='bx bx-calendar-plus'></i> Book a session</button>` : ''}
            </div>
            <div class="profile-details">
                <div class="detail-card">
                    <h2 class="section-title">Contact Information</h2>
                    ${infoItem('bx-envelope', 'Email', email || 'Not available')}
                    ${infoItem('bx-phone', 'Phone', phone || 'Not provided')}
                    ${infoItem('bx-map', 'Location', place || 'Not provided')}
                    ${website ? infoItem('bx-globe', 'Website', `<a href="${esc(website)}" target="_blank" rel="noopener nofollow">${esc(website.replace(/^https:\/\//, ''))}</a>`, true) : ''}
                </div>
                ${feesCard}
                ${detailsCard}
                ${cvCard}
                ${owner ? `<div class="detail-card" id="requests"><h2 class="section-title">Booking Requests</h2><div id="requests-list"><div class="spinner"></div></div></div>` : ''}
                ${reviewsCard}
                <div class="ad-slot" data-ad-slot="profile"></div>
            </div>`;
        RV.renderAds();

        const bookBtn = head.querySelector('[data-book]');
        if (bookBtn) bookBtn.addEventListener('click', () => RV.book({ listing: L, listingKind: kind }));
        head.querySelector('[data-share]').addEventListener('click', () => share(name));
        const zoom = head.querySelector('[data-zoom]');
        const openPhoto = () => RV.dialog({ title: name || 'Photo', wide: true, body: `<img src="${esc(photo)}" alt="" style="margin:0 auto;max-height:75vh;border-radius:12px;object-fit:contain">` });
        zoom.addEventListener('click', openPhoto);
        zoom.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPhoto(); } });
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
