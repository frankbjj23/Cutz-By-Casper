-- Avoid a PL/pgSQL name collision between the result variable and contact_id
-- columns when an existing master contact is updated.
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

    update public.booking_contact_methods as methods
    set contact_id = canonical_id
    where methods.contact_id = any(matching_ids)
      and methods.contact_id <> canonical_id;

    update public.booking_contact_capture_events as events
    set contact_id = canonical_id
    where events.contact_id = any(matching_ids)
      and events.contact_id <> canonical_id;

    delete from public.booking_contacts as contacts
    where contacts.id = any(matching_ids)
      and contacts.id <> canonical_id;

    update public.booking_contacts as contacts
    set full_name = normalized_name,
        email = coalesce(normalized_email, contacts.email),
        phone_e164 = coalesce(normalized_phone, contacts.phone_e164),
        consent_version = p_consent_version,
        consented_at = p_consented_at,
        source_path = '/book',
        network_fingerprint = p_network_fingerprint,
        last_seen_at = now(),
        handoff_count = existing_handoff_count + 1,
        expires_at = null
    where contacts.id = canonical_id
    returning contacts.id into result_contact_id;
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
