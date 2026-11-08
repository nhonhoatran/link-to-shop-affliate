# Phase 5 admin report

Created: newsletter page + loading, admin-newsletter-api, components/admin/newsletter/{copy,list-query,list-filters,list-table,row-actions}, settings-newsletter-consent-fields, 5 test files.
Modified: admin-paths, admin-nav (+Mail icon), settings-form, settings-form-state, settings-form-errors, admin.module.css (.title serif), admin-list.module.css (th/badge small caps), overview.module.css (kpiValue serif), login-page.module.css (siteName serif), admin-nav.test, settings-form.test.

Notes
- Contract paths used: export = /api/admin/newsletter/export (not export.csv); unsubscribe = POST adminNewsletterUnsubscribe(id); delete = DELETE adminNewsletterSubscriber(id). P2 routes did not exist yet when coded.
- Settings always sends newsletterConsent (PUT replaces doc), so first Save publishes the prefilled default sentence; note text says "Bam Luu de bat".
- Not done: visual review in browser (2 themes), editor try-out with new sections (needs P4), live run vs P2 API.

Checks
- vitest test/admin + test/app/admin-*: 314 tests pass; 3 files fail to load (admin-home-preview-page, home-preview-pane, home-editor-screen): hero-slider-autoplay.tsx (P4, in progress) imports `buttons` twice.
- tsc: only the same 2 errors (hero-slider-autoplay.tsx 5,6 TS2300).
- eslint on touched dirs: clean.
