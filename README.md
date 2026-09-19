# Manirampur Blood Network — মণিরামপুর ব্লাড নেটওয়ার্ক

**এক ব্যাগ রক্ত, একটি জীবন** · *One bag of blood, one life*

A production-oriented blood donor management and emergency blood connection platform for
**Manirampur Upazila, Jashore, Bangladesh**. Developed by **Zarif**.

---

## 1. Stack

| Layer | Technology |
| --- | --- |
| UI | React 19 + TypeScript, Next.js App Router, Tailwind CSS v4 design tokens |
| Backend | Node.js server (Next.js Route Handlers — the Express-equivalent runtime in this deployment) |
| Database | PostgreSQL + **Drizzle ORM** (typed, parameterised queries; SQL-injection safe) |
| Email | Nodemailer + Gmail SMTP (`smtp.gmail.com:465`) |
| Auth | Email + password, Argon-class hashing via **bcrypt (cost 12)**, opaque session token in a signed **HttpOnly** cookie backed by a `sessions` table |
| PWA | `manifest.webmanifest`, service worker (static shell only), safe-area + viewport ready for Capacitor/Android |

> **Note on Prisma:** the deployment target provisions PostgreSQL through Drizzle ORM
> (`src/db/schema.ts`). Every model, relation, index and constraint described for Prisma is
> implemented there, with typed, parameterised queries and no string-concatenated SQL.
> No Firebase service is used anywhere.

---

## 2. Core flows

```
Register (email + password)
  → hashed verification code emailed automatically (30 min TTL, single use, 6 attempts)
  → email verified
  → 4-step donor profile completion (mandatory)
  → secure persistent session (HttpOnly cookie + server-side session row)
  → Home
```

* **No phone OTP / no SMS OTP / no phone authentication.** Phone number is donor contact data only.
* **Password reset** uses the same hashed-code pipeline and revokes every existing session.
* **Logout** revokes the server-side session row, then clears the cookie.
* Home (`/home`) is gated three times: middleware (cookie presence), server layout
  (`getSession()` → verified + profile complete) and every API route
  (`requireCompletedProfile()`).

---

## 3. Phone-number privacy (critical guarantee)

* Donor search (`GET /api/donors`) and donor detail (`GET /api/donors/:id`) return a strict
  projection (`toPublicDonor`): display name, blood group, general area, availability,
  verified status, computed age and donation counters. **No phone, email, address, DOB,
  weight, height or health notes.**
* The only endpoint that returns a phone number is
  `GET /api/blood-requests/:id/contact`, and it succeeds only when the caller
  **owns the request**, the donor **accepted** it **and** `contactPermissionGranted` is true.
  Everything else returns **403**.
* Accepting is always an explicit, confirmed action with the disclosure text:
  “অনুরোধ গ্রহণ করলে সংশ্লিষ্ট অনুরোধকারী আপনার যোগাযোগের নম্বর দেখতে পারবেন।”
* Declining keeps the number private forever.

---

## 4. Security

* Helmet-equivalent security headers + CSP, `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, HSTS in production (`src/middleware.ts`).
* Passwords: bcrypt cost 12 — never stored or logged in plaintext.
* Verification/reset codes: 10-digit CSPRNG, stored **SHA-256 hashed**, single use,
  expiring, brute-force locked after 6 attempts, resend rate limited.
* Sessions: opaque token, SHA-256 hashed in the DB, signed JWT wrapper (HS256),
  `HttpOnly` + `SameSite=Lax` + `Secure` (production), rolling `lastUsedAt`,
  revoked on logout/password change/reset/suspension.
* Rate limiting on every auth, write, report and read endpoint
  (`src/lib/rate-limit.ts`).
* RBAC enforced server-side only (`USER`, `SUPPORT`, `MODERATOR`, `ADMIN`, `SUPER_ADMIN`).
  Client-side role manipulation cannot elevate privileges — roles are read from the DB
  on every request; admin routes use `requireStaff()` / `requireAdmin()` / `requireSuperAdmin()`.
* Uploads: MIME allow-list (PDF/JPG/PNG), 4 MB cap, generated UUID filenames, stored
  **outside `public/`**, streamed only to the owner or staff, path-traversal guarded.
* Audit log for every sensitive action; visible only to administrators.
* Generic error envelopes only — no stack traces, SQL errors or SMTP details ever leave
  the server.

---

## 5. Email delivery (Gmail SMTP)

1. Enable 2-Step Verification on the sending Google account.
2. Create an **App Password** (Google Account → Security → App passwords).
3. Put it **only** in `.env` (never in source, never in the repo):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=zarifasan119@gmail.com
SMTP_APP_PASSWORD=YOUR_GMAIL_APP_PASSWORD
EMAIL_FROM=zarifasan119@gmail.com
```

* Codes are sent **from** `zarifasan119@gmail.com` **to** whatever address the user registered.
* The sender address and all credentials are never rendered in the UI or returned by an API.
* While `SMTP_APP_PASSWORD` is unset, delivery is impossible, so the platform records the
  mail in a server-side outbox and exposes the pending code **only** through
  `POST /api/auth/pending-code` (and a clearly labelled banner). As soon as the App Password
  exists, that endpoint returns `available: false` and never reveals codes.

---

## 6. Setup

```bash
# 1. PostgreSQL
createdb app_db
export DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE

# 2. Install
npm install

# 3. Schema
npx drizzle-kit push

# 4. Develop / build
npm run dev
npm run build && npm run start
```

Core reference data (Manirampur union dataset + the active eligibility ruleset) is seeded
idempotently at runtime by `src/db/seed.ts`. **No demo users, demo donors, demo requests,
fake statistics or fabricated government numbers exist anywhere in the codebase.**

### Admin bootstrap

Add the email of the first administrator to `ADMIN_EMAILS` in `.env` before registering:

```env
ADMIN_EMAILS=admin@example.org
```

That registration becomes `SUPER_ADMIN`, and `/admin` (a separate, server-gated surface that
the donor UI never links to) unlocks: dashboard, request verification & donor broadcast,
donor verification/suspension, report moderation, emergency-contact management
(source URL + verification date mandatory), eligibility-rules versioning and audit logs.

---

## 7. Emergency services policy

`emergency_contacts` rows are administrator-managed only and require an official
`source_url` plus `last_verified_at`. Unverified records stay `active = false` and are never
served publicly. When nothing verified exists the UI shows **“তথ্য যাচাইাধীন” /
“Information under verification”** — no number is ever invented.

---

## 8. Medical safety

The donation-date engine (`src/lib/eligibility.ts`) stores `lastDonationDate`, computes
`nextPotentialDonationDate` (“সম্ভাব্য পরবর্তী রক্তদানের তারিখ”) and always records the rule
version used. Every assessment carries the mandatory disclaimer:

> প্রাথমিক তথ্য অনুযায়ী সম্ভাব্যভাবে উপযুক্ত হতে পারেন; চূড়ান্ত সিদ্ধান্ত সংশ্লিষ্ট
> চিকিৎসক/রক্ত সংগ্রহ কেন্দ্রের।

The platform never states that a donor is “medically safe”.

---

## 9. PWA & Android (Capacitor)

* `public/manifest.webmanifest` (standalone, theme `#8d1224`, maskable icon, shortcuts).
* `public/sw.js` caches **only** the static shell (`/_next/static`, icons). API and navigation
  requests always hit the network, so private data is never cached and stale availability is
  never shown offline — the offline screen (“ইন্টারনেট সংযোগ নেই”) blocks sensitive flows.
* `viewport-fit=cover`, safe-area insets, 44px+ touch targets, Android back-button friendly
  (no nested history traps), keyboard-safe forms.

Capacitor wrapper:

```bash
npm i -D @capacitor/cli && npx cap init "মণিরামপুর ব্লাড নেটওয়ার্ক" org.manirampur.blood --web-dir=public
npx cap add android
# point server.url (capacitor.config) at the HTTPS deployment, then:
npx cap sync android && npx cap open android
```

Notification permission is requested in-app with
“নোটিফিকেশন চালু করুন” / “পরে করব” and is **never** re-prompted after a denial or deferral.

---

## 10. API surface

```
POST   /api/auth/register            POST   /api/auth/login
POST   /api/auth/logout              GET    /api/auth/session
POST   /api/auth/verify-email        POST   /api/auth/resend-verification
POST   /api/auth/forgot-password     POST   /api/auth/reset-password
POST   /api/auth/change-password     POST   /api/auth/pending-code   (setup only)

GET    /api/profile                  POST   /api/profile             PATCH  /api/profile
POST   /api/profile/availability
GET    /api/donors                   GET    /api/donors/:id
GET    /api/blood-requests           POST   /api/blood-requests
GET    /api/blood-requests/:id       PATCH  /api/blood-requests/:id
POST   /api/blood-requests/:id/accept      /api/blood-requests/:id/decline
GET    /api/blood-requests/:id/contact     ← 403 unless authorised
GET    /api/donor-requests
GET    /api/notifications            POST   /api/notifications
GET/PUT /api/notifications/preferences
POST   /api/reports                  GET    /api/reports
GET    /api/emergency-contacts       GET    /api/locations
GET    /api/eligibility/rules        POST   /api/account/deletion
GET    /api/documents/:requestId     GET    /api/health

Admin (staff only): /api/admin/overview · /donors · /donors/:id/verification
                    /requests · /requests/:id/status · /reports
                    /emergency-contacts · /eligibility-rules · /audit-logs · /locations
```

---

## 11. Security checklist

- [x] Passwords hashed (bcrypt cost 12), never plaintext
- [x] Verification/reset codes hashed, expiring, single use, brute-force + resend limited
- [x] HttpOnly signed session cookie + server-side revocable sessions
- [x] Persistent login until explicit logout / revocation
- [x] Server-side authorisation on every endpoint (no client-side trust)
- [x] Phone private until donor acceptance; contact endpoint enforces ownership + consent
- [x] Private documents stored outside `public/`, access-controlled, MIME + size validated
- [x] RBAC with admin/moderator separation; normal users get 403 on admin APIs
- [x] Rate limiting, CSP, secure headers, no stack traces, no secret leakage
- [x] Audit logging of sensitive administrative actions
- [x] `.env` git-ignored; `.env.example` contains placeholders only
- [x] Account deletion request with anonymisation and session revocation
- [x] No Firebase, no phone/SMS OTP, no demo data, no fabricated government numbers


## Shared admin database

The separate admin dashboard is designed to connect directly to this same PostgreSQL database using the same `DATABASE_URL`. It uses the same `src/db/schema.ts` contract, so donor profiles, blood requests, donations, reports, users and other shared records are not split between two databases.

**Important:** run `npm run db:push` from this main project when applying schema changes. Do not maintain a second incompatible schema in the admin project.

## APK

The project includes Capacitor 8.5.2 configuration and a GitHub Actions workflow. Put your deployed HTTPS URL in the GitHub repository secret `CAPACITOR_SERVER_URL`, then run **Actions → Build Android APK → Run workflow**. The workflow generates an installable debug APK artifact. A Play Store release requires a signed release/AAB build.
