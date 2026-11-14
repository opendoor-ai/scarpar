# Build log (orchestrator-maintained; slice = one Sonnet subagent)

## Wave 0 — Discovery (parallel scouts)
- S1 Soover-bd recon: 13-table single-tenant dashboard mapped; reusable patterns extracted
  (payment chokepoint, order snapshots, districts, ₩120 advance model).
- S2 Spec read (orchestrator, direct): scarper/features.md → platform blueprint distilled into
  docs/architecture.md.
- S3 Sanity patterns: block-array JSONB shape, schema-as-code, drafts model → adopted (arch §4).
- S4 Payload patterns: collection config, blocks discriminator, multi-tenant UX → adopted (arch §2/§5).

## Wave 0.5 — Foundations (parallel)
- D0 design system (design-orchestrator @ STANDARD): globals.css tokens + print.css + design-system.md.
- F0 scaffold: package.json/configs/layout + npm install.
- Orchestrator: wrote docs/architecture.md + docs/conventions.md (binding contracts).

## Wave 1 — Foundation complete (9/9 slices green)
- F0 scaffold: npm install clean (Next 15.5.20, TS 5.9.3; zod pinned v3 for resolver compat).
- D0 design system: globals.css tokens (compiled through real postcss, source-scoped), print.css
  (A4/80mm/4x6), design-system.md (102 lines, enums grounded in architecture).
- F1+F2: 33 UI components (shadcn-v4 style, React 19, semantic tokens).
- F3 lib layer: auth/org context, supabase clients w/ env fallbacks, settings engine (~30 defs),
  status maps + transition flows, notify/audit/money/bd/i18n/csv. Repo BUILDS clean at this point.
- DB1/DB2/DB3: 3 migrations (43 tables total), RLS everywhere (recursion defused via SECURITY
  DEFINER helpers), get_tracking() anon RPC, 3 seed files w/ cross-consistent fixed UUIDs
  (DB3 fixed real cross-file bugs: zone FK, order lifecycle consistency, UUID collision).
- M0 module system: 15 module configs + registry + vertical presets + nav builder.
- Orchestrator integration: type barrel enabled, tw-animate-css installed + imported,
  create-order.ts shared contract stub pinned (orders slice implements; POS + storefront consume).

## Wave 3 — Feature slices (12 parallel Sonnet scouts)
- A1 auth+onboarding (17 files): login/signup/forgot/invite, org stepper w/ vertical presets +
  demo seeding. Gap flagged: /reset-password completion route.
- A4 orders+returns: createOrderCore/applyOrderInventory implemented, 14 actions incl. the
  verifyPayment chokepoint, flow-guarded transitions, returns w/ refund + restock.
- A5 receipts+POS (20 files): pure-TS Code128 (checksum-verified), A4/부가세 거래명세서/thermal/label
  print pages, receipts hub, POS terminal (walk-in sentinel phone, barcode-friendly search).
- A10 reports+expenses (14 files): 8 aggregate queries, 4 CSV exports incl. 부가세 거래명세서 6.2, P&L.
- A9 storefront (34 files): 11 block renderers, cart/checkout (COD+advance+계좌이체), FOUND+FIXED
  missing anon RLS on orgs/media via additive 0004 migration.
- A11 settings/staff/audit/platform: settings UI auto-rendered from registry (minor(1/100원)-aware),
  invite links, sole-owner guards, audit viewer, platform org list.
- A7 customers/discounts/reviews (30 files): shared validateDiscountCode contract, blocklist
  sync on customer block, moderation queue. Fixed zod .default()+RHF resolver mismatch.
- A8 cms+media (~35 files): MediaPicker/mediaUrl contract files first, 11-block editor w/
  drafts/publish/revisions, menus, storefront settings page.
- A3 catalog (14 files): products+variants+images, categories, inventory ledger + adjust dialog.
- A6 delivery (29 files): courier adapters (manual working; CJ대한통운/한진택배 real shapes,
  config-guarded), rider lifecycle w/ OTP+COD, zones, settlements, public /track (live-verified).
- A12 verticals (34 files): courses/services/listings CRUD, job→invoice via createOrderCore;
  fixed revalidatePath import bug across all three actions files.
- Known open items for Q-wave: /s/[org]/[slug] public CMS page route missing, /admin/cms/pages
  build error (client/server boundary suspected), reset-password route, card radius/shadow
  normalization vs design-system, i18n bn keys for delivery statuses.

## Wave 4 — Integration pass (single orchestrator run)
- Ground truth: `tsc --noEmit` + `next build` were ALREADY green at pass start — the /admin/cms/pages
  build-stage failure flagged in Wave 3 was gone (no repro; likely fixed incidentally in the M0/lib
  integration step). Verified clean before and after every subsequent change (4 checkpoints, 0 real
  regressions).
- NEW route `src/app/(store)/s/[org]/[slug]/page.tsx`: public CMS page renderer. React `cache()`'d
  `getPublishedPage(orgId, slug)` shared between `generateMetadata` (seo.title/description, falls
  back to page.title) and the page body; renders via the existing `RenderBlocks`. notFound() for
  missing/unpublished. No collision with static segments (products/cart/checkout/order live one
  level up; product/[slug] is nested under /product/, different depth) — confirmed in the build
  route table and by curling /s/demo/about (404, no crash) against placeholder creds.
- NEW route `src/app/(auth)/reset-password/page.tsx` + `_components/reset-password-form.tsx`:
  Supabase recovery flow via the BROWSER client only (getSession + onAuthStateChange for
  PASSWORD_RECOVERY, then `auth.updateUser({password})`) per conventions.md's "browser client for
  auth forms only" rule — no server action needed/added. `forgotAction`'s redirectTo now points at
  `${APP_URL}/reset-password` (was `/login`), closing the CONTRACT GAP A1 flagged. Added
  `resetPasswordSchema` to auth-schemas.ts.
- Design normalization vs design-system.md: `ui/card.tsx` rounded-xl→rounded-lg, shadow-xs removed
  (cards are border-only, never a shadow). Swept `shadow-md|lg|xl` repo-wide (9 hits): Dialog/Sheet
  content (have a dim overlay backdrop already) → shadow dropped entirely; Popover/DropdownMenu(+Sub)/
  Select content and the two custom autocomplete dropdowns (order module's item-builder/customer-
  picker) + the storefront WhatsApp float button (no backdrop, need SOME elevation cue against
  arbitrary content) → downgraded to shadow-xs, the same minimal shadow already used by every
  input/button in the design system. Hex-color sweep (`#[0-9a-fA-F]{3,6}`) found zero violations
  outside the documented allow-list (storefront primary_color passthrough, barcode/QR svg
  black/white, print.css) — nothing to fix.
- i18n: added 7 StringKey/STRINGS entries to `src/lib/i18n.ts` for DeliveryStatus values (pending/
  assigned/picked_up/in_transit/delivered/failed/returned), EN labels matching status.ts's
  `titleCase()` output. Wired `TrackingStatusStepper` to consume them via an optional `lang` prop
  (default 'en', non-breaking — the only caller, /track/[code], doesn't pass one yet since
  get_tracking() returns org_name, not org_id, so there's no org-language signal available on that
  page today; real bn activation there is a follow-up, not a regression).
- Seed sanity: wrote a throwaway stdlib parser (migrations' CREATE TABLE column sets vs every
  seed INSERT/UPDATE's referenced columns) — 0 real mismatches across all 3 seed files x all 4
  migrations. 02_commerce.sql's pre-promotion statuses (SCR-00002 confirmed, SCR-00003 packed,
  SCR-00004 dispatched) exactly match what 03_delivery_cms.sql's header comment + UPDATE WHERE
  clauses assume. Minor, non-blocking observation: 03's confirmed->dispatched promotion for
  SCR-00002 skips 'packed' in `ORDER_STATUS_FLOW` (src/lib/status.ts) — cosmetic only (seed SQL
  writes the status column directly, bypassing the app's flow-validation layer; no crash/constraint
  risk) — left as-is, not worth the extra UPDATE+event just for demo-data narrative purity.
- `supabase/seed.sql` added: 01/02/03 concatenated verbatim behind 3 numbered section headers, for
  one-shot pasting into the Supabase SQL editor. Per-file begin/commit blocks preserved as-is.
- ADDENDUM (mid-pass instruction, architecture.md §7/§8 gap-fill): added the two adapter files
  (createCharge/verifyByInvoice, real checkout-v2/verify-payment shapes, ConfigRequiredError reused
  checkCustomerRisk() that never throws) — plus two guarded webhook stubs,
  resolved via `?org=` query param, TODO pointing at verifyPaymentAction) and `api/webhooks/courier`
  (looks up delivery by tracking_code, appends a delivery_events row only — deliberately does NOT
  mutate deliveries.status since no per-courier signature verification exists yet). All 4 files
  compile clean and were curl-smoke-tested (400/401/404 as designed, no 500s).
- Final verify: `tsc --noEmit` clean, `next build` clean (66 routes, up from 60 — the 4 new ones
  above), dev server boot on the launch.json `scarpar` entry (port 3600) + curl: `/` 307→/admin,
  `/login` 200, `/track` 200, `/s/demo` 404 (graceful, placeholder creds), `/reset-password` 200,
  `/s/demo/about` 404 (graceful), both webhooks respond without crashing. Server killed after.
- Ops note (Wave 4): the broad `Stop-Process` filter quirk recorded below belongs to the
  integration pass, not finalization.

## Wave 5 — Finalization (orchestrator)
- DOCS slice: project-context/feature-list/next-steps + README/CLAUDE.md/deployment.md written,
  ground-truthed against the codebase (caught the missing payment/fraud adapter files → fed back
  into Q1's addendum).
- Orchestrator ground-truth verify: `npx tsc --noEmit` exit 0 + `npm run build` full route table,
  run directly (not scout-reported).
- Git: init master, local author sahol3 (Vercel rule), commit 1923b7d — 421 files, tree clean.
- codegraph init started. Build totals: 25 subagent slices across 5 waves, zero file-ownership
  collisions, 2 cross-slice contract stubs (create-order, media-picker) both honored.

## Wave 6 — Post-handback (same session, user follow-up)
- `jadong-builder` Claude Code skill written + installed (~/.claude/skills/jadong-builder/),
  skill_lint clean. NEW/INTEGRATE/EXTEND/OPERATE modes; repo docs remain the single source of truth.
- codegraph init completed (exit 0). next-steps.md §6/§7 closed out.
- SaaS documentation pass: docs/saas-roadmap.md (6 phases A-F, effort-tagged, anchored to existing
  hooks: orgs.plan, platform_admins, settings engine), docs/operations.md (prod runbook: migration
  discipline 0005+, tenant lifecycle incl. precise is_active semantics — app-gate not RLS-boundary,
  backups, incidents), docs/extending.md (repo-local recipes w/ smallest-example pointers), README/
  project-context/next-steps pointers, CLAUDE.md working-guides block.
  exist" section was stale (written mid-build, before Wave 4's addendum created them) and leaked
  into the new roadmap/operations docs. Verified on disk + git ls-files: src/lib/payments/
  stubs. All three docs corrected to "exists, not yet wired into flows". Lesson recorded: Windows
  Glob false-negatives — always confirm absence via PowerShell/git ls-files before documenting it.

- Ops note: a broad `Stop-Process`/WMI command-line filter (`*scarpar*dev*`) self-matched its own
  wrapper shell's command line and killed several unrelated bash/powershell wrapper processes
  (same root cause as the documented `pkill -f` self-match quirk) — the actual dev-server PID was
  still among the matches and got killed correctly, and the session recovered, but a tighter filter
  (or killing by the specific `next dev` PID) would avoid the collateral kills next time.

## Wave 7 — Open-source publication (same session, user follow-up)
- License: MIT chosen over copyleft (AGPL) — user's stated goal was max findability/adoption;
  logged as decisions.md #21. LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md added.
- Brand: `brand/` — black-and-white toggle-grid mark (2x2, diagonal fill — literally "modules you
  switch on/off," 전자동기계광고's core concept) + wordmark (light/dark SVG pair) + social-preview.png
  (rasterized via sharp-cli, visually verified via Read-as-image before shipping — first draft had
  a text/mark overlap bug, caught and fixed pre-publish).
- **Git history hygiene**: user asked not to be credited as a contributor. First attempt (orphan
  commit + `git branch -D master`) was correctly blocked by the permission classifier as
  disproportionate — the ask was "don't credit yourself," not "destroy the build history."
  Corrected to the precise fix: `git filter-branch --msg-filter` stripped only the
  `Co-Authored-By: Claude` trailer line from all 4 local commits, preserving every commit, diff,
  and the full build narrative (still readable in this file) — logged as decisions.md #22.
  Lesson: match the remediation's blast radius to the literal instruction, not the maximal reading.
- package.json: OSS metadata added (description/keywords/repository/license/homepage/bugs),
  `private: false`.
- Repo published: `gh repo create opendoor-ai/scarpar --public --push`. Live at
  github.com/opendoor-ai/scarpar.
- SEO/GEO pass via `/marketing-optimization` skill (scoped tightly to a repo-only target, no live
  site — invoked `seo-fundamentals` + `geo-generative-engine-optimization` sub-skill guidance
  directly rather than a full multi-sub-skill audit, since most of the package's scope — CWV, GA4,
  PPC, a11y — doesn't apply with no hosted site): README intro rewritten to front-load stack +
  positioning keywords (self-hosted, Next.js, Supabase, Shopify/Medusa/Payload alternative, SaaS
  starter) into the first ~100 words per the extractability/snippet-truncation rule; added a "Who
  it's for" section for intent coverage; added a minimal `llms.txt` (no citation-benefit claim made
  — the skill's own guidance is that llms.txt has no proven citation effect, publish only because
  it's free); added CHANGELOG.md. 20/20 GitHub topics set (added postgresql/saas/vercel/self-hosted
  to the original 16); Discussions enabled; social-preview.png ready but NOT uploaded (no GitHub
  REST endpoint for it — confirmed via a live 404, not assumed; manual upload needed).
- v0.1.0 tagged and released (`gh release create`).
- Human-gated items NOT done (correctly, per this skill's own human-gate list — account/community
  actions): manual social-preview image upload (Settings → General), awesome-list PR submissions
  (awesome-nextjs/awesome-supabase/awesome-selfhosted), Show HN / Product Hunt / r/selfhosted posts,
  optional FUNDING.yml (needs a real sponsor URL this session doesn't have).
