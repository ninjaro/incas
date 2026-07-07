# INCAS React Frontend Migration and Platform Extension
## Technical Specification

**Repository:** `ninjaro/incas`  
**Source branch:** `react`  
**Target architecture:** Python/Flask backend + Node.js/React/TypeScript frontend  
**Primary brand color:** `#ff6600`  
**Document language:** English

---

## 1. Objective

Extend and modernize the INCAS platform while preserving the existing Python/Flask backend.

The project must complete the frontend migration started in the `react` branch and move all public-facing and admin-facing user interfaces to a Node.js frontend implemented with React and TypeScript.

The Flask application remains responsible for:

- business logic;
- authorization and access-key validation;
- database access;
- server-side validation;
- scheduling;
- integrations with third-party APIs;
- payment and social-media orchestration;
- serving JSON APIs;
- optionally serving the compiled frontend bundle in production.

The React application becomes responsible for:

- all public pages;
- all forms;
- calendar and landing-page variants;
- the complete admin interface;
- theme preview and voting;
- client-side navigation and user interaction;
- the static demo build.

---

## 2. Mandatory Architecture

### 2.1 Backend

The backend must remain:

- Python;
- Flask;
- SQLAlchemy or the existing persistence layer;
- the source of truth for permissions, data validation, and business rules.

The backend must not be rewritten in Node.js.

### 2.2 Frontend

The frontend must use:

- Node.js;
- React;
- TypeScript;
- Vite or the existing build setup from the `react` branch.

Plain JavaScript should not be used for new application code unless required by a third-party package.

### 2.3 Frontend/Backend Boundary

The current Jinja-based UI must be migrated to React.

Jinja may remain only for:

- the minimal HTML shell used to load the compiled frontend;
- server error pages that must work when the frontend bundle is unavailable;
- temporary compatibility during migration.

No new feature should be implemented primarily as a Jinja page.

The Flask backend must expose versioned JSON endpoints, preferably under `/api/v1`.

Business rules must not be duplicated in React. React may validate forms for usability, but Flask must repeat and enforce all validation.

### 2.4 Source Branch

All implementation work must start from the existing `react` branch.

The current React/TypeScript/Vite setup in that branch should be extended rather than replaced without a strong technical reason.

---

## 3. High-Level Frontend Structure

Recommended structure:

```text
frontend/
  src/
    app/
    api/
    auth/
    components/
    content/
    features/
      admin/
      calendar/
      karaoke/
      language-tandem/
      payments/
      posts/
      social/
      themes/
    layouts/
    pages/
    router/
    styles/
    types/
  public/
  tests/
```

The frontend should use a data-provider abstraction:

- `ApiDataProvider` for the real Flask backend;
- `DemoDataProvider` for the static demo build;
- shared React pages and components for both modes.

The demo build must not contain a second implementation of the same pages.

---

## 4. Access-Key and Permission Model

The existing access-key concept must be preserved and extended.

Permissions must be capability-based. A key may unlock one or more capabilities. The backend must enforce every capability independently of frontend visibility.

The admin interface should be one unified application. Stronger keys reveal additional controls inside the same panels instead of opening unrelated duplicate panels.

### 4.1 New Theme Permissions

Add the following scopes:

| Scope | Capability |
|---|---|
| `theme_review` | Preview all available page themes and vote for a preferred theme |
| `theme_force` | Includes theme-review capabilities and may force the active public theme |

`theme_force` must behave as an extension of `theme_review`, not as a separate disconnected panel.

### 4.2 Language Tandem Permissions

Unify the existing Language Tandem admin interfaces into one panel with progressive capabilities.

Recommended scopes:

| Scope | Capability |
|---|---|
| `language_tandem_blind` | View anonymized requests and use matching tools |
| `language_tandem_private` | Reveal personal information required for contacting participants |
| `language_tandem_corrections` | Edit requests, resolve duplicates, merge or correct data |

Rules:

- The weakest scope must still allow matching.
- In blind mode, personal data must not be sent by the API.
- Hiding personal data only with CSS or React conditionals is not sufficient.
- Blind responses must exclude names, email addresses, phone numbers, free-text fields containing personal information, and direct database identifiers where avoidable.
- Stronger scopes progressively unlock the missing information and actions.
- Existing keys should be migrated or mapped to the closest new capability.

### 4.3 Karaoke Permission

Add:

| Scope | Capability |
|---|---|
| `karaoke_queue` | Approve, reject, reorder, cancel, and manage karaoke song requests |

### 4.4 Permission UX

The React admin application must:

- show locked capabilities clearly;
- avoid rendering controls that the current session cannot use;
- display which capabilities are active;
- support activating additional keys without logging out;
- refresh the session capability list after a new key is accepted.

The backend must return `403` for every unauthorized API action even when the user manually calls the endpoint.

---

## 5. Page Theme System

### 5.1 General Behavior

Several pages currently have multiple visual variants. Normal public users must no longer see variant selectors.

For each theme-enabled page:

- exactly one theme is active for public visitors;
- all existing variants remain available internally;
- variants are managed from the admin application;
- the selected public theme is resolved by the backend or a public configuration endpoint;
- an invalid or missing theme falls back to a stable default.

Initially supported pages must include at least:

- landing page;
- calendar;
- Language Tandem form;
- admin dashboard and major admin panels.

The architecture must allow adding themes to other pages without adding route-specific conditionals throughout the application.

### 5.2 Theme Registry

Create a central theme registry containing:

- page identifier;
- theme identifier;
- human-readable name;
- short description;
- optional preview image;
- enabled/disabled state;
- default-theme flag;
- compatibility metadata if a theme requires specific data.

Example page identifiers:

```text
landing
calendar
language_tandem
admin_dashboard
admin_posts
admin_tandem
admin_forms
```

Theme components should share typed page contracts so that variants receive the same normalized data.

### 5.3 Admin Theme Panel

Create one unified theme-management panel in the admin application.

Users with `theme_review` can:

- open any theme-enabled page in preview mode;
- switch themes locally without changing the public theme;
- view the current public theme;
- cast one vote for one theme on each page;
- replace their previous vote.

Voting rules:

- one effective vote per unlocked admin session per page;
- activating multiple keys does not multiply votes;
- a new vote replaces the previous vote;
- votes do not automatically change the public theme;
- vote totals are visible to users with theme-review access.

Users with `theme_force` can additionally:

- force a selected theme as the public theme for a page;
- see the last force timestamp;
- see when the next change is permitted;
- see an audit history of theme changes.

### 5.4 Twenty-Four-Hour Force Lock

A public theme for a given page cannot be changed more than once in any rolling 24-hour period.

Rules:

- the lock is per page, not global;
- previewing and voting are never blocked by this lock;
- only a successful public force operation starts the cooldown;
- the backend must enforce the cooldown;
- the frontend must display the remaining lock time;
- no key, including `theme_force`, bypasses the lock unless a separate emergency override is added in a future task;
- concurrent force requests must be handled transactionally so that only one succeeds.

### 5.5 Theme Audit Data

Store at least:

- page identifier;
- previous theme;
- new theme;
- timestamp;
- access-key or session audit identifier;
- optional note;
- action type.

---

## 6. Theme Quality and UI/UX Redesign

All current themes must be reviewed.

Weak, repetitive, or incomplete themes must be:

- improved;
- expanded;
- replaced;
- or removed from the enabled theme list.

New themes should differ in layout and interaction, not only in colors.

Examples of meaningful differences:

- editorial layout;
- poster layout;
- card-based layout;
- timeline layout;
- compact utility layout;
- accessibility-focused high-clarity layout;
- event-first landing layout.

Additional public pages should receive theme support where it provides real value.

The admin application must be redesigned as a coherent product rather than a collection of independent templates.

Admin redesign requirements:

- shared navigation;
- shared page headers;
- consistent tables, filters, forms, dialogs, badges, and empty states;
- responsive behavior;
- keyboard navigation;
- accessible labels and focus states;
- clear loading, error, and success states;
- reusable confirmation dialogs;
- optional admin themes using the same theme infrastructure.

The primary INCAS orange must remain exactly:

```text
#ff6600
```

Other colors, typography, spacing, and component styling may be improved.

The UI should meet WCAG 2.1 AA contrast and interaction requirements where practical.

---

## 7. Post and Event Publishing

### 7.1 Drafts

The post editor must support saving a post as a draft.

A draft:

- is stored in the backend;
- is not visible publicly;
- is editable later;
- may be converted to scheduled or published state;
- may contain incomplete optional fields.

Use an explicit publication status rather than relying only on a combination of booleans.

Recommended statuses:

```text
draft
scheduled
published
archived
```

### 7.2 Templates

Admins with post-management permission must be able to:

- save the current post as a reusable template;
- create a post from a template;
- update a template;
- duplicate a template;
- delete a template;
- distinguish templates from drafts and published posts.

Templates may contain:

- title pattern;
- body;
- event type;
- registration settings;
- default image URL;
- social publishing settings;
- payment settings.

### 7.3 Scheduled Publishing

Admins must be able to choose a future publication date and time.

Requirements:

- use the configured local timezone, Europe/Berlin;
- scheduled posts must become public automatically;
- scheduled social publishing must be triggered at the same publication time;
- failed scheduled jobs must remain visible and retryable;
- publication must not depend on a user keeping the admin page open.

### 7.4 Editor UX

The editor must clearly separate:

- content;
- event details;
- registration settings;
- media;
- publication status;
- schedule;
- social channels;
- payment settings.

Add unsaved-change protection and a preview mode.

---

## 8. Static Demo Build

Create a static demo version of the site deployable with GitHub Actions, preferably to GitHub Pages.

### 8.1 Goals

The demo must:

- run without Python;
- run without a database;
- run without private tokens;
- reuse the production React code;
- demonstrate major public pages and selected admin panels;
- include realistic fixture data;
- clearly indicate demo-only actions.

### 8.2 Data Abstraction

All React pages must consume typed data through a provider interface.

Production mode:

```text
React -> Flask JSON API -> database/integrations
```

Demo mode:

```text
React -> local JSON/TypeScript fixtures
```

Do not fork or copy full page implementations for demo mode.

### 8.3 Demo Behavior

Actions that require a backend must either:

- run against an in-memory demo state;
- show a deterministic simulated result;
- or display a clear “Demo mode” notice.

The demo should cover at least:

- landing page;
- calendar;
- theme switching;
- theme voting UI;
- Language Tandem blind interface;
- post editor draft/template UI;
- karaoke queue;
- team page.

### 8.4 GitHub Actions

Add workflows for:

- frontend install;
- type checking;
- frontend tests;
- production build;
- demo build;
- deployment of the demo artifact.

The demo workflow must be documented in the repository.

---

## 9. Karaoke Waiting List and Song Queue

Add a queue for karaoke events.

### 9.1 Public User Flow

A visitor can submit:

- display name or nickname;
- song title;
- artist;
- optional note;
- optional contact field if required by the event.

A request is not placed into the live queue until approved.

The visitor must receive a public tracking identifier or tracking link.

The visitor can view:

- request status;
- current approved queue position;
- whether the request was rejected or cancelled;
- an estimated “coming soon” indicator if implemented.

Do not expose private contact data in the public queue.

### 9.2 Queue Statuses

Recommended statuses:

```text
pending
approved
rejected
queued
performing
completed
cancelled
```

A simpler internal state machine is acceptable if it preserves the required behavior.

### 9.3 Karaoke Admin Panel

Admins with `karaoke_queue` can:

- approve a request;
- reject a request;
- cancel a request;
- move a song up or down;
- drag and drop to reorder;
- mark a song as performing;
- mark a song as completed;
- restore an accidentally cancelled request where safe;
- filter by status;
- view an audit history.

Reordering must be safe under concurrent admin actions.

The queue must be attached to a specific karaoke event.

### 9.4 Updates

The public queue should update without a full page refresh.

Acceptable implementation options:

- polling;
- Server-Sent Events;
- WebSocket.

Polling is acceptable for the first implementation.

---

## 10. Facebook and Instagram Publishing

Create a social-publishing integration layer for Facebook and Instagram.

### 10.1 Architecture

Implement provider adapters on the Flask backend.

Recommended interface:

```text
SocialPublisher
  publish_post()
  schedule_post()
  get_status()
  retry()
```

Do not put access tokens in the React frontend.

### 10.2 Publish Flow

When an admin publishes a post and enables social publishing:

- publish the local INCAS post;
- publish to Facebook;
- publish to Instagram;
- store the result separately for each channel;
- show partial failures;
- allow retrying a failed channel without duplicating successful channels.

A social failure must not automatically delete or roll back the local post.

### 10.3 Stored Integration Data

Store as available:

- provider;
- provider post/media ID;
- permalink;
- externally hosted media URL;
- publication status;
- error code;
- error message;
- attempt timestamps;
- retry count.

The INCAS application should not permanently store a local cover-image file when an external URL is available.

Use an external image URL in the post data. If the provider returns a stable hosted image URL, replace or supplement the original image reference with that URL.

Do not assume that every provider returns a direct permanent image URL. Preserve a valid fallback URL and the provider permalink.

### 10.4 Stub Mode

The integration must be usable without real credentials.

When credentials are absent:

- use a mock adapter;
- return realistic simulated provider responses;
- mark the result as simulated;
- keep the UI and database flow testable;
- do not attempt real network requests.

Add environment-variable documentation and never commit tokens.

---

## 11. Payment Integration

Add provider-based payment functionality with a working stub mode.

### 11.1 Backend Responsibilities

The Flask backend must:

- create payment sessions;
- validate amounts;
- store payment state;
- process provider callbacks or webhooks;
- update event registration status;
- prevent client-side price manipulation;
- support test and mock modes.

### 11.2 Frontend Responsibilities

The React frontend must:

- start checkout;
- display pending, paid, failed, refunded, and cancelled states;
- show clear recovery actions;
- never receive secret provider credentials.

### 11.3 Suggested Payment Statuses

```text
not_required
pending
paid
failed
cancelled
refund_pending
refunded
```

### 11.4 Stub Mode

Without provider credentials:

- create a simulated checkout session;
- allow deterministic success and failure paths;
- update the same backend models used by the real provider;
- visibly label the transaction as simulated.

The payment layer should be provider-agnostic. A concrete provider such as Stripe may be used as the first implementation, but provider-specific logic must remain behind an adapter.

---

## 12. Team and Organization Content

Add team-member sections to the relevant “About”, “Team”, and organization pages.

Data must not come from the database.

Create a JSON-like source object, preferably TypeScript, for example:

```text
frontend/src/content/team.ts
```

Each member entry should support:

```ts
type TeamMember = {
  id: string;
  name: string;
  role: string;
  description: string;
  imagePath: string;
  links?: {
    label: string;
    url: string;
  }[];
};
```

Requirements:

- programmers can manually edit names, descriptions, roles, and image paths;
- a default avatar is used when an image is missing;
- a default placeholder description is used when no description is supplied;
- the same content source works in production and demo mode;
- provide several visual layout variants through the page-theme system;
- missing images must not break the page.

Do not create admin CRUD or database tables for team members in this task.

---

## 13. API Requirements

Use versioned JSON APIs.

Suggested endpoint groups:

```text
/api/v1/session
/api/v1/access/unlock
/api/v1/public/config
/api/v1/public/posts
/api/v1/public/calendar
/api/v1/public/team
/api/v1/admin/themes
/api/v1/admin/theme-votes
/api/v1/admin/theme-forces
/api/v1/admin/posts
/api/v1/admin/post-templates
/api/v1/admin/language-tandem
/api/v1/admin/karaoke
/api/v1/admin/social
/api/v1/admin/payments
```

API requirements:

- consistent JSON error format;
- server-side validation errors mapped to fields;
- pagination for large admin lists;
- filtering and sorting on the backend where needed;
- CSRF protection or an equivalent secure write-request strategy;
- no secrets or personal information in public endpoints;
- capability checks on every protected endpoint;
- audit logging for sensitive actions.

Recommended error format:

```json
{
  "error": {
    "code": "theme_force_locked",
    "message": "This page theme cannot be changed yet.",
    "details": {
      "availableAt": "2026-07-08T14:30:00+02:00"
    }
  }
}
```

---

## 14. Data Model Additions

Exact names may change, but the backend will likely need models equivalent to:

- `PageThemeSelection`
- `PageThemeVote`
- `PageThemeAudit`
- `PostTemplate`
- explicit post publication status fields
- `KaraokeSongRequest`
- `KaraokeQueueAudit`
- `SocialPublication`
- `PaymentTransaction`

Database migrations must be explicit and repeatable.

Do not continue adding schema changes through silent `ALTER TABLE` statements wrapped in broad exception handlers. Introduce a real migration mechanism, preferably Alembic or Flask-Migrate.

---

## 15. Security and Privacy

Mandatory rules:

- permissions are enforced in Flask;
- blind Language Tandem mode excludes private fields from API responses;
- social and payment secrets remain server-side;
- access keys are never written to client logs;
- stored access keys should be hashed where practical;
- audit identifiers should not expose the raw key;
- personal data must not be included in the static demo;
- demo fixtures must be synthetic;
- write endpoints must be protected against CSRF or equivalent attacks;
- rate-limit public submission endpoints where practical;
- validate external URLs before displaying or storing them;
- sanitize rich post content before rendering.

---

## 16. Testing

### 16.1 Backend Tests

Add tests for:

- permission checks;
- blind tandem serialization;
- theme force cooldown;
- theme voting;
- concurrent theme-force attempts;
- draft and scheduled publication;
- template operations;
- karaoke state changes and reordering;
- social mock adapter;
- payment mock adapter;
- scheduled tasks;
- public/private data separation.

### 16.2 Frontend Tests

Add tests for:

- theme preview and voting;
- capability-based control visibility;
- blind tandem UI;
- post editor state;
- draft/template flow;
- karaoke queue management;
- demo provider behavior;
- error and loading states.

Use TypeScript type checking as a required CI step.

### 16.3 End-to-End Tests

Add a small end-to-end suite for:

- unlocking an admin capability;
- previewing and forcing a theme;
- verifying the 24-hour lock;
- saving a draft and scheduling it;
- submitting and approving a karaoke song;
- running simulated social publishing;
- running simulated payment.

---

## 17. Delivery Phases

### Phase 1 — Frontend Foundation

- start from `react`;
- establish React router, app shell, API client, capability store, and shared design system;
- keep Flask as the backend;
- create production and demo data providers;
- add CI type checking and builds.

### Phase 2 — Public Frontend Migration

- migrate landing page;
- migrate calendar;
- migrate content pages and forms;
- migrate Language Tandem public form;
- add theme registry.

### Phase 3 — Admin Frontend Migration

- migrate admin corridor/dashboard;
- migrate posts and events;
- migrate forms;
- migrate access-key management;
- migrate Language Tandem into one capability-based panel;
- redesign all panels.

### Phase 4 — Theme Governance

- add review and force scopes;
- add previews;
- add voting;
- add 24-hour force lock;
- add theme audit history.

### Phase 5 — Publishing and Integrations

- drafts;
- templates;
- scheduled publication;
- Facebook and Instagram adapters;
- payment adapter and stubs.

### Phase 6 — Karaoke and Team Content

- karaoke request flow;
- queue management;
- public queue tracking;
- team content object;
- team page variants.

### Phase 7 — Static Demo and Hardening

- complete GitHub Actions deployment;
- add synthetic fixtures;
- finish tests;
- accessibility review;
- migration cleanup;
- remove obsolete Jinja UI after feature parity is confirmed.

---

## 18. Acceptance Criteria

The task is complete when all of the following are true:

1. The backend is still Python/Flask.
2. All primary public and admin interfaces are implemented in React and TypeScript.
3. The implementation is based on the `react` branch.
4. Normal visitors cannot manually select hidden page variants.
5. Theme-enabled pages have one public active theme.
6. Users with `theme_review` can preview themes and vote.
7. Users with `theme_force` can force themes.
8. A page theme cannot be forced more than once in 24 hours.
9. The Language Tandem admin panel is unified.
10. The weakest Tandem capability can match records without receiving personal data.
11. Admin panels use a consistent redesigned interface.
12. Weak themes are improved, disabled, or replaced.
13. Posts support drafts, reusable templates, and scheduled publication.
14. A static demo builds without Python and reuses the production React components.
15. GitHub Actions can build and deploy the demo.
16. Karaoke visitors can submit and track song requests.
17. Karaoke admins can approve, cancel, and reorder songs.
18. Facebook and Instagram publishing use backend adapters and work in mock mode without tokens.
19. Payment functionality uses backend adapters and works in mock mode without credentials.
20. The primary color remains `#ff6600`.
21. Team-member content comes from a manually editable JSON-like frontend object, not the database.
22. Production and demo builds pass type checking and automated tests.
23. Personal data is not exposed through blind or public endpoints.
24. Obsolete Jinja interfaces are removed after React feature parity is verified.

---

## 19. Out of Scope

Unless required to complete the items above, the following are out of scope:

- rewriting the Flask backend in Node.js;
- introducing a full user-account system;
- storing team members in the database;
- implementing real social publishing without credentials;
- implementing real payments without provider credentials;
- native mobile applications;
- multiplying theme votes based on how many keys a session has unlocked;
- bypassing the 24-hour theme lock.

---

## 20. Implementation Notes

- Prefer TypeScript over JavaScript.
- Prefer reusable feature modules over page-specific scripts.
- Keep public and admin routes stable where practical.
- Preserve existing backend behavior during migration.
- Add compatibility redirects for changed frontend routes.
- Use typed API contracts.
- Keep the orange brand token centralized as `--incas-orange: #ff6600`.
- Avoid storing generated frontend bundles manually when CI can build them, unless production deployment requires committed assets.
- Document local development for Flask and Vite together.
