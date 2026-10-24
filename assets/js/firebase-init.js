// firebase-init.js — connects to the RehabVerve Firebase project.
// This web config is public by design; access is controlled by database.rules.json and storage.rules.
(function () {
    'use strict';
    const RV = window.RV = window.RV || {};

    const config = {
        apiKey: 'AIzaSyAuT-RlMl5g4m96V3DtUWGFV6ym7YnMXt8',
        authDomain: 'tolexars-ac868.firebaseapp.com',
        databaseURL: 'https://tolexars-ac868-default-rtdb.firebaseio.com',
        projectId: 'tolexars-ac868',
        storageBucket: 'tolexars-ac868.appspot.com',
        messagingSenderId: '148559800786'
    };

    const done = () => { if (RV._fbReady) RV._fbReady(); };

    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK failed to load.');
        RV.fb = null;
        done();
        return;
    }

    const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
    const auth = firebase.auth();
    const db = firebase.database();
    const storage = firebase.storage ? firebase.storage() : null;
    const functions = firebase.functions ? app.functions('us-central1') : null;

    // Local testing against the Firebase emulators: on localhost, open any page with ?emulator=1
    // (remembered until ?emulator=0), or set window.RV_EMULATOR = true before this script.
    const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    let useEmulator = !!window.RV_EMULATOR;
    if (local) {
        try {
            const flag = (location.search.match(/[?&]emulator=([01])/) || [])[1];
            if (flag) localStorage.setItem('rv-emulator', flag);
            useEmulator = useEmulator || localStorage.getItem('rv-emulator') === '1';
        } catch (e) { /* storage blocked */ }
    }
    if (useEmulator) {
        auth.useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
        db.useEmulator('127.0.0.1', 9000);
        if (storage) storage.useEmulator('127.0.0.1', 9199);
        if (functions) functions.useEmulator('127.0.0.1', 5001);
    }

    RV.fb = {
        app, auth, db, storage, functions,
        TIMESTAMP: firebase.database.ServerValue.TIMESTAMP,
        increment: n => firebase.database.ServerValue.increment(n)
    };

    // Storage and Functions load only on the screens that need them (uploads, AI assessment)
    const SDK = 'https://www.gstatic.com/firebasejs/12.18.0/';
    const setup = {
        storage: () => { const s = firebase.storage(); if (useEmulator) s.useEmulator('127.0.0.1', 9199); return s; },
        functions: () => { const f = app.functions('us-central1'); if (useEmulator) f.useEmulator('127.0.0.1', 5001); return f; }
    };
    const loading = {};
    RV.loadSdk = (names = []) => Promise.all(names.filter(n => setup[n] && !RV.fb[n]).map(n => {
        if (!loading[n]) {
            loading[n] = new Promise((resolve, reject) => {
                const tag = document.createElement('script');
                tag.src = `${SDK}firebase-${n}-compat.js`;
                const timer = setTimeout(() => { tag.remove(); reject(new Error(`Firebase ${n} took too long to load`)); }, 20000);
                tag.onload = () => { clearTimeout(timer); resolve(); };
                tag.onerror = () => { clearTimeout(timer); tag.remove(); reject(new Error(`Could not load Firebase ${n}`)); };
                document.head.appendChild(tag);
            }).then(() => { RV.fb[n] = setup[n](); })
                .catch(err => { delete loading[n]; console.warn(err); });
        }
        return loading[n];
    }));
    done();
})();
