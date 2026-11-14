# 전자동기계광고

산업기계·중고기계 공급사와 고객을 연결하는 멀티 공급사 기계 광고 플랫폼 (한국, 원화·한국어 기준).
문의(전화·문자) 중심이며, 결제·배송 모듈은 남아 있지만 기본 흐름이 아닙니다.

**Stack**: Next.js 15 (App Router, TS, RSC) + Supabase (Postgres, Auth, Storage, RLS) + Tailwind v4.

## The three binding docs — read before coding
- `docs/architecture.md` (§3 = the schema contract) — routes, data model, settings, payments/fraud,
  couriers, receipts, what's stubbed vs. working.
- `docs/conventions.md` — data access, server actions, money/dates, UI patterns.
- `docs/design-system.md` — tokens + aesthetic.

Working guides: `docs/extending.md` (add a module/block/vertical/adapter — copy the named smallest
example), `docs/operations.md` (production runbook), `docs/saas-roadmap.md` (phased template→SaaS
plan — canonical for billing/plans/domains/platform work), `docs/deployment.md` (Vercel+Supabase).

## Key invariants
- Money = bigint minor units (1원 = 100) everywhere. Format with `formatMoney()` (`src/lib/money.ts`); never float taka.
- `verifyPayment()` (`src/modules/orders/actions.ts`) is the ONLY path that flips a payment to
  `verified` — webhooks and manual admin verify both call it.
- `order_items` snapshot product name/price/image at purchase time — never re-join live product data.
- **Module pattern**: a module = `src/modules/<key>/{module.config.ts, actions.ts, schemas.ts,
  components/}`. To add one: (1) add the key to `ModuleKey` in `types.ts`, (2) write
  `module.config.ts`, (3) register in `registry.ts` (`MODULES`+`MODULE_LIST`) and the relevant
  `VERTICAL_PRESETS` in `verticals.ts`, (4) build routes under `src/app/(admin)/admin/<route>/` —
  every admin page starts `const ctx = await requireOrg(); requireModule(ctx.org, '<key>')`.
- Settings go through the registry (`src/lib/settings/registry.ts` `SETTING_DEFS`) — never read/write
  `org_settings` directly. Doc numbers only via the `next_doc_number(org, doc_type, prefix)` RPC.
- Every page under `(admin)`/`(store)`/`(print)` is `export const dynamic = 'force-dynamic'`.
- No client-side Supabase queries in admin — server components use `getServerClient()`; storefront
  writes go through service-role server actions with server-side price recomputation.

## Commands & environment
`npm run dev` / `build` / `typecheck` — no lint or test framework yet; `tsc --noEmit` + `next build`
are the quality gates. Migrations are SQL-editor-appliable (`supabase/migrations/0001`→`0004`, in
order); no local Docker/local Supabase — always develop against a hosted project. Print routes: bare
layout + `src/styles/print.css` + `window.print()`, no Puppeteer/PDF service.

## Memory
`.memory/` is this repo's shared brain — read `project-context.md` + `next-steps.md` at session start;
update `logs.md` and `next-steps.md` at session end. `docs/architecture.md` and `.memory/decisions.md`
are locked contracts — don't edit without explicit instruction.
