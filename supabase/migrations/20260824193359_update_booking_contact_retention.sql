-- Future booking contacts no longer expire automatically. The two contacts
-- captured under the original v1 notice retain the twelve-month limit they
-- accepted; new v2 contacts are kept until staff deletes them or the customer
-- requests deletion.

alter table public.booking_contacts
  alter column expires_at drop not null,
  alter column expires_at drop default;

alter table public.booking_contacts
  drop constraint booking_contacts_valid_retention_window;

alter table public.booking_contacts
  add constraint booking_contacts_retention_matches_consent check (
    (
      consent_version = '2026-08-24-v1'
      and expires_at is not null
      and expires_at > created_at
      and expires_at <= created_at + interval '12 months 1 day'
    )
    or
    (
      consent_version = '2026-08-24-v2'
      and expires_at is null
    )
  );

comment on column public.booking_contacts.expires_at is
  'Required only for legacy v1 contacts that accepted a twelve-month maximum; null for v2 contacts retained until deletion.';

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
  where consent_version = '2026-08-24-v1'
    and expires_at <= now();

  get diagnostics purged_count = row_count;
  return purged_count;
end;
$$;

revoke all on function booking_private.purge_expired_booking_contacts()
  from public, anon, authenticated;
grant execute on function booking_private.purge_expired_booking_contacts()
  to service_role;

do $$
begin
  if exists (
    select 1 from cron.job
    where jobname = 'purge-expired-redeemed-booking-contacts'
  ) then
    perform cron.unschedule('purge-expired-redeemed-booking-contacts');
  end if;

  if exists (
    select 1 from cron.job
    where jobname = 'purge-expired-legacy-redeemed-booking-contacts'
  ) then
    perform cron.unschedule('purge-expired-legacy-redeemed-booking-contacts');
  end if;

  perform cron.schedule(
    'purge-expired-legacy-redeemed-booking-contacts',
    '17 4 * * *',
    'select booking_private.purge_expired_booking_contacts();'
  );
end;
$$;
