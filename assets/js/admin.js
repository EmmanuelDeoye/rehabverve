// admin.js — RehabVerve admin console.
// Access is enforced by the database rules (/admins/{uid}); this page only shows the tools.
(function () {
    'use strict';
    const { $, $$, esc, data: D } = RV;
    const fb = RV.fb;
    const db = fb && fb.db;
    let main = $('#admin-main'); // replaced on every navigation so old listeners go away
    const gate = $('#gate');

    const SECTIONS = [
        ['overview', 'bx-grid-alt', 'Overview'],
        ['applications', 'bx-id-card', 'Applications'],
        ['professionals', 'bx-user-pin', 'Professionals'],
        ['centers', 'bx-buildings', 'Centers'],
        ['users', 'bx-group', 'Users'],
        ['bookings', 'bx-calendar-check', 'Bookings'],
        ['classes', 'bx-book-open', 'Classes'],
        ['news', 'bx-news', 'News'],
        ['announcements', 'bx-bell', 'Announcements'],
        ['spotlight', 'bx-slideshow', 'Spotlight'],
        ['ads', 'bx-purchase-tag', 'Ads'],
        ['settings', 'bx-cog', 'Site settings'],
        ['maintenance', 'bx-wrench', 'Maintenance']
    ];

    const get = path => db.ref(path).once('value').then(s => s.val());
    const list = path => get(path).then(RV.list).catch(() => []);
    const fail = err => RV.toast(RV.errorMessage(err), 'error', 6000);
    const ok = text => RV.toast(text, 'success');
    const badge = (on, yes, no = '') => (on ? `<span class="badge badge-success">${yes}</span>` : no ? `<span class="badge">${no}</span>` : '');
    const STATUS_CLASS = { new: 'badge-warning', contacted: 'badge-accent', confirmed: 'badge-primary', completed: 'badge-success', cancelled: 'badge-danger', pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger', active: 'badge-success', suspended: 'badge-danger', open: 'badge-success', full: 'badge-warning', closed: '' };
    const statusBadge = st => `<span class="badge ${STATUS_CLASS[st] || ''}">${esc(st || '—')}</span>`;
    const table = (head, rows) => `<div class="table-wrap"><table class="table"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td colspan="${head.length}" class="muted">Nothing here yet.</td></tr>`}</tbody></table></div>`;
    const toLocalInput = ms => { const t = RV.ts(ms); if (!t) return ''; const d = new Date(t - new Date().getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };

    /* ================================================================== */
    /* Gate & navigation                                                    */
    /* ================================================================== */
    let started = false;
    RV.onAuth(s => {
        if (!s.user) {
            $('#admin').hidden = true;
            gate.hidden = false;
            gate.innerHTML = `<div class="card card-pad" style="max-width:420px;margin:0 auto"><h1 style="font-size:1.5rem">Admin console</h1><p class="muted">Sign in with an admin account.</p><button class="btn btn-primary" data-signin>Sign in</button></div>`;
            return;
        }
        if (!s.isAdmin) {
            $('#admin').hidden = true;
            gate.hidden = false;
            gate.innerHTML = `<div class="card card-pad" style="max-width:480px;margin:0 auto"><h1 style="font-size:1.5rem">No admin access</h1><p class="muted">Your account (${esc(s.user.email || '')}) is not an administrator. An existing admin can grant access from <strong>Users</strong>.</p><a class="btn" href="#/">Back to the site</a></div>`;
            return;
        }
        gate.hidden = true;
        $('#admin').hidden = false;
        if (!started) { started = true; start(); }
    });

    function start() {
        $('#admin-nav').innerHTML = SECTIONS.map(([id, icon, label]) => `<button type="button" data-section="${id}"><i class='bx ${icon}'></i>${label}<span class="count" data-count="${id}"></span></button>`).join('');
        $('#admin-nav').addEventListener('click', e => {
            const b = e.target.closest('[data-section]');
            if (b) RV.go('#/admin/' + b.dataset.section);
        });
        document.addEventListener('rv:subroute', route);
        route();
        refreshCounts();
        // Make sure the token carries the admin claim (needed for image uploads)
        fb.auth.currentUser.getIdToken(true).catch(() => {});
    }

    function route() {
        const id = RV.route.sub || 'overview';
        const known = SECTIONS.some(s => s[0] === id) ? id : 'overview';
        $$('#admin-nav [data-section]').forEach(b => b.setAttribute('aria-current', String(b.dataset.section === known)));
        const fresh = main.cloneNode(false);
        main.replaceWith(fresh);
        main = fresh;
        main.innerHTML = '<div class="spinner"></div>';
        Promise.resolve(VIEWS[known]()).catch(err => {
            console.error(err);
            main.innerHTML = `<div class="empty"><i class='bx bx-error'></i>Could not load this section: ${esc(RV.errorMessage(err))}</div>`;
        });
    }
    const reload = () => { route(); refreshCounts(); };

    async function refreshCounts() {
        const [apps, bookings] = await Promise.all([list('applications'), list('bookings')]);
        const set = (id, n) => { const el = $(`[data-count="${id}"]`); if (el) el.innerHTML = n ? `<span class="badge badge-warning">${n}</span>` : ''; };
        set('applications', apps.filter(a => (a.status || 'pending') === 'pending').length);
        set('bookings', bookings.filter(b => b.status === 'new').length);
    }

    /* ================================================================== */
    /* Generic field builder for content editors                            */
    /* ================================================================== */
    function fieldsHTML(fields, data = {}) {
        return `<div class="form-grid">${fields.map(f => {
            const v = data[f.k] == null ? (f.def == null ? '' : f.def) : data[f.k];
            const full = f.full ? ' full' : '';
            const hint = f.hint ? `<em>${esc(f.hint)}</em>` : '';
            const req = f.required ? ' required' : '';
            if (f.type === 'checkbox') return `<label class="check${full}"><input type="checkbox" name="${f.k}" ${v === true || (v === '' && f.def === true) ? 'checked' : ''}> ${esc(f.label)}</label>`;
            let control;
            if (f.type === 'select') control = `<select name="${f.k}">${RV.optionList(f.options, v)}</select>`;
            else if (f.type === 'textarea') control = `<textarea name="${f.k}" rows="${f.rows || 4}">${esc(v)}</textarea>`;
            else if (f.type === 'lines') control = `<textarea name="${f.k}" rows="${f.rows || 4}">${esc(Array.isArray(v) ? v.join('\n') : v)}</textarea>`;
            else if (f.type === 'datetime') control = `<input type="datetime-local" name="${f.k}" value="${esc(toLocalInput(v))}">`;
            else if (f.type === 'image') control = `<input name="${f.k}" value="${esc(v)}" placeholder="https://… or upload below"><input type="file" name="${f.k}__file" accept="image/jpeg,image/png,image/webp">`;
            else control = `<input name="${f.k}" type="${f.type === 'url' ? 'text' : f.type || 'text'}" value="${esc(v)}"${f.type === 'number' ? ' step="any" min="0"' : ''}${f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : ''}${req}>`;
            return `<label class="field${full}"><span>${esc(f.label)}${f.required ? ' *' : ''}</span>${control}${hint}</label>`;
        }).join('')}</div>`;
    }

    async function readFields(form, fields) {
        const out = {};
        for (const f of fields) {
            const el = form.elements[f.k];
            if (!el) continue;
            if (f.type === 'checkbox') { out[f.k] = el.checked; continue; }
            const raw = el.value.trim();
            if (f.required && !raw && f.type !== 'image') throw new Error(`${f.label} is required.`);
            if (f.type === 'number') out[f.k] = raw === '' ? null : Number(raw);
            else if (f.type === 'datetime') out[f.k] = raw ? new Date(raw).getTime() : null;
            else if (f.type === 'lines') out[f.k] = raw.split('\n').map(x => x.trim()).filter(Boolean);
            else if (f.type === 'url') {
                if (raw && !RV.safeUrl(raw)) throw new Error(`${f.label} must be a web link (https://…) or a page like #/teletherapy or teletherapy.html`);
                out[f.k] = raw || null;
            } else if (f.type === 'image') {
                const file = form.elements[f.k + '__file'] && form.elements[f.k + '__file'].files[0];
                if (file) {
                    const bad = RV.checkFile(file, { maxMb: 5, types: /^image\/(jpeg|png|webp|gif)$/ });
                    if (bad) throw new Error(bad);
                    await fb.auth.currentUser.getIdToken(true);
                    out[f.k] = await RV.upload(`media/${RV.fileName(file)}`, file);
                } else {
                    if (raw && !/^(https:\/\/|assets\/)/i.test(raw)) throw new Error(`${f.label} must start with https://`);
                    out[f.k] = raw || null;
                }
            } else out[f.k] = raw;
            if (f.required && f.type === 'image' && !out[f.k]) throw new Error(`${f.label} is required.`);
        }
        return out;
    }

    function editor({ title, fields, data, wide = true, extra = '', onSave }) {
        const dlg = RV.dialog({
            title, wide,
            body: `<form novalidate>${fieldsHTML(fields, data)}${extra}<div class="form-msg error mt-2" hidden></div><div class="form-actions"><button type="button" class="btn" data-cancel>Cancel</button><button type="submit" class="btn btn-primary">Save</button></div></form>`
        });
        const form = dlg.querySelector('form');
        dlg.querySelector('[data-cancel]').onclick = () => dlg.close();
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const msg = form.querySelector('.form-msg');
            const btn = form.querySelector('[type=submit]');
            msg.hidden = true;
            RV.busy(btn, true, 'Saving…');
            try {
                const values = await readFields(form, fields);
                await onSave(values, form);
                dlg.close();
                ok('Saved');
                reload();
            } catch (err) {
                RV.busy(btn, false);
                msg.textContent = RV.errorMessage(err);
                msg.hidden = false;
            }
        });
        return dlg;
    }

    // A list + editor for simple admin-owned content (news, announcements, spotlight, ads).
    function contentView({ node, title, intro, singular, fields, columns, head, sort, prepare }) {
        return async () => {
            const rows = (await list(node)).sort(sort || ((a, b) => RV.ts(b.createdAt || b.timestamp) - RV.ts(a.createdAt || a.timestamp)));
            main.innerHTML = `
                <div class="row-between"><div><h2>${esc(title)}</h2>${intro ? `<p class="muted mb-0">${intro}</p>` : ''}</div><button class="btn btn-primary" data-new><i class='bx bx-plus'></i> New ${esc(singular)}</button></div>
                <div class="toolbar"><input class="input" type="search" placeholder="Search" data-search></div>
                <div data-table></div>`;
            const render = q => {
                const shown = rows.filter(r => !q || RV.lower(JSON.stringify(r)).includes(RV.lower(q)));
                $('[data-table]', main).innerHTML = table(head.concat(''), shown.map(r => `<tr data-id="${esc(r.id)}">${columns(r).map(c => `<td>${c}</td>`).join('')}<td class="actions"><button class="btn btn-sm" data-edit>Edit</button> <button class="btn btn-sm btn-ghost" data-del aria-label="Delete"><i class='bx bx-trash'></i></button></td></tr>`));
            };
            render('');
            $('[data-search]', main).addEventListener('input', RV.debounce(e => render(e.target.value), 150));
            const open = r => editor({
                title: r ? `Edit ${singular}` : `New ${singular}`, fields, data: r || {},
                onSave: async values => {
                    const rec = prepare ? prepare(values, r) : values;
                    if (r) await db.ref(`${node}/${r.id}`).update(rec);
                    else await db.ref(node).push({ ...rec, createdAt: fb.TIMESTAMP });
                }
            });
            $('[data-new]', main).onclick = () => open(null);
            main.addEventListener('click', async e => {
                const row = e.target.closest('[data-id]');
                if (!row) return;
                const r = rows.find(x => x.id === row.dataset.id);
                if (e.target.closest('[data-edit]')) open(r);
                if (e.target.closest('[data-del]') && await RV.confirm(`Delete this ${singular}?`, { ok: 'Delete', danger: true })) {
                    try { await db.ref(`${node}/${r.id}`).remove(); ok('Deleted'); reload(); } catch (err) { fail(err); }
                }
            });
        };
    }

    /* ================================================================== */
    /* Views                                                                */
    /* ================================================================== */
    const VIEWS = {};

    VIEWS.overview = async () => {
        const [users, pros, centers, apps, bookings, classes, analytics] = await Promise.all([
            get('userdata').then(v => Object.keys(v || {}).length).catch(() => 0),
            list('professionals'), list('centers'), list('applications'), list('bookings'), list('classes'),
            get('analytics/daily').catch(() => ({}))
        ]);
        const enrol = await Promise.all(classes.map(c => list('enrollments/' + c.id)));
        const pendingEnrol = enrol.flat().filter(e => e.status === 'pending').length;
        const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(Date.now() - (13 - i) * 86400000); return d.toISOString().slice(0, 10); });
        const views = days.map(d => (analytics && analytics[d] && analytics[d].views) || 0);
        const max = Math.max(1, ...views);
        const today = (analytics && analytics[RV.today()] && analytics[RV.today()].pages) || {};
        const kpi = (n, label, href) => `<a class="card kpi clickable" href="#${href}" style="color:inherit;text-decoration:none"><strong>${n}</strong><span>${label}</span></a>`;
        main.innerHTML = `
            <h2>Overview</h2>
            <div class="kpis">
                ${kpi(users, 'Registered users', 'users')}
                ${kpi(pros.length, `Professionals (${pros.filter(p => p.verified === true).length} verified)`, 'professionals')}
                ${kpi(centers.length, 'Centers & mobile services', 'centers')}
                ${kpi(apps.filter(a => (a.status || 'pending') === 'pending').length, 'Applications to review', 'applications')}
                ${kpi(bookings.filter(b => b.status === 'new').length, 'New bookings', 'bookings')}
                ${kpi(bookings.length, 'Bookings in total', 'bookings')}
                ${kpi(classes.filter(c => c.status === 'open').length, 'Open classes', 'classes')}
                ${kpi(pendingEnrol, 'Enrolments waiting', 'classes')}
            </div>
            <div class="grid-2">
                <div class="card card-pad"><h3>Page views — last 14 days</h3><div class="bars">${days.map((d, i) => `<div><span class="muted">${esc(RV.date(d, { day: 'numeric', month: 'short' }))}</span><i style="width:${(views[i] / max) * 100}%"></i><span>${views[i]}</span></div>`).join('')}</div></div>
                <div class="card card-pad"><h3>Today by page</h3>${Object.keys(today).length ? `<dl class="kv">${Object.entries(today).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<dt>${esc(k)}</dt><dd>${n}</dd>`).join('')}</dl>` : '<p class="muted">No visits yet today.</p>'}</div>
            </div>
            <div class="card card-pad"><div class="row-between"><h3 class="mb-0">Latest bookings</h3><a class="btn btn-sm" href="#bookings">All bookings</a></div>
                <div class="mt-2">${table(['Received', 'Client', 'Service', 'Status'], bookings.sort((a, b) => RV.ts(b.createdAt) - RV.ts(a.createdAt)).slice(0, 6).map(b => `<tr><td>${esc(RV.dateTime(b.createdAt))}</td><td>${esc(b.name)}</td><td>${esc(b.service || b.type)}</td><td>${statusBadge(b.status)}</td></tr>`))}</div></div>`;
    };

    /* ---------- applications ---------- */
    function normalizeApp(a, key) {
        const role = a.role || a.applicationType || a.userType || 'practitioner';
        const uid = a.userId || a.userID || (key && !key.startsWith('-') ? key : '');
        const base = { key, role, uid, status: a.status || 'pending', submitted: a.timestamp || a.createdAt, raw: a, reviewNote: a.reviewNote };
        if (a.listing || a.supplier) {
            return { ...base, listing: a.listing || {}, supplier: a.supplier, category: a.category || '', licenseNo: a.licenseNo || '', licenseUrl: a.licenseUrl || '', photoUrl: a.photoUrl || '',
                name: (a.listing && (a.listing.name || a.listing.centerName)) || (a.supplier && a.supplier.orgName) || a.applicantName, email: a.applicantEmail };
        }
        if (role === 'center') {
            const listing = { centerName: a['center-name'] || a.centerName || a.name, centerType: a['center-type'] || a.centerType, address: a['center-address'] || a.address,
                phone: a['center-phone'] || a.phone, email: a['center-email'] || a.email, website: a['center-website'] || a.website, description: a['center-description'] || a.description };
            return { ...base, listing, photoUrl: a['center-logoUrl'] || a.logo || a.img || '', licenseUrl: '', name: listing.centerName, email: listing.email };
        }
        if (role === 'supplier') {
            const supplier = { orgName: a['org-name'] || a.orgName || a.name, email: a['contact-email'] || a.contactEmail || a.email, phone: a['contact-phone'] || a.contactPhone || a.phone, productsOffered: a['products-offered'] || a.productsOffered };
            return { ...base, supplier, listing: {}, name: supplier.orgName, email: supplier.email };
        }
        const cat = D.categoryOf(a['prof-specialty'] || a.specialty || a['prof-job']);
        const listing = { name: a['prof-name'] || a.fullName, job: a['prof-job'] || a.specialty || a['prof-specialty'], phone: a['prof-phone'] || a.contactPhone,
            email: a['prof-email'] || a.contactEmail, bio: a['prof-bio'] || a.bio, experience: Number(a['prof-experience'] || a.yearsExperience) || undefined };
        return { ...base, role: 'practitioner', listing, category: cat ? cat.value : '', licenseUrl: a['prof-licenseUrl'] || a.licenseUrl || '', photoUrl: a['prof-pictureUrl'] || a.profileImage || '', name: listing.name, email: listing.email };
    }

    // Keep only values the listing rules accept.
    function cleanListing(l) {
        const out = {};
        Object.entries(l || {}).forEach(([k, v]) => {
            if (v === undefined || v === null || v === '') return;
            if ((k === 'website' || k === 'img') && !/^(https:\/\/|assets\/)/i.test(String(v))) return;
            if ((k === 'priceMin' || k === 'priceMax' || k === 'experience') && typeof v === 'string' && /^\d+(\.\d+)?$/.test(v)) v = Number(v);
            out[k] = v;
        });
        return out;
    }

    VIEWS.applications = async () => {
        const raw = await get('applications') || {};
        const apps = Object.entries(raw).map(([k, a]) => normalizeApp(a || {}, k)).sort((a, b) => RV.ts(b.submitted) - RV.ts(a.submitted));
        main.innerHTML = `
            <div><h2>Applications</h2><p class="muted mb-0">Review licences, then approve to publish the listing (it is marked verified) or reject with a note the applicant can see.</p></div>
            <div class="toolbar"><select class="input" data-filter style="max-width:200px">${RV.optionList([{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: '', label: 'All' }], 'pending')}</select></div>
            <div data-table></div>`;
        const render = () => {
            const st = $('[data-filter]', main).value;
            const shown = apps.filter(a => !st || a.status === st);
            $('[data-table]', main).innerHTML = table(['Applicant', 'Type', 'Discipline', 'Submitted', 'Status', ''], shown.map(a => `
                <tr data-key="${esc(a.key)}"><td><strong>${esc(a.name || '—')}</strong><br><small class="muted">${esc(a.email || '')}</small></td>
                <td>${esc(a.role)}</td><td>${esc((D.categoryOf(a.category) || {}).label || a.listing.centerType || '')}</td>
                <td>${esc(RV.dateTime(a.submitted))}</td><td>${statusBadge(a.status)}</td>
                <td class="actions"><button class="btn btn-sm btn-primary" data-review>Review</button></td></tr>`));
        };
        render();
        $('[data-filter]', main).addEventListener('change', render);
        main.addEventListener('click', e => {
            const row = e.target.closest('[data-key]');
            if (row && e.target.closest('[data-review]')) review(apps.find(a => a.key === row.dataset.key));
        });
    };

    function review(a) {
        const l = a.listing || {};
        const sup = a.supplier || {};
        const rows = [
            ['Type', a.role], ['User ID', a.uid || 'unknown'], ['Name', a.name], ['Email', a.email],
            ['Discipline', (D.categoryOf(a.category) || {}).label], ['Licence no.', a.licenseNo], ['Title', l.job], ['Center type', l.centerType],
            ['Phone', l.phone || sup.phone], ['WhatsApp', l.whatsapp], ['Location', [l.address, l.city, l.state, l.country].filter(Boolean).join(', ')],
            ['Fees', RV.priceRange(l)], ['Modes', Object.keys(l.serviceModes || {}).join(', ')],
            ['Covers', RV.coverageText(l)], ['Experience', l.experience], ['Qualifications', l.education], ['About', l.bio || l.description],
            ['Products', sup.productsOffered], ['Review note', a.reviewNote]
        ].filter(([, v]) => v !== undefined && v !== null && v !== '');
        const lic = RV.safeUrl(a.licenseUrl), photo = RV.img(a.photoUrl, '');
        const dlg = RV.dialog({
            title: 'Review application', wide: true,
            body: `
                ${photo ? `<img src="${esc(photo)}" alt="" class="thumb" style="width:80px;height:80px;margin-bottom:12px">` : ''}
                <dl class="kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
                <p class="mt-2">${lic ? `<a class="btn btn-sm" href="${esc(lic)}" target="_blank" rel="noopener"><i class='bx bx-file'></i> Open licence / certificate</a>` : '<span class="badge badge-warning">No licence attached</span>'}</p>
                ${a.role === 'practitioner' ? `<label class="field"><span>Discipline to list under</span><select data-cat>${RV.optionList([{ value: '', label: 'Choose…' }, ...D.CATEGORIES.map(c => ({ value: c.value, label: c.label }))], a.category)}</select></label>` : ''}
                <label class="field mt-2"><span>Note to the applicant (shown if rejected)</span><textarea class="input" data-note rows="2">${esc(a.reviewNote || '')}</textarea></label>
                ${!a.uid ? '<div class="notice warn mt-2"><i class="bx bx-error"></i><span>This application has no linked account, so the listing will be created without an owner who can edit it.</span></div>' : ''}
                <div class="form-actions"><button class="btn btn-danger" data-reject>Reject</button><button class="btn btn-primary" data-approve>Approve and publish</button></div>`
        });
        const note = () => dlg.querySelector('[data-note]').value.trim().slice(0, 1000);
        dlg.querySelector('[data-reject]').onclick = async () => {
            try {
                await db.ref('applications/' + a.key).update({ status: 'rejected', reviewNote: note(), reviewedAt: fb.TIMESTAMP, reviewedBy: RV.state.user.uid });
                dlg.close(); ok('Application rejected'); reload();
            } catch (err) { fail(err); }
        };
        dlg.querySelector('[data-approve]').onclick = async e => {
            const btn = e.currentTarget;
            RV.busy(btn, true, 'Publishing…');
            try {
                const key = a.uid || db.ref().push().key;
                const updates = {};
                if (a.role === 'supplier') {
                    const m = { ...cleanListing(sup), userId: a.uid || '', status: 'active', verified: true, createdAt: fb.TIMESTAMP };
                    if (RV.img(a.photoUrl, '')) m.img = a.photoUrl;
                    updates[`merchants/${key}`] = m;
                } else {
                    const node = a.role === 'center' ? 'centers' : 'professionals';
                    const listing = { ...cleanListing(l), verified: true, status: 'active' };
                    if (RV.img(a.photoUrl, '') && !listing.img) listing.img = a.photoUrl;
                    if (a.role === 'center') listing.userId = a.uid || '';
                    else {
                        listing.userID = a.uid || '';
                        const cat = dlg.querySelector('[data-cat]').value;
                        if (cat) listing.category = cat;
                    }
                    if (!listing.name && !listing.centerName) throw new Error('This application has no name to publish.');
                    updates[`${node}/${key}`] = listing;
                }
                updates[`applications/${a.key}/status`] = 'approved';
                updates[`applications/${a.key}/reviewNote`] = note();
                updates[`applications/${a.key}/reviewedAt`] = fb.TIMESTAMP;
                updates[`applications/${a.key}/reviewedBy`] = RV.state.user.uid;
                await db.ref().update(updates);
                dlg.close();
                ok('Approved — the listing is live');
                reload();
            } catch (err) { RV.busy(btn, false); fail(err); }
        };
    }

    /* ---------- listings ---------- */
    function listingView(kind) {
        const node = kind === 'pros' ? 'professionals' : 'centers';
        return async () => {
            const rows = (await list(node)).sort((a, b) => (Number(a.pos) || 9999) - (Number(b.pos) || 9999));
            const title = kind === 'pros' ? 'Professionals' : 'Centers & mobile services';
            main.innerHTML = `
                <div class="row-between"><div><h2>${title}</h2><p class="muted mb-0">${rows.length} listings. Edit any field, verify, feature on the home page, suspend or remove.</p></div><button class="btn btn-primary" data-new><i class='bx bx-plus'></i> Add listing</button></div>
                <div class="toolbar"><input class="input" type="search" placeholder="Search name, place or discipline" data-search>
                    <select class="input" data-flag style="max-width:200px"><option value="">All</option><option value="unverified">Not verified</option><option value="verified">Verified</option><option value="featured">Featured</option><option value="suspended">Suspended</option></select></div>
                <div data-table></div>`;
            const render = () => {
                const q = RV.lower($('[data-search]', main).value);
                const flag = $('[data-flag]', main).value;
                const shown = rows.filter(r => (!q || RV.lower([r.name, r.centerName, r.job, r.city, r.state, r.location, r.address, r.category, r.centerType].join(' ')).includes(q)) &&
                    (!flag || (flag === 'unverified' ? r.verified !== true : flag === 'suspended' ? r.status === 'suspended' : r[flag] === true)));
                $('[data-table]', main).innerHTML = table(['', 'Name', kind === 'pros' ? 'Discipline' : 'Type', 'Location', 'Fees', 'Flags', ''], shown.map(r => `
                    <tr data-id="${esc(r.id)}">
                        <td><img class="thumb" src="${esc(RV.img(r.img || r.ing, kind === 'pros' ? 'assets/img/profile.png' : 'assets/img/center.jpg'))}" alt="" loading="lazy" onerror="this.src='assets/img/profile.png'"></td>
                        <td><a href="#/profile?id=${encodeURIComponent(r.id)}" target="_blank"><strong>${esc(r.name || r.centerName || '—')}</strong></a><br><small class="muted">${esc(r.email || '')} ${esc(r.phone || '')}</small></td>
                        <td>${esc(kind === 'pros' ? ((D.listingCategory(r) || {}).label || r.job || '') : (r.centerType || ''))}</td>
                        <td>${esc(RV.place(r) || r.address || '')}</td>
                        <td>${esc(RV.priceRange(r))}</td>
                        <td>${badge(r.verified === true, 'verified', 'unverified')} ${badge(r.featured === true, 'featured')} ${r.status === 'suspended' ? '<span class="badge badge-danger">suspended</span>' : ''}</td>
                        <td class="actions"><button class="btn btn-sm" data-edit>Edit</button> <button class="btn btn-sm" data-verify>${r.verified === true ? 'Unverify' : 'Verify'}</button> <button class="btn btn-sm" data-suspend>${r.status === 'suspended' ? 'Restore' : 'Suspend'}</button> <button class="btn btn-sm btn-ghost" data-del aria-label="Delete"><i class='bx bx-trash'></i></button></td>
                    </tr>`));
            };
            render();
            $('[data-search]', main).addEventListener('input', RV.debounce(render, 150));
            $('[data-flag]', main).addEventListener('change', render);
            $('[data-new]', main).onclick = () => editListing(kind, node, null);
            main.addEventListener('click', async e => {
                const row = e.target.closest('[data-id]');
                if (!row) return;
                const r = rows.find(x => x.id === row.dataset.id);
                const ref = db.ref(`${node}/${r.id}`);
                try {
                    if (e.target.closest('[data-edit]')) editListing(kind, node, r);
                    else if (e.target.closest('[data-verify]')) { await ref.update({ verified: r.verified !== true }); ok('Updated'); reload(); }
                    else if (e.target.closest('[data-suspend]')) { await ref.update({ status: r.status === 'suspended' ? 'active' : 'suspended' }); ok('Updated'); reload(); }
                    else if (e.target.closest('[data-del]') && await RV.confirm(`Remove the listing for ${r.name || r.centerName}? Their account stays; only the public listing is removed.`, { ok: 'Remove listing', danger: true })) {
                        await ref.remove(); ok('Listing removed'); reload();
                    }
                } catch (err) { fail(err); }
            });
        };
    }

    function editListing(kind, node, r) {
        const isNew = !r;
        const dlg = RV.dialog({
            title: isNew ? 'Add listing' : `Edit ${r.name || r.centerName || 'listing'}`, wide: true,
            body: `<form novalidate>
                ${isNew ? `<label class="field"><span>Owner’s user ID <em>(optional — lets them edit it; find it under Users)</em></span><input class="input" name="ownerUid" maxlength="128"></label>` : ''}
                <label class="field mt-2"><span>Photo / logo</span><input type="file" name="photo" accept="image/jpeg,image/png,image/webp"></label>
                ${RV.listingFormHTML(kind, r || {}, { admin: true })}
                <div class="form-msg error mt-2" hidden></div>
                <div class="form-actions"><button type="button" class="btn" data-cancel>Cancel</button><button class="btn btn-primary" type="submit">Save</button></div></form>`
        });
        const form = dlg.querySelector('form');
        dlg.querySelector('[data-cancel]').onclick = () => dlg.close();
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const msg = form.querySelector('.form-msg');
            const { updates, error } = RV.readListingForm(form, kind, r || {}, { admin: true });
            if (error) { msg.textContent = error; msg.hidden = false; return; }
            const btn = form.querySelector('[type=submit]');
            RV.busy(btn, true, 'Saving…');
            try {
                const photo = form.photo.files[0];
                if (photo) { await fb.auth.currentUser.getIdToken(true); updates.img = await RV.upload(`media/${RV.fileName(photo)}`, photo); }
                let key = r && r.id;
                if (isNew) {
                    const owner = form.ownerUid.value.trim();
                    if (owner && !/^[\w-]{10,128}$/.test(owner)) throw new Error('That user ID does not look right.');
                    key = owner || db.ref(node).push().key;
                    if (kind === 'pros') updates.userID = owner; else updates.userId = owner;
                }
                Object.keys(updates).forEach(k => { if (isNew && updates[k] === null) delete updates[k]; });
                await db.ref(`${node}/${key}`).update(updates);
                dlg.close(); ok('Listing saved'); reload();
            } catch (err) {
                RV.busy(btn, false);
                msg.textContent = RV.errorMessage(err); msg.hidden = false;
            }
        });
    }
    VIEWS.professionals = listingView('pros');
    VIEWS.centers = listingView('centers');

    /* ---------- users ---------- */
    VIEWS.users = async () => {
        const [users, admins, blocked] = await Promise.all([get('userdata'), get('admins'), get('blocked')]);
        const rows = Object.entries(users || {}).map(([id, u]) => ({ ...(u || {}), id })).sort((a, b) => RV.ts(b.createdAt) - RV.ts(a.createdAt));
        const me = RV.state.user.uid;
        main.innerHTML = `
            <div><h2>Users</h2><p class="muted mb-0">${rows.length} accounts. Admins have full control; blocked users can still sign in but cannot book, review, apply, enrol or edit.</p></div>
            <div class="toolbar"><input class="input" type="search" placeholder="Search name or email" data-search></div>
            <div data-table></div>`;
        const render = () => {
            const q = RV.lower($('[data-search]', main).value);
            const shown = rows.filter(u => !q || RV.lower([u.name, u.email, u.phone, u.id].join(' ')).includes(q)).slice(0, 300);
            $('[data-table]', main).innerHTML = table(['Name', 'Role', 'Joined', 'Access', ''], shown.map(u => {
                const isAdmin = admins && admins[u.id] === true, isBlocked = blocked && blocked[u.id];
                return `<tr data-id="${esc(u.id)}"><td><strong>${esc(u.name || '—')}</strong><br><small class="muted">${esc(u.email || '')} · <code>${esc(u.id)}</code></small></td>
                    <td>${esc(u.role || 'regular')}</td><td>${esc(RV.date(u.createdAt))}</td>
                    <td>${isAdmin ? '<span class="badge badge-accent">admin</span>' : ''} ${isBlocked ? '<span class="badge badge-danger">blocked</span>' : ''}</td>
                    <td class="actions"><a class="btn btn-sm" href="#/profile?id=${encodeURIComponent(u.id)}" target="_blank">Profile</a>
                    ${u.id !== me ? `<button class="btn btn-sm" data-admin="${isAdmin ? 0 : 1}">${isAdmin ? 'Remove admin' : 'Make admin'}</button>
                    <button class="btn btn-sm ${isBlocked ? '' : 'btn-danger'}" data-block="${isBlocked ? 0 : 1}">${isBlocked ? 'Unblock' : 'Block'}</button>` : '<span class="muted">you</span>'}</td></tr>`;
            }));
        };
        render();
        $('[data-search]', main).addEventListener('input', RV.debounce(render, 150));
        main.addEventListener('click', async e => {
            const row = e.target.closest('[data-id]');
            if (!row) return;
            const uid = row.dataset.id;
            const a = e.target.closest('[data-admin]'), b = e.target.closest('[data-block]');
            try {
                if (a) {
                    const on = a.dataset.admin === '1';
                    if (!(await RV.confirm(on ? 'Give this user full admin control?' : 'Remove admin access for this user?', { ok: on ? 'Make admin' : 'Remove', danger: on }))) return;
                    await db.ref('admins/' + uid).set(on ? true : null);
                    ok('Updated'); reload();
                }
                if (b) {
                    const on = b.dataset.block === '1';
                    await db.ref('blocked/' + uid).set(on ? true : null);
                    ok(on ? 'User blocked' : 'User unblocked'); reload();
                }
            } catch (err) { fail(err); }
        });
    };

    /* ---------- bookings ---------- */
    VIEWS.bookings = async () => {
        const [rows, pros] = await Promise.all([list('bookings'), list('professionals')]);
        rows.sort((a, b) => RV.ts(b.createdAt) - RV.ts(a.createdAt));
        main.innerHTML = `
            <div><h2>Bookings</h2><p class="muted mb-0">Teletherapy, home and clinic visits, intakes and tutoring requests. Assign a professional, schedule, and keep the client updated.</p></div>
            <div class="toolbar">
                <select class="input" data-status style="max-width:180px">${RV.optionList([{ value: '', label: 'All statuses' }, 'new', 'contacted', 'confirmed', 'completed', 'cancelled'], '')}</select>
                <select class="input" data-type style="max-width:180px">${RV.optionList([{ value: '', label: 'All types' }, 'teletherapy', 'home-visit', 'clinic', 'intake', 'tutoring', 'consultation'], '')}</select>
                <input class="input" type="search" placeholder="Search client, phone or reference" data-search>
            </div>
            <div data-table></div>`;
        const render = () => {
            const st = $('[data-status]', main).value, ty = $('[data-type]', main).value, q = RV.lower($('[data-search]', main).value);
            const shown = rows.filter(b => (!st || b.status === st) && (!ty || b.type === ty) && (!q || RV.lower([b.name, b.phone, b.userEmail, b.id, b.service, b.proName].join(' ')).includes(q)));
            $('[data-table]', main).innerHTML = table(['Ref', 'Received', 'Client', 'Request', 'With', 'Status', ''], shown.map(b => `
                <tr data-id="${esc(b.id)}"><td><code>${esc(b.id.slice(-6).toUpperCase())}</code></td><td>${esc(RV.dateTime(b.createdAt))}</td>
                <td><strong>${esc(b.name || '—')}</strong><br><small class="muted">${esc(b.phone || '')}</small></td>
                <td>${esc(b.service || '')}<br><small class="muted">${esc([b.type, b.audience, b.plan].filter(Boolean).join(' · '))}</small></td>
                <td>${esc(b.proName || '—')}</td><td>${statusBadge(b.status)}</td>
                <td class="actions"><button class="btn btn-sm btn-primary" data-open>Manage</button></td></tr>`));
        };
        render();
        ['[data-status]', '[data-type]'].forEach(s => $(s, main).addEventListener('change', render));
        $('[data-search]', main).addEventListener('input', RV.debounce(render, 150));
        main.addEventListener('click', e => {
            const row = e.target.closest('[data-id]');
            if (row && e.target.closest('[data-open]')) manageBooking(rows.find(b => b.id === row.dataset.id), pros);
        });
    };

    function manageBooking(b, pros) {
        const intake = b.intake ? Object.entries(b.intake).map(([k, v]) => `<dt>${esc(k.replace(/_/g, ' '))}</dt><dd>${esc(v)}</dd>`).join('') : '';
        const details = [['Reference', b.id.slice(-6).toUpperCase()], ['Received', RV.dateTime(b.createdAt)], ['Type', b.type], ['Service', b.service], ['For', b.audience], ['Plan', b.plan],
            ['Preferred', [b.preferredDate, b.timeOfDay].filter(Boolean).join(' · ')], ['Address / location', b.location], ['Client', b.name], ['Phone', b.phone], ['Account email', b.userEmail],
            ['Notes', b.notes], ['Quoted fees', b.price]].filter(([, v]) => v);
        const proOptions = [{ value: '', label: 'Not assigned' }, ...pros.filter(RV.isLive).map(p => ({ value: p.id, label: `${p.name || 'Unnamed'} — ${(D.listingCategory(p) || {}).short || p.job || ''}` }))];
        const dlg = RV.dialog({
            title: `Booking ${b.id.slice(-6).toUpperCase()}`, wide: true,
            body: `<dl class="kv">${details.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
                ${intake ? `<h4 class="mt-2">Intake answers</h4><dl class="kv">${intake}</dl>` : ''}
                <form class="mt-2" novalidate>
                    <div class="form-grid">
                        <label class="field"><span>Status</span><select name="status">${RV.optionList(['new', 'contacted', 'confirmed', 'completed', 'cancelled'], b.status)}</select></label>
                        <label class="field"><span>Assign professional</span><select name="proId">${RV.optionList(proOptions, b.proId || '')}</select></label>
                        <label class="field"><span>Scheduled for</span><input name="scheduledAt" maxlength="60" value="${esc(b.scheduledAt || '')}" placeholder="e.g. Mon 3 Nov, 10:00 WAT"></label>
                        <label class="field"><span>Session link</span><input name="meetingLink" value="${esc(b.meetingLink || '')}" placeholder="https://meet…"></label>
                        <label class="field full"><span>Internal note</span><textarea name="adminNote" rows="2" maxlength="3000">${esc(b.adminNote || '')}</textarea></label>
                    </div>
                    <div class="form-actions">
                        ${RV.digits(b.phone) ? `<a class="btn btn-whatsapp" href="${esc(RV.waLink(b.phone, `Hello ${b.name || ''}, this is RehabVerve about your booking #${b.id.slice(-6).toUpperCase()}.`))}" target="_blank" rel="noopener"><i class='bx bxl-whatsapp'></i> WhatsApp client</a>` : ''}
                        <button type="button" class="btn btn-ghost" data-delete><i class='bx bx-trash'></i> Delete</button>
                        <button type="submit" class="btn btn-primary">Save</button>
                    </div>
                </form>`
        });
        const form = dlg.querySelector('form');
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const v = RV.formValues(form);
            if (v.meetingLink && !/^https:\/\//i.test(v.meetingLink)) { RV.toast('Session link must start with https://', 'error'); return; }
            const pro = pros.find(p => p.id === v.proId);
            try {
                await db.ref('bookings/' + b.id).update({
                    status: v.status, proId: v.proId || null, proName: pro ? (pro.name || '') : null,
                    scheduledAt: v.scheduledAt || null, meetingLink: v.meetingLink || null, adminNote: v.adminNote || null, updatedAt: fb.TIMESTAMP
                });
                dlg.close(); ok('Booking updated'); reload();
            } catch (err) { fail(err); }
        });
        dlg.querySelector('[data-delete]').onclick = async () => {
            if (!(await RV.confirm('Delete this booking permanently?', { ok: 'Delete', danger: true }))) return;
            try { await db.ref('bookings/' + b.id).remove(); dlg.close(); ok('Deleted'); reload(); } catch (err) { fail(err); }
        };
    }

    /* ---------- classes ---------- */
    VIEWS.classes = async () => {
        const [rows, pros] = await Promise.all([list('classes'), list('professionals')]);
        rows.sort((a, b) => RV.ts(b.createdAt) - RV.ts(a.createdAt));
        const enrol = await Promise.all(rows.map(c => list('enrollments/' + c.id)));
        main.innerHTML = `
            <div class="row-between"><div><h2>Classes</h2><p class="muted mb-0">Online classes and tutoring for children. Assign a tutor; they manage students, assignments and grading from the class page.</p></div><button class="btn btn-primary" data-new><i class='bx bx-plus'></i> New class</button></div>
            ${table(['Class', 'Tutor', 'Schedule', 'Price', 'Students', 'Status', ''], rows.map((c, i) => {
                const e = enrol[i];
                return `<tr data-id="${esc(c.id)}"><td><strong>${esc(c.title)}</strong><br><small class="muted">${esc([c.subject, c.ageGroup].filter(Boolean).join(' · '))}</small></td>
                    <td>${esc(c.tutorName || '—')}</td><td>${esc(c.schedule || '')}</td><td>${esc(RV.money(c.price, c.currency || 'NGN') || 'Free')}</td>
                    <td>${e.filter(x => x.status === 'active').length} enrolled${e.some(x => x.status === 'pending') ? ` · <span class="badge badge-warning">${e.filter(x => x.status === 'pending').length} waiting</span>` : ''}</td>
                    <td>${statusBadge(c.status)}</td>
                    <td class="actions"><a class="btn btn-sm" href="#/class?id=${encodeURIComponent(c.id)}" target="_blank">Classroom</a> <button class="btn btn-sm" data-edit>Edit</button> <button class="btn btn-sm btn-ghost" data-del aria-label="Delete"><i class='bx bx-trash'></i></button></td></tr>`;
            }))}`;
        const tutorOptions = [{ value: '', label: 'No tutor yet' }, ...pros.filter(RV.isLive).map(p => ({ value: p.id, label: `${p.name || 'Unnamed'} — ${(D.listingCategory(p) || {}).short || p.job || ''}` }))];
        const fields = [
            { k: 'title', label: 'Title', required: true, full: true },
            { k: 'subject', label: 'Subject', type: 'select', options: D.CLASS_SUBJECTS },
            { k: 'ageGroup', label: 'Age group', type: 'select', options: D.AGE_GROUPS },
            { k: 'tutorId', label: 'Tutor', type: 'select', options: tutorOptions },
            { k: 'status', label: 'Status', type: 'select', options: [{ value: 'open', label: 'Open — enrolling' }, { value: 'full', label: 'Full' }, { value: 'closed', label: 'Closed' }], def: 'open' },
            { k: 'schedule', label: 'Schedule', placeholder: 'Saturdays 10:00 WAT' },
            { k: 'startDate', label: 'Start date', type: 'date' },
            { k: 'durationWeeks', label: 'Length (weeks)', type: 'number' },
            { k: 'capacity', label: 'Class size (max)', type: 'number' },
            { k: 'price', label: 'Price (0 = free)', type: 'number' },
            { k: 'currency', label: 'Currency', type: 'select', options: Object.keys(D.CURRENCIES), def: 'NGN' },
            { k: 'priceUnit', label: 'Charged per', type: 'select', options: Object.keys(D.PRICE_UNITS), def: 'month' },
            { k: 'img', label: 'Image', type: 'image', full: true },
            { k: 'description', label: 'Description', type: 'textarea', full: true },
            { k: 'meetingLink', label: 'Joining link (private — only enrolled families see it)', type: 'url', full: true }
        ];
        const open = async c => {
            const priv = c ? await get('classPrivate/' + c.id).catch(() => null) : null;
            editor({
                title: c ? 'Edit class' : 'New class', fields, data: { ...(c || {}), meetingLink: (priv && priv.meetingLink) || '' },
                onSave: async v => {
                    if (v.meetingLink && !/^https:\/\//i.test(v.meetingLink)) throw new Error('The joining link must start with https://');
                    const tutor = pros.find(p => p.id === v.tutorId);
                    const { meetingLink, ...rec } = v;
                    rec.tutorName = tutor ? (tutor.name || '') : '';
                    const key = c ? c.id : db.ref('classes').push().key;
                    const updates = {};
                    Object.entries(rec).forEach(([k, val]) => { updates[`classes/${key}/${k}`] = val; });
                    if (!c) updates[`classes/${key}/createdAt`] = fb.TIMESTAMP;
                    updates[`classPrivate/${key}/meetingLink`] = meetingLink || null;
                    await db.ref().update(updates);
                }
            });
        };
        $('[data-new]', main).onclick = () => open(null);
        main.addEventListener('click', async e => {
            const row = e.target.closest('[data-id]');
            if (!row) return;
            const c = rows.find(x => x.id === row.dataset.id);
            if (e.target.closest('[data-edit]')) open(c);
            if (e.target.closest('[data-del]') && await RV.confirm(`Delete “${c.title}” with its enrolments, assignments and submissions?`, { ok: 'Delete class', danger: true })) {
                try {
                    await db.ref().update({ [`classes/${c.id}`]: null, [`classPrivate/${c.id}`]: null, [`enrollments/${c.id}`]: null, [`assignments/${c.id}`]: null, [`submissions/${c.id}`]: null });
                    ok('Class deleted'); reload();
                } catch (err) { fail(err); }
            }
        });
    };

    /* ---------- content ---------- */
    VIEWS.news = contentView({
        node: 'blogPosts', title: 'News — Rehab updates', singular: 'post',
        intro: 'Write in plain text (**bold**, *italic*, blank line for a new paragraph, links are detected) or paste simple HTML.',
        head: ['Title', 'Category', 'Date', 'Visible'],
        sort: (a, b) => RV.ts(b.timestamp) - RV.ts(a.timestamp),
        columns: p => [`<strong>${esc(p.title)}</strong>`, esc(p.category || ''), esc(RV.date(p.timestamp)), p.published === false ? '<span class="badge">draft</span>' : '<span class="badge badge-success">published</span>'],
        fields: [
            { k: 'title', label: 'Title', required: true, full: true },
            { k: 'category', label: 'Category', placeholder: 'Research, Policy, Guides, Events…' },
            { k: 'author', label: 'Author', def: 'RehabVerve Team' },
            { k: 'timestamp', label: 'Publish date', type: 'datetime', hint: 'Leave empty for now' },
            { k: 'published', label: 'Published (untick to keep as a draft)', type: 'checkbox', def: true },
            { k: 'img', label: 'Cover image', type: 'image', full: true },
            { k: 'description', label: 'Short summary', type: 'textarea', rows: 2, full: true },
            { k: 'content', label: 'Article', type: 'textarea', rows: 14, full: true }
        ],
        prepare: v => ({ ...v, timestamp: v.timestamp || Date.now() })
    });

    VIEWS.announcements = contentView({
        node: 'announcements', title: 'Announcements', singular: 'announcement',
        intro: 'A bar across the top of every page. The highest-priority live announcement is shown; visitors can dismiss it.',
        head: ['Text', 'Type', 'Window', 'Live'],
        columns: a => [esc(a.text), esc(a.type || 'info'), esc([RV.dateTime(a.startAt), RV.dateTime(a.endAt)].filter(Boolean).join(' → ') || 'Always'), a.active === false ? '<span class="badge">off</span>' : '<span class="badge badge-success">on</span>'],
        fields: [
            { k: 'text', label: 'Message', required: true, full: true },
            { k: 'link', label: 'Link (optional)', type: 'url', placeholder: '#/teletherapy or https://…' },
            { k: 'linkText', label: 'Link text', placeholder: 'Learn more' },
            { k: 'type', label: 'Style', type: 'select', options: ['info', 'success', 'warning'], def: 'info' },
            { k: 'priority', label: 'Priority (higher shows first)', type: 'number', def: 0 },
            { k: 'startAt', label: 'Show from', type: 'datetime' },
            { k: 'endAt', label: 'Show until', type: 'datetime' },
            { k: 'active', label: 'Active', type: 'checkbox', def: true }
        ]
    });

    VIEWS.spotlight = contentView({
        node: 'slider', title: 'Spotlight slides', singular: 'slide',
        intro: 'Large slides on the home page.',
        head: ['', 'Title', 'Link', 'Order', 'Live'],
        sort: (a, b) => (Number(a.pos) || 0) - (Number(b.pos) || 0),
        columns: s => [`<img class="thumb" src="${esc(RV.img(s.imageUrl || s.image, 'assets/img/center.jpg'))}" alt="">`, esc(s.title || ''), esc(s.link || ''), esc(s.pos == null ? '' : s.pos), s.active === false ? '<span class="badge">off</span>' : '<span class="badge badge-success">on</span>'],
        fields: [
            { k: 'imageUrl', label: 'Image (wide, about 2100×800)', type: 'image', required: true, full: true },
            { k: 'title', label: 'Title' },
            { k: 'link', label: 'Link', type: 'url' },
            { k: 'description', label: 'Caption', full: true },
            { k: 'pos', label: 'Order', type: 'number' },
            { k: 'active', label: 'Active', type: 'checkbox', def: true }
        ]
    });

    VIEWS.ads = async () => {
        const stats = await get('adStats').catch(() => ({})) || {};
        return contentView({
            node: 'ads', title: 'Ads (sponsored notices)', singular: 'ad',
            intro: 'House ads shown in marked slots on the home page, directories, profiles, articles and classes. No third-party ad networks.',
            head: ['', 'Ad', 'Placement', 'Window', 'Clicks', 'Live'],
            columns: a => [a.img ? `<img class="thumb" src="${esc(RV.img(a.img, ''))}" alt="">` : '', `<strong>${esc(a.title)}</strong><br><small class="muted">${esc(a.advertiser || '')}</small>`, esc(a.placement || 'all'),
                esc([RV.date(a.startAt), RV.date(a.endAt)].filter(Boolean).join(' → ') || 'Always'), String((stats[a.id] && stats[a.id].clicks) || 0), a.active === false ? '<span class="badge">off</span>' : '<span class="badge badge-success">on</span>'],
            fields: [
                { k: 'title', label: 'Headline', required: true, full: true },
                { k: 'body', label: 'Text', type: 'textarea', rows: 2, full: true },
                { k: 'advertiser', label: 'Advertiser' },
                { k: 'link', label: 'Link', type: 'url' },
                { k: 'placement', label: 'Where', type: 'select', options: ['all', 'home', 'directory', 'profile', 'article', 'classes'], def: 'all' },
                { k: 'img', label: 'Image', type: 'image' },
                { k: 'startAt', label: 'Start', type: 'datetime' },
                { k: 'endAt', label: 'End', type: 'datetime' },
                { k: 'active', label: 'Active', type: 'checkbox', def: true }
            ]
        })();
    };

    /* ---------- site settings ---------- */
    VIEWS.settings = async () => {
        const cfg = { ...D.DEFAULT_CONFIG, ...((await get('siteConfig')) || {}) };
        const plans = Array.isArray(cfg.plans) && cfg.plans.length ? cfg.plans : D.DEFAULT_CONFIG.plans;
        const planHTML = (p, i) => `
            <fieldset class="card card-pad mt-2" data-plan="${i}" style="border:1px solid var(--border)">
                <div class="row-between"><strong>Plan ${i + 1}</strong><button type="button" class="btn btn-sm btn-ghost" data-remove-plan>Remove</button></div>
                <div class="form-grid mt-1">
                    <label class="field"><span>Name</span><input name="p-name" value="${esc(p.name || '')}"></label>
                    <label class="field"><span>Price</span><input name="p-price" type="number" min="0" value="${esc(p.price || '')}"></label>
                    <label class="field"><span>Currency</span><select name="p-currency">${RV.optionList(Object.keys(D.CURRENCIES), p.currency || 'NGN')}</select></label>
                    <label class="field"><span>Per</span><select name="p-unit">${RV.optionList(Object.keys(D.PRICE_UNITS), p.unit || 'session')}</select></label>
                    <label class="field full"><span>Note</span><input name="p-note" value="${esc(p.note || '')}"></label>
                    <label class="field full"><span>Features (one per line)</span><textarea name="p-features" rows="3">${esc((p.features || []).join('\n'))}</textarea></label>
                    <label class="check"><input type="checkbox" name="p-featured" ${p.featured ? 'checked' : ''}> Highlight as best value</label>
                </div>
            </fieldset>`;
        main.innerHTML = `
            <h2>Site settings</h2>
            <form class="card card-pad" id="cfg" novalidate>
                <h3>Contact</h3>
                <div class="form-grid">
                    <label class="field"><span>WhatsApp number (with country code)</span><input name="whatsapp" value="${esc(cfg.whatsapp || '')}"></label>
                    <label class="field"><span>Phone (as displayed)</span><input name="phone" value="${esc(cfg.phone || '')}"></label>
                    <label class="field"><span>Email</span><input name="email" type="email" value="${esc(cfg.email || '')}"></label>
                    <label class="field"><span>Address</span><input name="address" value="${esc(cfg.address || '')}"></label>
                    ${['facebook', 'instagram', 'x', 'linkedin'].map(k => `<label class="field"><span>${k === 'x' ? 'X / Twitter' : k[0].toUpperCase() + k.slice(1)} link</span><input name="s-${k}" value="${esc((cfg.social || {})[k] || '')}" placeholder="https://…"></label>`).join('')}
                </div>
                <h3 class="mt-3">Teletherapy plans</h3>
                <div id="plans">${plans.map(planHTML).join('')}</div>
                <button type="button" class="btn btn-sm mt-2" id="add-plan"><i class='bx bx-plus'></i> Add plan</button>
                <div class="form-actions"><button class="btn btn-primary" type="submit">Save settings</button></div>
            </form>`;
        const form = $('#cfg');
        $('#add-plan').onclick = () => $('#plans').insertAdjacentHTML('beforeend', planHTML({}, $$('#plans [data-plan]').length));
        $('#plans').addEventListener('click', e => { if (e.target.closest('[data-remove-plan]')) e.target.closest('[data-plan]').remove(); });
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const v = RV.formValues(form);
            const social = {};
            for (const k of ['facebook', 'instagram', 'x', 'linkedin']) {
                const u = (form.elements['s-' + k].value || '').trim();
                if (u && !/^https:\/\//i.test(u)) { RV.toast('Social links must start with https://', 'error'); return; }
                social[k] = u;
            }
            const newPlans = $$('#plans [data-plan]').map((fs, i) => {
                const q = n => fs.querySelector(`[name="${n}"]`);
                return { id: 'plan' + (i + 1), name: q('p-name').value.trim(), price: Number(q('p-price').value) || 0, currency: q('p-currency').value, unit: q('p-unit').value,
                    note: q('p-note').value.trim(), features: q('p-features').value.split('\n').map(x => x.trim()).filter(Boolean), featured: q('p-featured').checked };
            }).filter(p => p.name);
            try {
                await db.ref('siteConfig').set({ whatsapp: RV.digits(v.whatsapp), phone: v.phone, email: v.email, address: v.address, social, plans: newPlans, updatedAt: fb.TIMESTAMP });
                try { sessionStorage.removeItem('rv-config'); } catch (err) { /* ignore */ }
                ok('Settings saved');
            } catch (err) { fail(err); }
        });
    };

    /* ---------- maintenance ---------- */
    VIEWS.maintenance = async () => {
        const [apps, visits, tokens, pros, centers] = await Promise.all([get('applications'), get('visits').catch(() => null), get('tokens').catch(() => 'locked'), list('professionals'), list('centers')]);
        const withPw = Object.entries(apps || {}).filter(([, a]) => a && Object.keys(a).some(k => /password/i.test(k)));
        const visitCount = visits ? Object.keys(visits).length : 0;
        const unverified = pros.filter(p => p.verified === undefined).length + centers.filter(c => c.verified === undefined).length;
        const card = (title, text, btn, attr, danger) => `<div class="card card-pad row-between"><div style="max-width:620px"><h3 class="mb-0">${title}</h3><p class="muted mb-0">${text}</p></div><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" ${attr}>${btn}</button></div>`;
        main.innerHTML = `
            <h2>Maintenance</h2>
            <p class="muted">One-time clean-up tasks after the security upgrade.</p>
            ${card('Remove stored passwords', `The old registration form saved passwords inside applications. <strong>${withPw.length}</strong> application(s) still contain one. Remove them, then ask those people to reset their passwords.`, 'Remove passwords', 'data-task="pw"' + (withPw.length ? '' : ' disabled'), true)}
            ${card('Delete old visit logs', `The old tracker stored visitors’ email addresses on every page view (<strong>${visitCount}</strong> records). Page views are now counted anonymously.`, 'Delete visit logs', 'data-task="visits"' + (visitCount ? '' : ' disabled'), true)}
            ${card('Delete the old AI key record', 'The AI key used to be readable by anyone in <code>tokens</code>. Revoke that key with your AI provider first, then delete the record. The new key lives in a Cloud Functions secret.', 'Delete tokens', 'data-task="tokens"', true)}
            ${card('Verify existing listings', `<strong>${unverified}</strong> listing(s) were published before verification badges existed. Mark them all verified only if you reviewed them when you added them; otherwise verify them one by one.`, 'Mark all verified', 'data-task="verify"' + (unverified ? '' : ' disabled'))}
            ${card('Refresh my admin access', 'If image uploads say you do not have permission, refresh your sign-in so it includes admin rights.', 'Refresh', 'data-task="claim"')}`;
        main.addEventListener('click', async e => {
            const b = e.target.closest('[data-task]');
            if (!b) return;
            const task = b.dataset.task;
            try {
                if (task === 'pw' && await RV.confirm(`Remove passwords from ${withPw.length} application(s)?`, { ok: 'Remove', danger: true })) {
                    const updates = {};
                    withPw.forEach(([k, a]) => Object.keys(a).filter(x => /password/i.test(x)).forEach(x => { updates[`applications/${k}/${x}`] = null; }));
                    await db.ref().update(updates);
                    ok('Passwords removed');
                } else if (task === 'visits' && await RV.confirm('Delete all old visit logs?', { ok: 'Delete', danger: true })) {
                    await db.ref('visits').remove(); ok('Visit logs deleted');
                } else if (task === 'tokens' && await RV.confirm('Have you revoked the old key? Delete the tokens record?', { ok: 'Delete', danger: true })) {
                    await db.ref('tokens').remove(); ok('Tokens deleted');
                } else if (task === 'verify' && await RV.confirm(`Mark ${unverified} existing listing(s) as verified?`, { ok: 'Verify all' })) {
                    const updates = {};
                    pros.filter(p => p.verified === undefined).forEach(p => { updates[`professionals/${p.id}/verified`] = true; });
                    centers.filter(c => c.verified === undefined).forEach(c => { updates[`centers/${c.id}/verified`] = true; });
                    await db.ref().update(updates); ok('Listings verified');
                } else if (task === 'claim') {
                    const t = await fb.auth.currentUser.getIdTokenResult(true);
                    RV.toast(t.claims.admin ? 'Admin access is active for uploads.' : 'Not active yet — make sure the syncAdminClaim function is deployed, then try again.', t.claims.admin ? 'success' : 'error', 6000);
                    return;
                } else return;
                reload();
            } catch (err) { fail(err); }
        });
    };
})();
