# RehabVerve

The rehabilitation network for Africa: patients and caregivers find and book physiotherapists,
occupational and speech therapists, psychologists and the rest of the rehab team, rehab centers
and mobile rehab services. RehabVerve also offers teletherapy, online classes and tutoring for
children (with assignments), rehab news, and a free AI assessment.

- **Site:** a single-page web app (static HTML/CSS/JS on GitHub Pages, no build step).
  Every screen loads into `index.html`; links look like `/#/professionals?loc=Ikeja`.
- **Backend:** Firebase Auth, Realtime Database, Storage and Cloud Functions.
- **Admin console:** `/#/admin` — applications, professionals, centers, users, bookings,
  classes, news, announcements, spotlight slides, ads, site settings and maintenance.

See **[docs/SETUP.md](docs/SETUP.md)** for deployment, the first admin, and the security checklist.

## Layout

```
index.html             the app shell (header, tab bar, footer); screens load into <main>
pages/*.html           one fragment per screen (home, professionals, profile, admin…)
*.html (others)        old addresses — they redirect to the matching screen
404.html               unknown addresses such as /professionals open the matching screen
assets/js/router.js    navigation, deep links, loading each screen and cleaning up after it
assets/css/app.css     design system, light + dark themes
assets/css/admin.css   admin console layout
assets/js/theme.js     sets the theme before first paint
assets/js/app.js       shared shell: header, sign-in, toasts, safe-HTML helpers, ads, announcements
assets/js/*.js         one script per page, plus shared cards / booking / listing editor
database.rules.json    generated from tools/build-rules.js — run `npm run rules`
storage.rules          file upload rules
functions/             Cloud Functions (AI assistant, admin claim, rating totals)
tests/rules.test.js    security tests — run `npm test`
```
