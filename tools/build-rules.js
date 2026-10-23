#!/usr/bin/env node
// Builds database.rules.json from readable helpers.
// Edit this file, then run:  node tools/build-rules.js
'use strict';

const fs = require('fs');
const path = require('path');

// ---------- building blocks ----------
const ADMIN = "(auth != null && root.child('admins/' + auth.uid).val() === true)";
const FREE = "(auth != null && !root.child('blocked/' + auth.uid).exists())";
const or = (...xs) => '(' + xs.join(' || ') + ')';
const and = (...xs) => '(' + xs.join(' && ') + ')';

const v = expr => ({ '.validate': expr });
const str = n => v(`newData.isString() && newData.val().length <= ${n}`);
const num = (max = 1000000000) => v(`newData.isNumber() && newData.val() >= 0 && newData.val() <= ${max}`);
const bool = v('newData.isBoolean()');
const url = v("newData.isString() && newData.val().length <= 2000 && newData.val().matches(/^(https:\\/\\/|assets\\/)/)");
const ts = v('newData.isNumber() && newData.val() <= now + 600000');
const oneOf = list => v(`newData.isString() && newData.val().matches(/^(${list.join('|')})$/)`);
const currency = v('newData.isString() && newData.val().matches(/^[A-Z]{3}$/)');
const numOrStr = n => v(`newData.isNumber() || (newData.isString() && newData.val().length <= ${n})`);
const closed = { $other: v('false') };
const plusOne = v('newData.isNumber() && newData.val() === (data.exists() ? data.val() : 0) + 1');

// Give every field in `fields` an extra .write condition (on top of what the parent grants).
const writable = (cond, fields) =>
    Object.fromEntries(Object.entries(fields).map(([k, rule]) => [k, { '.write': cond, ...rule }]));

const PRICE_UNITS = ['session', 'hour', 'visit', 'day', 'week', 'month', 'term', 'package'];

// Fields a listed professional may edit on their own public listing.
// verified / featured / pos / status / category / rating stay admin-only.
const professionalOwnerFields = {
    name: str(120), job: str(120), bio: str(4000), phone: str(40), whatsapp: str(40),
    email: str(200), img: url, website: url, location: str(200), city: str(100),
    state: str(100), country: str(100), education: str(600), experience: numOrStr(100),
    languages: str(200), availability: str(400), priceMin: num(), priceMax: num(),
    priceUnit: oneOf(PRICE_UNITS), currency, updatedAt: ts,
    coverage: { states: str(800), areas: str(800), countries: str(400), nationwide: bool, ...closed },
    serviceModes: { $mode: v("newData.isBoolean() && $mode.matches(/^(clinic|home|tele)$/)") },
    cv: { name: str(200), size: num(), type: str(120), url, uploadedAt: str(40), ...closed }
};

const centerOwnerFields = {
    centerName: str(160), centerType: str(120), address: str(400), city: str(100),
    state: str(100), country: str(100), description: str(4000), operatingHours: str(300),
    accreditations: str(600), phone: str(40), whatsapp: str(40), email: str(200),
    website: url, img: url, priceMin: num(), priceMax: num(), priceUnit: oneOf(PRICE_UNITS),
    currency, updatedAt: ts,
    coverage: { states: str(800), areas: str(800), countries: str(400), nationwide: bool, ...closed },
    serviceModes: { $mode: v("newData.isBoolean() && $mode.matches(/^(onsite|home|tele)$/)") }
};

const adminListingFields = {
    verified: bool, featured: bool, pos: num(1000000), status: oneOf(['active', 'suspended']),
    rating: v('newData.isNumber() || newData.isString()'), ratingCount: num(), category: str(120)
};

const PRO_OWNER = and("auth.uid === $uid", "root.child('professionals/' + $uid).exists()", FREE);
const CENTER_OWNER = and(
    "(auth.uid === $key || root.child('centers/' + $key + '/userId').val() === auth.uid)",
    "root.child('centers/' + $key).exists()", FREE);

const TUTOR = "root.child('classes/' + $classId + '/tutorId').val() === auth.uid";
const ENROLLED = "root.child('enrollments/' + $classId + '/' + auth.uid + '/status').val() === 'active'";
const BOOKING_PARTY = "(data.parent().child('userId').val() === auth.uid || data.parent().child('proId').val() === auth.uid)";

const publicContent = extra => ({ '.read': true, '.write': ADMIN, ...extra });

const rules = {
    rules: {
        '.read': false,
        '.write': false,

        // ---------- roles ----------
        admins: {
            '.read': ADMIN,
            $uid: { '.read': 'auth != null && auth.uid === $uid', '.write': ADMIN, ...v('newData.isBoolean()') }
        },
        blocked: {
            '.read': ADMIN,
            $uid: { '.read': 'auth != null && auth.uid === $uid', '.write': ADMIN }
        },

        // ---------- private account data ----------
        userdata: {
            '.read': ADMIN,
            '.indexOn': ['createdAt', 'email'],
            $uid: {
                '.read': or('(auth != null && auth.uid === $uid)', ADMIN),
                '.write': or(and('auth.uid === $uid', FREE), ADMIN),
                name: str(120), email: str(200), phone: str(40), img: url, location: str(200),
                createdAt: v('newData.isNumber()'),
                role: v(`newData.isString() && (newData.val() === data.val() || ${ADMIN} || newData.val().matches(/^(regular|practitioner|center|supplier|tutor)$/))`),
                status: v(`newData.val() === data.val() || newData.val() === 'pending' || ${ADMIN}`),
                // Owners cannot add or change unknown fields; legacy fields may stay as they are.
                $other: v(`newData.val() === data.val() || ${ADMIN}`)
            }
        },

        // ---------- join applications (reviewed by admins) ----------
        applications: {
            '.read': ADMIN,
            '.indexOn': ['status', 'timestamp', 'userId', 'userID'],
            $appId: {
                '.read': or("(auth != null && (auth.uid === $appId || data.child('userId').val() === auth.uid))", ADMIN),
                '.write': or(ADMIN, and("auth.uid === $appId", FREE, 'newData.exists()',
                    "(!data.exists() || data.child('status').val() !== 'approved')",
                    "newData.child('status').val() === 'pending'")),
                '.validate': or(ADMIN, "(newData.child('userId').val() === auth.uid && newData.child('role').isString())"),
                // Passwords must never be stored in the database.
                password: v('false'), 'prof-password': v('false'), 'center-password': v('false'), 'supplier-password': v('false'),
                $other: v('!newData.isString() || newData.val().length <= 5000')
            }
        },

        // ---------- public listings ----------
        professionals: {
            '.read': true,
            '.indexOn': ['userID', 'pos', 'category', 'featured'],
            $uid: {
                '.write': ADMIN,
                ...adminListingFields,
                userID: str(128),
                ...writable(PRO_OWNER, professionalOwnerFields)
            }
        },
        centers: {
            '.read': true,
            '.indexOn': ['userId', 'pos', 'centerType', 'featured'],
            $key: {
                '.write': ADMIN,
                ...adminListingFields,
                userId: str(128),
                ...writable(CENTER_OWNER, centerOwnerFields)
            }
        },
        merchants: {
            '.read': true,
            '.indexOn': ['userId'],
            $key: {
                '.write': ADMIN,
                ...writable(and("data.parent().child('userId').val() === auth.uid", FREE), {
                    orgName: str(160), productsOffered: str(2000), phone: str(40), contactPhone: str(40),
                    email: str(200), location: str(200), img: url, description: str(4000), updatedAt: ts
                })
            }
        },

        // ---------- reviews, presence, profile views ----------
        ratings: {
            $profileId: {
                '.read': true,
                $raterId: {
                    '.write': or(and('auth.uid === $raterId', '$raterId !== $profileId', FREE), ADMIN),
                    '.validate': "!newData.exists() || (newData.hasChildren(['stars', 'createdAt']) && (root.child('professionals/' + $profileId).exists() || root.child('centers/' + $profileId).exists()))",
                    stars: v('newData.isNumber() && newData.val() >= 1 && newData.val() <= 5'),
                    comment: str(1000), name: str(120), createdAt: ts, ...closed
                }
            }
        },
        status: {
            $uid: {
                '.read': true,
                '.write': 'auth != null && auth.uid === $uid',
                state: oneOf(['online', 'offline']), last_changed: v('newData.isNumber()'), ...closed
            }
        },
        profileViews: {
            $uid: {
                '.read': or('(auth != null && auth.uid === $uid)', ADMIN),
                '.write': 'auth != null && auth.uid !== $uid',
                ...plusOne
            }
        },

        // ---------- bookings (teletherapy, intake, home visits, tutoring) ----------
        bookings: {
            '.read': or(ADMIN,
                "(auth != null && query.orderByChild == 'userId' && query.equalTo == auth.uid)",
                "(auth != null && query.orderByChild == 'proId' && query.equalTo == auth.uid)"),
            '.indexOn': ['userId', 'proId', 'status', 'createdAt'],
            $id: {
                '.read': or(ADMIN, "(auth != null && (data.child('userId').val() === auth.uid || data.child('proId').val() === auth.uid))"),
                '.write': or(ADMIN, and('!data.exists()', "newData.child('userId').val() === auth.uid", "newData.child('status').val() === 'new'", FREE)),
                '.validate': "newData.hasChildren(['userId', 'type', 'status', 'createdAt'])",
                userId: str(128),
                type: oneOf(['teletherapy', 'intake', 'home-visit', 'consultation', 'tutoring', 'clinic']),
                status: {
                    '.write': or(
                        and("data.parent().child('userId').val() === auth.uid", "newData.val() === 'cancelled'"),
                        and("data.parent().child('proId').val() === auth.uid", "newData.isString() && newData.val().matches(/^(confirmed|completed)$/)")),
                    ...oneOf(['new', 'contacted', 'confirmed', 'completed', 'cancelled'])
                },
                updatedAt: { '.write': `auth != null && ${BOOKING_PARTY}`, ...v('newData.isNumber()') },
                service: str(160), audience: str(80), plan: str(160), preferredDate: str(40), timeOfDay: str(40),
                name: str(120), phone: str(40), email: str(200), notes: str(3000), location: str(300),
                proId: str(128), proName: str(160), userEmail: str(200), adminNote: str(3000),
                scheduledAt: str(60), meetingLink: url, price: str(80), createdAt: ts,
                intake: { $q: v('newData.isString() && newData.val().length <= 600') },
                ...closed
            }
        },

        // ---------- classes for children ----------
        classes: {
            '.read': true,
            '.write': ADMIN,
            '.indexOn': ['status', 'tutorId', 'createdAt']
        },
        classPrivate: {
            $classId: {
                '.read': `auth != null && (${ADMIN} || ${TUTOR} || ${ENROLLED})`,
                '.write': `auth != null && (${ADMIN} || ${TUTOR})`,
                meetingLink: url, notes: str(3000), ...closed
            }
        },
        enrollments: {
            $classId: {
                '.read': `auth != null && (${ADMIN} || ${TUTOR})`,
                '.write': `auth != null && (${ADMIN} || ${TUTOR})`,
                $uid: {
                    '.read': 'auth != null && auth.uid === $uid',
                    '.write': and('auth.uid === $uid', FREE, or(
                        and('!data.exists()', "newData.child('status').val() === 'pending'", "root.child('classes/' + $classId + '/status').val() === 'open'"),
                        '!newData.exists()')),
                    '.validate': "newData.hasChildren(['childName', 'status', 'createdAt'])",
                    childName: str(120), childAge: str(20), parentName: str(120), phone: str(40),
                    country: str(100), notes: str(1000), createdAt: ts,
                    status: oneOf(['pending', 'active', 'rejected']), ...closed
                }
            }
        },
        userEnrollments: {
            $uid: {
                '.read': or('(auth != null && auth.uid === $uid)', ADMIN),
                '.write': or(and('auth.uid === $uid', FREE), ADMIN),
                $classId: { title: str(200), createdAt: ts, ...closed }
            }
        },
        assignments: {
            $classId: {
                '.read': `auth != null && (${ADMIN} || ${TUTOR} || ${ENROLLED})`,
                '.write': `auth != null && (${ADMIN} || ${TUTOR})`,
                $aid: {
                    '.validate': "newData.hasChildren(['title', 'createdAt'])",
                    title: str(200), instructions: str(6000), dueAt: str(40), attachmentUrl: url,
                    createdAt: ts, createdBy: str(128), ...closed
                }
            }
        },
        submissions: {
            $classId: {
                $aid: {
                    '.read': `auth != null && (${ADMIN} || ${TUTOR})`,
                    '.write': `auth != null && (${ADMIN} || ${TUTOR})`,
                    $uid: {
                        '.read': 'auth != null && auth.uid === $uid',
                        ...writable(and('auth.uid === $uid', FREE, ENROLLED, "root.child('assignments/' + $classId + '/' + $aid).exists()"), {
                            text: str(10000), fileUrl: url, fileName: str(200), submittedAt: ts, studentName: str(120)
                        }),
                        grade: str(40), feedback: str(4000), gradedAt: ts, ...closed
                    }
                }
            }
        },

        // ---------- admin-managed public content ----------
        blogPosts: publicContent({ '.indexOn': ['timestamp', 'category'] }),
        slider: publicContent({ '.indexOn': ['pos'] }),
        announcements: publicContent({}),
        ads: publicContent({ '.indexOn': ['placement'] }),
        siteConfig: publicContent({}),

        // ---------- counters ----------
        adStats: {
            '.read': ADMIN,
            $adId: { clicks: { '.write': "root.child('ads/' + $adId).exists()", ...plusOne } }
        },
        analytics: {
            '.read': ADMIN,
            '.write': ADMIN,
            daily: {
                $date: {
                    '.validate': '$date.matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)',
                    views: { '.write': true, ...plusOne },
                    pages: { $page: { '.write': true, ...plusOne, '.validate': '$page.length <= 40 && newData.isNumber() && newData.val() === (data.exists() ? data.val() : 0) + 1' } }
                }
            }
        },
        aiUsage: {
            '.read': ADMIN,
            $uid: { '.read': 'auth != null && auth.uid === $uid' }
        },

        // ---------- legacy nodes ----------
        // `visits` used to store e-mail addresses on every page view. It is no longer
        // written; admins can read it and delete it from the admin console.
        visits: { '.read': ADMIN, '.write': ADMIN },
        // `tokens` held the AI key. The key now lives in a Cloud Functions secret.
        tokens: { '.read': false, '.write': ADMIN },
        // Nodes left over from an earlier marketplace build.
        products: publicContent({}),
        designs: publicContent({}),
        cert: publicContent({}),
        equip: publicContent({})
    }
};

const out = path.join(__dirname, '..', 'database.rules.json');
fs.writeFileSync(out, JSON.stringify(rules, null, 2) + '\n');
console.log('Wrote', path.relative(process.cwd(), out));
