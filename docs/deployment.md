# 전자동기계광고 — Deployment

## Vercel deploy
1. Import the repo in Vercel (New Project → select this repo).
2. Set env vars (Project Settings → Environment Variables) — values come from the Supabase dashboard,
   Project Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` — service_role key (server-only secret; bypasses RLS — never expose
     client-side)
   - `NEXT_PUBLIC_APP_URL` — your production URL (e.g. `https://www.jadong.co.kr`), used for auth
     redirects
3. Build command: default (`next build`). No custom build steps required.
4. Deploy.

## Supabase hosted setup
- **Migrations**: SQL Editor → paste and run, in order: `supabase/migrations/0001_core.sql` →
  `0002_commerce.sql` → `0003_delivery_cms_ops.sql` → `0004_storefront_public_org_read.sql` — or via
  CLI: `supabase link && supabase db push`.
- **Storage**: the `media` bucket (public read) is created by migration `0001` itself — no manual
  bucket setup needed.
- **Auth settings** (Authentication → Providers / Settings):
  - Enable the Email provider — it's the only auth method wired.
  - Either disable "Confirm email" for the fastest signup→onboarding flow, or configure SMTP
    (Authentication → Emails) for confirmation + reset emails. Note: password reset has a known gap —
    see `.memory/feature-list.md` "Known gaps" (no `/reset-password` completion route exists yet, so a
    reset email currently dead-ends at `/login`).

## Post-deploy checklist
- [ ] Create your first org via `/signup` → `/onboarding`.
- [ ] Set `NEXT_PUBLIC_APP_URL` to the real deployed URL (redeploy after changing env vars).
- [ ] Test checkout end-to-end: place a storefront order, confirm it lands in `/admin/orders`.
- [ ] Test `/track/[code]` on that order's tracking code.
- [ ] Test print: open `/print/invoice/[orderId]` and confirm it renders and prints correctly.

## Custom domain per org (documented future — not built)
Storefront is path-based only today: `/s/[org-slug]`. Custom domains would need:
1. Wildcard/per-domain DNS pointed at the Vercel deployment.
2. A `custom_domain` column on `orgs` (or a lookup table) mapping hostname → org.
3. `middleware.ts` extended to read the request's `host` header, resolve it to an org, and rewrite `/`
   → `/s/[org-slug]` (today middleware only handles the admin-auth redirect).
4. Vercel's Domains API (or manual per-domain add) to attach each org's domain to the project.
5. SSL is automatic via Vercel once a domain is verified — no extra work there.
