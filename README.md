# RehabVerve

The rehabilitation network for Africa: patients and caregivers find and book physiotherapists,
occupational and speech therapists, psychologists and the rest of the rehab team, rehab centers
and mobile rehab services. RehabVerve also offers teletherapy, online classes and tutoring for
children (with assignments), rehab news, and a free AI assessment.

- **Site:** static HTML/CSS/JS on GitHub Pages — no build step.
- **Backend:** Firebase Auth, Realtime Database, Storage and Cloud Functions.
- **Admin console:** `admin.html` — applications, professionals, centers, users, bookings,
  classes, news, announcements, spotlight slides, ads, site settings and maintenance.

See **[docs/SETUP.md](docs/SETUP.md)** for deployment, the first admin, and the security checklist.

## Layout

```
*.html                 pages (one per screen)
assets/css/app.css     design system, light + dark themes
assets/css/admin.css   admin console layout
assets/css/home.css, directory.css, blogs.css, profile.css
                       original RehabVerve card and page styles (one file per page)
assets/js/theme.js     sets the theme before first paint
assets/js/app.js       shared shell: header, sign-in, toasts, safe-HTML helpers, ads, announcements
assets/js/*.js         one script per page, plus shared cards / booking / listing editor
database.rules.json    generated from tools/build-rules.js — run `npm run rules`
storage.rules          file upload rules
functions/             Cloud Functions (AI assistant, admin claim, rating totals)
tests/rules.test.js    security tests — run `npm test`
```
