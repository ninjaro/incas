# Privacy & Security Audit

Scope: the current Flask + React application. This is an engineering review of
what the code actually does, not a legal assessment. It records the state at
the time the legacy `old-site/` legal text was migrated into
`app/site_content.py` (`impressum`, `privacy` pages) and lists what still needs
a policy or architecture decision.

Legal references used while writing the migrated notices: GDPR Art. 5, 6, 9,
13, 25, 28, 32; DDG §5 (Impressum); TDDDG §25 (cookies / terminal-device
access).

---

## 1. Personal data collected and stored

All personal data lives in the application database (`app/models.py`). No
row has an automatic expiry.

| Model / table | Personal data | Entry point | Notes |
| --- | --- | --- | --- |
| `ContactRequest` | name, email, subject, free-text message | `POST /api/v1/public/contact` | message capped at 10 000 chars |
| `EventSuggestion` | contact name, email, phone, country/culture, free-text comment | `POST /api/v1/public/event-suggestions` | |
| `LanguageTandemRequest` | first/last name, email, occupation, **gender**, birth year, planned departure date, country of origin, offered/requested languages + self-rated levels, partner-gender preference (free text), free-text comment | `POST /api/v1/public/language-tandem` | gender + free-text comment can carry special-category data (Art. 9); quasi-identifiers (gender + birth year + country + languages) remain in the "blind" view |
| `EventRegistration` | first/last name, email, occupation, **diet preference**, free-text comment | `POST /api/v1/public/events/<slug>/registrations` | diet preference can imply religion/health (Art. 9); only asked for `breakfast` events |
| `KaraokeSongRequest` | display name, song/artist, note, optional contact string | `POST /api/v1/public/karaoke/requests` | contact field free-form (email or phone) |
| `PaymentTransaction` | amount, currency, provider session id, links to a registration | payment flow | provider is `mock`; no real cardholder data today |
| `AccessUnlockAttempt` | SHA-256 of the client IP, session audit id, success flag, timestamp | admin key unlock | unsalted hash of a small value space; retained forever |
| `RateLimitBucket` | SHA-256 of `scope\0IP\0window` | every rate-limited endpoint | rows self-expire by window |
| Server logs | request IP, UA, referrer, timestamp | WSGI / reverse proxy | outside the app; retention unknown — see §6 |

Transactional email: `app/registration_recovery.py` sends a registration
link to the registrant's address over SMTP when `SMTP_HOST` + `MAIL_FROM`
are configured. The mail-server operator is a recipient/processor.

## 2. Forms — notices added in this change

Every public form now renders a one-line Art. 13 pointer
(`FormPrivacyNotice`, linking to `/privacy`): contact, event suggestion,
Language Tandem (all variants, shown on the final step), and event
registration. The Tandem and registration forms carry the most data and the
only Art. 9 risk; the notice names the purpose and links to the full policy,
which lists every field per form.

Not changed (out of scope / needs a decision): no separate opt-in checkbox
for the free-text/Art. 9 case, no double opt-in on the email address, no
"why we ask for gender" helper text on the Tandem form.

## 3. Retention / deletion — UNRESOLVED

**Problem.** Nothing deletes personal data. There is a `reservation-worker`
that cancels *unpaid* registrations, but it only flips a status; the row,
name and email stay. There is no cron/CLI to purge old contact requests,
event suggestions, tandem requests, past-event registrations, karaoke
requests, or `AccessUnlockAttempt` rows. Erasure requests can only be served
by a manual SQL `DELETE`.

**Risk.** Art. 5(1)(e) storage limitation and Art. 17 are not technically
supported. Tandem data (with gender + free text) accumulates indefinitely.

**Options.**
1. *Retention worker + per-table max age.* Add a `retention-worker` CLI
   (mirrors the existing workers) that deletes rows past a configured age:
   e.g. contact/suggestion/tandem after N months of inactivity, event
   registrations N months after the event, karaoke requests after the
   event, unlock attempts after 90 days. Small, testable, reversible per
   table. **Preferred** — matches the existing worker pattern and needs
   only a policy input (the actual periods) from INCAS.
2. *Soft-delete + anonymise.* Keep aggregate rows for statistics
   ("participants matched each year") but null the identifying columns on
   expiry. More code, keeps the counts the site advertises.
3. *Manual only + documented SOP.* Cheapest; leaves the Art. 5(1)(e) gap
   open. Not recommended.

**Blocker for a public launch:** the migrated privacy page states "we delete
when the purpose ends" — that must become true before the policy is
published. Concrete periods are a INCAS decision.

## 4. Admin access — blind vs. restricted vs. full — PARTLY DONE, UNRESOLVED edges

**What exists.** `app/routes/helpers/access.py` defines capability scopes;
Tandem is split three ways (`app/api/tandem.py`):

- `language_tandem_blind` — pseudonymised list + matching. Names, email and
  the free-text comment are stripped server-side; requests are addressed by
  an HMAC `blind_ref`, not the DB id. Good Art. 25/32 design.
- `language_tandem_private` — adds name, email, comment; required for the
  "contacted / final pair" workflow.
- `language_tandem_corrections` — edit + merge duplicates.

Access keys are hashed, scoped, and expire; sessions prune expired scopes.

**Problems.**
1. **The blind view still leaks quasi-identifiers**: `serialize_blind`
   returns gender, exact birth year, country of origin, departure date and
   the full language sets. For a small pool that can re-identify a person.
   `preferredGender` is free text and is also in the blind payload.
2. **No enforced separation of duties.** One access key can carry
   `language_tandem_private` + everything else. Legacy scope
   `language_tandem` expands to blind+private together. There is no "blind
   only" key issued by default.
3. **Other domains have no blind tier.** `event_registrations`, `forms`
   (contact requests + suggestions) and `karaoke_queue` are all-or-nothing:
   the capability shows full name + email. FormsInbox and the registrations
   panel have no redacted mode.
4. **`AccessUnlockAttempt`** keeps IP hashes forever (see §3).

**Options for the quasi-identifier leak (Tandem blind view).**
1. *Coarsen the blind payload.* Replace birth year with an age band, country
   with region/continent, drop `preferredGender` free text from the blind
   serializer (move it behind `_private`). Matching still works on language
   sets + coarse filters. **Preferred** — localised, testable, no schema
   change.
2. *Separate "matcher" role that never sees identity.* Formalise a key that
   only ever gets `language_tandem_blind`, and require a second key for the
   introduction step, ideally held by a different person. Process + docs
   change, not just code.
3. *Two-person rule for `_private`/`_corrections`.* Bigger change; probably
   overkill for a student association.

**Options for the other domains.** Add a `*_blind` capability + redacted
serializer for `forms` and `event_registrations` on the same pattern as
Tandem, so a triaging volunteer sees counts/subjects/status without the name
and email until they need to act. Worth doing but it is a design task, not a
safe local edit — deferred.

## 5. Cookies, local/session storage, external browser requests

**Cookies (first-party only).**
- `locale` — set by the client on language switch, `max-age` 1 year. Purpose:
  remember language. Strictly necessary for a user-requested setting
  (TDDDG §25(2)); no banner needed.
- Flask session cookie — `HttpOnly`, `SameSite=Lax`, `Secure` in production.
  Created only after an admin unlock. Strictly necessary.

No analytics/advertising cookies anywhere (grepped: no gtag, GA, GTM,
Plausible, Matomo, Sentry, Facebook pixel).

**Local storage (per-device, never sent to us):** `incas.locale`,
`incas.appearance`, `incas.admin.view` (admin only), and a karaoke
tracking-id list. All exempt from consent.

**External browser requests.**
| From | Host | Status |
| --- | --- | --- |
| SPA `frontend/index.html` + Jinja `index/calendar.html` | `fonts.googleapis.com`, `fonts.gstatic.com` | **fixed in this change** — fonts self-hosted (`static/fonts`, `frontend/src/styles/fonts`), Google links removed, CSP `style-src`/`font-src` tightened to `'self'` |
| Event pages with a map | `tile.openstreetmap.org` | present by design (`docs/map-delivery.md`, CSP `img-src`). IP goes to the OSM Foundation. Documented in the privacy page §11. **Decision needed** — see below |
| Legacy Jinja `base.html` / `admin/base.html` | `cdn.jsdelivr.net` (Bootstrap CSS+JS, icons) | still there. The enforced CSP is `script-src 'self'`, so the jsdelivr **script** is already blocked; the CSS `<link>` violates `style-src` too. These templates are the pre-React UI (`REACT_PRIMARY_FRONTEND=false`). See below |
| Legacy `event_registration_status.html`, `admin/access_keys/index.html` | `cdnjs.cloudflare.com` (qrcodejs) | same as above; blocked by `script-src 'self'` |
| Post/event images, social embeds | `tile.openstreetmap.org`, `cdn.simulated.social` (allow-listed via `REMOTE_IMAGE_ORIGINS`) | admin-entered image URLs; `cdn.simulated.social` is demo-only |

**Map tiles — options.**
1. *Keep the community endpoint, keep the disclosure.* Zero cost. Fine while
   traffic is low; already covered in the privacy page and honours the OSM
   tile usage policy (viewport only, attribution shown).
2. *Consent gate the map.* Render a click-to-load placeholder; only contact
   OSM after the user opts in. Removes the Art. 6(1)(f) reliance for the
   default page load. **Preferred if a stricter reading is wanted** — small,
   local React change, and event detail/registration already work without
   the map.
3. *Self-host / paid tiles.* Only worth it at scale or with an SLA need.

**Legacy CDN assets — options.**
1. *Delete the legacy Jinja UI* once `REACT_PRIMARY_FRONTEND` is permanently
   on (Phase D is already referenced in `app/__init__.py`). Removes the
   jsdelivr/cdnjs exposure entirely. **Preferred.**
2. *Vendor Bootstrap + qrcodejs into `static/`* if the Jinja UI must live
   on. Straightforward but pointless if option 1 is close.

## 6. Fonts, maps, mail, hosting

- **Fonts** — done: self-hosted, licence text bundled (`static/fonts/OFL.txt`).
- **Maps** — see §5.
- **Mail** — `SmtpRegistrationRecoveryMailer` connects to a configured SMTP
  host with STARTTLS. The host is a processor. **Decision needed:** name the
  mail provider and conclude an Art. 28 agreement; confirm STARTTLS is
  enforced (currently `SMTP_STARTTLS` defaults true but a missing cert is
  not rejected).
- **Hosting** — **UNRESOLVED / blocker.** The old site named "Rektor der RWTH
  Aachen University" as host with an AVV. The current app ships in a
  `Dockerfile` / `docker-compose.yml` with Postgres and Gunicorn; where it
  actually runs is not in the repo. The migrated privacy page therefore
  states the Art. 28 obligation conditionally and does **not** name a
  provider. Before publishing: confirm the hosting arrangement, name the
  provider + server location in privacy §4, and attach the DPA. Also decide
  server-log retention (a common value is 7 days) and record it.

## 7. Other observations (lower priority)

- `Impressum` requires an email address for "schnelle elektronische
  Kontaktaufnahme" (§5 DDG). The old site had it JS-obfuscated; the value was
  not in the dump, so the migrated Impressum lists phone + contact form only.
  **Add a real address before publishing.**
- The represented coordinators in the Impressum ("Nölke, Linus Ary" /
  "Rzaev, Vladmir") come straight from the old site and are almost certainly
  out of date (coordinators rotate yearly). Confirm before publishing.
- `resolve_blind_ref` iterates every tandem row and HMACs each id on every
  admin request — O(n) per lookup. Not a privacy issue; will get slow.
- `AccessUnlockAttempt.source_hash` is an unsalted SHA-256 of an IP. Use an
  HMAC with `SECRET_KEY` (like `blind_ref`) so the table isn't a rainbow
  target, and add it to the retention worker.
- Rate-limit identifier falls back to `"unknown"` when `remote_addr` is
  `None`; with `TRUST_PROXY_HEADERS=false` behind a proxy every client
  shares a bucket. Operational note for deployment.

## 8. Summary — what to do next

1. **Retention worker** with INCAS-provided periods (§3). Blocks publishing
   the privacy page as written.
2. **Hosting + mail processor**: name them, sign Art. 28 DPAs, fill in
   privacy §4, set log retention (§6). Blocks publishing.
3. **Impressum**: real email address, current coordinators (§7). Blocks
   publishing.
4. **Tandem blind view**: coarsen quasi-identifiers, move `preferredGender`
   behind `_private` (§4 option 1). Safe, local, do next.
5. **Map**: decide click-to-load vs. keep-with-disclosure (§5).
6. **Legacy Jinja UI**: schedule removal to drop the jsdelivr/cdnjs
   exposure (§5).
7. Later: blind tiers for `forms`/`event_registrations`; HMAC + expiry for
   `AccessUnlockAttempt`.
