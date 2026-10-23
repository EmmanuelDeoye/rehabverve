// classroom.js — one class: details and enrolment for parents; meeting link, assignments
// and submissions for enrolled students; roster, assignments and grading for the tutor.
(function () {
    'use strict';
    const { $, esc, data: D } = RV;
    const fb = RV.fb;
    const head = $('#class-head');
    const body = $('#class-body');
    const id = RV.params.get('id');
    let klass = null;

    const notFound = () => { head.innerHTML = RV.empty('This class could not be found. <a href="classes.html">See all classes</a>', 'bx-book-open'); body.innerHTML = ''; };
    if (!id || !fb || !/^[\w-]+$/.test(id)) { notFound(); return; }

    RV.onAuth(s => load(s).catch(err => { console.error(err); notFound(); }));

    async function load(s) {
        const snap = await fb.db.ref('classes/' + id).once('value');
        klass = snap.val();
        if (!klass) { notFound(); return; }
        const uid = s.user && s.user.uid;
        const tutor = !!uid && klass.tutorId === uid;
        const staff = tutor || s.isAdmin;
        const enrollment = uid ? (await fb.db.ref(`enrollments/${id}/${uid}`).once('value').catch(() => null))?.val() : null;
        const active = enrollment && enrollment.status === 'active';
        document.title = `${klass.title || 'Class'} — RehabVerve`;

        const price = RV.money(klass.price, klass.currency || 'NGN');
        head.innerHTML = `
            <a class="btn btn-sm btn-ghost" href="classes.html"><i class='bx bx-arrow-back'></i> All classes</a>
            <span class="eyebrow" style="display:block;margin-top:12px">${esc(klass.subject || 'Class')}</span>
            <h1>${esc(klass.title || 'Class')}</h1>
            <div class="row muted">
                <span><i class='bx bx-child'></i> ${esc(klass.ageGroup || 'All ages')}</span>
                ${klass.schedule ? `<span><i class='bx bx-time-five'></i> ${esc(klass.schedule)}</span>` : ''}
                ${klass.tutorName ? `<span><i class='bx bx-chalkboard'></i> ${klass.tutorId ? `<a href="users.html?id=${encodeURIComponent(klass.tutorId)}">${esc(klass.tutorName)}</a>` : esc(klass.tutorName)}</span>` : ''}
                <span class="price">${price ? `${esc(price)}${klass.priceUnit ? ' / ' + esc(D.PRICE_UNITS[klass.priceUnit] || klass.priceUnit) : ''}` : 'Free'}</span>
            </div>`;

        const side = `
            <div class="stack">
                <div class="card card-pad"><h3>About this class</h3><div class="prose" style="font-size:1rem">${RV.formatText(klass.description) || '<p class="muted">Details coming soon.</p>'}</div>
                <dl class="dl">
                    ${klass.startDate ? `<dt>Starts</dt><dd>${esc(RV.date(klass.startDate))}</dd>` : ''}
                    ${klass.durationWeeks ? `<dt>Length</dt><dd>${esc(klass.durationWeeks)} weeks</dd>` : ''}
                    ${klass.capacity ? `<dt>Class size</dt><dd>Up to ${esc(klass.capacity)} children</dd>` : ''}
                    <dt>Where</dt><dd>Live online — the joining link appears here once enrolled</dd>
                </dl></div>
                <div class="ad-slot" data-ad-slot="classes"></div>
            </div>`;

        let main = '';
        if (staff) main = '<div class="stack" id="staff"></div>';
        else if (active) main = '<div class="stack" id="student"></div>';
        else main = `<div class="card card-pad" id="enrol">${enrolHTML(s, enrollment)}</div>`;
        body.innerHTML = main + side;
        RV.renderAds();

        if (staff) renderStaff(s);
        else if (active) renderStudent(s, enrollment);
        else wireEnrol(s, enrollment);
    }

    /* ---------------- parents: enrol ---------------- */
    function enrolHTML(s, e) {
        if (e && e.status === 'pending') {
            return `<h3>Enrolment requested</h3><div class="notice"><i class='bx bx-time-five'></i><span>We received your request for <strong>${esc(e.childName)}</strong>. The tutor will confirm shortly — you will see the joining link and assignments here.</span></div>
                <div class="form-actions"><button type="button" class="btn btn-danger" data-withdraw>Withdraw request</button></div>`;
        }
        if (e && e.status === 'rejected') {
            return `<h3>Enrolment not confirmed</h3><p class="muted">The tutor could not confirm this place. Please choose another class or <a href="classes.html">request a private tutor</a>.</p>`;
        }
        if (klass.status !== 'open') return `<h3>Enrolment is closed</h3><p class="muted mb-0">This class is not taking new students right now. <a href="classes.html">See open classes</a>.</p>`;
        const p = s.profile || {};
        return `
            <h3>Enrol your child</h3>
            <form id="enrol-form" class="form-grid" novalidate>
                <label class="field"><span>Child’s name *</span><input name="childName" maxlength="120"></label>
                <label class="field"><span>Child’s age *</span><input name="childAge" type="number" min="1" max="21"></label>
                <label class="field"><span>Parent / guardian name *</span><input name="parentName" maxlength="120" value="${esc(p.name || '')}"></label>
                <label class="field"><span>Phone / WhatsApp *</span><input name="phone" type="tel" maxlength="40" value="${esc(p.phone || '')}"></label>
                <label class="field"><span>Country</span><select name="country">${RV.optionList(D.COUNTRIES, 'Nigeria')}</select></label>
                <label class="field full"><span>Anything the tutor should know? <em>(learning needs, goals)</em></span><textarea name="notes" rows="3" maxlength="1000"></textarea></label>
                <label class="check full"><input type="checkbox" name="consent"> I am this child’s parent or guardian and I agree to the <a href="privacy.html" target="_blank">Privacy Policy</a>.</label>
                <div class="form-msg error full" hidden></div>
                <div class="form-actions full"><button type="submit" class="btn btn-primary">Request a place</button></div>
            </form>`;
    }

    function wireEnrol(s, e) {
        const withdraw = $('[data-withdraw]');
        if (withdraw) withdraw.addEventListener('click', async () => {
            if (!(await RV.confirm('Withdraw this enrolment request?', { ok: 'Withdraw', danger: true }))) return;
            await fb.db.ref().update({ [`enrollments/${id}/${s.user.uid}`]: null, [`userEnrollments/${s.user.uid}/${id}`]: null });
            RV.toast('Request withdrawn');
            load(RV.state);
        });
        const form = $('#enrol-form');
        if (!form) return;
        form.addEventListener('submit', async ev => {
            ev.preventDefault();
            const msg = form.querySelector('.form-msg');
            const v = RV.formValues(form);
            const fail = t => { msg.textContent = t; msg.hidden = false; };
            if (!v.childName || !v.childAge || !v.parentName) return fail('Please fill in the child’s name, age and your name.');
            if (RV.digits(v.phone).length < 7) return fail('Please enter a phone number.');
            if (!v.consent) return fail('Please confirm you are the parent or guardian.');
            try { await RV.requireAuth('Sign in or create a free parent account to enrol your child.'); } catch (err) { return fail('Please sign in to enrol.'); }
            const btn = form.querySelector('[type=submit]');
            RV.busy(btn, true, 'Sending…');
            const uid = RV.state.user.uid;
            try {
                await fb.db.ref(`enrollments/${id}/${uid}`).set({
                    childName: v.childName, childAge: String(v.childAge), parentName: v.parentName, phone: v.phone,
                    country: v.country || '', notes: v.notes || '', status: 'pending', createdAt: fb.TIMESTAMP
                });
                await fb.db.ref(`userEnrollments/${uid}/${id}`).set({ title: String(klass.title || 'Class').slice(0, 200), createdAt: fb.TIMESTAMP });
                RV.toast('Enrolment requested — the tutor will confirm soon.', 'success');
                load(RV.state);
            } catch (err) {
                RV.busy(btn, false);
                fail(RV.errorMessage(err));
            }
        });
    }

    /* ---------------- students: classroom ---------------- */
    async function renderStudent(s, enrollment) {
        const host = $('#student');
        const uid = s.user.uid;
        const [priv, asg] = await Promise.all([
            fb.db.ref('classPrivate/' + id).once('value').then(x => x.val() || {}).catch(() => ({})),
            fb.db.ref('assignments/' + id).once('value').then(x => RV.list(x.val())).catch(() => [])
        ]);
        const subs = await Promise.all(asg.map(a => fb.db.ref(`submissions/${id}/${a.id}/${uid}`).once('value').then(x => x.val()).catch(() => null)));
        const link = RV.safeUrl(priv.meetingLink);
        asg.sort((a, b) => RV.ts(b.createdAt) - RV.ts(a.createdAt));
        host.innerHTML = `
            <div class="card card-pad row-between">
                <div><h3 class="mb-0">${esc(enrollment.childName)} is enrolled</h3><p class="muted mb-0">${esc(klass.schedule || '')}</p></div>
                ${link ? `<a class="btn btn-primary" href="${esc(link)}" target="_blank" rel="noopener"><i class='bx bx-video'></i> Join class</a>` : '<span class="muted">The tutor will share the joining link here.</span>'}
            </div>
            <div class="card card-pad">
                <h3>Assignments</h3>
                ${asg.length ? asg.map((a, i) => {
                    const sub = subs[i];
                    const file = sub && RV.safeUrl(sub.fileUrl);
                    return `
                    <div class="review" data-aid="${esc(a.id)}">
                        <div class="row-between"><strong>${esc(a.title)}</strong>${a.dueAt ? `<span class="badge">Due ${esc(RV.date(a.dueAt))}</span>` : ''}</div>
                        <div class="prose" style="font-size:.96rem">${RV.formatText(a.instructions)}</div>
                        ${sub && sub.grade ? `<div class="notice"><i class='bx bx-award'></i><span><strong>Grade: ${esc(sub.grade)}</strong>${sub.feedback ? ` — ${esc(sub.feedback)}` : ''}</span></div>` : ''}
                        ${sub && sub.submittedAt ? `<p class="hint">Handed in ${esc(RV.dateTime(sub.submittedAt))}${file ? ` · <a href="${esc(file)}" target="_blank" rel="noopener">${esc(sub.fileName || 'file')}</a>` : ''}</p>` : ''}
                        <form class="stack" data-submit>
                            <textarea class="input" name="text" rows="3" maxlength="10000" placeholder="Answer or note for the tutor">${esc(sub ? sub.text || '' : '')}</textarea>
                            <div class="row"><input type="file" name="file" accept="application/pdf,image/jpeg,image/png,image/webp,.doc,.docx"><button class="btn btn-primary btn-sm" type="submit">${sub ? 'Update' : 'Hand in'}</button></div>
                        </form>
                    </div>`;
                }).join('') : '<p class="muted mb-0">No assignments yet.</p>'}
            </div>`;
        host.querySelectorAll('[data-submit]').forEach(form => form.addEventListener('submit', async e => {
            e.preventDefault();
            const aid = form.closest('[data-aid]').dataset.aid;
            const file = form.file.files[0];
            const bad = RV.checkFile(file, { maxMb: 10, types: /^(application\/pdf|image\/(jpeg|png|webp)|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/ });
            if (bad) { RV.toast(bad, 'error'); return; }
            if (!form.text.value.trim() && !file) { RV.toast('Write an answer or attach a file.', 'error'); return; }
            const btn = form.querySelector('[type=submit]');
            RV.busy(btn, true, 'Sending…');
            try {
                const update = { text: form.text.value.trim(), submittedAt: fb.TIMESTAMP, studentName: String(enrollment.childName || '').slice(0, 120) };
                if (file) {
                    update.fileUrl = await RV.upload(`submissions/${id}/${uid}/${RV.fileName(file)}`, file);
                    update.fileName = file.name.slice(0, 200);
                }
                await fb.db.ref(`submissions/${id}/${aid}/${uid}`).update(update);
                RV.toast('Handed in!', 'success');
                renderStudent(RV.state, enrollment);
            } catch (err) {
                RV.busy(btn, false);
                RV.toast(RV.errorMessage(err), 'error');
            }
        }));
    }

    /* ---------------- tutor & admin tools ---------------- */
    async function renderStaff(s) {
        const host = $('#staff');
        const [priv, roster, asg] = await Promise.all([
            fb.db.ref('classPrivate/' + id).once('value').then(x => x.val() || {}).catch(() => ({})),
            fb.db.ref('enrollments/' + id).once('value').then(x => RV.list(x.val())).catch(() => []),
            fb.db.ref('assignments/' + id).once('value').then(x => RV.list(x.val())).catch(() => [])
        ]);
        asg.sort((a, b) => RV.ts(b.createdAt) - RV.ts(a.createdAt));
        const activeCount = roster.filter(r => r.status === 'active').length;
        host.innerHTML = `
            <div class="card card-pad">
                <h3><i class='bx bx-video'></i> Joining link</h3>
                <form id="link-form" class="row" style="flex-wrap:nowrap"><input class="input" name="meetingLink" type="url" placeholder="https://meet.google.com/…" value="${esc(priv.meetingLink || '')}"><button class="btn btn-primary" type="submit">Save</button></form>
                <p class="hint mb-0">Only enrolled families, you and the admins can see this link.</p>
            </div>
            <div class="card card-pad">
                <h3><i class='bx bx-group'></i> Students (${activeCount} enrolled${klass.capacity ? ` of ${esc(klass.capacity)}` : ''})</h3>
                ${roster.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Child</th><th>Parent</th><th>Status</th><th></th></tr></thead><tbody>
                ${roster.map(r => `<tr data-uid="${esc(r.id)}"><td><strong>${esc(r.childName)}</strong><br><small class="muted">Age ${esc(r.childAge || '–')}${r.notes ? ' · ' + esc(r.notes) : ''}</small></td>
                    <td>${esc(r.parentName)}<br><small>${esc(r.phone)} ${esc(r.country || '')}</small></td>
                    <td>${RV.esc(r.status)}</td>
                    <td><div class="row">${r.status !== 'active' ? '<button class="btn btn-sm btn-primary" data-status="active">Accept</button>' : ''}${r.status !== 'rejected' ? '<button class="btn btn-sm" data-status="rejected">Decline</button>' : ''}
                    ${RV.digits(r.phone) ? `<a class="btn btn-sm btn-whatsapp btn-icon" href="${esc(RV.waLink(r.phone, `Hello ${r.parentName}, this is about ${klass.title} on RehabVerve.`))}" target="_blank" rel="noopener" aria-label="WhatsApp"><i class='bx bxl-whatsapp'></i></a>` : ''}</div></td></tr>`).join('')}
                </tbody></table></div>` : '<p class="muted mb-0">No enrolment requests yet.</p>'}
            </div>
            <div class="card card-pad">
                <h3><i class='bx bx-task'></i> Assignments</h3>
                <form id="asg-form" class="stack">
                    <input class="input" name="title" maxlength="200" placeholder="Assignment title" required>
                    <textarea class="input" name="instructions" rows="3" maxlength="6000" placeholder="Instructions"></textarea>
                    <div class="row"><label class="field"><span>Due date</span><input class="input" type="date" name="dueAt"></label><button class="btn btn-primary" type="submit" style="align-self:flex-end">Post assignment</button></div>
                </form>
                <div id="asg-list" class="mt-2">${asg.map(a => `
                    <div class="review" data-aid="${esc(a.id)}">
                        <div class="row-between"><strong>${esc(a.title)}</strong><div class="row">${a.dueAt ? `<span class="badge">Due ${esc(RV.date(a.dueAt))}</span>` : ''}<button class="btn btn-sm" data-subs>Submissions</button><button class="btn btn-sm btn-ghost" data-del aria-label="Delete assignment"><i class='bx bx-trash'></i></button></div></div>
                        <div class="subs"></div>
                    </div>`).join('') || '<p class="muted mb-0">No assignments yet.</p>'}</div>
            </div>`;

        $('#link-form').addEventListener('submit', async e => {
            e.preventDefault();
            const v = e.target.meetingLink.value.trim();
            if (v && !/^https:\/\//i.test(v)) { RV.toast('The link must start with https://', 'error'); return; }
            try { await fb.db.ref(`classPrivate/${id}/meetingLink`).set(v || null); RV.toast('Link saved', 'success'); }
            catch (err) { RV.toast(RV.errorMessage(err), 'error'); }
        });
        host.querySelectorAll('[data-status]').forEach(b => b.addEventListener('click', async () => {
            const uid = b.closest('[data-uid]').dataset.uid;
            try { await fb.db.ref(`enrollments/${id}/${uid}/status`).set(b.dataset.status); RV.toast('Updated', 'success'); renderStaff(s); }
            catch (err) { RV.toast(RV.errorMessage(err), 'error'); }
        }));
        $('#asg-form').addEventListener('submit', async e => {
            e.preventDefault();
            const v = RV.formValues(e.target);
            if (!v.title) return;
            try {
                await fb.db.ref('assignments/' + id).push({ title: v.title, instructions: v.instructions || '', dueAt: v.dueAt || '', createdAt: fb.TIMESTAMP, createdBy: s.user.uid });
                RV.toast('Assignment posted', 'success');
                renderStaff(s);
            } catch (err) { RV.toast(RV.errorMessage(err), 'error'); }
        });
        host.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
            const aid = b.closest('[data-aid]').dataset.aid;
            if (!(await RV.confirm('Delete this assignment and its submissions?', { ok: 'Delete', danger: true }))) return;
            await fb.db.ref().update({ [`assignments/${id}/${aid}`]: null, [`submissions/${id}/${aid}`]: null });
            renderStaff(s);
        }));
        host.querySelectorAll('[data-subs]').forEach(b => b.addEventListener('click', () => showSubmissions(b.closest('[data-aid]'))));
    }

    async function showSubmissions(row) {
        const aid = row.dataset.aid;
        const box = row.querySelector('.subs');
        const subs = RV.list((await fb.db.ref(`submissions/${id}/${aid}`).once('value')).val());
        box.innerHTML = subs.length ? subs.map(sub => {
            const file = RV.safeUrl(sub.fileUrl);
            return `<form class="card card-pad mt-1 stack" data-student="${esc(sub.id)}">
                <div class="row-between"><strong>${esc(sub.studentName || 'Student')}</strong><small class="muted">${esc(RV.dateTime(sub.submittedAt))}</small></div>
                ${sub.text ? `<p class="mb-0">${esc(sub.text)}</p>` : ''}
                ${file ? `<a href="${esc(file)}" target="_blank" rel="noopener"><i class='bx bx-paperclip'></i> ${esc(sub.fileName || 'Attachment')}</a>` : ''}
                <div class="row"><input class="input" name="grade" maxlength="40" placeholder="Grade" value="${esc(sub.grade || '')}" style="max-width:120px"><input class="input grow" name="feedback" maxlength="4000" placeholder="Feedback" value="${esc(sub.feedback || '')}" style="min-width:160px;flex:1"><button class="btn btn-sm btn-primary" type="submit">Save</button></div>
            </form>`;
        }).join('') : '<p class="muted">No submissions yet.</p>';
        box.querySelectorAll('[data-student]').forEach(f => f.addEventListener('submit', async e => {
            e.preventDefault();
            try {
                await fb.db.ref(`submissions/${id}/${aid}/${f.dataset.student}`).update({ grade: f.grade.value.trim(), feedback: f.feedback.value.trim(), gradedAt: fb.TIMESTAMP });
                RV.toast('Feedback saved', 'success');
            } catch (err) { RV.toast(RV.errorMessage(err), 'error'); }
        }));
    }
})();
