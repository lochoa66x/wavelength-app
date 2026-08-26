create schema if not exists gigscapes_private;

revoke all on schema gigscapes_private from public, anon, authenticated;
grant usage on schema gigscapes_private to service_role;

create table gigscapes_private.quality_signal_daily_aggregates (
  day_bucket date not null,
  schema_version smallint not null check (schema_version = 1),
  event_name text not null check (event_name in (
    'posting_review_completed', 'tailoring_completed', 'tailoring_blocked',
    'export_attempted', 'export_completed', 'export_failed',
    'fit_feedback_submitted', 'suggestion_feedback_submitted'
  )),
  route text not null check (route in ('app', 'custom_job')),
  posting_source text not null check (posting_source in ('public_listing', 'public_url', 'pasted_text', 'screenshots', 'not_applicable')),
  occupation_family text not null check (occupation_family in (
    'general-professional', 'sap-functional', 'project-leadership', 'technical',
    'admin-customer-operations', 'skilled-trades-field-services',
    'marketing-communications', 'creative-design', 'not_applicable'
  )),
  candidate_path text not null check (candidate_path in ('direct', 'adjacent', 'transferable', 'major-transition', 'not_applicable')),
  posting_readiness text not null check (posting_readiness in ('reviewed_complete', 'needs_full_posting', 'preliminary', 'not_available', 'not_applicable')),
  export_readiness text not null check (export_readiness in ('final', 'preliminary', 'blocked', 'not_applicable')),
  integrity_status text not null check (integrity_status in ('pass', 'review', 'blocked', 'unknown', 'not_applicable')),
  template_id text not null check (template_id in (
    'ats-core-v1', 'sap-functional-v1', 'project-leadership-v1',
    'career-transition-v1', 'technical-software-v1',
    'admin-customer-operations-v1', 'skilled-trades-field-services-v1',
    'marketing-communications-v1', 'creative-design-v1', 'not_applicable'
  )),
  export_format text not null check (export_format in ('docx', 'pdf', 'text', 'not_applicable')),
  outcome text not null check (outcome in ('completed', 'completed_with_fallback', 'blocked', 'failed', 'not_applicable')),
  error_category text not null check (error_category in (
    'stale_exporter', 'invalid_content', 'browser_download', 'serialization',
    'timeout', 'network', 'validation', 'storage', 'unknown', 'not_applicable'
  )),
  coverage_band text not null check (coverage_band in ('none', '0-24', '25-49', '50-74', '75-89', '90-100', 'not_available')),
  duration_band text not null check (duration_band in ('under_5s', '5-30s', '30-90s', '90s_plus', 'not_available')),
  feedback text not null check (feedback in ('helpful', 'not_helpful', 'opened', 'did_not_open', 'not_applicable')),
  feedback_reason text not null check (feedback_reason in (
    'positioning_accurate', 'positioning_unclear', 'missing_relevant_evidence',
    'too_generic', 'document_opened', 'document_did_not_open',
    'formatting_issue', 'missing_content', 'not_applicable'
  )),
  event_count bigint not null default 1 check (event_count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (
    day_bucket, schema_version, event_name, route, posting_source, occupation_family,
    candidate_path, posting_readiness, export_readiness, integrity_status,
    template_id, export_format, outcome, error_category, coverage_band,
    duration_band, feedback, feedback_reason
  )
);

alter table gigscapes_private.quality_signal_daily_aggregates enable row level security;
revoke all on table gigscapes_private.quality_signal_daily_aggregates from public, anon, authenticated;
grant select, insert, update, delete on table gigscapes_private.quality_signal_daily_aggregates to service_role;

create or replace function public.record_quality_signal(
  p_schema_version smallint,
  p_event_name text,
  p_route text,
  p_posting_source text,
  p_occupation_family text,
  p_candidate_path text,
  p_posting_readiness text,
  p_export_readiness text,
  p_integrity_status text,
  p_template_id text,
  p_export_format text,
  p_outcome text,
  p_error_category text,
  p_coverage_band text,
  p_duration_band text,
  p_feedback text,
  p_feedback_reason text
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into gigscapes_private.quality_signal_daily_aggregates (
    day_bucket, schema_version, event_name, route, posting_source, occupation_family,
    candidate_path, posting_readiness, export_readiness, integrity_status,
    template_id, export_format, outcome, error_category, coverage_band,
    duration_band, feedback, feedback_reason
  ) values (
    (timezone('utc', now()))::date, p_schema_version, p_event_name, p_route, p_posting_source,
    p_occupation_family, p_candidate_path, p_posting_readiness,
    p_export_readiness, p_integrity_status, p_template_id, p_export_format,
    p_outcome, p_error_category, p_coverage_band, p_duration_band,
    p_feedback, p_feedback_reason
  )
  on conflict (
    day_bucket, schema_version, event_name, route, posting_source, occupation_family,
    candidate_path, posting_readiness, export_readiness, integrity_status,
    template_id, export_format, outcome, error_category, coverage_band,
    duration_band, feedback, feedback_reason
  ) do update
    set event_count = gigscapes_private.quality_signal_daily_aggregates.event_count + 1,
        updated_at = now();

  delete from gigscapes_private.quality_signal_daily_aggregates
  where day_bucket < ((timezone('utc', now()))::date - 180);
end;
$$;

revoke all on function public.record_quality_signal(
  smallint, text, text, text, text, text, text, text, text, text, text, text, text,
  text, text, text, text
) from public, anon, authenticated;
grant execute on function public.record_quality_signal(
  smallint, text, text, text, text, text, text, text, text, text, text, text, text,
  text, text, text, text
) to service_role;
