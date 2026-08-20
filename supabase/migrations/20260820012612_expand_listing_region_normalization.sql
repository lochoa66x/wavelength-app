-- Phase 3: complete Canada/United States region normalization.
-- Keep the parsing helpers in a non-exposed schema and run the ingestion
-- trigger with the privileges of the role writing the listing.

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
    -- Canada
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

    -- United States
    when 'al' then 'alabama'
    when 'ak' then 'alaska'
    when 'az' then 'arizona'
    when 'ar' then 'arkansas'
    when 'ca' then 'california'
    when 'calif' then 'california'
    when 'co' then 'colorado'
    when 'colo' then 'colorado'
    when 'ct' then 'connecticut'
    when 'dc' then 'district of columbia'
    when 'de' then 'delaware'
    when 'fl' then 'florida'
    when 'fla' then 'florida'
    when 'ga' then 'georgia'
    when 'hi' then 'hawaii'
    when 'id' then 'idaho'
    when 'il' then 'illinois'
    when 'in' then 'indiana'
    when 'ia' then 'iowa'
    when 'ks' then 'kansas'
    when 'ky' then 'kentucky'
    when 'la' then 'louisiana'
    when 'me' then 'maine'
    when 'md' then 'maryland'
    when 'ma' then 'massachusetts'
    when 'mass' then 'massachusetts'
    when 'mi' then 'michigan'
    when 'mn' then 'minnesota'
    when 'ms' then 'mississippi'
    when 'mo' then 'missouri'
    when 'mt' then 'montana'
    when 'ne' then 'nebraska'
    when 'nv' then 'nevada'
    when 'nh' then 'new hampshire'
    when 'nj' then 'new jersey'
    when 'nm' then 'new mexico'
    when 'ny' then 'new york'
    when 'nc' then 'north carolina'
    when 'nd' then 'north dakota'
    when 'oh' then 'ohio'
    when 'ok' then 'oklahoma'
    when 'or' then 'oregon'
    when 'pa' then 'pennsylvania'
    when 'ri' then 'rhode island'
    when 'sc' then 'south carolina'
    when 'sd' then 'south dakota'
    when 'tn' then 'tennessee'
    when 'tx' then 'texas'
    when 'ut' then 'utah'
    when 'vt' then 'vermont'
    when 'va' then 'virginia'
    when 'wa' then 'washington'
    when 'wv' then 'west virginia'
    when 'wi' then 'wisconsin'
    when 'wy' then 'wyoming'
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
  select case
    when gigscapes_private.normalize_listing_region(value) in (
      'alberta',
      'british columbia',
      'manitoba',
      'new brunswick',
      'newfoundland and labrador',
      'nova scotia',
      'northwest territories',
      'nunavut',
      'ontario',
      'prince edward island',
      'quebec',
      'saskatchewan',
      'yukon'
    ) then 'CA'
    when gigscapes_private.normalize_listing_region(value) in (
      'alabama',
      'alaska',
      'arizona',
      'arkansas',
      'california',
      'colorado',
      'connecticut',
      'delaware',
      'district of columbia',
      'florida',
      'georgia',
      'hawaii',
      'idaho',
      'illinois',
      'indiana',
      'iowa',
      'kansas',
      'kentucky',
      'louisiana',
      'maine',
      'maryland',
      'massachusetts',
      'michigan',
      'minnesota',
      'mississippi',
      'missouri',
      'montana',
      'nebraska',
      'nevada',
      'new hampshire',
      'new jersey',
      'new mexico',
      'new york',
      'north carolina',
      'north dakota',
      'ohio',
      'oklahoma',
      'oregon',
      'pennsylvania',
      'rhode island',
      'south carolina',
      'south dakota',
      'tennessee',
      'texas',
      'utah',
      'vermont',
      'virginia',
      'washington',
      'west virginia',
      'wisconsin',
      'wyoming'
    ) then 'US'
    else null
  end;
$$;

-- SECURITY INVOKER prevents this trigger from silently bypassing the grants
-- or RLS policies of the role writing the listing. The only extra privileges
-- granted below are for pure text-normalization helpers in a private schema.
alter function gigscapes_private.set_listing_location_fields() security invoker;

grant usage on schema gigscapes_private to anon, authenticated, service_role;
grant execute on function gigscapes_private.normalize_listing_region(text)
  to anon, authenticated, service_role;
grant execute on function gigscapes_private.listing_region_country_code(text)
  to anon, authenticated, service_role;
grant execute on function gigscapes_private.set_listing_location_fields()
  to anon, authenticated, service_role;

-- Re-run records that could not be fully normalized by Phase 2. This update
-- goes through the existing trigger and preserves the raw location string.
update public.listings
set location = location
where country_code is null
   or region is null
   or region is distinct from gigscapes_private.normalize_listing_region(region);

analyze public.listings;
