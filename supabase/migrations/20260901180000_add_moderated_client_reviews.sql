-- Moderated client reviews for the Redeemed website.
--
-- Visitor email addresses and moderation state remain in a private table. The
-- only anonymous-readable table contains fields intentionally approved for
-- public display. Booksy excerpts are short, source-linked snapshots from
-- confirmed clients; website submissions are always labeled separately.

create table public.published_reviews (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('booksy', 'website')),
  source_key text not null unique check (char_length(source_key) between 3 and 160),
  display_name text not null check (char_length(display_name) between 2 and 60),
  rating smallint not null check (rating between 1 and 5),
  review_text text not null check (char_length(review_text) between 20 and 1000),
  service_name text check (service_name is null or char_length(service_name) between 2 and 120),
  reviewed_at date,
  confirmed_client boolean not null default false,
  source_url text check (source_url is null or source_url ~ '^https://'),
  active boolean not null default true,
  display_order integer not null default 1000,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_reviews_source_boundary check (
    (source = 'booksy' and confirmed_client = true and source_url is not null)
    or
    (source = 'website' and confirmed_client = false and source_url is null)
  )
);

comment on table public.published_reviews is
  'Approved public-only review fields. Contains no reviewer email or network identifier.';
comment on column public.published_reviews.source is
  'Booksy excerpts and Redeemed website reviews must remain visibly distinct.';

create table public.review_submissions (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(display_name) between 2 and 60),
  email text not null check (
    char_length(email) between 5 and 320
    and email = lower(btrim(email))
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  rating smallint not null check (rating between 1 and 5),
  review_text text not null check (char_length(review_text) between 20 and 1000),
  consent_version text not null check (char_length(consent_version) between 1 and 40),
  consented_at timestamptz not null,
  source_path text not null default '/reviews' check (source_path = '/reviews'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  moderated_at timestamptz,
  moderated_by uuid references auth.users(id),
  published_review_id uuid unique references public.published_reviews(id) on delete restrict,
  constraint review_submissions_moderation_state check (
    (status = 'pending' and moderated_at is null and moderated_by is null and published_review_id is null)
    or
    (status = 'approved' and moderated_at is not null and moderated_by is not null and published_review_id is not null)
    or
    (status = 'rejected' and moderated_at is not null and moderated_by is not null and published_review_id is null)
  )
);

comment on table public.review_submissions is
  'Private website review inbox. Reviewer email is visible only to active staff.';

create table public.review_capture_events (
  id bigint generated always as identity primary key,
  network_fingerprint text not null check (network_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

comment on table public.review_capture_events is
  'Short-lived keyed network hashes used only to limit automated review submissions.';

create index published_reviews_public_order_idx
  on public.published_reviews (active, display_order, published_at desc);
create index review_submissions_status_created_idx
  on public.review_submissions (status, created_at desc);
create index review_capture_events_rate_idx
  on public.review_capture_events (network_fingerprint, created_at desc);

alter table public.published_reviews enable row level security;
alter table public.review_submissions enable row level security;
alter table public.review_capture_events enable row level security;

create policy public_read_active_published_reviews
  on public.published_reviews
  for select to anon
  using (active = true);

create policy authenticated_read_published_reviews
  on public.published_reviews
  for select to authenticated
  using (active = true or (select booking_private.is_active_staff()));

create policy staff_insert_published_reviews
  on public.published_reviews
  for insert to authenticated
  with check ((select booking_private.is_active_staff()));

create policy staff_update_published_reviews
  on public.published_reviews
  for update to authenticated
  using ((select booking_private.is_active_staff()))
  with check ((select booking_private.is_active_staff()));

create policy staff_read_review_submissions
  on public.review_submissions
  for select to authenticated
  using ((select booking_private.is_active_staff()));

create policy staff_update_review_submissions
  on public.review_submissions
  for update to authenticated
  using ((select booking_private.is_active_staff()))
  with check ((select booking_private.is_active_staff()));

create policy staff_delete_review_submissions
  on public.review_submissions
  for delete to authenticated
  using ((select booking_private.is_active_staff()));

revoke all on table public.published_reviews from public, anon, authenticated;
grant select on table public.published_reviews to anon;
grant select, insert, update on table public.published_reviews to authenticated;
grant all privileges on table public.published_reviews to service_role;

revoke all on table public.review_submissions from public, anon, authenticated;
grant select, update, delete on table public.review_submissions to authenticated;
grant all privileges on table public.review_submissions to service_role;

revoke all on table public.review_capture_events from public, anon, authenticated;
grant all privileges on table public.review_capture_events to service_role;
grant usage, select on sequence public.review_capture_events_id_seq to service_role;

create or replace function public.capture_review_submission(
  p_display_name text,
  p_email text,
  p_rating smallint,
  p_review_text text,
  p_consent_version text,
  p_consented_at timestamptz,
  p_source_path text,
  p_network_fingerprint text
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

  insert into public.review_capture_events (network_fingerprint)
  values (p_network_fingerprint);

  return submission_id;
end;
$$;

revoke all on function public.capture_review_submission(
  text, text, smallint, text, text, timestamptz, text, text
) from public, anon, authenticated;
grant execute on function public.capture_review_submission(
  text, text, smallint, text, text, timestamptz, text, text
) to service_role;

create or replace function public.publish_review_submission(p_submission_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  submission public.review_submissions%rowtype;
  result_review_id uuid;
begin
  if not (select booking_private.is_active_staff()) then
    raise exception using errcode = '42501', message = 'active_staff_required';
  end if;

  select * into submission
  from public.review_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'review_submission_not_found';
  end if;

  if submission.status = 'approved' and submission.published_review_id is not null then
    return submission.published_review_id;
  end if;

  if submission.status <> 'pending' then
    raise exception using errcode = '22023', message = 'review_submission_not_pending';
  end if;

  insert into public.published_reviews (
    source,
    source_key,
    display_name,
    rating,
    review_text,
    reviewed_at,
    confirmed_client,
    source_url,
    active,
    display_order
  ) values (
    'website',
    'website:' || submission.id::text,
    submission.display_name,
    submission.rating,
    submission.review_text,
    (submission.created_at at time zone 'America/New_York')::date,
    false,
    null,
    true,
    1000
  )
  returning id into result_review_id;

  update public.review_submissions
  set status = 'approved',
      moderated_at = now(),
      moderated_by = (select auth.uid()),
      published_review_id = result_review_id
  where id = submission.id;

  return result_review_id;
end;
$$;

revoke all on function public.publish_review_submission(uuid)
  from public, anon;
grant execute on function public.publish_review_submission(uuid)
  to authenticated;

create or replace function booking_private.purge_stale_review_capture_events()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  purged_count integer;
begin
  delete from public.review_capture_events
  where created_at < now() - interval '24 hours';

  get diagnostics purged_count = row_count;
  return purged_count;
end;
$$;

revoke all on function booking_private.purge_stale_review_capture_events()
  from public, anon, authenticated;
grant execute on function booking_private.purge_stale_review_capture_events()
  to service_role;

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
    '53 4 * * *',
    'select booking_private.purge_stale_review_capture_events();'
  );
end;
$$;

insert into public.published_reviews (
  source,
  source_key,
  display_name,
  rating,
  review_text,
  service_name,
  reviewed_at,
  confirmed_client,
  source_url,
  active,
  display_order
) values
  (
    'booksy',
    'booksy-mauricio-sharp-cut',
    'Mauricio O.',
    5,
    'Super sharp cut today.',
    'HAIRCUT NO BEARD',
    date '2026-02-27',
    true,
    'https://booksy.com/en-us/697614_casper_barber-shop_28387_ridgefield',
    true,
    10
  ),
  (
    'booksy',
    'booksy-danny-craft',
    'Danny R.',
    5,
    'A man of his craft, never disappoints!',
    'HAIRCUT NO BEARD',
    date '2025-08-06',
    true,
    'https://booksy.com/en-us/697614_casper_barber-shop_28387_ridgefield',
    true,
    20
  ),
  (
    'booksy',
    'booksy-david-best-in-jersey',
    'David S.',
    5,
    'BEST BARBER IN JERSEY',
    'HAIRCUT NO BEARD',
    date '2025-01-20',
    true,
    'https://booksy.com/en-us/697614_casper_barber-shop_28387_ridgefield',
    true,
    30
  )
on conflict (source_key) do update
set display_name = excluded.display_name,
    rating = excluded.rating,
    review_text = excluded.review_text,
    service_name = excluded.service_name,
    reviewed_at = excluded.reviewed_at,
    confirmed_client = excluded.confirmed_client,
    source_url = excluded.source_url,
    active = excluded.active,
    display_order = excluded.display_order,
    updated_at = now();
