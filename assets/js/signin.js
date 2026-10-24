// signin.js — the sign-in page: opens the account dialog and returns to `next` afterwards.
(function () {
    'use strict';
    const { $$ } = RV;
    // Only pages of this site are allowed as the place to return to
    const next = RV.safeRoute(RV.params.get('next')) || '#/settings';
    $$('[data-open]').forEach(b => b.addEventListener('click', () => RV.openAuth(b.dataset.open)));
    let first = true;
    RV.onAuth(s => {
        if (s.user) { RV.go(next, { replace: true }); return; }
        if (first) { first = false; RV.openAuth(RV.params.get('mode') === 'signin' ? 'signin' : 'signup'); }
    });
})();
