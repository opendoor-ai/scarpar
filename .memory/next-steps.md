# 전자동기계광고 — Next Steps (ordered)

> SaaS/platform work (billing, plans, custom domains, platform ops, production trust) now has its own
> canonical, phased plan: `docs/saas-roadmap.md`. §1-5 below remain the immediate wiring steps for the
> template itself — do the roadmap once this repo is carrying a real org, not before.

## 1. Connect a Supabase project
1. Create a project at supabase.com.
2. SQL Editor → paste and run, **in order** (each depends on the previous): `supabase/migrations/
   0001_core.sql` → `0002_commerce.sql` → `0003_delivery_cms_ops.sql` → `0004_storefront_public_org_read.sql`.
3. Optional demo data → also run, in order: `supabase/seed/01_core.sql` → `02_commerce.sql` →
   `03_delivery_cms.sql` — or paste `supabase/seed.sql` (same 3 files concatenated behind section
   headers) in one shot. These are idempotent upserts and create a demo org (slug `demo`) but **zero**
   `auth.users`-linked rows — no profile/membership is created for you. To see the demo org after you
   sign up, run the commented `insert into org_members (...) values (..., 'YOUR-AUTH-UID', 'owner')`
   block at the end of `01_core.sql` with your real auth UID (Supabase dashboard → Authentication →
   Users).
4. Project Settings → API → copy the Project URL, anon key, and service_role key into `.env.local`
   (`cp .env.example .env.local` first).
5. `npm install` (if not already done) → `npm run dev`.
6. Visit `/signup`, create an account, complete the `/onboarding` wizard. This creates your own org
   (independent of the seeded `demo` org unless you linked yourself to it in step 3).

## 2. Create your first real org via onboarding
Pick a vertical preset (ecommerce / courses / services / realestate) — this sets `enabled_modules` for
that org. The optional "load demo data" checkbox runs `src/lib/demo-seed.ts`, giving you a working CMS
home page + sample content immediately, scoped to your new org.

## 3. Go-live integrations
Priority order, with the real state of each (see `.memory/feature-list.md` for the full breakdown —
two of these are NOT simple config fills):
1. **CJ대한통운 / 한진택배 courier** — config fill only. Admin → courier settings → enter API keys
   (CJ대한통운: `api_key`/`secret_key`; 한진택배: OAuth client credentials). The adapters
   (`src/lib/couriers/cj.ts`, `hanjin.ts`) already call the real endpoints; they're gated by
   `ConfigRequiredError` until keys exist.
2. **SMS provider** — pick one from the spec's BD list (`scarper/features.md` §19: BulkSMSBD, AlphaSMS,
   SSL Wireless, etc.) and replace the `console.log` stub in the `sms` channel adapter in
   `src/lib/notify.ts`.
3. **Email provider** — same file, `email` channel adapter.
   (삭제된 결제 연동 관련 메모), org resolved via `?org=` query param — createCharge()
   embeds that into the `webhook_url` it registers). What's still missing: nothing calls
   `createCharge()` from checkout yet, and the webhook route logs-and-200s instead of actually calling
   `verifyPaymentAction` (`src/modules/orders/actions.ts`) — both TODO'd inline. Settings keys and the
   `payment_method` enum value already exist.
   `checkCustomerRisk(orgSettings, phone): Promise<FraudCheckResult | null>` (never throws — logs and
   itself still just throws "not implemented" (no public API docs found to build a real request
   against). Still needed: call `checkCustomerRisk()` from the checkout fraud step in
   `src/modules/storefront/actions.ts` (currently blocklist-only) and map its `riskLevel` to
   `fraud.high_risk_action` (see JSDoc on `checkCustomerRisk` for the exact mapping). The
   `fraud.provider` setting already exists and just needs a real branch to read.

## 4. Deferred-features shortlist worth building next
In priority order, by leverage vs. effort:
1. **Reservation inventory** (multi-warehouse-ready) — smallest lift of the three; extends the existing
   `inventory_movements` ledger pattern with a reserve-on-add-to-cart step. Prevents oversell during
   flash sales.
2. **Customer OTP accounts** — do alongside step 3.2 above (same SMS provider). Turns guest-checkout
   customers into returning logged-in accounts; spec marks this Core-tier.
3. **Abandoned-cart recovery** — biggest lift: requires moving the cart from localStorage to a
   server-side cart table first (a real architecture change, not additive), then an email/SMS trigger
   on cart-idle.

## 5. Productionization
- Vercel deploy — see `docs/deployment.md` for the full steps.
- Custom domain per org — not built; `docs/deployment.md` has the middleware host→org mapping sketch.
- Backup policy — confirm Supabase plan; automatic backups are a paid-plan feature, not default on
  free tier.
- Error monitoring — nothing is wired today beyond `console.error` calls; add Sentry (or similar)
  before relying on this in production.
- Test framework — none exists yet (decisions #11); `tsc --noEmit` + `next build` are the only quality
  gates today. Add one before this grows past template stage.

## 6. Claude Code skill — DONE (2026-07-12, same session)
`jadong-builder` installed at `~/.claude/skills/jadong-builder/` (lint 0 ERROR / 0 WARN). Four
modes: NEW (clone template), INTEGRATE (copy-in playbook for existing Next.js sites — merge points:
middleware, root layout, globals tokens, deps, migrations w/ collision check), EXTEND (module /
CMS-block / vertical / adapter recipes), OPERATE (Supabase wiring + /ship deploy runbook). It
defers to this repo's docs/ as ground truth. Triggers on new client builds, or any
session inside a 전자동기계광고 기반 repo.

## 7. Codegraph — DONE (2026-07-12, same session)
`codegraph init` ran clean (exit 0); `.codegraph/` exists (gitignored). Use `codegraph explore`
for structure questions here.
