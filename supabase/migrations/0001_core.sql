-- =====================================================================
-- 전자동기계광고 — 0001_core.sql
-- Core multi-tenant contract: orgs, membership, invitations, settings,
-- audit, notifications, media, doc numbering, platform admins.
-- Idempotent-where-cheap: safe to paste and re-run in the Supabase SQL
-- editor. Order: extensions -> tables -> indexes -> fns -> grants ->
-- triggers -> RLS -> storage.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------

create table if not exists public.orgs (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,
  vertical         text not null default 'ecommerce'
                     check (vertical in ('ecommerce','courses','services','realestate')),
  plan             text not null default 'free',
  enabled_modules  text[] not null default '{}'::text[],
  currency         char(3) not null default 'KRW',
  country          char(2) not null default 'BD',
  timezone         text not null default 'Asia/Seoul',
  logo_path        text,
  phone            text,
  email            text,
  address          text,
  bin_number       text,  -- 13-digit e-BIN, nullable
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  phone        text,
  avatar_path  text,
  created_at   timestamptz not null default now()
);

create table if not exists public.org_members (
  org_id      uuid not null references public.orgs(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('owner','admin','manager','staff','rider','viewer')),
  created_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table if not exists public.invitations (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs(id) on delete cascade,
  email        text not null,
  role         text not null check (role in ('owner','admin','manager','staff','rider','viewer')),
  token        uuid not null default gen_random_uuid() unique,
  status       text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_by   uuid references auth.users(id),
  expires_at   timestamptz not null default (now() + interval '7 days'),
  created_at   timestamptz not null default now()
);

create table if not exists public.org_settings (
  org_id      uuid not null references public.orgs(id) on delete cascade,
  key         text not null,
  value       jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  primary key (org_id, key)
);

create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  org_id      uuid not null references public.orgs(id) on delete cascade,
  actor_id    uuid references auth.users(id),
  action      text not null,
  entity      text not null,
  entity_id   text,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,  -- null = whole org
  type        text not null,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.media (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs(id) on delete cascade,
  path        text not null,  -- storage path `{org_id}/...`
  name        text,
  mime        text,
  size        int,
  width       int,
  height      int,
  alt         text,
  folder      text not null default '',
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

create table if not exists public.doc_sequences (
  org_id      uuid not null references public.orgs(id) on delete cascade,
  doc_type    text not null,
  prefix      text not null,
  next_no     int not null default 1,
  padding     int not null default 5,
  created_at  timestamptz not null default now(),
  primary key (org_id, doc_type)
);

create table if not exists public.platform_admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Indexes
--    org_id already leads the composite PK on org_members / org_settings
--    / doc_sequences, so no separate single-column index is added there.
-- ---------------------------------------------------------------------
create index if not exists idx_invitations_org_id     on public.invitations(org_id);
create index if not exists idx_notifications_org_id   on public.notifications(org_id);
create index if not exists idx_notifications_user_read on public.notifications(user_id, read_at);
create index if not exists idx_audit_log_org_created   on public.audit_log(org_id, created_at desc);
create index if not exists idx_media_org_folder        on public.media(org_id, folder);
-- Every RLS check runs user_org_ids(), which filters org_members by
-- user_id — the second column of that table's PK — so without this it
-- would seq-scan on every request.
create index if not exists idx_org_members_user_id     on public.org_members(user_id);

-- ---------------------------------------------------------------------
-- 4. Helper functions (SECURITY DEFINER, locked search_path, STABLE)
-- ---------------------------------------------------------------------

create or replace function public.user_org_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select org_id from public.org_members where user_id = auth.uid();
$$;

create or replace function public.is_org_member(o uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.org_members
    where org_id = o and user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(o uuid, roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.org_members
    where org_id = o and user_id = auth.uid() and role = any(roles)
  );
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  );
$$;

-- Extra helper (not explicitly requested) so "profiles: members of shared
-- orgs can SELECT" doesn't reintroduce the same trap org_members avoids:
-- a plain cross-table subquery against org_members from inside the
-- profiles policy would itself be filtered by org_members' own RLS,
-- silently hiding colleagues from any non-owner/admin viewer. SECURITY
-- DEFINER bypasses that, same pattern as the four helpers above.
create or replace function public.shares_org_with(p_user uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.org_members mine
    join public.org_members theirs on theirs.org_id = mine.org_id
    where mine.user_id = auth.uid() and theirs.user_id = p_user
  );
$$;

create or replace function public.next_doc_number(p_org uuid, p_doc_type text, p_prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_no      int;
  v_padding int;
begin
  insert into public.doc_sequences (org_id, doc_type, prefix)
  values (p_org, p_doc_type, p_prefix)
  on conflict (org_id, doc_type) do nothing;

  -- Single atomic UPDATE...RETURNING: the row lock held for the duration
  -- of the update serializes concurrent callers, so no separate SELECT...
  -- FOR UPDATE step is needed. next_no - 1 (post-increment) is the number
  -- this call claims; the stored counter is left pointing at the next one.
  update public.doc_sequences
  set next_no = next_no + 1
  where org_id = p_org and doc_type = p_doc_type
  returning next_no - 1, padding into v_no, v_padding;

  return p_prefix || lpad(v_no::text, v_padding, '0');
end;
$$;

grant execute on function public.user_org_ids()                    to authenticated, service_role;
grant execute on function public.is_org_member(uuid)                to authenticated, service_role;
grant execute on function public.has_org_role(uuid, text[])         to authenticated, service_role;
grant execute on function public.is_platform_admin()                to authenticated, service_role;
grant execute on function public.shares_org_with(uuid)               to authenticated, service_role;
grant execute on function public.next_doc_number(uuid, text, text)  to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 5. Triggers
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 6. Row Level Security
--    Plain ENABLE (not FORCE) throughout — the helper functions above
--    rely on running as the (RLS-bypassing) table owner via SECURITY
--    DEFINER. FORCE would apply RLS to the owner too and break every one
--    of them, reintroducing the org_members recursion this file exists
--    to avoid.
-- ---------------------------------------------------------------------

alter table public.orgs            enable row level security;
alter table public.profiles        enable row level security;
alter table public.org_members     enable row level security;
alter table public.invitations     enable row level security;
alter table public.org_settings    enable row level security;
alter table public.audit_log       enable row level security;
alter table public.notifications   enable row level security;
alter table public.media           enable row level security;
alter table public.doc_sequences   enable row level security;
alter table public.platform_admins enable row level security;

-- orgs: members SELECT; owner/admin UPDATE; any authenticated user may
-- INSERT (onboarding creates the org, then the membership row, in the
-- same service-role transaction). No DELETE policy: orgs are
-- soft-deleted via is_active, never hard-deleted through the API.
drop policy if exists orgs_select_members on public.orgs;
create policy orgs_select_members on public.orgs
  for select to authenticated
  using (public.is_org_member(id));

drop policy if exists orgs_update_owner_admin on public.orgs;
create policy orgs_update_owner_admin on public.orgs
  for update to authenticated
  using (public.has_org_role(id, array['owner','admin']))
  with check (public.has_org_role(id, array['owner','admin']));

drop policy if exists orgs_insert_authenticated on public.orgs;
create policy orgs_insert_authenticated on public.orgs
  for insert to authenticated
  with check (true);

-- profiles: a user owns and fully controls their own row; members of any
-- shared org can additionally SELECT it.
drop policy if exists profiles_all_own on public.profiles;
create policy profiles_all_own on public.profiles
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists profiles_select_shared_org on public.profiles;
create policy profiles_select_shared_org on public.profiles
  for select to authenticated
  using (public.shares_org_with(user_id));

-- org_members: owner/admin manage every row in the org; any member can
-- see their own membership row. is_org_member/has_org_role are SECURITY
-- DEFINER and therefore evaluate org_members WITHOUT applying
-- org_members' own RLS — without that bypass, evaluating this table's
-- own policy would call has_org_role(), which queries org_members, which
-- is gated by this same policy: infinite recursion ("infinite recursion
-- detected in policy for relation org_members"). This is the recursion
-- trap the brief flagged; the SECURITY DEFINER helpers exist specifically
-- to defuse it. (There's deliberately no "insert your own first
-- membership" carve-out here either: the very first owner row for a
-- brand-new org can't pass has_org_role, since no member exists yet —
-- onboarding writes that row via service role, per the orgs policy note
-- above, not through this policy.)
drop policy if exists org_members_manage_owner_admin on public.org_members;
create policy org_members_manage_owner_admin on public.org_members
  for all to authenticated
  using (public.has_org_role(org_id, array['owner','admin']))
  with check (public.has_org_role(org_id, array['owner','admin']));

drop policy if exists org_members_select_own on public.org_members;
create policy org_members_select_own on public.org_members
  for select to authenticated
  using (user_id = auth.uid());

-- invitations: owner/admin only, full control. No anon policy at all —
-- the token-lookup step of accepting an invite reads this table via a
-- service-role server action, which bypasses RLS entirely.
drop policy if exists invitations_all_owner_admin on public.invitations;
create policy invitations_all_owner_admin on public.invitations
  for all to authenticated
  using (public.has_org_role(org_id, array['owner','admin']))
  with check (public.has_org_role(org_id, array['owner','admin']));

-- org_settings: members read; owner/admin write.
drop policy if exists org_settings_select_members on public.org_settings;
create policy org_settings_select_members on public.org_settings
  for select to authenticated
  using (public.is_org_member(org_id));

drop policy if exists org_settings_write_owner_admin on public.org_settings;
create policy org_settings_write_owner_admin on public.org_settings
  for all to authenticated
  using (public.has_org_role(org_id, array['owner','admin']))
  with check (public.has_org_role(org_id, array['owner','admin']));

-- audit_log: members read only. INSERT happens exclusively via service
-- role (bypasses RLS) — no insert policy for authenticated, and no
-- update/delete policy at all, keeping the log append-only and immutable.
drop policy if exists audit_log_select_members on public.audit_log;
create policy audit_log_select_members on public.audit_log
  for select to authenticated
  using (public.is_org_member(org_id));

-- notifications: staff+ can see org rows targeted at them or org-wide
-- (user_id null); any member can mark their own notification read. No
-- insert/delete policy for authenticated — notify() writes via service
-- role.
drop policy if exists notifications_select_staff_up on public.notifications;
create policy notifications_select_staff_up on public.notifications
  for select to authenticated
  using (
    public.has_org_role(org_id, array['owner','admin','manager','staff'])
    and (user_id = auth.uid() or user_id is null)
  );

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- media (table = metadata rows, distinct from the storage bucket below):
-- members read; staff+ can upload; owner/admin/manager can delete. No
-- update policy — the brief doesn't grant one, so editing alt text/folder
-- on an existing row is service-role/next-slice work.
drop policy if exists media_select_members on public.media;
create policy media_select_members on public.media
  for select to authenticated
  using (public.is_org_member(org_id));

drop policy if exists media_insert_staff_up on public.media;
create policy media_insert_staff_up on public.media
  for insert to authenticated
  with check (public.has_org_role(org_id, array['owner','admin','manager','staff']));

drop policy if exists media_delete_manager_up on public.media;
create policy media_delete_manager_up on public.media
  for delete to authenticated
  using (public.has_org_role(org_id, array['owner','admin','manager']));

-- doc_sequences: intentionally zero policies. RLS is enabled (default
-- deny for anon/authenticated); the only paths in are service_role
-- (bypasses RLS) and next_doc_number() (SECURITY DEFINER).

-- platform_admins: read-only via is_platform_admin() — no insert/update/
-- delete policy; grants happen out-of-band (service role / dashboard),
-- never through the app.
drop policy if exists platform_admins_select on public.platform_admins;
create policy platform_admins_select on public.platform_admins
  for select to authenticated
  using (public.is_platform_admin());

-- ---------------------------------------------------------------------
-- 7. Storage
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists media_bucket_public_read on storage.objects;
create policy media_bucket_public_read on storage.objects
  for select
  using (bucket_id = 'media');

drop policy if exists media_bucket_org_insert on storage.objects;
create policy media_bucket_org_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] in (select public.user_org_ids()::text)
  );

drop policy if exists media_bucket_org_update on storage.objects;
create policy media_bucket_org_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] in (select public.user_org_ids()::text)
  )
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] in (select public.user_org_ids()::text)
  );

drop policy if exists media_bucket_org_delete on storage.objects;
create policy media_bucket_org_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] in (select public.user_org_ids()::text)
  );
