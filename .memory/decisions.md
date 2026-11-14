# Decisions log (assumptions made without asking, with rationale)

1. **Repo location = D:\CLAUDE-CODE\scarpar** — primary working directory (D:\Projects would prompt on
   every write); follows workspace rule (subproject + CLAUDE.md + codegraph init).
2. **"Merchant/tenant" (spec) → `orgs`** — 전자동기계광고 spans non-commerce verticals (services, realestate),
   so the tenant entity is generic. Spec's §17/§D patterns kept verbatim otherwise.
3. **Ecommerce = flagship complete vertical; courses/services/realestate = thin-but-functional module
   packs** — the base must *support* vertical swapping (module registry + presets prove it); building four
   full verticals would blow the token budget without adding architectural proof.
4. **Money = bigint minor(1/100원) everywhere** (spec §22). No float 원 math.
5. **Printing = HTML + print CSS (browser print → PDF), no Puppeteer/@react-pdf** — zero deps, perfect
   한국어 rendering via fonts, fits "lightweight admin". Code128 barcode hand-rolled in pure TS; QR via
   tiny `qrcode` package. PDF-generation service deferred.
   interfaces + config UI, stubbed execution** — real shapes from the spec, guarded by per-org config;
   `manual` courier adapter + manual 계좌이체 verification are fully working paths so the system is usable
   day one without any third-party account.
7. **Inventory = denormalized stock_qty + append-only inventory_movements ledger** — full Magento-style
   reservation model deferred (documented in next-steps); ledger gives auditability now.
8. **Cart = localStorage** (Soover-bd pattern); abandoned-cart flows deferred (need server carts).
9. **Customer auth deferred** — storefront is guest-checkout (phone-keyed customers table). Spec's
   phone-OTP login needs an SMS provider; interface exists, so it's a small follow-up.
10. **No chart library** — hand-rolled SVG mini-charts (lightweight admin mandate).
11. **No eslint/prettier/test framework in v1** — `tsc --noEmit` + `next build` are the quality gates;
    testing framework deferred to next-steps. Budget call.
12. **Tailwind v4 with `source(none)` + explicit `@source "../../src"`** — global CLAUDE.md quirk: v4
    scans .memory/docs markdown and breaks styles otherwise.
13. **All pages force-dynamic + env fallbacks in lib/env.ts** — `next build` must succeed with no
    Supabase credentials (template DX; user has no Docker for local Supabase).
14. **Design system delegated to a scout running design-orchestrator at STANDARD tier** — budget: full
    FLAGSHIP pipeline on the main model would breach the 10% ceiling; brief pinned the aesthetic
    ("operational calm", zinc + emerald, dense 13px, borders>shadows).
15. **Storefront multi-tenancy = path-based `/s/[orgSlug]`** — custom-domain mapping documented as
    next-step (needs wildcard DNS at deploy layer).
16. **RLS pattern**: membership via SECURITY DEFINER `user_org_ids()`; storefront writes via service-role
    server actions with server-side price recomputation (never trust client totals) — Soover-bd's
    payment-verify chokepoint generalized to `verifyPayment()`.
17. **Order snapshots**: order_items copy name/price/image at purchase (survives product edits) — proven
    Soover-bd pattern.
18. **Verification bar for "working"**: `tsc --noEmit` + `next build` green + code review. Runtime against
    a live Supabase requires user creds (no Docker locally, CLI auth unknown) — wiring steps documented
    in README; this is the honest DoD interpretation within a one-shot autonomous run.
19. **Reviews/returns/fraud kept lite** (tables + core flows + moderation), loyalty/gift-cards/abandoned-
    cart/B2B/Meilisearch/multi-warehouse deferred — spec tiers them S/N/A; Core tier ships.
20. **Claude Code skill packaging deferred unless end-of-build budget allows** — working repo is the
    deliverable per the directive; a template-scaffolding skill is a thin wrapper to add later.
21. **Open-sourced under MIT (2026-07-12), superseding the earlier "Proprietary — Elite Heights"
    README line.** User explicitly directed publishing this as a public open-source project.
    MIT over a copyleft license (e.g. AGPL, used by some self-hostable-SaaS peers to deter
    unmodified commercial re-hosting) because the user's stated goal was maximizing findability
    and adoption ("so people rlly find and use this") — copyleft is real friction for corporate
    adopters. Low-cost to revisit: zero external contributors exist yet, so no CLA/relicensing
    complexity if this needs to change before the project gains outside contributors.
22. **Local git history squashed to one clean initial commit before the first public push**
    (2026-07-12), removing internal build-process commit messages and AI co-author trailers from
    the public record. Safe because no remote existed yet — nothing pushed, nothing rewritten that
    was ever shared. Full build narrative is preserved in `.memory/logs.md`, which ships in the
    repo; only the git commit history itself was condensed.
