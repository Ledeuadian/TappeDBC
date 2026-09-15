-- ============================================================
-- Tappe — Digital Business Card Platform — Database Schema
-- ============================================================
-- Run this in Supabase SQL editor (or via supabase CLI).
-- Idempotent where possible; safe to re-run.
--
-- Tables
--   profiles    : one row per auth user (auto-created on signup)
--   cards       : digital business cards owned by a user
--   card_links  : ordered social/contact links on a card
--   card_views  : analytics — every public card open
-- ============================================================

-- ----------------- profiles -----------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  full_name    text,
  avatar_url   text,
  is_verified  boolean not null default false,  -- true once a card claim code is redeemed
  is_admin     boolean not null default false,  -- true for staff who can mint claim codes
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Column migrations — CREATE TABLE IF NOT EXISTS does NOT add new columns to
-- an existing table, so back-fill them explicitly (idempotent).
alter table public.profiles add column if not exists is_verified boolean not null default false;
alter table public.profiles add column if not exists is_admin    boolean not null default false;

-- Card field migrations
alter table public.cards add column if not exists cover_url      text;
alter table public.cards add column if not exists logo_url       text;
alter table public.cards add column if not exists headline       text;
alter table public.cards add column if not exists accreditations text;
alter table public.cards add column if not exists avatar_url_pos jsonb;
alter table public.cards add column if not exists cover_url_pos  jsonb;
alter table public.cards add column if not exists logo_url_pos   jsonb;
alter table public.cards add column if not exists night_mode     boolean not null default false;
alter table public.cards add column if not exists links          jsonb;
-- card layout variant: 'standard' (avatar left, logo right) or 'centered'
-- (avatar centered, @handle, socials in a framed box)
alter table public.cards add column if not exists layout         text not null default 'standard';
-- social handle shown as @handle on the centered layout
alter table public.cards add column if not exists handle         text;

-- ----------------- cards -----------------
create table if not exists public.cards (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  slug          text not null unique,
  name          text not null,                   -- display name on card
  title         text,                            -- job title
  brand_title   text,                            -- custom brand title shown in editor nav
  company       text,                            -- company / org
  pronouns      text,
  email         text,
  phone         text,
  website       text,
  address       text,
  bio           text,

  -- branding
  theme_color   text not null default '#ef4444',  -- hex; default = Tappe red
  accent_color  text not null default '#f97316',
  bg_style      text not null default 'gradient', -- gradient | solid | aurora
  avatar_url    text,

  -- status flags
  is_published  boolean not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- lookup by slug is the public-page hot path
create unique index if not exists cards_slug_idx on public.cards (slug);
create index if not exists cards_owner_id_idx on public.cards (owner_id);

-- ----------------- card_links -----------------
-- ordered list of links/icons shown on the public card page.
create table if not exists public.card_links (
  id          uuid primary key default gen_random_uuid(),
  card_id     uuid not null references public.cards(id) on delete cascade,
  label       text not null,                   -- e.g. "Instagram", "GitHub"
  url         text not null,
  icon_key    text,                            -- lucide icon name or brand key
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists card_links_card_id_idx on public.card_links (card_id, sort_order);

-- ----------------- card_claims (QR/card-based account verification) -----------------
-- Instead of email verification, a physical Tappe card ships with a claim code
-- embedded in its QR. When the card owner signs up and scans/enters the code,
-- their auth account is "verified" and becomes the owner of that card.
create table if not exists public.card_claims (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,           -- claim code printed in the card's QR
  card_id       uuid references public.cards(id) on delete set null,
  claimed_by    uuid references public.profiles(id) on delete cascade,
  claimed_at    timestamptz,
  expires_at    timestamptz not null default (now() + interval '1 year'),
  created_at    timestamptz not null default now()
);
create unique index if not exists card_claims_code_idx on public.card_claims (code);
create index if not exists card_claims_card_id_idx on public.card_claims (card_id);

-- ----------------- card_views (analytics) -----------------
create table if not exists public.card_views (
  id          bigserial primary key,
  card_id     uuid not null references public.cards(id) on delete cascade,
  viewed_at   timestamptz not null default now(),
  user_agent  text,
  referrer    text
);
create index if not exists card_views_card_id_idx on public.card_views (card_id, viewed_at desc);

-- ============================================================
-- Triggers
-- ============================================================

-- Auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-bump updated_at on profile/card writes
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.tg_touch_updated_at();

drop trigger if exists cards_touch_updated_at on public.cards;
create trigger cards_touch_updated_at
  before update on public.cards
  for each row execute function public.tg_touch_updated_at();

-- Flip profiles.is_verified → true when a claim code is redeemed.
-- SECURITY DEFINER so the update runs with table-owner rights (the redeeming
-- user can't normally UPDATE arbitrary profile rows).
create or replace function public.handle_claim_redeemed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.claimed_by is not null and old.claimed_by is null then
    update public.profiles
    set is_verified = true
    where id = new.claimed_by;
  end if;
  return new;
end;
$$;

drop trigger if exists on_claim_redeemed on public.card_claims;
create trigger on_claim_redeemed
  after update on public.card_claims
  for each row execute function public.handle_claim_redeemed();

-- Block privilege escalation: a user updating their own profile must not be
-- able to flip is_admin (or is_verified, which belongs to the claim flow).
create or replace function public.tg_guard_profile_flags()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Allow the change only if it comes from a server-side trigger/role
  -- (current_user is a definer role like 'postgres') or from an existing admin.
  if current_user in ('authenticated', 'anon') then
    if new.is_admin is distinct from old.is_admin then
      if not exists (
        select 1 from public.profiles
        where id = auth.uid() and is_admin = true
      ) then
        raise exception 'Not allowed to change is_admin';
      end if;
    end if;
    if new.is_verified is distinct from old.is_verified
       and new.is_verified = true then
      -- is_verified=true may be set by the claim trigger (runs as definer,
      -- detectable via current_user not being authenticated/anon) or by an admin
      if current_user in ('authenticated', 'anon') then
        if not exists (
          select 1 from public.profiles
          where id = auth.uid() and is_admin = true
        ) then
          raise exception 'Not allowed to set is_verified directly';
        end if;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_flags on public.profiles;
create trigger profiles_guard_flags
  before update on public.profiles
  for each row execute function public.tg_guard_profile_flags();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles    enable row level security;
alter table public.cards       enable row level security;
alter table public.card_links  enable row level security;
alter table public.card_views  enable row level security;
alter table public.card_claims enable row level security;

-- profiles: each user can read/update their own row.
-- NOTE: is_admin cannot be self-granted — there is no policy allowing a user
-- to set it, and updates to it are blocked by the guard trigger below.
drop policy if exists "profiles self read"     on public.profiles;
drop policy if exists "profiles self update"  on public.profiles;
create policy "profiles self read"
  on public.profiles for select
  using (auth.uid() = id);
create policy "profiles self update"
  on public.profiles for update
  using (auth.uid() = id);

-- cards: owner has full CRUD; published cards are publicly readable by slug
drop policy if exists "cards owner select" on public.cards;
drop policy if exists "cards public select by slug" on public.cards;
drop policy if exists "cards owner insert" on public.cards;
drop policy if exists "cards owner update" on public.cards;
drop policy if exists "cards owner delete" on public.cards;

create policy "cards owner select"
  on public.cards for select using (auth.uid() = owner_id);

create policy "cards public select by slug"
  on public.cards for select using (is_published = true);

create policy "cards owner insert"
  on public.cards for insert with check (auth.uid() = owner_id);

create policy "cards owner update"
  on public.cards for update using (auth.uid() = owner_id);

create policy "cards owner delete"
  on public.cards for delete using (auth.uid() = owner_id);

-- card_links: owner manages; public reads if parent card is published
drop policy if exists "card_links owner all"        on public.card_links;
drop policy if exists "card_links public select"    on public.card_links;

create policy "card_links owner all"
  on public.card_links for all
  using (
    exists (select 1 from public.cards c
            where c.id = card_links.card_id and c.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.cards c
            where c.id = card_links.card_id and c.owner_id = auth.uid())
  );

create policy "card_links public select"
  on public.card_links for select using (
    exists (select 1 from public.cards c
            where c.id = card_links.card_id and c.is_published = true)
  );

-- card_views: anyone (including anon) can insert a view; owners can read their own
drop policy if exists "card_views public insert" on public.card_views;
drop policy if exists "card_views owner select"  on public.card_views;

create policy "card_views public insert"
  on public.card_views for insert with check (true);

create policy "card_views owner select"
  on public.card_views for select using (
    exists (select 1 from public.cards c
            where c.id = card_views.card_id and c.owner_id = auth.uid())
  );

-- card_claims: anon/unauthenticated users can LOOK UP a code (to start a claim),
-- but only the logged-in user can redeem it for themselves. Codes are opaque
-- high-entropy strings so enumeration isn't practical.
drop policy if exists "card_claims anon lookup" on public.card_claims;
drop policy if exists "card_claims self read"   on public.card_claims;
drop policy if exists "card_claims self redeem" on public.card_claims;

create policy "card_claims anon lookup"
  on public.card_claims for select using (true);

create policy "card_claims self read"
  on public.card_claims for select using (claimed_by = auth.uid());

create policy "card_claims self redeem"
  on public.card_claims for update using (
    claimed_by is null and expires_at > now()
  )
  with check (
    claimed_by = auth.uid()
  );

-- ============================================================
-- Claim code generator (admin-only)
-- ============================================================
-- Mints a batch of secure, unused claim codes. Returns the codes
-- so you can print them / encode them into QRs.
--
-- Codes are 12 chars of Crockford-base32 (no ambiguous chars:
-- 0/O/1/I excluded), giving 60 bits of entropy — unguessable.
--
-- Only callable by an authenticated user whose profiles.is_admin = true.
-- Throws 'permission denied' for everyone else (anon + non-admins).
create or replace function public.generate_claim_codes(count int)
returns table (code text)
language plpgsql
security definer set search_path = public
as $$
declare
  i int;
  j int;
  candidate text;
  caller uuid := auth.uid();
  alphabet text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
begin
  -- The SQL editor / service role runs as 'postgres' with no JWT, so
  -- auth.uid() is null there. Allow that path through (trusted server-side);
  -- everyone else must be an authenticated admin.
  if current_user not in ('postgres', 'service_role') then
    if caller is null then
      raise exception 'Authentication required' using errcode = '42501';
    end if;
    if not exists (
      select 1 from public.profiles
      where id = caller and is_admin = true
    ) then
      raise exception 'Admin only' using errcode = '42501';
    end if;
  end if;
  if count is null or count <= 0 or count > 5000 then
    raise exception 'Count must be between 1 and 5000';
  end if;

  for i in 1..count loop
    -- collision-safe: retry until unique
    loop
      candidate := '';
      for j in 1..12 loop
        candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      end loop;
      exit when not exists (
        select 1 from public.card_claims cc where cc.code = candidate
      );
    end loop;

    insert into public.card_claims (code) values (candidate);
    code := candidate;
    return next;
  end loop;
end;
$$;

-- Default: anon cannot call the RPC. Authenticated users also cannot
-- without admin rights — the function itself raises on non-admin callers.
revoke all on function public.generate_claim_codes(int) from public;
grant execute on function public.generate_claim_codes(int) to authenticated;

-- ============================================================
-- Server-side links validation (defense in depth)
-- ============================================================
-- cards.links is a jsonb array written directly by the editor. This
-- trigger validates its shape server-side so a tampered client can't
-- store arbitrary URLs (javascript:, data:) or off-bucket qr_urls.
--
-- Rules:
--   • links must be a jsonb array (or null)
--   • each entry: { category, icon, label, values }
--   • values.value, when present, must start with http:// or https://
--     (or be a plain email — the app links those via mailto:)
--   • values.mobile / values.landline must be plain text (no protocol)
--   • values.qr_url must point at this project's storage bucket
create or replace function public.tg_validate_card_links()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  entry jsonb;
  v jsonb;
  vtext text;
  bucket_host text;
begin
  if new.links is null then return new; end if;

  if jsonb_typeof(new.links) <> 'array' then
    raise exception 'links must be a JSON array';
  end if;

  -- Supabase storage public URL host, e.g. xptathxklsddpyrmukhe.supabase.co
  select regexp_replace(
    current_setting('app.settings.supabase_url', true) || '',
    '^https?://', '')
  into bucket_host;

  for entry in select * from jsonb_array_elements(new.links) loop
    v := entry->'values';
    if v is null then continue; end if;

    -- value: URL field — only http(s) allowed
    vtext := v->>'value';
    if vtext is not null and vtext <> '' then
      if vtext !~ '^https?://' and vtext !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
        raise exception 'links value must be an http(s) URL or an email: %', vtext;
      end if;
    end if;

    -- qr_url: payment QR — must be served by our own storage bucket
    vtext := v->>'qr_url';
    if vtext is not null and vtext <> '' then
      if vtext !~ ('^https://' || coalesce(bucket_host, 'xptathxklsddpyrmukhe.supabase.co') || '/') then
        raise exception 'qr_url must point at the project storage bucket';
      end if;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists cards_validate_links on public.cards;
create trigger cards_validate_links
  before insert or update of links on public.cards
  for each row execute function public.tg_validate_card_links();

-- ============================================================
-- Storage bucket (for avatars / cover photos / logos)
-- ============================================================
-- 1) Dashboard → Storage → New bucket:
--      name:  tappe-assets
--      public: true  ← required so uploaded URLs are readable by /c/<slug>
--
-- 2) Run these policies so each user can only upload to their own folder.
--    Idempotent: each one is dropped before being created.
drop policy if exists "tappe-assets owner upload" on storage.objects;
drop policy if exists "tappe-assets owner update" on storage.objects;
drop policy if exists "tappe-assets owner delete" on storage.objects;

create policy "tappe-assets owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'tappe-assets'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "tappe-assets owner update"
  on storage.objects for update
  using (
    bucket_id = 'tappe-assets'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "tappe-assets owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'tappe-assets'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3) Public read is automatic for any object in a public bucket — no policy
--    needed. The path convention is <owner-uuid>/<file>, so URLs are
--    unguessable but freely fetchable by anyone who has them.
