# 전자동기계광고 — Project Context

## What it is
전자동기계광고 is a multi-tenant, module-based CMS + commerce + business-management platform built for
한국 businesses. One Next.js deployment serves many independent organizations ("orgs"); each
org enables a set of modules and picks a vertical preset (ecommerce / courses / services /
realestate) that pre-selects that set. It's a self-hosted-friendly alternative to Shopify/Medusa-style
SaaS commerce platforms, purpose-built around 한국's actual retail mechanics: cash-on-delivery
as the default payment rail, manual 계좌이체/카드 verification, local courier partners
(CJ대한통운/한진택배), and 부가세 거래명세서-compliant receipts for VAT-registered sellers.

## Why it exists / lineage
전자동기계광고 evolved from two source projects:
- **Soover-bd** — a working single-tenant ecommerce dashboard. Its hard-won patterns were mined and
  generalized: the payment-verification chokepoint (one function flips a payment to `verified`),
  order-item price/name snapshots (orders survive later product edits), the advance-payment model, and
  the district-based delivery-zone list.
- **scarper/features.md** (`D:\CLAUDE-CODE\scarper\features.md`) — a platform blueprint written against
  Soover-bd, proposing ~18 toggleable modules, a three-layer settings/feature-flag system, a
  BD-specific courier/payments/fraud layer, and a Core/Should/Nice/Advanced maturity tier for every
  feature. 전자동기계광고 is the platform build that blueprint called for.

Prior art adopted from outside the BD ecosystem: Payload CMS's config-driven collections/blocks and
multi-tenant admin UX; Sanity's keyed block-array shape for JSONB page content.

## Architecture in brief
- **Multi-tenant orgs** — every table carries `org_id`; RLS is on everywhere; membership is checked via
  a `SECURITY DEFINER` `user_org_ids()` helper (avoids RLS recursion). Roles: owner > admin > manager >
  staff > rider > viewer.
- **Module registry + vertical presets** — `src/modules/registry.ts` statically imports one
  `module.config.ts` per module and exports `MODULES`/`MODULE_LIST`; `src/modules/verticals.ts` maps
  each vertical to the module-key array it enables by default. Orgs store their actual set in
  `enabled_modules text[]`; nav, dashboard widgets, and every admin route gate on it via
  `requireModule()`.
- **Settings engine** (spec §17) — ~30 typed setting definitions (`src/lib/settings/registry.ts`)
  across 10 groups (checkout/payments/delivery/fraud/inventory/notifications/tax/localization/
  printing/storefront); the settings UI auto-renders from the defs, values live in `org_settings`
  (jsonb per key).
- **BD commerce layer** — COD with optional/required advance payment, manual 계좌이체 (계좌이체/카드) with
  admin-verified trxID, a `verifyPayment()` chokepoint that is the *only* code path allowed to mark a
  payment verified (webhooks and manual admin verify both funnel through it), courier adapters
  (CJ대한통운/한진택배 real request shapes, `manual` fully working today), and receipts with a 부가세 거래명세서 6.3
  invoice variant + HS-code/VAT columns for VAT-registered orgs.

## Componentization model
A **module** = one `src/modules/<key>/` folder: `module.config.ts` (nav + dashboard widgets, no side
effects), `actions.ts` (`'use server'` mutations returning `ActionResult<T>`), `schemas.ts` (zod), and
`components/*`. Admin routes live in the matching `src/app/(admin)/admin/<route>/` folder and stay
thin — UI lives in the module's `components/`. A **vertical** is just an array of module keys in
`VERTICAL_PRESETS`; swapping verticals swaps which module folders are active for that org, nothing
else moves. To add a new module: add its key to the `ModuleKey` union (`src/modules/types.ts`), create
`module.config.ts`, register it in `registry.ts` (`MODULES` + `MODULE_LIST`) and the relevant
`VERTICAL_PRESETS` entries, then build its routes/actions/components — see `docs/architecture.md` §2
for the binding contract.

## Where to look next
- `docs/saas-roadmap.md` — canonical plan for SaaS/platform work (plans, billing, platform ops, custom
  domains, production trust, scale-outs) — phased and effort-tagged.
- `docs/operations.md` — production runbook. `docs/extending.md` — dev recipes (modules/blocks/etc.).
- `docs/architecture.md` — full binding contract (routes, schema, settings, payments/fraud, couriers,
  receipts, what's stubbed vs. working).
- `docs/conventions.md` — binding build conventions (data access, server actions, money/dates, UI).
- `docs/design-system.md` — tokens + aesthetic ("operational calm", zinc + emerald).
- `.memory/decisions.md` — locked assumptions made without asking, with rationale.
- `.memory/logs.md` — build history by wave/slice.
- `.memory/feature-list.md` — what's actually built vs. stubbed vs. deferred.
- `.memory/next-steps.md` — what to do next, in order.
