-- Website-owned contact capture before the customer continues to Booksy.
--
-- These rows are booking handoff contacts, not confirmed appointments. Only the
-- Edge Function service client may write them; active staff may read or delete
-- them through the private dashboard. Anonymous table access remains disabled.

create table public.booking_contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 100),
  email text check (
    email is null or (
      char_length(email) between 5 and 320
      and email = lower(btrim(email))
      and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  ),
  phone_e164 text check (
    phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
  ),
  consent_version text not null check (char_length(consent_version) between 1 and 40),
  consented_at timestamptz not null,
  source_path text not null default '/book' check (source_path = '/book'),
  network_fingerprint text not null check (network_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '12 months'),
  constraint booking_contacts_contact_method_required check (
    email is not null or phone_e164 is not null
  ),
  constraint booking_contacts_valid_retention_window check (
    expires_at > created_at and expires_at <= created_at + interval '12 months 1 day'
  )
);

comment on table public.booking_contacts is
  'Consent-based website contacts captured before a customer continues to Booksy; not proof of a completed booking.';
comment on column public.booking_contacts.network_fingerprint is
  'One-way keyed hash used only for abuse rate limiting; never a raw network address.';

create index booking_contacts_created_at_idx
  on public.booking_contacts (created_at desc);
create index booking_contacts_expires_at_idx
  on public.booking_contacts (expires_at);
create index booking_contacts_rate_limit_idx
  on public.booking_contacts (network_fingerprint, created_at desc);

alter table public.booking_contacts enable row level security;

create policy staff_read_booking_contacts on public.booking_contacts
  for select to authenticated
  using ((select booking_private.is_active_staff()));

create policy staff_delete_booking_contacts on public.booking_contacts
  for delete to authenticated
  using ((select booking_private.is_active_staff()));

revoke all on table public.booking_contacts from public, anon, authenticated;
grant select, delete on public.booking_contacts to authenticated;
grant all privileges on table public.booking_contacts to service_role;

create or replace function booking_private.purge_expired_booking_contacts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  purged_count integer;
begin
  delete from public.booking_contacts
  where expires_at <= now();

  get diagnostics purged_count = row_count;
  return purged_count;
end;
$$;

revoke all on function booking_private.purge_expired_booking_contacts()
  from public, anon, authenticated;
grant execute on function booking_private.purge_expired_booking_contacts()
  to service_role;

-- Supabase provides pg_cron for database housekeeping. The daily job makes the
-- promised twelve-month maximum retention independent of future submissions.
create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'purge-expired-redeemed-booking-contacts';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'purge-expired-redeemed-booking-contacts',
    '17 4 * * *',
    'select booking_private.purge_expired_booking_contacts();'
  );
end;
$$;
