create extension if not exists "pgcrypto";

create type appointment_status as enum (
  'pending_payment',
  'booked',
  'completed',
  'cancelled',
  'no_show',
  'expired'
);

create type payment_status as enum ('paid', 'refunded', 'forfeited');

create type sms_type as enum (
  'confirmation',
  'reminder_24h',
  'reminder_2h',
  'late_warning',
  'no_show_notice'
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_minutes integer not null,
  price_display text not null,
  deposit_amount numeric not null default 20,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists business_settings (
  id uuid primary key default gen_random_uuid(),
  time_zone text not null default 'America/New_York',
  late_grace_minutes integer not null default 15,
  reschedule_min_hours integer not null default 72,
  deposit_amount_default numeric not null default 20,
  buffer_minutes integer not null default 0,
  working_hours_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone_e164 text not null unique,
  sms_opt_in boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  service_id uuid not null references services(id),
  start_time_utc timestamptz not null,
  end_time_utc timestamptz not null,
  status appointment_status not null default 'pending_payment',
  hold_expires_at_utc timestamptz,
  late_eligible_at_utc timestamptz not null,
  reschedule_deadline_utc timestamptz not null,
  rescheduled_from_appointment_id uuid references appointments(id),
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references appointments(id),
  stripe_checkout_session_id text not null unique,
  amount_cents integer not null,
  currency text not null default 'usd',
  status payment_status not null default 'paid',
  created_at timestamptz not null default now()
);

create table if not exists sms_logs (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments(id),
  customer_id uuid references customers(id),
  type sms_type not null,
  to_phone text not null,
  twilio_sid text,
  status text not null default 'queued',
  sent_at timestamptz not null default now()
);

create table if not exists time_blocks (
  id uuid primary key default gen_random_uuid(),
  start_time_utc timestamptz not null,
  end_time_utc timestamptz not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists appointments_time_idx on appointments (start_time_utc, end_time_utc);
create index if not exists appointments_status_idx on appointments (status);
create index if not exists time_blocks_time_idx on time_blocks (start_time_utc, end_time_utc);

create or replace function create_pending_appointment(
  p_customer_id uuid,
  p_service_id uuid,
  p_start_time_utc timestamptz,
  p_end_time_utc timestamptz,
  p_hold_expires_at_utc timestamptz,
  p_late_eligible_at_utc timestamptz,
  p_reschedule_deadline_utc timestamptz,
  p_buffer_minutes integer
) returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_conflict boolean;
begin
  perform pg_advisory_xact_lock(42);

  select exists (
    select 1
    from appointments
    where status in ('booked', 'pending_payment')
      and (status <> 'pending_payment' or hold_expires_at_utc > now())
      and tstzrange(start_time_utc, end_time_utc + make_interval(mins => p_buffer_minutes), '[)')
        && tstzrange(p_start_time_utc, p_end_time_utc + make_interval(mins => p_buffer_minutes), '[)')
  ) into v_conflict;

  if v_conflict then
    raise exception 'Slot already booked';
  end if;

  select exists (
    select 1
    from time_blocks
    where tstzrange(start_time_utc, end_time_utc, '[)')
      && tstzrange(p_start_time_utc, p_end_time_utc, '[)')
  ) into v_conflict;

  if v_conflict then
    raise exception 'Time blocked';
  end if;

  insert into appointments (
    customer_id,
    service_id,
    start_time_utc,
    end_time_utc,
    status,
    hold_expires_at_utc,
    late_eligible_at_utc,
    reschedule_deadline_utc
  ) values (
    p_customer_id,
    p_service_id,
    p_start_time_utc,
    p_end_time_utc,
    'pending_payment',
    p_hold_expires_at_utc,
    p_late_eligible_at_utc,
    p_reschedule_deadline_utc
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function reschedule_appointment(
  p_appointment_id uuid,
  p_start_time_utc timestamptz,
  p_end_time_utc timestamptz,
  p_late_eligible_at_utc timestamptz,
  p_reschedule_deadline_utc timestamptz,
  p_buffer_minutes integer
) returns void
language plpgsql
as $$
declare
  v_conflict boolean;
begin
  perform pg_advisory_xact_lock(43);

  select exists (
    select 1
    from appointments
    where id <> p_appointment_id
      and status in ('booked', 'pending_payment')
      and (status <> 'pending_payment' or hold_expires_at_utc > now())
      and tstzrange(start_time_utc, end_time_utc + make_interval(mins => p_buffer_minutes), '[)')
        && tstzrange(p_start_time_utc, p_end_time_utc + make_interval(mins => p_buffer_minutes), '[)')
  ) into v_conflict;

  if v_conflict then
    raise exception 'Slot already booked';
  end if;

  select exists (
    select 1
    from time_blocks
    where tstzrange(start_time_utc, end_time_utc, '[)')
      && tstzrange(p_start_time_utc, p_end_time_utc, '[)')
  ) into v_conflict;

  if v_conflict then
    raise exception 'Time blocked';
  end if;

  update appointments
  set start_time_utc = p_start_time_utc,
      end_time_utc = p_end_time_utc,
      late_eligible_at_utc = p_late_eligible_at_utc,
      reschedule_deadline_utc = p_reschedule_deadline_utc
  where id = p_appointment_id;
end;
$$;
