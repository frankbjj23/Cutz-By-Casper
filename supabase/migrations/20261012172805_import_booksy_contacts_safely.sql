-- Import legacy clients without inventing website consent or website handoffs.
-- Filename matches the verified production migration version.
alter table public.booking_contacts
  add column origin text not null default 'website' check (origin in ('website', 'booksy')),
  add column needs_identity_review boolean not null default false,
  add column review_reasons text[] not null default array[]::text[],
  alter column consent_version drop not null,
  alter column consented_at drop not null,
  alter column source_path drop not null,
  alter column network_fingerprint drop not null,
  drop constraint booking_contacts_positive_handoff_count,
  drop constraint booking_contacts_retention_matches_consent,
  add constraint booking_contacts_nonnegative_handoff_count check (handoff_count >= 0),
  add constraint booking_contacts_import_or_website_consent check (
    (origin = 'booksy' and handoff_count = 0 and consent_version is null
      and consented_at is null and source_path is null and network_fingerprint is null
      and expires_at is null)
    or
    (handoff_count > 0 and consent_version is not null and consented_at is not null
      and source_path = '/book' and source_path is not null and network_fingerprint is not null
      and ((consent_version = '2026-08-24-v2' and expires_at is null)
        or (consent_version = '2026-08-24-v1' and expires_at is not null
          and expires_at > consented_at and expires_at <= consented_at + interval '12 months 1 day')))
  );

-- A family can share a phone. Uniqueness belongs to person + method, not phone alone.
alter table public.booking_contact_methods drop constraint booking_contact_methods_pkey;
alter table public.booking_contact_methods add primary key (contact_id, kind, value);
create index booking_contact_methods_lookup_idx on public.booking_contact_methods(kind, value);

create function booking_private.contact_name_key(p_name text)
returns text language sql immutable strict security invoker set search_path = ''
as $$ select lower(regexp_replace(btrim(p_name), '[[:space:]]+', ' ', 'g')); $$;
revoke all on function booking_private.contact_name_key(text) from public, anon, authenticated;
grant execute on function booking_private.contact_name_key(text) to service_role;

create table public.booking_contact_import_batches (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source = 'booksy'),
  source_business_id text not null,
  source_file text not null,
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  match_policy text not null,
  source_count integer not null check (source_count > 0),
  master_count integer not null check (master_count > 0),
  created_count integer not null default 0,
  linked_count integer not null default 0,
  imported_at timestamptz not null default now(),
  unique(source, source_business_id, source_sha256)
);
create table public.booking_contact_source_records (
  source text not null check (source = 'booksy'),
  source_business_id text not null,
  external_id text not null,
  contact_id uuid not null references public.booking_contacts(id) on delete cascade,
  batch_id uuid not null references public.booking_contact_import_batches(id),
  source_record jsonb not null check (jsonb_typeof(source_record) = 'object'),
  imported_at timestamptz not null default now(),
  primary key(source, source_business_id, external_id)
);
create index booking_contact_source_records_contact_idx on public.booking_contact_source_records(contact_id);
create index booking_contact_source_records_batch_idx on public.booking_contact_source_records(batch_id);
alter table public.booking_contact_import_batches enable row level security;
alter table public.booking_contact_source_records enable row level security;
revoke all on public.booking_contact_import_batches, public.booking_contact_source_records from public, anon, authenticated;
grant select on public.booking_contact_import_batches, public.booking_contact_source_records to authenticated;
grant select, insert, update, delete on public.booking_contact_import_batches, public.booking_contact_source_records to service_role;
create policy staff_read_contact_import_batches on public.booking_contact_import_batches
  for select to authenticated using ((select booking_private.is_active_staff()));
create policy staff_read_contact_source_records on public.booking_contact_source_records
  for select to authenticated using ((select booking_private.is_active_staff()));
comment on table public.booking_contact_source_records is
  'Original Booksy contact identities and flags. Source agreement flags are not new website or marketing consent.';
comment on table public.booking_contacts is
  'Private master contacts from website handoffs and approved Booksy imports; not confirmed appointments.';
comment on table public.booking_contact_methods is
  'Normalized methods per person. Shared phones or emails do not establish the same identity.';

-- Only one exact-name identity is updated by the unauthenticated website intake.
-- No existing master rows or import provenance are deleted by intake.
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
  where booking_private.contact_name_key(c.full_name) = booking_private.contact_name_key(normalized_name)
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
revoke all on function public.capture_or_merge_booking_contact(text,text,text,text,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.capture_or_merge_booking_contact(text,text,text,text,timestamptz,text,text) to service_role;

-- A private, atomic, retry-safe import. Dry run executes the same checks and writes,
-- then rolls back its subtransaction. Not exposed as a public import endpoint.
create function booking_private.import_booksy_contacts(p_payload jsonb, p_dry_run boolean default true)
returns jsonb language plpgsql security invoker set search_path = '' as $$
<<import_state>>
declare
  batch_uuid uuid;
  item jsonb;
  source_item jsonb;
  method_value text;
  contact_uuid uuid;
  source_ids uuid[];
  created_count integer := 0;
  linked_count integer := 0;
  source_count integer;
  distinct_source_count integer;
  result jsonb;
  old_record jsonb;
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception using errcode = '42501', message = 'contact import is restricted';
  end if;
  if p_dry_run is null or p_payload->>'source' is distinct from 'booksy'
    or p_payload->>'source_business_id' is distinct from '697614'
    or p_payload->>'policy' is distinct from 'exact-full-name-and-phone-v1'
    or coalesce(p_payload->>'source_sha256','') !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(p_payload->'contacts') is distinct from 'array'
    or jsonb_array_length(p_payload->'contacts') not between 1 and 10000
  then raise exception 'invalid import envelope'; end if;
  perform pg_advisory_xact_lock(hashtextextended('redeemed-contact-write-v2', 0));
  select id into batch_uuid from public.booking_contact_import_batches
  where source = 'booksy' and source_business_id = p_payload->>'source_business_id'
    and source_sha256 = p_payload->>'source_sha256';
  if batch_uuid is not null then
    return jsonb_build_object('status','already_imported','batch_id',batch_uuid,'created',0,'dry_run',p_dry_run);
  end if;
  select count(*),count(distinct r->>'external_id') into source_count,distinct_source_count
  from jsonb_array_elements(p_payload->'contacts') c cross join lateral jsonb_array_elements(c->'source_rows') r;
  if source_count <> (p_payload->>'source_count')::integer or source_count <> distinct_source_count then
    raise exception 'source count or external ID reconciliation failed';
  end if;
  begin
    insert into public.booking_contact_import_batches(source,source_business_id,source_file,source_sha256,match_policy,source_count,master_count)
    values('booksy',p_payload->>'source_business_id',p_payload->>'source_file',p_payload->>'source_sha256',p_payload->>'policy',source_count,jsonb_array_length(p_payload->'contacts'))
    returning id into batch_uuid;
    for item in select value from jsonb_array_elements(p_payload->'contacts') loop
      if jsonb_array_length(item->'source_rows') < 1 or char_length(item->>'full_name') not between 2 and 100
        or (jsonb_array_length(item->'emails') = 0 and jsonb_array_length(item->'phones') = 0) then
        raise exception 'invalid contact structure';
      end if;
      if exists(select 1 from jsonb_array_elements(item->'source_rows') r
        where booking_private.contact_name_key(r->>'full_name') is distinct from booking_private.contact_name_key(item->>'full_name')) then
        raise exception 'different names cannot be merged automatically';
      end if;
      if jsonb_array_length(item->'source_rows') > 1 and (
        jsonb_array_length(item->'phones') <> 1 or exists(select 1 from jsonb_array_elements(item->'source_rows') r
          where nullif(btrim(r->>'last_name'),'') is null or r->>'phone_e164' is distinct from item->'phones'->>0)) then
        raise exception 'merge requires full name and matching phone';
      end if;
      select coalesce(array_agg(distinct s.contact_id),array[]::uuid[]) into source_ids
      from public.booking_contact_source_records s
      where s.source = 'booksy' and s.source_business_id = p_payload->>'source_business_id'
        and s.external_id in (select r->>'external_id' from jsonb_array_elements(item->'source_rows') r);
      if cardinality(source_ids) > 1 then raise exception 'existing source identities need manual review'; end if;
      contact_uuid := case when cardinality(source_ids) = 1 then source_ids[1] else null end;
      if nullif(item->>'existing_id','') is not null then
        if contact_uuid is not null and contact_uuid <> (item->>'existing_id')::uuid then raise exception 'crossed website identity'; end if;
        contact_uuid := (item->>'existing_id')::uuid;
        if not exists(select 1 from public.booking_contacts c where c.id = contact_uuid
          and booking_private.contact_name_key(c.full_name) = booking_private.contact_name_key(item->>'full_name')
          and exists(select 1 from public.booking_contact_methods m where m.contact_id = c.id
            and ((m.kind = 'email' and item->'emails' ? m.value) or (m.kind = 'phone' and item->'phones' ? m.value)))) then
          raise exception 'website identity match no longer valid';
        end if;
      end if;
      if contact_uuid is null then
        insert into public.booking_contacts(full_name,email,phone_e164,origin,consent_version,consented_at,source_path,
          network_fingerprint,handoff_count,expires_at,needs_identity_review,review_reasons)
        values(item->>'full_name',item->'emails'->>0,item->'phones'->>0,'booksy',null,null,null,null,0,null,
          jsonb_array_length(item->'review_reasons') > 0,array(select jsonb_array_elements_text(item->'review_reasons')))
        returning id into contact_uuid;
        created_count := created_count + 1;
      else
        linked_count := linked_count + 1;
      end if;
      for method_value in select jsonb_array_elements_text(item->'emails') loop
        insert into public.booking_contact_methods(contact_id,kind,value) values(contact_uuid,'email',method_value)
        on conflict(contact_id,kind,value) do nothing;
      end loop;
      for method_value in select jsonb_array_elements_text(item->'phones') loop
        insert into public.booking_contact_methods(contact_id,kind,value) values(contact_uuid,'phone',method_value)
        on conflict(contact_id,kind,value) do nothing;
      end loop;
      for source_item in select value from jsonb_array_elements(item->'source_rows') loop
        if nullif(source_item->>'external_id','') is null then raise exception 'missing Booksy ID'; end if;
        select source_record into old_record from public.booking_contact_source_records
        where source = 'booksy' and source_business_id = p_payload->>'source_business_id' and external_id = source_item->>'external_id';
        if old_record is not null and old_record <> source_item then raise exception 'source record changed; review before updating'; end if;
        insert into public.booking_contact_source_records(source,source_business_id,external_id,contact_id,batch_id,source_record)
        values('booksy',p_payload->>'source_business_id',source_item->>'external_id',contact_uuid,batch_uuid,source_item)
        on conflict(source,source_business_id,external_id) do nothing;
      end loop;
    end loop;
    update public.booking_contact_import_batches set created_count = import_state.created_count,
      linked_count = import_state.linked_count where id = batch_uuid;
    result := jsonb_build_object('status',case when p_dry_run then 'dry_run_passed' else 'imported' end,
      'batch_id',batch_uuid,'source_records',source_count,'master_contacts',jsonb_array_length(p_payload->'contacts'),
      'created',created_count,'linked',linked_count,'duplicates_consolidated',source_count-jsonb_array_length(p_payload->'contacts'),
      'dry_run',p_dry_run);
    if p_dry_run then raise sqlstate 'PZ001' using message = 'rollback contact import dry run'; end if;
  exception when sqlstate 'PZ001' then null;
  end;
  return result;
end; $$;
revoke all on function booking_private.import_booksy_contacts(jsonb,boolean) from public,anon,authenticated;
grant execute on function booking_private.import_booksy_contacts(jsonb,boolean) to service_role;
notify pgrst, 'reload schema';
