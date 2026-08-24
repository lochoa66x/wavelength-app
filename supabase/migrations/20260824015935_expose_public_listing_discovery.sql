begin;

-- P1.4 exposes a deliberately narrow, read-only listing surface. The base
-- table still contains ingestion identifiers, hashes, error codes, and other
-- operational fields that must never be returned by the browser client.
alter table public.listings enable row level security;

revoke all on table public.listings from anon, authenticated;
grant select (
  id,
  category,
  tier,
  title,
  company,
  location,
  job_type,
  source,
  city,
  region,
  country_code,
  location_type,
  reason,
  description_snippet,
  url,
  posted_at
) on table public.listings to anon, authenticated;

drop policy if exists "public listings are readable" on public.listings;
create policy "public listings are readable"
on public.listings
for select
to anon, authenticated
using (
  nullif(btrim(title), '') is not null
  and nullif(btrim(company), '') is not null
  and url ~* '^https://'
  and source <> 'craigslist'
);

create or replace view public.public_listings
with (security_invoker = true, security_barrier = true)
as
select
  id,
  category,
  tier,
  title,
  company,
  location,
  job_type,
  source,
  city,
  region,
  country_code,
  location_type,
  reason,
  description_snippet,
  url,
  posted_at
from public.listings
where nullif(btrim(title), '') is not null
  and nullif(btrim(company), '') is not null
  and url ~* '^https://'
  and source <> 'craigslist';

revoke all on table public.public_listings from public, anon, authenticated;
grant select on table public.public_listings to anon, authenticated;

comment on view public.public_listings is
  'Read-only public job discovery fields. Operational ingestion and enrichment metadata are excluded.';

-- Profiles contain saved jobs and synchronized account preferences. Guests
-- receive no object grant, and signed-in clients can only read/update the row
-- whose primary key is the verified Auth user id used by the application.
alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select, update on table public.profiles to authenticated;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  loop
    execute format('drop policy %I on public.profiles', policy_record.policyname);
  end loop;
end
$$;

create policy "profiles select own row"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles update own row"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

commit;
