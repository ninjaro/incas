# Public Content Maintenance

Use this checklist whenever an About page, Offer page, or offer-card record is
changed.

- Keep page ownership explicit: every authored page belongs to `about` or
  `offers`; do not expose a slug through both sections.
- Keep the Offers catalog in `SITE_OFFERS`. Do not recreate an authored HTML
  overview grid in `SITE_PAGES`.
- Put changing weekday, start-time, registration, capacity, deposit, and price
  values in the event-kind registry or event record. Static prose should point
  readers to the current event instead of copying operational values.
- Review English and German together for frequency, location, registration,
  and pricing meaning.
- Supply localized alt text and verified image dimensions for meaningful
  images. Use empty alt text only for decorative images.
- Render FAQ content as real disclosures or honest static headings and
  answers. Do not add inactive Bootstrap collapse markup.
- Run `python -m app.export_site_content`, backend content-contract tests,
  frontend tests, and responsive/accessibility browser checks.
