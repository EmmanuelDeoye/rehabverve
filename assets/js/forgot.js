// forgot.js — sends a password reset email.
(function () {
    'use strict';
    const { $ } = RV;
    const form = $('#reset'), msg = $('#msg');
    const SENT = 'If an account uses that address, a reset link is on its way. Check your inbox and spam folder.';
    const say = (text, ok) => { msg.textContent = text; msg.className = 'form-msg ' + (ok ? 'ok' : 'error'); msg.hidden = false; };
    form.addEventListener('submit', e => {
        e.preventDefault();
        const email = form.email.value.trim();
        const btn = form.querySelector('[type=submit]');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { say('Please enter a valid email address.'); return; }
        if (!RV.fb) { say('We could not reach our servers. Please try again.'); return; }
        RV.busy(btn, true, 'Sending…');
        RV.fb.auth.sendPasswordResetEmail(email)
            // Same message whether or not the address has an account, so emails can't be probed
            .then(() => { say(SENT, true); form.reset(); })
            .catch(err => say(err.code === 'auth/user-not-found' ? SENT : RV.errorMessage(err), err.code === 'auth/user-not-found'))
            .then(() => RV.busy(btn, false));
    });
})();
