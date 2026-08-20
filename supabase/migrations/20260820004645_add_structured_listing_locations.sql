-- Phase 2: structured listing locations.
-- This migration is additive, preserves listings.location verbatim, and does
-- not alter the listings table's existing grants, RLS state, or policies.

create schema if not exists gigscapes_private;
revoke all on schema gigscapes_private from public;

alter table public.listings
  add column if not exists city text,
  add column if not exists location_type text,
  add column if not exists region text,
  add column if not exists country_code text;

comment on column public.listings.location_type is
  'Normalized work location mode: remote, hybrid, or onsite.';
comment on column public.listings.city is
  'Normalized city or locality parsed from the source location.';
comment on column public.listings.region is
  'Normalized lowercase province, territory, or state.';
comment on column public.listings.country_code is
  'Uppercase ISO 3166-1 alpha-2 country code.';

create or replace function gigscapes_private.normalize_listing_region(value text)
returns text
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  with cleaned as (
    select btrim(regexp_replace(
      lower(replace(coalesce(value, ''), 'é', 'e')),
      '[^a-z0-9]+',
      ' ',
      'g'
    )) as value
  )
  select nullif(case value
    when 'ab' then 'alberta'
    when 'alta' then 'alberta'
    when 'bc' then 'british columbia'
    when 'mb' then 'manitoba'
    when 'nb' then 'new brunswick'
    when 'nl' then 'newfoundland and labrador'
    when 'newfoundland' then 'newfoundland and labrador'
    when 'ns' then 'nova scotia'
    when 'nt' then 'northwest territories'
    when 'nu' then 'nunavut'
    when 'on' then 'ontario'
    when 'ont' then 'ontario'
    when 'pe' then 'prince edward island'
    when 'pei' then 'prince edward island'
    when 'qc' then 'quebec'
    when 'pq' then 'quebec'
    when 'sk' then 'saskatchewan'
    when 'yt' then 'yukon'
    when 'ca' then 'california'
    when 'calif' then 'california'
    when 'co' then 'colorado'
    when 'dc' then 'district of columbia'
    when 'fl' then 'florida'
    when 'fla' then 'florida'
    when 'ga' then 'georgia'
    when 'il' then 'illinois'
    when 'ma' then 'massachusetts'
    when 'ny' then 'new york'
    when 'or' then 'oregon'
    when 'tx' then 'texas'
    when 'wa' then 'washington'
    else value
  end, '')
  from cleaned;
$$;

create or replace function gigscapes_private.listing_region_country_code(value text)
returns text
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select case gigscapes_private.normalize_listing_region(value)
    when 'alberta' then 'CA'
    when 'british columbia' then 'CA'
    when 'manitoba' then 'CA'
    when 'new brunswick' then 'CA'
    when 'newfoundland and labrador' then 'CA'
    when 'nova scotia' then 'CA'
    when 'northwest territories' then 'CA'
    when 'nunavut' then 'CA'
    when 'ontario' then 'CA'
    when 'prince edward island' then 'CA'
    when 'quebec' then 'CA'
    when 'saskatchewan' then 'CA'
    when 'yukon' then 'CA'
    when 'california' then 'US'
    when 'colorado' then 'US'
    when 'district of columbia' then 'US'
    when 'florida' then 'US'
    when 'georgia' then 'US'
    when 'illinois' then 'US'
    when 'massachusetts' then 'US'
    when 'new york' then 'US'
    when 'oregon' then 'US'
    when 'texas' then 'US'
    when 'washington' then 'US'
    else null
  end;
$$;

create or replace function gigscapes_private.set_listing_location_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_location text := btrim(coalesce(new.location, ''));
  raw_title text := btrim(coalesce(new.title, ''));
  place_text text;
  region_candidate text;
  candidate_country_code text;
  explicit_region text;
  inferred_region text;
  inferred_country_code text;
begin
  new.city := nullif(btrim(coalesce(new.city, '')), '');
  new.location_type := nullif(
    replace(replace(lower(btrim(coalesce(new.location_type, ''))), 'on-site', 'onsite'), 'on site', 'onsite'),
    ''
  );

  if new.location_type not in ('remote', 'hybrid', 'onsite') then
    new.location_type := null;
  end if;

  if new.location_type is null then
    new.location_type := case
      when concat_ws(' ', raw_title, raw_location) ~* '\mhybrid\M' then 'hybrid'
      when concat_ws(' ', raw_title, raw_location) ~* '\m(remote|anywhere|worldwide|work from home|home[- ]based|distributed)\M'
        or lower(btrim(coalesce(new.source, ''))) in ('wwr', 'we work remotely') then 'remote'
      when concat_ws(' ', raw_title, raw_location) ~* '\m(on[- ]?site|in person|office[- ]based)\M' then 'onsite'
      when raw_location <> '' then 'onsite'
      else null
    end;
  end if;

  place_text := btrim(regexp_replace(
    raw_location,
    '^\s*(remote|hybrid|on[- ]?site|in person|office[- ]based|anywhere|worldwide)\s*([-|–—,:/]\s*)?',
    '',
    'i'
  ));

  inferred_country_code := case
    when place_text ~* '(^|,|\s)(canada|canadian)\s*$' then 'CA'
    when place_text ~* '(^|,|\s)(united states|united states of america|usa|u[.]?s[.]?a?[.]?)\s*$' then 'US'
    else null
  end;

  place_text := btrim(regexp_replace(
    place_text,
    '\s*,?\s*(canada|canadian|united states|united states of america|usa|u[.]?s[.]?a?[.]?)\s*$',
    '',
    'i'
  ));

  if position(',' in place_text) > 0 then
    region_candidate := btrim(regexp_replace(place_text, '^.*[,]\s*', ''));
    candidate_country_code := gigscapes_private.listing_region_country_code(region_candidate);
    if candidate_country_code is not null then
      inferred_region := gigscapes_private.normalize_listing_region(region_candidate);
      inferred_country_code := coalesce(inferred_country_code, candidate_country_code);
    end if;
  end if;

  explicit_region := gigscapes_private.normalize_listing_region(new.region);
  new.region := coalesce(explicit_region, inferred_region);
  new.country_code := upper(nullif(btrim(coalesce(new.country_code, '')), ''));

  if new.country_code !~ '^[A-Z]{2}$' then
    new.country_code := null;
  end if;

  new.country_code := coalesce(
    new.country_code,
    inferred_country_code,
    gigscapes_private.listing_region_country_code(new.region)
  );

  if new.city is null and inferred_region is not null then
    new.city := nullif(btrim(regexp_replace(place_text, '\s*[,]\s*[^,]+\s*$', '')), '');
  end if;

  return new;
end;
$$;

revoke execute on function gigscapes_private.normalize_listing_region(text) from public, anon, authenticated;
revoke execute on function gigscapes_private.listing_region_country_code(text) from public, anon, authenticated;
revoke execute on function gigscapes_private.set_listing_location_fields() from public, anon, authenticated;

drop trigger if exists listings_set_location_fields on public.listings;
create trigger listings_set_location_fields
before insert or update of title, location, source, location_type, city, region, country_code
on public.listings
for each row
execute function gigscapes_private.set_listing_location_fields();

-- Re-run every current row through the same normalization used by ingestion.
update public.listings
set location = location
where location_type is null
   or city is null
   or region is null
   or country_code is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'listings_location_type_check'
      and conrelid = 'public.listings'::regclass
  ) then
    alter table public.listings
      add constraint listings_location_type_check
      check (location_type is null or location_type in ('remote', 'hybrid', 'onsite'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'listings_country_code_check'
      and conrelid = 'public.listings'::regclass
  ) then
    alter table public.listings
      add constraint listings_country_code_check
      check (country_code is null or country_code ~ '^[A-Z]{2}$');
  end if;
end
$$;

create index if not exists listings_location_filter_idx
on public.listings (location_type, country_code, region, city)
where location_type is not null;

analyze public.listings;
