-- Treat website handoff contacts as a small master contact list. Repeated
-- submissions merge by normalized email or E.164 phone while retaining every
-- unique contact method and a count of handoffs.

alter table public.booking_contacts
  add column first_seen_at timestamptz,
  add column last_seen_at timestamptz,
  add column handoff_count integer;

update public.booking_contacts
set first_seen_at = created_at,
    last_seen_at = created_at,
    handoff_count = 1;

alter table public.booking_contacts
  alter column first_seen_at set not null,
  alter column first_seen_at set default now(),
  alter column last_seen_at set not null,
  alter column last_seen_at set default now(),
  alter column handoff_count set not null,
  alter column handoff_count set default 1,
  add constraint booking_contacts_positive_handoff_count
    check (handoff_count > 0);

alter table public.booking_contacts
  drop constraint booking_contacts_retention_matches_consent;

-- Keep a temporary identity map and method snapshot while existing duplicate
-- rows are consolidated. This preserves secondary emails and phone numbers.
create temporary table booking_contact_merge_map (
  original_id uuid primary key,
  current_id uuid not null
) on commit drop;

insert into booking_contact_merge_map (original_id, current_id)
select id, id from public.booking_contacts;

create temporary table booking_contact_original_methods (
  original_id uuid not null,
  kind text not null,
  value text not null,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null
) on commit drop;

insert into booking_contact_original_methods (
  original_id,
  kind,
  value,
  first_seen_at,
  last_seen_at
)
select id, 'email', email, created_at, created_at
from public.booking_contacts
where email is not null
union all
select id, 'phone', phone_e164, created_at, created_at
from public.booking_contacts
where phone_e164 is not null;

do $$
declare
  keep_id uuid;
  remove_id uuid;
  keep_row public.booking_contacts%rowtype;
  remove_row public.booking_contacts%rowtype;
  merged_consent_version text;
  merged_consented_at timestamptz;
begin
  loop
    select a.id, b.id
    into keep_id, remove_id
    from public.booking_contacts a
    join public.booking_contacts b
      on a.id <> b.id
     and (
       (a.email is not null and b.email is not null and lower(a.email) = lower(b.email))
       or
       (a.phone_e164 is not null and b.phone_e164 is not null and a.phone_e164 = b.phone_e164)
     )
    where a.created_at < b.created_at
       or (a.created_at = b.created_at and a.id::text < b.id::text)
    order by a.created_at, a.id::text, b.created_at, b.id::text
    limit 1;

    exit when not found;

    select * into strict keep_row
    from public.booking_contacts
    where id = keep_id
    for update;

    select * into strict remove_row
    from public.booking_contacts
    where id = remove_id
    for update;

    merged_consent_version := case
      when keep_row.consent_version = '2026-08-24-v2'
        or remove_row.consent_version = '2026-08-24-v2'
      then '2026-08-24-v2'
      when remove_row.consented_at >= keep_row.consented_at
      then remove_row.consent_version
      else keep_row.consent_version
    end;
    merged_consented_at := greatest(keep_row.consented_at, remove_row.consented_at);

    update public.booking_contacts
    set full_name = case
          when remove_row.last_seen_at >= keep_row.last_seen_at
            then remove_row.full_name
          else keep_row.full_name
        end,
        email = case
          when remove_row.last_seen_at >= keep_row.last_seen_at
            then coalesce(remove_row.email, keep_row.email)
          else coalesce(keep_row.email, remove_row.email)
        end,
        phone_e164 = case
          when remove_row.last_seen_at >= keep_row.last_seen_at
            then coalesce(remove_row.phone_e164, keep_row.phone_e164)
          else coalesce(keep_row.phone_e164, remove_row.phone_e164)
        end,
        consent_version = merged_consent_version,
        consented_at = merged_consented_at,
        network_fingerprint = case
          when remove_row.last_seen_at >= keep_row.last_seen_at
            then remove_row.network_fingerprint
          else keep_row.network_fingerprint
        end,
        created_at = least(keep_row.created_at, remove_row.created_at),
        first_seen_at = least(keep_row.first_seen_at, remove_row.first_seen_at),
        last_seen_at = greatest(keep_row.last_seen_at, remove_row.last_seen_at),
        handoff_count = keep_row.handoff_count + remove_row.handoff_count,
        expires_at = case
          when merged_consent_version = '2026-08-24-v2' then null
          else greatest(keep_row.expires_at, remove_row.expires_at)
        end
    where id = keep_row.id;

    update booking_contact_merge_map
    set current_id = keep_row.id
    where current_id = remove_row.id;

    delete from public.booking_contacts where id = remove_row.id;
  end loop;
end;
$$;

alter table public.booking_contacts
  add constraint booking_contacts_retention_matches_consent check (
    (
      consent_version = '2026-08-24-v1'
      and expires_at is not null
      and expires_at > consented_at
      and expires_at <= consented_at + interval '12 months 1 day'
    )
    or
    (
      consent_version = '2026-08-24-v2'
      and expires_at is null
    )
  );

create table public.booking_contact_methods (
  contact_id uuid not null references public.booking_contacts(id) on delete cascade,
  kind text not null check (kind in ('email', 'phone')),
  value text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (kind, value),
  constraint booking_contact_methods_valid_value check (
    (kind = 'email' and value = lower(btrim(value))
      and char_length(value) between 5 and 320
      and value ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or
    (kind = 'phone' and value ~ '^\+[1-9][0-9]{7,14}$')
  ),
  constraint booking_contact_methods_valid_seen_window check (
    last_seen_at >= first_seen_at
  )
);

insert into public.booking_contact_methods (
  contact_id,
  kind,
  value,
  first_seen_at,
  last_seen_at
)
select
  merge_map.current_id,
  original.kind,
  original.value,
  min(original.first_seen_at),
  max(original.last_seen_at)
from booking_contact_original_methods original
join booking_contact_merge_map merge_map
  on merge_map.original_id = original.original_id
group by merge_map.current_id, original.kind, original.value;

create index booking_contact_methods_contact_idx
  on public.booking_contact_methods (contact_id, kind);

create index booking_contacts_last_seen_idx
  on public.booking_contacts (last_seen_at desc);

comment on table public.booking_contact_methods is
  'Unique normalized email addresses and phone numbers belonging to deduplicated website handoff contacts.';
comment on column public.booking_contacts.handoff_count is
  'Number of successful website-to-Booksy handoffs merged into this master contact.';

alter table public.booking_contact_methods enable row level security;

create policy staff_read_booking_contact_methods
  on public.booking_contact_methods
  for select to authenticated
  using ((select booking_private.is_active_staff()));

revoke all on table public.booking_contact_methods
  from public, anon, authenticated;
grant select on table public.booking_contact_methods to authenticated;
grant all privileges on table public.booking_contact_methods to service_role;

-- Retain short-lived capture events only for the existing five-per-hour abuse
-- boundary. They contain no name, email, phone, or raw network address.
create table public.booking_contact_capture_events (
  id bigint generated always as identity primary key,
  contact_id uuid not null references public.booking_contacts(id) on delete cascade,
  network_fingerprint text not null
    check (network_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create index booking_contact_capture_events_rate_idx
  on public.booking_contact_capture_events (network_fingerprint, created_at desc);

alter table public.booking_contact_capture_events enable row level security;
revoke all on table public.booking_contact_capture_events
  from public, anon, authenticated;
grant all privileges on table public.booking_contact_capture_events to service_role;
grant usage, select on sequence public.booking_contact_capture_events_id_seq
  to service_role;

create or replace function booking_private.purge_stale_booking_contact_capture_events()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  purged_count integer;
begin
  delete from public.booking_contact_capture_events
  where created_at < now() - interval '24 hours';

  get diagnostics purged_count = row_count;
  return purged_count;
end;
$$;

revoke all on function booking_private.purge_stale_booking_contact_capture_events()
  from public, anon, authenticated;
grant execute on function booking_private.purge_stale_booking_contact_capture_events()
  to service_role;

do $$
begin
  if exists (
    select 1 from cron.job
    where jobname = 'purge-stale-redeemed-booking-contact-capture-events'
  ) then
    perform cron.unschedule('purge-stale-redeemed-booking-contact-capture-events');
  end if;

  perform cron.schedule(
    'purge-stale-redeemed-booking-contact-capture-events',
    '41 4 * * *',
    'select booking_private.purge_stale_booking_contact_capture_events();'
  );
end;
$$;

create or replace function public.capture_or_merge_booking_contact(
  p_full_name text,
  p_email text,
  p_phone_e164 text,
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
  normalized_email text := nullif(lower(btrim(p_email)), '');
  normalized_phone text := nullif(btrim(p_phone_e164), '');
  normalized_name text := regexp_replace(btrim(p_full_name), '[[:space:]]+', ' ', 'g');
  matching_ids uuid[];
  canonical_id uuid;
  existing_handoff_count integer;
  result_contact_id uuid;
begin
  if p_full_name is null
    or char_length(normalized_name) not between 2 and 100
    or (normalized_email is null and normalized_phone is null)
    or (normalized_email is not null and (
      char_length(normalized_email) not between 5 and 320
      or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ))
    or (normalized_phone is not null and normalized_phone !~ '^\+[1-9][0-9]{7,14}$')
    or p_consent_version is null
    or p_consent_version <> '2026-08-24-v2'
    or p_source_path is null
    or p_source_path <> '/book'
    or p_consented_at is null
    or p_network_fingerprint is null
    or p_network_fingerprint !~ '^[0-9a-f]{64}$'
  then
    raise exception using errcode = '22023', message = 'invalid booking contact';
  end if;

  -- Acquire method locks in a consistent order. Concurrent submissions sharing
  -- either method cannot create separate people.
  if normalized_email is not null then
    perform pg_advisory_xact_lock(
      hashtextextended('redeemed-booking-email:' || normalized_email, 0)
    );
  end if;
  if normalized_phone is not null then
    perform pg_advisory_xact_lock(
      hashtextextended('redeemed-booking-phone:' || normalized_phone, 0)
    );
  end if;

  select coalesce(array_agg(distinct methods.contact_id), array[]::uuid[])
  into matching_ids
  from public.booking_contact_methods methods
  where (normalized_email is not null
      and methods.kind = 'email'
      and methods.value = normalized_email)
     or (normalized_phone is not null
      and methods.kind = 'phone'
      and methods.value = normalized_phone);

  if cardinality(matching_ids) = 0 then
    insert into public.booking_contacts (
      full_name,
      email,
      phone_e164,
      consent_version,
      consented_at,
      source_path,
      network_fingerprint,
      first_seen_at,
      last_seen_at,
      handoff_count,
      expires_at
    ) values (
      normalized_name,
      normalized_email,
      normalized_phone,
      p_consent_version,
      p_consented_at,
      '/book',
      p_network_fingerprint,
      now(),
      now(),
      1,
      null
    )
    returning id into result_contact_id;
  else
    perform 1
    from public.booking_contacts contacts
    where contacts.id = any(matching_ids)
    order by contacts.id
    for update;

    select contacts.id
    into canonical_id
    from public.booking_contacts contacts
    where contacts.id = any(matching_ids)
    order by contacts.first_seen_at, contacts.id
    limit 1;

    select coalesce(sum(contacts.handoff_count), 0)
    into existing_handoff_count
    from public.booking_contacts contacts
    where contacts.id = any(matching_ids);

    update public.booking_contact_methods
    set contact_id = canonical_id
    where contact_id = any(matching_ids)
      and contact_id <> canonical_id;

    update public.booking_contact_capture_events
    set contact_id = canonical_id
    where contact_id = any(matching_ids)
      and contact_id <> canonical_id;

    delete from public.booking_contacts
    where id = any(matching_ids)
      and id <> canonical_id;

    update public.booking_contacts
    set full_name = normalized_name,
        email = coalesce(normalized_email, email),
        phone_e164 = coalesce(normalized_phone, phone_e164),
        consent_version = p_consent_version,
        consented_at = p_consented_at,
        source_path = '/book',
        network_fingerprint = p_network_fingerprint,
        last_seen_at = now(),
        handoff_count = existing_handoff_count + 1,
        expires_at = null
    where id = canonical_id
    returning id into result_contact_id;
  end if;

  if normalized_email is not null then
    insert into public.booking_contact_methods (
      contact_id, kind, value, first_seen_at, last_seen_at
    ) values (
      result_contact_id, 'email', normalized_email, now(), now()
    )
    on conflict (kind, value) do update
      set contact_id = excluded.contact_id,
          last_seen_at = excluded.last_seen_at;
  end if;

  if normalized_phone is not null then
    insert into public.booking_contact_methods (
      contact_id, kind, value, first_seen_at, last_seen_at
    ) values (
      result_contact_id, 'phone', normalized_phone, now(), now()
    )
    on conflict (kind, value) do update
      set contact_id = excluded.contact_id,
          last_seen_at = excluded.last_seen_at;
  end if;

  insert into public.booking_contact_capture_events (
    contact_id,
    network_fingerprint
  ) values (
    result_contact_id,
    p_network_fingerprint
  );

  return result_contact_id;
end;
$$;

revoke all on function public.capture_or_merge_booking_contact(
  text, text, text, text, timestamptz, text, text
) from public, anon, authenticated;
grant execute on function public.capture_or_merge_booking_contact(
  text, text, text, text, timestamptz, text, text
) to service_role;
