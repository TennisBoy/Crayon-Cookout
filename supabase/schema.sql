-- Crayon Cookout — database schema
--
-- Run this once against a fresh Supabase project:
--   Dashboard → SQL Editor → paste → Run
-- Or:  psql "$SUPABASE_DB_URL" -f supabase/schema.sql
--
-- Safe to re-run: every statement is idempotent.

-- gen_random_uuid()
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- crayon_designs
-- ---------------------------------------------------------------------------
-- A design is a stack of coloured segments: colors[i] is the colour of the
-- segment whose relative height is heights[i]. The two arrays are always the
-- same length; that is enforced by a check constraint rather than trusted from
-- the client.
create table if not exists public.crayon_designs (
    id                   uuid primary key default gen_random_uuid(),
    user_id              uuid not null references auth.users (id) on delete cascade,
    name                 text not null,
    colors               text[] not null,
    heights              double precision[] not null,
    shape                text not null default 'crayon',
    is_competition_entry boolean not null default false,
    competition_email    text,
    created_date         timestamptz not null default now(),
    updated_at           timestamptz not null default now(),

    constraint crayon_designs_name_not_blank
        check (length(btrim(name)) between 1 and 120),
    constraint crayon_designs_segments_pair_up
        check (array_length(colors, 1) = array_length(heights, 1)),
    constraint crayon_designs_has_segments
        check (array_length(colors, 1) between 1 and 64),
    constraint crayon_designs_known_shape
        check (shape in ('crayon', 'star', 'heart', 'diamond', 'hexagon', 'flower')),
    -- A competition entry is only meaningful with a way to contact the winner.
    constraint crayon_designs_entry_needs_email
        check (not is_competition_entry or competition_email is not null)
);

-- The app's only list query: this user's designs, newest first.
create index if not exists crayon_designs_user_created_idx
    on public.crayon_designs (user_id, created_date desc);

-- ---------------------------------------------------------------------------
-- collectibles
-- ---------------------------------------------------------------------------
-- Which physical shaped crayons a user has photographed and had verified.
-- The frontend currently keeps this in localStorage under `cc_collected`;
-- this table is where it goes when collections should survive a device change.
create table if not exists public.collectibles (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references auth.users (id) on delete cascade,
    set_name     text not null,
    crayon_name  text not null,
    verified_at  timestamptz not null default now(),

    -- Each crayon can only be collected once per user.
    unique (user_id, set_name, crayon_name)
);

create index if not exists collectibles_user_idx
    on public.collectibles (user_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists crayon_designs_set_updated_at on public.crayon_designs;
create trigger crayon_designs_set_updated_at
    before update on public.crayon_designs
    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
-- The backend connects with the service role key, which BYPASSES these
-- policies — it scopes every query by user_id itself. These policies are the
-- second line of defence: if the anon key is ever used directly from a client,
-- a user still cannot read or write anyone else's rows.
alter table public.crayon_designs enable row level security;
alter table public.collectibles   enable row level security;

drop policy if exists "own designs" on public.crayon_designs;
create policy "own designs" on public.crayon_designs
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "own collectibles" on public.collectibles;
create policy "own collectibles" on public.collectibles
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Deny-by-default for anonymous callers. Nothing here is public.
revoke all on public.crayon_designs from anon;
revoke all on public.collectibles   from anon;
