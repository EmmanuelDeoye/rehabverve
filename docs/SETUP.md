# RehabVerve — setup, deployment and security checklist

The website is plain HTML/CSS/JS served by **GitHub Pages** (`www.rehabverve.com.ng`).
Data, sign-in, file uploads and the AI assistant run on **Firebase** (project `tolexars-ac868`).

Nothing in this file is automatic: the steps below need someone with access to the
Firebase console and the AI provider account.

---

## 1. Do these first (security)

The previous version exposed data. In this order:

1. **Revoke the old AI key.** It was stored at `tokens/openAI` in the database and anyone
   could read it. Revoke that token where it was created (GitHub → Settings → Developer
   settings → Personal access tokens, if it is a GitHub Models token) and create a new one.
2. **Deploy the new database and storage rules** (section 3). Until you do, the old rules —
   whatever they are — still apply.
3. **Make yourself an admin** (section 2), open `admin.html` → **Maintenance** and:
   - *Remove stored passwords* — the old registration form saved passwords inside
     `applications`. After removing them, ask those applicants to reset their passwords
     (or send them reset emails from Firebase Console → Authentication).
   - *Delete old visit logs* — the old tracker stored visitors’ e-mail addresses.
   - *Delete the old AI key record* (after step 1).
   - *Verify existing listings* — only if you checked those professionals when you added them.

## 2. Make the first admin

Admins are listed in the database under `admins/{uid}: true`. Nobody can add themselves —
only an existing admin (or you, in the console) can.

1. Sign up on the website with the account that should be admin.
2. Firebase Console → Authentication → copy that user’s **User UID**.
3. Firebase Console → Realtime Database → add the key `admins` → child `<that UID>` with value `true`.
4. Open `https://www.rehabverve.com.ng/admin.html`. From then on you can make other admins
   from **Admin → Users**.

## 3. Deploy rules and functions

Install the tools once (Node.js 22+):

```bash
npm install            # Firebase CLI + test tools (root folder)
cd functions && npm install && cd ..
npx firebase login
```

### Database and storage rules

The database rules are generated from `tools/build-rules.js` (easier to read and review):

```bash
npm run rules          # regenerates database.rules.json
npm test               # runs the security tests against local emulators
npm run deploy:rules   # deploys database + storage rules
```

> **Shared project warning.** The Firebase project is named `tolexars-ac868`. If another
> app (for example a “Tolexars” marketplace) uses the same database, the new rules will
> deny it anything not listed in `tools/build-rules.js`. Check the console’s
> *Realtime Database → Rules* tab for nodes that other app needs before deploying, or
> better, move RehabVerve to its own Firebase project.

### Cloud Functions (AI assessment, admin claim, rating totals)

Cloud Functions need the Firebase **Blaze** (pay-as-you-go) plan. Usage at RehabVerve’s
size normally stays within the free allowance.

```bash
npx firebase functions:secrets:set AI_TOKEN      # paste the NEW AI key
npm run deploy:functions
```

Non-secret settings live in `functions/.env`:

| Setting          | Default                              | Meaning                              |
|------------------|--------------------------------------|--------------------------------------|
| `AI_ENDPOINT`    | `https://models.github.ai/inference` | OpenAI-compatible chat endpoint      |
| `AI_MODEL`       | `openai/gpt-4.1`                     | Model name for that endpoint         |
| `AI_DAILY_LIMIT` | `20`                                 | AI requests per user per day         |

Functions deployed:

- `aiAssist` — creates questionnaires and summaries. Signed-in users only, with the daily
  limit. The key never reaches the browser, and prompts are built on the server, so the
  endpoint cannot be used as a general-purpose AI proxy.
- `syncAdminClaim` — copies `admins/{uid}` into an `admin` sign-in claim, which the storage
  rules use for admin image uploads.
- `aggregateRatings` — keeps `rating` and `ratingCount` on listings up to date.

## 4. Website hosting

GitHub Pages publishes the repository root. Pushing to the default branch updates the
site. `_config.yml` keeps development files (functions, tests, tools) out of the site.

The site loads two things from CDNs: the Firebase SDK (`www.gstatic.com/firebasejs/12.18.0`)
and Boxicons (`unpkg.com/boxicons@2.1.4`).

## 5. Running everything locally

```bash
npm run emulators                    # auth, database, storage and functions on localhost
python3 -m http.server 8000          # in another terminal, from the repository root
```

Open `http://localhost:8000/index.html?emulator=1`. The page then talks to the local
emulators instead of the live project, and remembers this until you open a page with
`?emulator=0`. For the AI assistant locally, put `AI_TOKEN=…` in `functions/.secret.local`.

## 6. Data model (Realtime Database)

| Path | Who can read | Who can write |
|------|--------------|---------------|
| `admins/{uid}` | admins, self | admins |
| `blocked/{uid}` | admins, self | admins |
| `userdata/{uid}` | owner, admins | owner (allowed fields), admins |
| `applications/{uid}` | applicant, admins | applicant while pending, admins |
| `professionals/{uid}` | everyone | admins; owner for their own details (not verification, ranking or ratings) |
| `centers/{key}` | everyone | admins; owner (`userId`) for their own details |
| `merchants/{key}` | everyone | admins; owner for their own details |
| `ratings/{profileId}/{uid}` | everyone | the reviewer (one review each, not on their own profile) |
| `bookings/{id}` | client, assigned professional, admins | client creates; client cancels; professional confirms/completes; admins manage |
| `classes/{id}` | everyone | admins |
| `classPrivate/{id}` (joining link) | enrolled families, tutor, admins | tutor, admins |
| `enrollments/{classId}/{uid}` | parent, tutor, admins | parent requests/withdraws; tutor and admins accept |
| `assignments/{classId}` | enrolled families, tutor, admins | tutor, admins |
| `submissions/{classId}/{aid}/{uid}` | student, tutor, admins | student hands in; tutor grades |
| `blogPosts`, `slider`, `announcements`, `ads`, `siteConfig` | everyone | admins |
| `analytics/daily`, `adStats` | admins | anyone, +1 only (no personal data) |
| `tokens`, `visits` | nobody / admins | admins (delete only) |

Listing fields used for matching: `priceMin`, `priceMax`, `priceUnit`, `currency`,
`serviceModes` (`clinic` / `home` / `tele`; centers use `onsite` / `home` / `tele`),
`coverage` (`states`, `areas`, `countries`, `nationwide`), `city`, `state`, `country`,
`category` (set by admins), `verified`, `featured`, `pos`, `status`.
