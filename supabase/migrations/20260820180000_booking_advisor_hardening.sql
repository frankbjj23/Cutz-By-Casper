-- Follow-up hardening from Supabase's live security and performance advisors.

drop function if exists public.create_time_block(timestamptz, timestamptz, text);

create or replace function public.create_time_block(
  p_staff_user_id uuid,
  p_start_time_utc timestamptz,
  p_end_time_utc timestamptz,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  block_id uuid;
begin
  if not exists (
    select 1
    from public.staff_members
    where user_id = p_staff_user_id
      and active = true
  ) then
    raise exception using errcode = '42501', message = 'STAFF_ACCESS_REQUIRED';
  end if;
  if p_end_time_utc <= p_start_time_utc then
    raise exception using errcode = '22023', message = 'INVALID_TIME_BLOCK';
  end if;

  perform pg_advisory_xact_lock(7719932620240820);
  perform public.release_expired_booking_holds();

  if exists (
    select 1
    from public.appointments
    where status in ('pending_payment', 'confirmed')
      and tstzrange(start_time_utc, blocked_until_utc, '[)')
        && tstzrange(p_start_time_utc, p_end_time_utc, '[)')
  ) then
    raise exception using errcode = '23P01', message = 'APPOINTMENT_ALREADY_OCCUPIES_TIME';
  end if;

  insert into public.time_blocks (start_time_utc, end_time_utc, reason, created_by)
  values (p_start_time_utc, p_end_time_utc, nullif(btrim(p_reason), ''), p_staff_user_id)
  returning id into block_id;

  return block_id;
end;
$$;

revoke all on function public.create_time_block(uuid, timestamptz, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.create_time_block(uuid, timestamptz, timestamptz, text)
  to service_role;

drop policy if exists deny_direct_stripe_webhook_events on public.stripe_webhook_events;
create policy deny_direct_stripe_webhook_events on public.stripe_webhook_events
  for all to authenticated
  using (false)
  with check (false);

drop policy if exists owners_manage_staff_members on public.staff_members;
drop policy if exists owners_insert_staff_members on public.staff_members;
drop policy if exists owners_update_staff_members on public.staff_members;
drop policy if exists owners_delete_staff_members on public.staff_members;
create policy owners_insert_staff_members on public.staff_members
  for insert to authenticated
  with check ((select booking_private.is_owner()));
create policy owners_update_staff_members on public.staff_members
  for update to authenticated
  using ((select booking_private.is_owner()))
  with check ((select booking_private.is_owner()));
create policy owners_delete_staff_members on public.staff_members
  for delete to authenticated
  using ((select booking_private.is_owner()));

create index if not exists appointment_events_actor_user_idx
  on public.appointment_events (actor_user_id);
create index if not exists appointments_rescheduled_from_idx
  on public.appointments (rescheduled_from_appointment_id);
create index if not exists appointments_service_idx
  on public.appointments (service_id);
create index if not exists business_settings_updated_by_idx
  on public.business_settings (updated_by);
create index if not exists notification_outbox_appointment_idx
  on public.notification_outbox (appointment_id);
create index if not exists stripe_webhook_events_appointment_idx
  on public.stripe_webhook_events (appointment_id);
create index if not exists time_blocks_created_by_idx
  on public.time_blocks (created_by);
