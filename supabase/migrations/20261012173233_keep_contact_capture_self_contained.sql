-- Keep the service-only capture RPC within its existing namespace permissions.
-- No grants or other access changes are needed.
-- Filename matches the migration version applied in production.
create or replace function public.capture_or_merge_booking_contact(
  p_full_name text, p_email text, p_phone_e164 text, p_consent_version text,
  p_consented_at timestamptz, p_source_path text, p_network_fingerprint text
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  normalized_email text := nullif(lower(btrim(p_email)), '');
  normalized_phone text := nullif(btrim(p_phone_e164), '');
  normalized_name text := regexp_replace(btrim(p_full_name), '[[:space:]]+', ' ', 'g');
  matching_ids uuid[];
  result_contact_id uuid;
  ambiguous boolean;
begin
  if p_full_name is null or char_length(normalized_name) not between 2 and 100
    or (normalized_email is null and normalized_phone is null)
    or (normalized_email is not null and (char_length(normalized_email) not between 5 and 320
      or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'))
    or (normalized_phone is not null and normalized_phone !~ '^[+][1-9][0-9]{7,14}$')
    or p_consent_version is distinct from '2026-08-24-v2'
    or p_source_path is distinct from '/book' or p_consented_at is null
    or p_network_fingerprint is null or p_network_fingerprint !~ '^[0-9a-f]{64}$'
  then raise exception using errcode = '22023', message = 'invalid booking contact'; end if;
  perform pg_advisory_xact_lock(hashtextextended('redeemed-contact-write-v2', 0));
  select coalesce(array_agg(distinct c.id), array[]::uuid[]) into matching_ids
  from public.booking_contact_methods m join public.booking_contacts c on c.id = m.contact_id
  where lower(regexp_replace(btrim(c.full_name), '[[:space:]]+', ' ', 'g')) = lower(normalized_name)
    and ((m.kind = 'email' and m.value = normalized_email) or (m.kind = 'phone' and m.value = normalized_phone));
  ambiguous := cardinality(matching_ids) > 1 or exists (
    select 1 from public.booking_contact_methods m
    where ((m.kind = 'email' and m.value = normalized_email) or (m.kind = 'phone' and m.value = normalized_phone))
      and not (m.contact_id = any(matching_ids))
  );
  if cardinality(matching_ids) = 1 then
    result_contact_id := matching_ids[1];
    update public.booking_contacts c set
      email = coalesce(normalized_email, c.email), phone_e164 = coalesce(normalized_phone, c.phone_e164),
      consent_version = p_consent_version, consented_at = p_consented_at, source_path = '/book',
      network_fingerprint = p_network_fingerprint, last_seen_at = now(),
      handoff_count = c.handoff_count + 1, expires_at = null,
      needs_identity_review = c.needs_identity_review or ambiguous
    where c.id = result_contact_id;
  else
    insert into public.booking_contacts(full_name,email,phone_e164,consent_version,consented_at,source_path,
      network_fingerprint,first_seen_at,last_seen_at,handoff_count,expires_at,needs_identity_review,review_reasons)
    values(normalized_name,normalized_email,normalized_phone,p_consent_version,p_consented_at,'/book',
      p_network_fingerprint,now(),now(),1,null,ambiguous,
      case when ambiguous then array['shared_contact_identity'] else array[]::text[] end)
    returning id into result_contact_id;
  end if;
  if normalized_email is not null then
    insert into public.booking_contact_methods(contact_id,kind,value) values(result_contact_id,'email',normalized_email)
    on conflict(contact_id,kind,value) do update set last_seen_at = now();
  end if;
  if normalized_phone is not null then
    insert into public.booking_contact_methods(contact_id,kind,value) values(result_contact_id,'phone',normalized_phone)
    on conflict(contact_id,kind,value) do update set last_seen_at = now();
  end if;
  insert into public.booking_contact_capture_events(contact_id,network_fingerprint) values(result_contact_id,p_network_fingerprint);
  return result_contact_id;
end; $$;
