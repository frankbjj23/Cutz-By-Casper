-- Authenticate public review intake with a replay-resistant signed request,
-- tighten deletion to one staff-only RPC, and keep abuse hashes for no longer
-- than the stated 24-hour window.

alter table public.review_capture_events
  add column receiver_request_id uuid;

create unique index review_capture_events_request_id_uidx
  on public.review_capture_events (receiver_request_id)
  where receiver_request_id is not null;

create or replace function public.capture_review_submission_v2(
  p_display_name text,
  p_email text,
  p_rating smallint,
  p_review_text text,
  p_consent_version text,
  p_consented_at timestamptz,
  p_source_path text,
  p_network_fingerprint text,
  p_receiver_request_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_name text := regexp_replace(btrim(p_display_name), '[[:space:]]+', ' ', 'g');
  normalized_email text := lower(btrim(p_email));
  normalized_review text := regexp_replace(btrim(p_review_text), '[[:space:]]+', ' ', 'g');
  submission_id uuid;
  recent_capture_count integer;
begin
  if p_display_name is null
    or char_length(normalized_name) not between 2 and 60
    or p_email is null
    or char_length(normalized_email) not between 5 and 320
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_rating is null
    or p_rating not between 1 and 5
    or p_review_text is null
    or char_length(normalized_review) not between 20 and 1000
    or p_consent_version is null
    or p_consent_version <> '2026-09-01-v1'
    or p_consented_at is null
    or p_consented_at < now() - interval '10 minutes'
    or p_consented_at > now() + interval '2 minutes'
    or p_source_path is null
    or p_source_path <> '/reviews'
    or p_network_fingerprint is null
    or p_network_fingerprint !~ '^[0-9a-f]{64}$'
    or p_receiver_request_id is null
  then
    raise exception using errcode = '22023', message = 'invalid_review_submission';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('redeemed-review-network:' || p_network_fingerprint, 0)
  );

  select count(*)
  into recent_capture_count
  from public.review_capture_events
  where network_fingerprint = p_network_fingerprint
    and created_at >= now() - interval '24 hours';

  if recent_capture_count >= 4 then
    raise exception using errcode = 'P0001', message = 'review_rate_limited';
  end if;

  insert into public.review_submissions (
    display_name,
    email,
    rating,
    review_text,
    consent_version,
    consented_at,
    source_path
  ) values (
    normalized_name,
    normalized_email,
    p_rating,
    normalized_review,
    p_consent_version,
    p_consented_at,
    '/reviews'
  )
  returning id into submission_id;

  insert into public.review_capture_events (
    network_fingerprint,
    receiver_request_id
  ) values (
    p_network_fingerprint,
    p_receiver_request_id
  );

  return submission_id;
end;
$$;

revoke all on function public.capture_review_submission_v2(
  text, text, smallint, text, text, timestamptz, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.capture_review_submission_v2(
  text, text, smallint, text, text, timestamptz, text, text, uuid
) to service_role;

drop policy if exists staff_delete_review_submissions
  on public.review_submissions;
revoke delete on table public.review_submissions from authenticated;

create or replace function booking_private.delete_review_submission_internal(
  p_submission_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  linked_public_id uuid;
begin
  if (select auth.uid()) is null
    or not (select booking_private.is_active_staff())
  then
    raise exception using errcode = '42501', message = 'active_staff_required';
  end if;

  delete from public.review_submissions
  where id = p_submission_id
  returning published_review_id into linked_public_id;

  if not found then
    return false;
  end if;

  if linked_public_id is not null then
    delete from public.published_reviews
    where id = linked_public_id
      and source = 'website'
      and source_key = 'website:' || p_submission_id::text;

    if not found then
      raise exception using errcode = 'P0001', message = 'review_public_link_mismatch';
    end if;
  end if;

  return true;
end;
$$;

revoke all on function booking_private.delete_review_submission_internal(uuid)
  from public, anon, authenticated;

create or replace function public.delete_review_submission(p_submission_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select booking_private.delete_review_submission_internal(p_submission_id);
$$;

revoke all on function public.delete_review_submission(uuid)
  from public, anon, authenticated;
grant execute on function public.delete_review_submission(uuid)
  to authenticated;

do $$
begin
  if exists (
    select 1 from cron.job
    where jobname = 'purge-stale-redeemed-review-capture-events'
  ) then
    perform cron.unschedule('purge-stale-redeemed-review-capture-events');
  end if;

  perform cron.schedule(
    'purge-stale-redeemed-review-capture-events',
    '53 * * * *',
    'select booking_private.purge_stale_review_capture_events();'
  );
end;
$$;
