-- Redeemed by Casper custom booking foundation.
--
-- This migration intentionally exposes no anonymous table access. Customer-facing
-- booking requests will be validated by the Next.js server, then committed through
-- the narrowly granted create_booking_hold function. Staff access is protected by
-- Supabase Auth plus the staff_members allowlist and RLS.

create schema if not exists booking_private;
revoke all on schema booking_private from public, anon, authenticated;

create type public.booking_staff_role as enum ('owner', 'administrator');
create type public.booking_appointment_status as enum (
  'pending_payment',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
  'expired'
);
create type public.booking_payment_status as enum (
  'pending',
  'paid',
  'failed',
  'refunded',
  'disputed',
  'forfeited'
);
create type public.booking_job_status as enum (
  'queued',
  'processing',
  'completed',
  'failed',
  'cancelled'
);

create table public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.booking_staff_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 100),
  description text,
  duration_minutes integer not null check (duration_minutes between 15 and 240),
  price_cents integer not null check (price_cents >= 0),
  price_from boolean not null default false,
  online_bookable boolean not null default true,
  active boolean not null default true,
  display_order integer not null default 0,
  source_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_settings (
  id smallint primary key default 1 check (id = 1),
  time_zone text not null default 'America/New_York',
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  deposit_cents integer not null default 1000 check (deposit_cents >= 0),
  deposit_non_refundable boolean not null default true,
  deposit_applies_to_balance boolean not null default true,
  reschedule_min_hours integer not null default 24 check (reschedule_min_hours between 0 and 720),
  hold_minutes integer not null default 30 check (hold_minutes between 30 and 1440),
  buffer_minutes integer not null default 0 check (buffer_minutes between 0 and 120),
  slot_interval_minutes integer not null default 15 check (slot_interval_minutes in (5, 10, 15, 20, 30, 60)),
  min_lead_hours integer not null default 2 check (min_lead_hours between 0 and 720),
  booking_window_days integer not null default 60 check (booking_window_days between 1 and 365),
  location_city text not null default 'Ridgefield Park',
  location_region text not null default 'NJ',
  address_line text,
  policy_version text not null check (char_length(policy_version) between 1 and 40),
  policy_text text not null check (char_length(policy_text) between 20 and 2000),
  policy_effective_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table public.weekly_hours (
  id uuid primary key default gen_random_uuid(),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_hours_valid_range check (closes_at > opens_at),
  constraint weekly_hours_unique_range unique (day_of_week, opens_at, closes_at)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 100),
  email text not null check (char_length(email) between 5 and 320),
  phone_e164 text not null unique check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  sms_opt_in boolean not null default false,
  sms_consent_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_sms_consent_consistent check (
    (sms_opt_in and sms_consent_at is not null) or
    (not sms_opt_in and sms_consent_at is null)
  )
);

create index customers_email_lower_idx on public.customers (lower(email));

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  service_name_snapshot text not null,
  service_duration_minutes_snapshot integer not null check (service_duration_minutes_snapshot between 15 and 240),
  service_price_cents_snapshot integer not null check (service_price_cents_snapshot >= 0),
  start_time_utc timestamptz not null,
  end_time_utc timestamptz not null,
  blocked_until_utc timestamptz not null,
  status public.booking_appointment_status not null default 'pending_payment',
  hold_expires_at_utc timestamptz,
  deposit_required_cents integer not null check (deposit_required_cents >= 0),
  deposit_non_refundable boolean not null,
  deposit_applies_to_balance boolean not null,
  balance_due_cents integer generated always as (
    greatest(service_price_cents_snapshot - deposit_required_cents, 0)
  ) stored,
  policy_version text not null,
  policy_text_snapshot text not null,
  policy_accepted_at timestamptz not null,
  policy_acceptance_ip_hash text check (
    policy_acceptance_ip_hash is null or policy_acceptance_ip_hash ~ '^[0-9a-f]{64}$'
  ),
  manage_token_hash text not null unique check (manage_token_hash ~ '^[0-9a-f]{64}$'),
  reschedule_deadline_utc timestamptz not null,
  reschedule_count integer not null default 0 check (reschedule_count >= 0),
  rescheduled_from_appointment_id uuid references public.appointments(id) on delete set null,
  cancellation_reason text,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_valid_time_range check (
    end_time_utc > start_time_utc and blocked_until_utc >= end_time_utc
  ),
  constraint appointments_pending_hold_consistent check (
    (status = 'pending_payment' and hold_expires_at_utc is not null) or
    (status <> 'pending_payment')
  ),
  constraint appointments_confirmation_consistent check (
    (status = 'confirmed' and confirmed_at is not null) or
    (status <> 'confirmed')
  )
);

alter table public.appointments
  add constraint appointments_no_active_overlap
  exclude using gist (
    tstzrange(start_time_utc, blocked_until_utc, '[)') with &&
  )
  where (status in ('pending_payment', 'confirmed'));

create index appointments_start_time_idx on public.appointments (start_time_utc);
create index appointments_customer_idx on public.appointments (customer_id, start_time_utc desc);
create index appointments_status_idx on public.appointments (status, start_time_utc);
create index appointments_expiring_holds_idx on public.appointments (hold_expires_at_utc)
  where status = 'pending_payment';

create table public.time_blocks (
  id uuid primary key default gen_random_uuid(),
  start_time_utc timestamptz not null,
  end_time_utc timestamptz not null,
  reason text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint time_blocks_valid_range check (end_time_utc > start_time_utc)
);

create index time_blocks_range_idx on public.time_blocks using gist (
  tstzrange(start_time_utc, end_time_utc, '[)')
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete restrict,
  provider text not null default 'stripe' check (provider = 'stripe'),
  provider_checkout_session_id text not null unique,
  provider_payment_intent_id text unique,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  status public.booking_payment_status not null default 'pending',
  non_refundable boolean not null default true,
  applies_to_balance boolean not null default true,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index one_paid_deposit_per_appointment_idx
  on public.payments (appointment_id)
  where status = 'paid';

create table public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  appointment_id uuid references public.appointments(id) on delete set null,
  processed_at timestamptz not null default now()
);

create table public.appointment_events (
  id bigint generated always as identity primary key,
  appointment_id uuid not null references public.appointments(id) on delete restrict,
  event_type text not null,
  actor_type text not null check (actor_type in ('customer', 'staff', 'system', 'stripe')),
  actor_user_id uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index appointment_events_appointment_idx
  on public.appointment_events (appointment_id, created_at);

create table public.notification_outbox (
  id bigint generated always as identity primary key,
  appointment_id uuid references public.appointments(id) on delete restrict,
  topic text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.booking_job_status not null default 'queued',
  available_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notification_outbox_work_idx
  on public.notification_outbox (status, available_at)
  where status in ('queued', 'failed');

create table public.calendar_sync_jobs (
  id bigint generated always as identity primary key,
  appointment_id uuid not null references public.appointments(id) on delete restrict,
  action text not null check (action in ('upsert', 'cancel')),
  status public.booking_job_status not null default 'queued',
  google_calendar_id text,
  google_event_id text,
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index calendar_sync_one_open_job_idx
  on public.calendar_sync_jobs (appointment_id, action)
  where status in ('queued', 'processing', 'failed');

create table public.staff_notification_settings (
  user_id uuid primary key references public.staff_members(user_id) on delete cascade,
  notification_email text not null,
  send_booking_updates boolean not null default true,
  send_daily_summary boolean not null default true,
  daily_summary_local_time time not null default '07:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function booking_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger staff_members_set_updated_at before update on public.staff_members
  for each row execute function booking_private.set_updated_at();
create trigger services_set_updated_at before update on public.services
  for each row execute function booking_private.set_updated_at();
create trigger business_settings_set_updated_at before update on public.business_settings
  for each row execute function booking_private.set_updated_at();
create trigger weekly_hours_set_updated_at before update on public.weekly_hours
  for each row execute function booking_private.set_updated_at();
create trigger customers_set_updated_at before update on public.customers
  for each row execute function booking_private.set_updated_at();
create trigger appointments_set_updated_at before update on public.appointments
  for each row execute function booking_private.set_updated_at();
create trigger payments_set_updated_at before update on public.payments
  for each row execute function booking_private.set_updated_at();
create trigger notification_outbox_set_updated_at before update on public.notification_outbox
  for each row execute function booking_private.set_updated_at();
create trigger calendar_sync_jobs_set_updated_at before update on public.calendar_sync_jobs
  for each row execute function booking_private.set_updated_at();
create trigger staff_notification_settings_set_updated_at before update on public.staff_notification_settings
  for each row execute function booking_private.set_updated_at();

create or replace function booking_private.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_members
    where user_id = (select auth.uid())
      and active = true
  );
$$;

create or replace function booking_private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_members
    where user_id = (select auth.uid())
      and active = true
      and role = 'owner'
  );
$$;

create or replace function public.release_expired_booking_holds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  released_count integer;
begin
  update public.appointments
  set status = 'expired',
      cancellation_reason = 'Payment window expired'
  where status = 'pending_payment'
    and hold_expires_at_utc <= now();

  get diagnostics released_count = row_count;
  return released_count;
end;
$$;

create or replace function public.create_booking_hold(
  p_service_id uuid,
  p_start_time_utc timestamptz,
  p_full_name text,
  p_email text,
  p_phone_e164 text,
  p_sms_opt_in boolean,
  p_policy_version text,
  p_policy_accepted boolean,
  p_policy_acceptance_ip_hash text,
  p_manage_token_hash text
)
returns table (
  appointment_id uuid,
  hold_expires_at_utc timestamptz,
  deposit_cents integer,
  balance_due_cents integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.business_settings%rowtype;
  selected_service public.services%rowtype;
  customer_id uuid;
  appointment_id_value uuid;
  local_start timestamp;
  local_end timestamp;
  end_time_value timestamptz;
  blocked_until_value timestamptz;
  hold_expires_value timestamptz;
  schedule_matches integer;
begin
  perform pg_advisory_xact_lock(7719932620240820);

  if not p_policy_accepted then
    raise exception using errcode = '22023', message = 'POLICY_ACCEPTANCE_REQUIRED';
  end if;
  if char_length(btrim(p_full_name)) not between 2 and 100 then
    raise exception using errcode = '22023', message = 'INVALID_CUSTOMER_NAME';
  end if;
  if char_length(btrim(p_email)) not between 5 and 320 or position('@' in p_email) < 2 then
    raise exception using errcode = '22023', message = 'INVALID_CUSTOMER_EMAIL';
  end if;
  if p_phone_e164 !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception using errcode = '22023', message = 'INVALID_CUSTOMER_PHONE';
  end if;
  if p_manage_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'INVALID_MANAGE_TOKEN';
  end if;
  if p_policy_acceptance_ip_hash is not null and p_policy_acceptance_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'INVALID_ACCEPTANCE_HASH';
  end if;

  select * into strict settings from public.business_settings where id = 1;
  select * into strict selected_service
  from public.services
  where id = p_service_id
    and active = true
    and online_bookable = true
    and price_from = false;

  if p_policy_version <> settings.policy_version then
    raise exception using errcode = '22023', message = 'POLICY_VERSION_CHANGED';
  end if;
  if selected_service.price_cents < settings.deposit_cents then
    raise exception using errcode = '23514', message = 'DEPOSIT_EXCEEDS_SERVICE_PRICE';
  end if;
  if p_start_time_utc < now() + make_interval(hours => settings.min_lead_hours) then
    raise exception using errcode = '22023', message = 'APPOINTMENT_TOO_SOON';
  end if;
  if p_start_time_utc > now() + make_interval(days => settings.booking_window_days) then
    raise exception using errcode = '22023', message = 'APPOINTMENT_OUTSIDE_BOOKING_WINDOW';
  end if;

  end_time_value := p_start_time_utc + make_interval(mins => selected_service.duration_minutes);
  blocked_until_value := end_time_value + make_interval(mins => settings.buffer_minutes);
  hold_expires_value := now() + make_interval(mins => settings.hold_minutes);
  local_start := p_start_time_utc at time zone settings.time_zone;
  local_end := end_time_value at time zone settings.time_zone;

  if mod(
    extract(hour from local_start)::integer * 60 + extract(minute from local_start)::integer,
    settings.slot_interval_minutes
  ) <> 0 then
    raise exception using errcode = '22023', message = 'INVALID_SLOT_INTERVAL';
  end if;

  select count(*) into schedule_matches
  from public.weekly_hours
  where day_of_week = extract(dow from local_start)::smallint
    and local_start::date = local_end::date
    and local_start::time >= opens_at
    and local_end::time <= closes_at;

  if schedule_matches = 0 then
    raise exception using errcode = '22023', message = 'OUTSIDE_WORKING_HOURS';
  end if;

  if exists (
    select 1
    from public.time_blocks
    where tstzrange(start_time_utc, end_time_utc, '[)')
      && tstzrange(p_start_time_utc, blocked_until_value, '[)')
  ) then
    raise exception using errcode = '23P01', message = 'TIME_BLOCKED';
  end if;

  perform public.release_expired_booking_holds();

  insert into public.customers (
    full_name,
    email,
    phone_e164,
    sms_opt_in,
    sms_consent_at
  ) values (
    btrim(p_full_name),
    lower(btrim(p_email)),
    p_phone_e164,
    p_sms_opt_in,
    case when p_sms_opt_in then now() else null end
  )
  on conflict (phone_e164) do update
  set full_name = excluded.full_name,
      email = excluded.email,
      sms_opt_in = excluded.sms_opt_in,
      sms_consent_at = excluded.sms_consent_at
  returning id into customer_id;

  insert into public.appointments (
    customer_id,
    service_id,
    service_name_snapshot,
    service_duration_minutes_snapshot,
    service_price_cents_snapshot,
    start_time_utc,
    end_time_utc,
    blocked_until_utc,
    status,
    hold_expires_at_utc,
    deposit_required_cents,
    deposit_non_refundable,
    deposit_applies_to_balance,
    policy_version,
    policy_text_snapshot,
    policy_accepted_at,
    policy_acceptance_ip_hash,
    manage_token_hash,
    reschedule_deadline_utc
  ) values (
    customer_id,
    selected_service.id,
    selected_service.name,
    selected_service.duration_minutes,
    selected_service.price_cents,
    p_start_time_utc,
    end_time_value,
    blocked_until_value,
    'pending_payment',
    hold_expires_value,
    settings.deposit_cents,
    settings.deposit_non_refundable,
    settings.deposit_applies_to_balance,
    settings.policy_version,
    settings.policy_text,
    now(),
    p_policy_acceptance_ip_hash,
    p_manage_token_hash,
    p_start_time_utc - make_interval(hours => settings.reschedule_min_hours)
  )
  returning id into appointment_id_value;

  insert into public.appointment_events (
    appointment_id,
    event_type,
    actor_type,
    details
  ) values (
    appointment_id_value,
    'hold_created',
    'customer',
    jsonb_build_object('hold_expires_at_utc', hold_expires_value)
  );

  return query
  select
    appointment_id_value,
    hold_expires_value,
    settings.deposit_cents,
    greatest(selected_service.price_cents - settings.deposit_cents, 0);
exception
  when exclusion_violation then
    raise exception using errcode = '23P01', message = 'SLOT_UNAVAILABLE';
  when no_data_found then
    raise exception using errcode = '22023', message = 'BOOKING_CONFIGURATION_NOT_FOUND';
end;
$$;

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

create or replace function public.reschedule_confirmed_appointment(
  p_appointment_id uuid,
  p_new_start_time_utc timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.business_settings%rowtype;
  appointment_row public.appointments%rowtype;
  old_start_time_utc timestamptz;
  new_end_time_utc timestamptz;
  new_blocked_until_utc timestamptz;
  local_start timestamp;
  local_end timestamp;
  schedule_matches integer;
begin
  perform pg_advisory_xact_lock(7719932620240820);
  select * into strict settings from public.business_settings where id = 1;
  select * into strict appointment_row
  from public.appointments
  where id = p_appointment_id
  for update;

  if appointment_row.status <> 'confirmed' then
    raise exception using errcode = '22023', message = 'APPOINTMENT_NOT_CONFIRMED';
  end if;
  if now() > appointment_row.reschedule_deadline_utc then
    raise exception using errcode = '22023', message = 'RESCHEDULE_DEADLINE_PASSED';
  end if;
  if p_new_start_time_utc < now() + make_interval(hours => settings.min_lead_hours) then
    raise exception using errcode = '22023', message = 'APPOINTMENT_TOO_SOON';
  end if;
  if p_new_start_time_utc > now() + make_interval(days => settings.booking_window_days) then
    raise exception using errcode = '22023', message = 'APPOINTMENT_OUTSIDE_BOOKING_WINDOW';
  end if;

  new_end_time_utc := p_new_start_time_utc
    + make_interval(mins => appointment_row.service_duration_minutes_snapshot);
  new_blocked_until_utc := new_end_time_utc
    + make_interval(mins => settings.buffer_minutes);
  local_start := p_new_start_time_utc at time zone settings.time_zone;
  local_end := new_end_time_utc at time zone settings.time_zone;

  if mod(
    extract(hour from local_start)::integer * 60 + extract(minute from local_start)::integer,
    settings.slot_interval_minutes
  ) <> 0 then
    raise exception using errcode = '22023', message = 'INVALID_SLOT_INTERVAL';
  end if;

  select count(*) into schedule_matches
  from public.weekly_hours
  where day_of_week = extract(dow from local_start)::smallint
    and local_start::date = local_end::date
    and local_start::time >= opens_at
    and local_end::time <= closes_at;

  if schedule_matches = 0 then
    raise exception using errcode = '22023', message = 'OUTSIDE_WORKING_HOURS';
  end if;

  if exists (
    select 1
    from public.time_blocks
    where tstzrange(start_time_utc, end_time_utc, '[)')
      && tstzrange(p_new_start_time_utc, new_blocked_until_utc, '[)')
  ) then
    raise exception using errcode = '22023', message = 'TIME_BLOCKED';
  end if;

  perform public.release_expired_booking_holds();
  old_start_time_utc := appointment_row.start_time_utc;

  update public.appointments
  set start_time_utc = p_new_start_time_utc,
      end_time_utc = new_end_time_utc,
      blocked_until_utc = new_blocked_until_utc,
      reschedule_deadline_utc = p_new_start_time_utc
        - make_interval(hours => settings.reschedule_min_hours),
      reschedule_count = reschedule_count + 1
  where id = p_appointment_id;

  insert into public.appointment_events (
    appointment_id,
    event_type,
    actor_type,
    details
  ) values (
    p_appointment_id,
    'appointment_rescheduled',
    'customer',
    jsonb_build_object(
      'old_start_time_utc', old_start_time_utc,
      'new_start_time_utc', p_new_start_time_utc,
      'deposit_transferred', true
    )
  );

  insert into public.notification_outbox (appointment_id, topic)
  values (p_appointment_id, 'booking.rescheduled');

  insert into public.calendar_sync_jobs (appointment_id, action)
  values (p_appointment_id, 'upsert')
  on conflict (appointment_id, action)
    where status in ('queued', 'processing', 'failed')
  do update set
    status = 'queued',
    available_at = now(),
    last_error = null;

  return p_appointment_id;
exception
  when exclusion_violation then
    raise exception using errcode = '23P01', message = 'SLOT_UNAVAILABLE';
  when no_data_found then
    raise exception using errcode = '22023', message = 'APPOINTMENT_NOT_FOUND';
end;
$$;

create or replace function public.cancel_customer_appointment(
  p_appointment_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  appointment_row public.appointments%rowtype;
begin
  perform pg_advisory_xact_lock(7719932620240820);
  select * into strict appointment_row
  from public.appointments
  where id = p_appointment_id
  for update;

  if appointment_row.status <> 'confirmed' then
    raise exception using errcode = '22023', message = 'APPOINTMENT_NOT_CONFIRMED';
  end if;

  update public.appointments
  set status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = coalesce(nullif(btrim(p_reason), ''), 'Cancelled by customer')
  where id = p_appointment_id;

  update public.payments
  set status = 'forfeited'
  where appointment_id = p_appointment_id
    and status = 'paid';

  insert into public.appointment_events (
    appointment_id,
    event_type,
    actor_type,
    details
  ) values (
    p_appointment_id,
    'appointment_cancelled',
    'customer',
    jsonb_build_object(
      'deposit_forfeited', true,
      'cancelled_before_reschedule_deadline', now() <= appointment_row.reschedule_deadline_utc
    )
  );

  insert into public.notification_outbox (appointment_id, topic)
  values (p_appointment_id, 'booking.cancelled');

  update public.calendar_sync_jobs
  set status = 'cancelled'
  where appointment_id = p_appointment_id
    and action = 'upsert'
    and status in ('queued', 'processing', 'failed');

  insert into public.calendar_sync_jobs (appointment_id, action)
  values (p_appointment_id, 'cancel')
  on conflict (appointment_id, action)
    where status in ('queued', 'processing', 'failed')
  do update set
    status = 'queued',
    available_at = now(),
    last_error = null;

  return p_appointment_id;
exception
  when no_data_found then
    raise exception using errcode = '22023', message = 'APPOINTMENT_NOT_FOUND';
end;
$$;

create or replace function public.confirm_deposit_payment(
  p_stripe_event_id text,
  p_stripe_event_type text,
  p_appointment_id uuid,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_amount_cents integer,
  p_currency text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  appointment_row public.appointments%rowtype;
begin
  perform pg_advisory_xact_lock(7719932620240820);

  if exists (select 1 from public.stripe_webhook_events where event_id = p_stripe_event_id) then
    return p_appointment_id;
  end if;

  select * into strict appointment_row
  from public.appointments
  where id = p_appointment_id
  for update;

  if appointment_row.status <> 'pending_payment' then
    raise exception using errcode = '22023', message = 'APPOINTMENT_NOT_PENDING_PAYMENT';
  end if;
  if appointment_row.hold_expires_at_utc <= now() then
    raise exception using errcode = '22023', message = 'PAYMENT_HOLD_EXPIRED';
  end if;
  if p_amount_cents <> appointment_row.deposit_required_cents then
    raise exception using errcode = '22023', message = 'PAYMENT_AMOUNT_MISMATCH';
  end if;
  if lower(p_currency) <> 'usd' then
    raise exception using errcode = '22023', message = 'PAYMENT_CURRENCY_MISMATCH';
  end if;

  insert into public.stripe_webhook_events (
    event_id,
    event_type,
    appointment_id
  ) values (
    p_stripe_event_id,
    p_stripe_event_type,
    p_appointment_id
  );

  insert into public.payments (
    appointment_id,
    provider_checkout_session_id,
    provider_payment_intent_id,
    amount_cents,
    currency,
    status,
    non_refundable,
    applies_to_balance,
    paid_at
  ) values (
    p_appointment_id,
    p_checkout_session_id,
    nullif(p_payment_intent_id, ''),
    p_amount_cents,
    lower(p_currency),
    'paid',
    appointment_row.deposit_non_refundable,
    appointment_row.deposit_applies_to_balance,
    now()
  );

  update public.appointments
  set status = 'confirmed',
      confirmed_at = now(),
      hold_expires_at_utc = null
  where id = p_appointment_id;

  insert into public.appointment_events (
    appointment_id,
    event_type,
    actor_type,
    details
  ) values (
    p_appointment_id,
    'deposit_paid_and_booking_confirmed',
    'stripe',
    jsonb_build_object('amount_cents', p_amount_cents, 'currency', lower(p_currency))
  );

  insert into public.notification_outbox (appointment_id, topic)
  values (p_appointment_id, 'booking.confirmed');

  insert into public.calendar_sync_jobs (appointment_id, action)
  values (p_appointment_id, 'upsert');

  return p_appointment_id;
exception
  when no_data_found then
    raise exception using errcode = '22023', message = 'APPOINTMENT_NOT_FOUND';
end;
$$;

-- Every application table uses RLS, including server-only tables. No policy is
-- added for anon, and anon receives no table or function privileges.
alter table public.staff_members enable row level security;
alter table public.services enable row level security;
alter table public.business_settings enable row level security;
alter table public.weekly_hours enable row level security;
alter table public.customers enable row level security;
alter table public.appointments enable row level security;
alter table public.time_blocks enable row level security;
alter table public.payments enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.appointment_events enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.calendar_sync_jobs enable row level security;
alter table public.staff_notification_settings enable row level security;

create policy staff_read_staff_members on public.staff_members
  for select to authenticated
  using ((select booking_private.is_active_staff()));
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

create policy staff_manage_services on public.services
  for all to authenticated
  using ((select booking_private.is_active_staff()))
  with check ((select booking_private.is_active_staff()));
create policy staff_manage_business_settings on public.business_settings
  for all to authenticated
  using ((select booking_private.is_active_staff()))
  with check ((select booking_private.is_active_staff()));
create policy staff_manage_weekly_hours on public.weekly_hours
  for all to authenticated
  using ((select booking_private.is_active_staff()))
  with check ((select booking_private.is_active_staff()));
create policy staff_manage_customers on public.customers
  for all to authenticated
  using ((select booking_private.is_active_staff()))
  with check ((select booking_private.is_active_staff()));
create policy staff_manage_appointments on public.appointments
  for all to authenticated
  using ((select booking_private.is_active_staff()))
  with check ((select booking_private.is_active_staff()));
create policy staff_read_time_blocks on public.time_blocks
  for select to authenticated
  using ((select booking_private.is_active_staff()));
create policy staff_delete_time_blocks on public.time_blocks
  for delete to authenticated
  using ((select booking_private.is_active_staff()));
create policy deny_direct_stripe_webhook_events on public.stripe_webhook_events
  for all to authenticated
  using (false)
  with check (false);
create policy staff_read_payments on public.payments
  for select to authenticated
  using ((select booking_private.is_active_staff()));
create policy staff_read_appointment_events on public.appointment_events
  for select to authenticated
  using ((select booking_private.is_active_staff()));
create policy staff_read_notification_outbox on public.notification_outbox
  for select to authenticated
  using ((select booking_private.is_active_staff()));
create policy staff_read_calendar_sync_jobs on public.calendar_sync_jobs
  for select to authenticated
  using ((select booking_private.is_active_staff()));
create policy staff_manage_own_notification_settings on public.staff_notification_settings
  for all to authenticated
  using ((select auth.uid()) = user_id and (select booking_private.is_active_staff()))
  with check ((select auth.uid()) = user_id and (select booking_private.is_active_staff()));

-- Start these booking objects from deny-all, then grant only the operations the
-- app needs. The explicit list avoids changing unrelated tables if this
-- migration is ever applied to a shared Supabase project.
revoke all on table
  public.staff_members,
  public.services,
  public.business_settings,
  public.weekly_hours,
  public.customers,
  public.appointments,
  public.time_blocks,
  public.payments,
  public.stripe_webhook_events,
  public.appointment_events,
  public.notification_outbox,
  public.calendar_sync_jobs,
  public.staff_notification_settings
from anon, authenticated;
revoke all on sequence
  public.appointment_events_id_seq,
  public.notification_outbox_id_seq,
  public.calendar_sync_jobs_id_seq
from anon, authenticated;
revoke all on function booking_private.set_updated_at() from public, anon, authenticated;
revoke all on function booking_private.is_active_staff() from public, anon;
revoke all on function booking_private.is_owner() from public, anon;
revoke all on function public.release_expired_booking_holds() from public, anon, authenticated;
revoke all on function public.create_booking_hold(uuid, timestamptz, text, text, text, boolean, text, boolean, text, text) from public, anon, authenticated;
revoke all on function public.create_time_block(uuid, timestamptz, timestamptz, text) from public, anon, authenticated;
revoke all on function public.reschedule_confirmed_appointment(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.cancel_customer_appointment(uuid, text) from public, anon, authenticated;
revoke all on function public.confirm_deposit_payment(text, text, uuid, text, text, integer, text) from public, anon, authenticated;

grant usage on schema public to authenticated, service_role;
grant execute on function booking_private.is_active_staff() to authenticated;
grant execute on function booking_private.is_owner() to authenticated;

grant select, insert, update, delete on public.staff_members to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.business_settings to authenticated;
grant select, insert, update, delete on public.weekly_hours to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.appointments to authenticated;
grant select, delete on public.time_blocks to authenticated;
grant select on public.payments to authenticated;
grant select on public.appointment_events to authenticated;
grant select on public.notification_outbox to authenticated;
grant select on public.calendar_sync_jobs to authenticated;
grant select, insert, update, delete on public.staff_notification_settings to authenticated;

grant all privileges on table
  public.staff_members,
  public.services,
  public.business_settings,
  public.weekly_hours,
  public.customers,
  public.appointments,
  public.time_blocks,
  public.payments,
  public.stripe_webhook_events,
  public.appointment_events,
  public.notification_outbox,
  public.calendar_sync_jobs,
  public.staff_notification_settings
to service_role;
grant usage, select on sequence
  public.appointment_events_id_seq,
  public.notification_outbox_id_seq,
  public.calendar_sync_jobs_id_seq
to service_role;
grant execute on function public.release_expired_booking_holds() to service_role;
grant execute on function public.create_booking_hold(uuid, timestamptz, text, text, text, boolean, text, boolean, text, text) to service_role;
grant execute on function public.create_time_block(uuid, timestamptz, timestamptz, text) to service_role;
grant execute on function public.reschedule_confirmed_appointment(uuid, timestamptz) to service_role;
grant execute on function public.cancel_customer_appointment(uuid, text) to service_role;
grant execute on function public.confirm_deposit_payment(text, text, uuid, text, text, integer, text) to service_role;

insert into public.business_settings (
  id,
  time_zone,
  currency,
  deposit_cents,
  deposit_non_refundable,
  deposit_applies_to_balance,
  reschedule_min_hours,
  hold_minutes,
  buffer_minutes,
  slot_interval_minutes,
  min_lead_hours,
  booking_window_days,
  location_city,
  location_region,
  address_line,
  policy_version,
  policy_text,
  policy_effective_at
) values (
  1,
  'America/New_York',
  'usd',
  1000,
  true,
  true,
  24,
  30,
  0,
  15,
  2,
  60,
  'Ridgefield Park',
  'NJ',
  null,
  '2026-08-20-v1',
  'Appointments require a $10 non-refundable deposit. The deposit is applied to the final service price. Reschedule at least 24 hours before the appointment to transfer the deposit to a new time. Cancellations, no-shows, and changes made less than 24 hours before the appointment forfeit the deposit.',
  '2026-08-20T00:00:00-04:00'
);

insert into public.services (
  slug,
  name,
  description,
  duration_minutes,
  price_cents,
  price_from,
  online_bookable,
  active,
  display_order,
  source_note
) values
  ('haircut-no-beard', 'Haircut — No Beard', null, 45, 4500, false, true, true, 10, 'Initial values from Casper''s Booksy profile; editable in admin.'),
  ('haircut-with-beard', 'Haircut With Beard', 'Enhancements may cost extra.', 60, 6000, false, true, true, 20, 'Initial values from Casper''s Booksy profile; editable in admin.'),
  ('beard-with-the-works', 'Beard With The Works', null, 45, 4500, false, true, true, 30, 'Initial values from Casper''s Booksy profile; editable in admin.'),
  ('haircut-beard-hot-towel', 'Haircut With Beard and Hot Towel', 'Enhancements may cost extra.', 60, 6500, false, true, true, 40, 'Initial values from Casper''s Booksy profile; editable in admin.'),
  ('gentlemen-haircut-shape-up', 'Gentlemen Haircut / Shape Up', null, 30, 3500, false, true, true, 50, 'Initial values from Casper''s Booksy profile; editable in admin.'),
  ('before-after-hours', 'Before and After Hours Appointment', 'Contact Casper directly to arrange this service.', 60, 10000, true, false, true, 60, 'Initial values from Casper''s Booksy profile; kept offline because the listed price starts at $100 and requires direct confirmation.');

-- 0 = Sunday, 1 = Monday, ... 6 = Saturday. Closed days have no row.
insert into public.weekly_hours (day_of_week, opens_at, closes_at) values
  (1, '11:00', '18:00'),
  (3, '11:00', '18:00'),
  (4, '10:00', '19:00'),
  (5, '11:00', '19:00'),
  (6, '10:00', '17:00');
