// Security tests for database.rules.json and storage.rules.
// Run with:  npm test   (starts the Firebase emulators and runs these with node --test)
'use strict';

const fs = require('fs');
const path = require('path');
const { test, before, after, beforeEach } = require('node:test');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');

const ROOT = path.join(__dirname, '..');
let env;
const TS = { '.sv': 'timestamp' };

before(async () => {
    env = await initializeTestEnvironment({
        projectId: 'demo-rehabverve',
        database: { host: '127.0.0.1', port: 9000, rules: fs.readFileSync(path.join(ROOT, 'database.rules.json'), 'utf8') },
        storage: { host: '127.0.0.1', port: 9199, rules: fs.readFileSync(path.join(ROOT, 'storage.rules'), 'utf8') }
    });
});
after(() => env && env.cleanup());

beforeEach(async () => {
    await env.clearDatabase();
    await env.withSecurityRulesDisabled(async ctx => {
        await ctx.database().ref().set({
            admins: { boss: true },
            blocked: { banned: true },
            userdata: { alice: { name: 'Alice', email: 'a@x.com', role: 'regular' }, pro: { name: 'Pro', role: 'practitioner' } },
            professionals: { pro: { name: 'Pro', userID: 'pro', verified: true, priceMin: 1000 } },
            centers: { c1: { centerName: 'Hope', userId: 'centerOwner' } },
            classes: { k1: { title: 'Reading', tutorId: 'tutor', status: 'open' }, k2: { title: 'Closed', tutorId: 'tutor', status: 'closed' } },
            classPrivate: { k1: { meetingLink: 'https://meet.example.com/x' } },
            enrollments: { k1: { student: { childName: 'Tobi', status: 'active', createdAt: 1 } } },
            assignments: { k1: { a1: { title: 'Read', createdAt: 1 } } },
            bookings: { b1: { userId: 'alice', proId: 'pro', type: 'teletherapy', status: 'new', createdAt: 1 } },
            tokens: { openAI: { openai_token: 'secret' }, deepseek: { api_key: 'sk-secret' } },
            ads: { ad1: { title: 'Ad' } }
        });
    });
});

const as = uid => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).database();

test('the old AI key and other people’s data are not readable', async () => {
    await assertFails(as(null).ref('tokens').once('value'));
    await assertFails(as('alice').ref('tokens').once('value'));
    // The DeepSeek key: not even admins can read it from a browser; only Cloud Functions use it
    await assertFails(as(null).ref('tokens/deepseek/api_key').once('value'));
    await assertFails(as('boss').ref('tokens/deepseek').once('value'));
    await assertFails(as('alice').ref('tokens/deepseek/api_key').set('sk-attacker'));
    // AI usage counters are written only by Cloud Functions
    await assertFails(as('alice').ref('aiChat/2026-01-01/v_x').set(0));
    await assertFails(as(null).ref('aiNewsroom').once('value'));
    await assertFails(as('alice').ref('userdata').once('value'));
    await assertFails(as('alice').ref('userdata/pro').once('value'));
    await assertSucceeds(as('alice').ref('userdata/alice').once('value'));
    await assertSucceeds(as('boss').ref('userdata').once('value'));
});

test('nobody can make themselves an admin or edit roles beyond the allowed list', async () => {
    await assertFails(as('alice').ref('admins/alice').set(true));
    await assertFails(as('alice').ref('userdata/alice/role').set('admin'));
    await assertSucceeds(as('alice').ref('userdata/alice/role').set('practitioner'));
    await assertSucceeds(as('boss').ref('admins/alice').set(true));
});

test('applications never store passwords and cannot be self-approved', async () => {
    const app = { role: 'practitioner', userId: 'alice', status: 'pending', timestamp: TS };
    await assertFails(as('alice').ref('applications/alice').set({ ...app, 'prof-password': 'hunter2' }));
    await assertFails(as('alice').ref('applications/alice').set({ ...app, password: 'hunter2' }));
    await assertFails(as('alice').ref('applications/alice').set({ ...app, status: 'approved' }));
    await assertFails(as('alice').ref('applications/bob').set({ ...app, userId: 'bob' }));
    await assertSucceeds(as('alice').ref('applications/alice').set(app));
    await assertFails(as('banned').ref('applications/banned').set({ ...app, userId: 'banned' }));
});

test('listing owners edit their own details but not verification, ranking or ratings', async () => {
    const db = as('pro');
    await assertSucceeds(db.ref('professionals/pro').update({ priceMax: 5000, 'coverage/areas': 'Ikeja', 'serviceModes/home': true }));
    await assertFails(db.ref('professionals/pro/verified').set(false));
    await assertFails(db.ref('professionals/pro/featured').set(true));
    await assertFails(db.ref('professionals/pro/rating').set(5));
    await assertFails(db.ref('professionals/pro/category').set('doctor'));
    await assertFails(db.ref('professionals/pro/img').set('javascript:alert(1)'));
    await assertFails(db.ref('professionals/pro/serviceModes/teleport').set(true));
    await assertFails(as('alice').ref('professionals/pro/name').set('Hacked'));
    await assertFails(as('alice').ref('professionals/alice').set({ name: 'Self-listed' }));
    await assertSucceeds(as('centerOwner').ref('centers/c1/priceMin').set(2000));
    await assertFails(as('alice').ref('centers/c1/priceMin').set(2000));
    await assertSucceeds(as('boss').ref('professionals/pro/verified').set(false));
});

test('bookings are private to the client, the professional and admins', async () => {
    const booking = { userId: 'alice', type: 'home-visit', status: 'new', createdAt: TS, name: 'Alice', phone: '0801' };
    await assertSucceeds(as('alice').ref('bookings').push(booking));
    await assertFails(as('alice').ref('bookings').push({ ...booking, userId: 'bob' }));
    await assertFails(as('alice').ref('bookings').push({ ...booking, status: 'confirmed' }));
    await assertFails(as(null).ref('bookings').push(booking));
    await assertFails(as('banned').ref('bookings').push({ ...booking, userId: 'banned' }));

    await assertFails(as('alice').ref('bookings').once('value'));
    await assertSucceeds(as('alice').ref('bookings').orderByChild('userId').equalTo('alice').once('value'));
    await assertFails(as('alice').ref('bookings').orderByChild('userId').equalTo('bob').once('value'));
    await assertSucceeds(as('pro').ref('bookings').orderByChild('proId').equalTo('pro').once('value'));
    await assertFails(as('bob').ref('bookings/b1').once('value'));

    await assertSucceeds(as('alice').ref('bookings/b1').update({ status: 'cancelled', updatedAt: Date.now() }));
    await assertFails(as('alice').ref('bookings/b1/status').set('completed'));
    await assertFails(as('alice').ref('bookings/b1/adminNote').set('x'));
    await assertSucceeds(as('pro').ref('bookings/b1/status').set('confirmed'));
    await assertSucceeds(as('boss').ref('bookings/b1/adminNote').set('Called client'));
});

test('reviews: one per person, not on your own profile, stars 1–5', async () => {
    const review = { stars: 4, comment: 'Good', name: 'Alice', createdAt: TS };
    await assertSucceeds(as('alice').ref('ratings/pro/alice').set(review));
    await assertFails(as('alice').ref('ratings/pro/bob').set(review));
    await assertFails(as('pro').ref('ratings/pro/pro').set(review));
    await assertFails(as('alice').ref('ratings/pro/alice').set({ ...review, stars: 9 }));
    await assertFails(as('alice').ref('ratings/nobody/alice').set(review));
});

test('classes: enrolment, private link, assignments and grading', async () => {
    const enrol = { childName: 'Ada', childAge: '6', status: 'pending', createdAt: TS };
    await assertSucceeds(as('alice').ref('enrollments/k1/alice').set(enrol));
    await assertFails(as('alice').ref('enrollments/k1/alice/status').set('active'));
    await assertFails(as('alice').ref('enrollments/k2/alice').set(enrol)); // class closed
    await assertFails(as('alice').ref('enrollments/k1/bob').set(enrol));
    await assertFails(as('alice').ref('classPrivate/k1').once('value')); // pending, not active
    await assertSucceeds(as('student').ref('classPrivate/k1').once('value'));
    await assertSucceeds(as('tutor').ref('enrollments/k1/alice/status').set('active'));
    await assertSucceeds(as('tutor').ref('assignments/k1').push({ title: 'Homework', createdAt: TS }));
    await assertFails(as('alice').ref('assignments/k1').push({ title: 'Fake', createdAt: TS }));

    const sub = as('student').ref('submissions/k1/a1/student');
    await assertSucceeds(sub.update({ text: 'My answer', submittedAt: TS }));
    await assertFails(sub.update({ grade: 'A+' }));
    await assertFails(as('student').ref('submissions/k1/a1/other').update({ text: 'x', submittedAt: TS }));
    await assertSucceeds(as('tutor').ref('submissions/k1/a1/student').update({ grade: 'A', feedback: 'Well done', gradedAt: TS }));
    await assertFails(as('student').ref('submissions/k1/a1').once('value'));
});

test('public content is read-only for everyone but admins', async () => {
    for (const node of ['blogPosts', 'slider', 'announcements', 'ads', 'siteConfig', 'classes']) {
        await assertSucceeds(as(null).ref(node).once('value'));
        await assertFails(as('alice').ref(`${node}/x`).set({ title: 'spam' }));
    }
    await assertSucceeds(as('boss').ref('announcements/a1').set({ text: 'Hello', active: true }));
});

test('anonymous counters can only go up by one', async () => {
    const day = '2026-10-23';
    await assertSucceeds(as(null).ref(`analytics/daily/${day}/views`).set(1));
    await assertFails(as(null).ref(`analytics/daily/${day}/views`).set(500));
    await assertFails(as(null).ref('analytics/daily/not-a-date/views').set(1));
    await assertFails(as(null).ref('analytics').once('value'));
    await assertSucceeds(as(null).ref('adStats/ad1/clicks').set(1));
    await assertFails(as(null).ref('adStats/ghost/clicks').set(1));
    await assertSucceeds(as('alice').ref('profileViews/pro').set(1));
    await assertFails(as('pro').ref('profileViews/pro').set(1));
    await assertFails(as(null).ref('visits').push({ userEmail: 'x@y.com' }));
});

test('storage: private documents stay private, public images are images only', async () => {
    const st = uid => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).storage();
    const png = new Uint8Array([137, 80, 78, 71]);
    await assertSucceeds(st('alice').ref('profile-images/alice/me.png').put(png, { contentType: 'image/png' }));
    await assertFails(st('alice').ref('profile-images/bob/me.png').put(png, { contentType: 'image/png' }));
    await assertFails(st('alice').ref('profile-images/alice/x.html').put(png, { contentType: 'text/html' }));
    await assertSucceeds(st('alice').ref('applications/alice/licence.pdf').put(png, { contentType: 'application/pdf' }));
    await assertFails(st('bob').ref('applications/alice/licence.pdf').getMetadata());
    await assertFails(st('alice').ref('media/banner.png').put(png, { contentType: 'image/png' }));
    const admin = env.authenticatedContext('boss', { admin: true }).storage();
    await assertSucceeds(admin.ref('media/banner.png').put(png, { contentType: 'image/png' }));
});
