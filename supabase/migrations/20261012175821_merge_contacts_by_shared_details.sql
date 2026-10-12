-- Owner-approved cleanup: either a shared normalized email OR phone joins entries.
-- Filename matches the verified production migration version.
-- This is an administrative operation, never callable by the public intake form.
alter table public.booking_contacts
  add column alternate_names text[] not null default array[]::text[];

create table booking_private.contact_merge_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  policy text not null check (policy = 'shared-email-or-phone-v1'),
  before_snapshot jsonb not null,
  merge_groups jsonb not null,
  result jsonb not null
);
alter table booking_private.contact_merge_runs enable row level security;
revoke all on booking_private.contact_merge_runs from public, anon, authenticated, service_role;
comment on table booking_private.contact_merge_runs is
  'Administrative recovery record: original contacts, methods, source links, and capture events before an approved merge. Not exposed through the Data API.';

create function booking_private.merge_booking_contacts_by_method(p_dry_run boolean default true)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  groups jsonb;
  item jsonb;
  member_ids uuid[];
  keep_id uuid;
  keep_row public.booking_contacts;
  before_data jsonb;
  outcome jsonb;
  run_id uuid;
  before_count integer;
  removed_count integer := 0;
  initial_methods integer;
  initial_sources integer;
  initial_events integer;
begin
  if current_user <> 'postgres' then
    raise exception using errcode = '42501', message = 'contact merge is administrator-only';
  end if;
  if p_dry_run is null then raise exception 'dry-run mode is required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('redeemed-contact-write-v2', 0));
  -- Serialize against any other contact-table maintenance, not just intake.
  lock table public.booking_contacts, public.booking_contact_methods,
    public.booking_contact_source_records, public.booking_contact_capture_events in share row exclusive mode;
  select count(*) into before_count from public.booking_contacts;
  select count(distinct (kind,value)) into initial_methods from public.booking_contact_methods;
  select count(*) into initial_sources from public.booking_contact_source_records;
  select count(*) into initial_events from public.booking_contact_capture_events;

  -- Connected components include chains: A shares an email with B, B a phone with C.
  -- Blank fields do not participate; contact methods are already normalized.
  with recursive edges as (
    select distinct a.contact_id as a, b.contact_id as b
    from public.booking_contact_methods a join public.booking_contact_methods b using(kind,value)
  ), reach(seed,member) as (
    select id,id from public.booking_contacts
    union
    select r.seed,e.b from reach r join edges e on e.a=r.member
  ), roots as (
    select r.member, (array_agg(c.id order by (c.handoff_count > 0) desc,
      (c.origin='website') desc, c.consented_at desc nulls last, c.first_seen_at, c.id))[1] as keeper
    from reach r join public.booking_contacts c on c.id=r.seed group by r.member
  ), clusters as (
    select keeper,array_agg(member order by member) as members
    from roots group by keeper having count(*) > 1
  )
  select coalesce(jsonb_agg(jsonb_build_object('keeper',keeper,'members',members) order by keeper),'[]'::jsonb)
    into groups from clusters;

  if jsonb_array_length(groups)=0 then
    return jsonb_build_object('status','no_duplicates','before',before_count,'after',before_count,'merged',0,'groups',0,'dry_run',p_dry_run);
  end if;
  select jsonb_build_object(
    'contacts',(select coalesce(jsonb_agg(to_jsonb(c) order by c.id),'[]'::jsonb) from public.booking_contacts c),
    'methods',(select coalesce(jsonb_agg(to_jsonb(m) order by m.contact_id,m.kind,m.value),'[]'::jsonb) from public.booking_contact_methods m),
    'sources',(select coalesce(jsonb_agg(to_jsonb(s) order by s.source,s.source_business_id,s.external_id),'[]'::jsonb) from public.booking_contact_source_records s),
    'events',(select coalesce(jsonb_agg(to_jsonb(e) order by e.id),'[]'::jsonb) from public.booking_contact_capture_events e)
  ) into before_data;

  begin
    for item in select value from jsonb_array_elements(groups) loop
      keep_id := (item->>'keeper')::uuid;
      member_ids := array(select jsonb_array_elements_text(item->'members')::uuid);
      select * into strict keep_row from public.booking_contacts where id=keep_id;

      -- Retain every name. A shared detail is the owner's grouping rule, not proof
      -- of identity or permission to market to anyone in this group.
      update public.booking_contacts c set
        alternate_names = array(
          select distinct name from (
            select full_name as name from public.booking_contacts where id=any(member_ids)
            union all select unnest(alternate_names) from public.booking_contacts where id=any(member_ids)
          ) names where name <> keep_row.full_name order by name
        ),
        email=coalesce(c.email,(select min(email) from public.booking_contacts where id=any(member_ids))),
        phone_e164=coalesce(c.phone_e164,(select min(phone_e164) from public.booking_contacts where id=any(member_ids))),
        first_seen_at=(select min(first_seen_at) from public.booking_contacts where id=any(member_ids)),
        created_at=(select min(created_at) from public.booking_contacts where id=any(member_ids)),
        last_seen_at=coalesce(
          (select max(last_seen_at) from public.booking_contacts where id=any(member_ids) and handoff_count>0),
          (select max(last_seen_at) from public.booking_contacts where id=any(member_ids))),
        handoff_count=(select sum(handoff_count) from public.booking_contacts where id=any(member_ids)),
        needs_identity_review=false,
        review_reasons=array[]::text[]
      where c.id=keep_id;

      insert into public.booking_contact_methods(contact_id,kind,value,first_seen_at,last_seen_at)
      select keep_id,kind,value,min(first_seen_at),max(last_seen_at)
      from public.booking_contact_methods where contact_id=any(member_ids) group by kind,value
      on conflict(contact_id,kind,value) do update set
        first_seen_at=least(public.booking_contact_methods.first_seen_at,excluded.first_seen_at),
        last_seen_at=greatest(public.booking_contact_methods.last_seen_at,excluded.last_seen_at);
      update public.booking_contact_source_records set contact_id=keep_id where contact_id=any(member_ids) and contact_id<>keep_id;
      update public.booking_contact_capture_events set contact_id=keep_id where contact_id=any(member_ids) and contact_id<>keep_id;
      -- All methods and references have been transferred; complete originals are
      -- retained in the restricted audit record and the pre-merge local backup.
      delete from public.booking_contacts where id=any(member_ids) and id<>keep_id;
      removed_count := removed_count + cardinality(member_ids)-1;
    end loop;

    if (select count(distinct(kind,value)) from public.booking_contact_methods) <> initial_methods
      or (select count(*) from public.booking_contact_source_records) <> initial_sources
      or (select count(*) from public.booking_contact_capture_events) <> initial_events
      or (select count(*) from public.booking_contacts) <> before_count-removed_count
      or exists(select 1 from public.booking_contact_methods group by kind,value having count(*)>1)
    then raise exception 'contact merge reconciliation failed'; end if;
    outcome := jsonb_build_object('status',case when p_dry_run then 'dry_run_passed' else 'merged' end,
      'before',before_count,'after',before_count-removed_count,'merged',removed_count,
      'groups',jsonb_array_length(groups),'preserved_methods',initial_methods,'preserved_sources',initial_sources,'dry_run',p_dry_run);
    insert into booking_private.contact_merge_runs(policy,before_snapshot,merge_groups,result)
      values('shared-email-or-phone-v1',before_data,groups,outcome) returning id into run_id;
    outcome := outcome || jsonb_build_object('run_id',run_id);
    if p_dry_run then raise sqlstate 'PZ002' using message='rollback contact merge dry run'; end if;
  exception when sqlstate 'PZ002' then null;
  end;
  return outcome;
end; $$;
revoke all on function booking_private.merge_booking_contacts_by_method(boolean) from public,anon,authenticated,service_role;
-- Returning under an original merged name must not recreate a duplicate.
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
  where (lower(regexp_replace(btrim(c.full_name), '[[:space:]]+', ' ', 'g')) = lower(normalized_name)
    or exists(select 1 from unnest(c.alternate_names) as aliases(name)
      where lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')) = lower(normalized_name)))
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
notify pgrst,'reload schema';
