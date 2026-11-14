# 전자동기계광고 — Feature List

Grounded directly in the codebase (`src/app/(admin)/admin/*`, `src/modules/*`, `supabase/migrations/*`)
as of 2026-07-12, not just the architecture spec. Where the code diverges from `docs/architecture.md`,
this file reports what actually exists.

## BUILT — toggleable modules (`src/modules/registry.ts`, 15 total)

- **Catalog** (`/admin/products`, `/categories`, `/inventory`) — products + variants + images,
  nested categories (`parent_id`), stock ledger (`inventory_movements`, append-only) backing a
  denormalized `stock_qty`, low-stock threshold + backorder settings.
- **Orders** (`/admin/orders`, `/returns`) — full lifecycle (pending→confirmed→packed→dispatched→
  delivered→completed, plus cancelled/returned/failed), order-events timeline, returns with
  refund/store-credit/exchange + restock. `createOrderCore` (`src/modules/orders/create-order.ts`) is
  the one shared implementation used by admin orders, POS, and storefront checkout.
- **POS** (`/admin/pos`) — walk-in terminal: barcode-friendly product search grid, cart, cash/계좌이체
  tender → creates a `channel=pos`, `status=completed`, paid order → thermal receipt.
- **Delivery** (`/admin/deliveries`, `/delivery-zones`, `/riders`, `/cod`) — zones with per-district
  charge, rider lifecycle (assign→picked_up→in_transit→delivered with OTP check + COD-collected
  flag), COD settlements (rider cash-on-hand → batch settle), public `/track/[code]` via the
  `get_tracking()` RPC.
- **Receipts** (`/admin/receipts`) — A4 invoice, A4+부가세 거래명세서 6.3 variant (HS code + VAT columns), 80mm
  thermal, 4x6 courier label with a hand-rolled pure-TS Code128 barcode + QR-to-tracking-URL. All via
  `window.print()` (no Puppeteer). Doc numbering via the `next_doc_number` RPC.
- **Customers** (`/admin/customers`, `/blocklist`) — profiles + addresses, blocklist (phone/address/ip)
  — wired live into storefront checkout fraud flagging (see Fraud below).
- **Discounts** (`/admin/discounts`) — code or auto-apply, percent/fixed/free-shipping, scope by
  all/products/categories, usage caps + date window.
- **Reviews** (`/admin/reviews`) — product reviews, moderation queue (pending/published/rejected),
  verified-purchase flag.
- **Courses** (`/admin/courses`) — course + lesson CRUD, enrollments linked to orders.
- **Services** (`/admin/services`) — service jobs (quoted→scheduled→in_progress→done→invoiced),
  appointments, job→invoice via the shared `createOrderCore`.
- **Listings** (`/admin/listings`) — property listings (sale/rent, apartment/house/land/commercial),
  buyer inquiries.
- **CMS** (`/admin/cms/pages`, `/cms/menus`) — 11 block types (hero, richText, productGrid, banner,
  imageWithText, faq, testimonials, contact, listingsGrid, coursesGrid, html-escape-hatch), drafts +
  publish + revisions (keeps last 20), header/footer menus.
- **Storefront** (`/admin/storefront`) — theme/checkout settings surface (announcement bar, WhatsApp
  float number, accent color).
- **Reports** (`/admin/reports`) — 8 SQL-in-server-component aggregates (sales by day, orders by
  status, top products, COD success rate by district, delivery performance, expenses by category,
  simple P&L) + CSV export incl. a 부가세 거래명세서 6.2 sales register.
- **Expenses** (`/admin/expenses`) — category + amount + receipt-media tracking.

## BUILT — always-on core (not gated by `enabled_modules`)

- **Dashboard** (`/admin`) — widgets sourced from each enabled module's `dashboardWidgets`.
- **Media** (`/admin/media`) — org-namespaced Supabase Storage library (`{org_id}/…` paths, `media`
  bucket, public read, created by migration 0001).
- **Staff** (`/admin/staff`) — invite links (token, 7-day expiry), role assignment, sole-owner guard.
- **Audit Log** (`/admin/audit`) — before/after JSON viewer for every audited mutation.
- **Settings** (`/admin/settings`) — all ~30 keys auto-rendered from the registry across 10 groups.
- **Platform** (`/admin/platform`) — `platform_admins`-only cross-tenant org list.
- **Auth + onboarding** — login/signup/forgot-password/invite-accept, org-creation stepper (vertical
  picker + optional demo-data seeding via `src/lib/demo-seed.ts`).
- **Public storefront** (`/s/[org]`) — CMS-driven home, PLP (category filter + ILIKE search), PDP
  (gallery/variants/reviews), localStorage cart, checkout (COD / advance / manual 계좌이체, server-side
  price recomputation), order confirmation with track link.
- **Print routes** (`/print/invoice`, `/print/thermal`, `/print/label`) — bare layout + `print.css` +
  `<PrintButton/>`.
- **Public tracking** (`/track/[code]`).

## STUBBED-EXECUTION integrations — honest breakdown (two tiers, not one)

**Real guarded adapters** (real request/response shapes, throw `ConfigRequiredError` until an org fills
`courier_accounts`, otherwise fully wired):
- CJ대한통운 (`src/lib/couriers/cj.ts`) and 한진택배 (`src/lib/couriers/hanjin.ts`) courier APIs.
  The `manual` adapter (admin types in a tracking code) is fully working with no config needed.
- SMS and email notification channels (`src/lib/notify.ts`) — real `ChannelAdapter` interface, fans out
  per the `notifications.events` setting; v1 driver for both is `console.log` + audit trail (no
  provider wired yet).

**Adapter + route stubs exist, not yet wired into flows** (CORRECTED after the Wave 4 integration
pass built these; an earlier draft of this section — written mid-build, before that pass — said they
didn't exist and that stale claim briefly leaked into `docs/saas-roadmap.md`/`operations.md`, now
fixed. Ground truth verified on disk AND in git: `git ls-files 'src/app/api/*' 'src/lib/payments/*'
'src/lib/fraud/*'`):
  real checkout-v2/verify-payment request shapes, `ConfigRequiredError`-guarded on the
  shows a disabled state), and the webhook doesn't call the verify chokepoint (below).
  throws "not implemented" (no public API docs to code against), and checkout doesn't call
  `checkCustomerRisk()` yet — live fraud enforcement is blocklist-only (see below).
  settings (org via `?org=` query param), 401 on mismatch, logs + 200 on match; TODO'd to call
  `verifyPaymentAction` (the chokepoint) instead of log-and-ack.
- **api/webhooks/courier** — EXISTS: resolves delivery by `tracking_code`, appends a
  `delivery_events` note row only — deliberately does NOT mutate `deliveries.status` because there is
  no per-courier signature verification yet (that hardening is `docs/saas-roadmap.md` Phase E).

**Fraud that IS working today**: on storefront checkout, `src/modules/storefront/actions.ts` (~line
239, 380) queries `blocklist` by phone/address, sets `risk_level='high'` on a match, and applies the
org's `fraud.high_risk_action` (block / require_full_advance / flag). This is blocklist-based, not

## Known gaps (verified in code, not just carried over from the build log)

- **No `/reset-password` completion route.** `forgotAction` (`src/lib/actions/auth.ts`) sends
  Supabase's password-reset email but `redirectTo` points at `/login`, which cannot consume a recovery
  token. Marked in-code as a `CONTRACT GAP`.
- **No generic CMS page route on the storefront.** `/s/[org]` renders the CMS home page and
  product/category pages only; there is no `/s/[org]/[slug]` route for non-home `cms_pages` rows
  (type `page`/`policy`), so pages created in the CMS editor beyond Home have nowhere public to render.

## DEFERRED (spec tier from `scarper/features.md` §23; reason from `.memory/decisions.md` #19)

- **Loyalty (points/redemption)** — spec Marketing/Customer Should–Nice tier; v1 ships Core commerce
  only.
- **Gift cards** — not in spec's Core tier; grouped with promotions, deferred alongside loyalty.
- **Abandoned-cart recovery** — spec lists a basic abandoned-cart email as *Core*, but 전자동기계광고's cart is
  localStorage-only (decisions #8, Soover-bd pattern), so there's no server-side cart state to trigger
  from. Needs server carts first.
- **B2B price lists** — spec Orders "Nice" tier (draft/quote, B2B PO); no multi-price-list model exists.
- **Meilisearch** — spec Performance "Should" tier; v1 storefront search is Postgres `ILIKE` (per the
  spec's own note, fine under ~5k SKUs).
- **Multi-warehouse + inventory reservations** — spec Catalog "Should" tier; v1 is a single
  `stock_qty` per product/variant + append-only `inventory_movements` ledger (decisions #7), no
  reserve-on-add-to-cart model.
- **Customer OTP login** — spec Customer "Core" tier, but deferred here: storefront is guest-checkout
  (phone-keyed `customers` table). Needs an SMS provider; the notify-channel interface point already
  exists (decisions #9).
- **Wishlist** — spec Customer "Should" tier; not built.
- **WhatsApp BSP (Interakt/Wati)** — spec Notifications "Should" tier; only a `storefront.whatsapp_number`
  float-button link exists — no BSP messaging/broadcast integration.
- **PDF generation service** — spec §18 suggested Puppeteer or `@react-pdf/renderer`; decisions #5
  chose browser print→PDF instead (zero deps, correct 한국어 rendering). A server-side PDF service
  (e.g. for emailed invoices) is deferred, not missing-by-oversight.
- **Courier auto-pick by region** — spec Fulfillment "Should" tier; v1 courier choice is manual per
  delivery, no `couriers.by_region` rule engine.
- **RFM / cohort analytics** — spec Analytics "Should" tier; v1 reports are the 8 aggregates listed
  above, no segmentation or CLV.
- **Platform billing (plan/entitlement enforcement)** — spec §17.1 Layer 1; `orgs.plan` is a free-text
  column with no billing logic, plan-gated features, or payment collection behind it.
- **Custom domains per org** — decisions #15: storefront is path-based `/s/[orgSlug]` only;
  wildcard-DNS + middleware host-mapping is a documented next-step (see `docs/deployment.md`), not
  built.
- **App marketplace** — spec Integrations "Advanced" tier; not started — no public API, webhooks
  surface, or app-install flow exists (the two internal webhook routes above are unauthenticated-
  inbound stubs, not a public API surface).
