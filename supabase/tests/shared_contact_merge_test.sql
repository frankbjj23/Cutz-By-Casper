begin;
-- Synthetic data only; every assertion and write rolls back.
do $$
declare
  a uuid; b uuid; c uuid; d uuid; keeper uuid;
  batch uuid; n integer; audit_n integer; merge_result jsonb; original jsonb;
begin
  a := public.capture_or_merge_booking_contact('Merge Test Alice','merge-a@example.com','+12015550201','2026-08-24-v2',now(),'/book',repeat('a',64));
  b := public.capture_or_merge_booking_contact('Merge Test Bob','merge-b@example.com','+12015550201','2026-08-24-v2',now(),'/book',repeat('b',64));
  c := public.capture_or_merge_booking_contact('Merge Test Carol','merge-b@example.com','+12015550202','2026-08-24-v2',now(),'/book',repeat('c',64));
  d := public.capture_or_merge_booking_contact('Merge Test Alice','merge-other@example.com','+12015550203','2026-08-24-v2',now(),'/book',repeat('d',64));
  insert into public.booking_contact_import_batches(source,source_business_id,source_file,source_sha256,match_policy,source_count,master_count)
    values('booksy','697614','merge-test.xlsx',repeat('d',64),'exact-full-name-and-phone-v1',2,2) returning id into batch;
  insert into public.booking_contact_source_records(source,source_business_id,external_id,contact_id,batch_id,source_record) values
    ('booksy','697614','merge-test-source-a',a,batch,'{"source_flags":{"processing_consent":0}}'),
    ('booksy','697614','merge-test-source-c',c,batch,'{"source_flags":{"processing_consent":1}}');
  select count(*),jsonb_agg(to_jsonb(x) order by x.id) into n,original from public.booking_contacts x;
  select count(*) into audit_n from booking_private.contact_merge_runs;
  merge_result := booking_private.merge_booking_contacts_by_method(true);
  if (merge_result->>'merged')::integer <> 2 or merge_result->>'status' <> 'dry_run_passed'
    or (select jsonb_agg(to_jsonb(x) order by x.id) from public.booking_contacts x) <> original
    or (select count(*) from booking_private.contact_merge_runs) <> audit_n then
    raise exception 'Dry run failed or changed data';
  end if;
  merge_result := booking_private.merge_booking_contacts_by_method(false);
  if (select count(*) from public.booking_contacts) <> n-2 then raise exception 'Transitive shared-method merge failed'; end if;
  select contact_id into keeper from public.booking_contact_methods where kind='email' and value='merge-a@example.com';
  if keeper=d or not exists(select 1 from public.booking_contacts where id=d) then raise exception 'Name-only match merged'; end if;
  if (select count(*) from public.booking_contact_methods where contact_id=keeper) <> 4
    or (select cardinality(alternate_names) from public.booking_contacts where id=keeper) <> 2
    or (select handoff_count from public.booking_contacts where id=keeper) <> 3
    or (select count(*) from public.booking_contact_capture_events where contact_id=keeper) <> 3
    or (select count(*) from public.booking_contact_source_records where contact_id=keeper) <> 2 then
    raise exception 'Merge lost methods, aliases, handoffs, events or source links';
  end if;
  if not exists(select 1 from public.booking_contact_source_records where external_id='merge-test-source-a'
    and source_record='{"source_flags":{"processing_consent":0}}'::jsonb) then raise exception 'Source consent changed'; end if;
  if (select jsonb_array_length(before_snapshot->'contacts') from booking_private.contact_merge_runs where id=(merge_result->>'run_id')::uuid) <> n then
    raise exception 'Recovery snapshot incomplete';
  end if;
  merge_result := booking_private.merge_booking_contacts_by_method(false);
  if merge_result->>'status' <> 'no_duplicates' or (merge_result->>'merged')::integer <> 0 then raise exception 'Repeat not idempotent'; end if;
  perform set_config('test.merge_keeper',keeper::text,true);
end; $$;

-- The service-only intake can recognize a preserved alias, but cannot run merges.
set local role service_role;
do $$ declare merge_result uuid; begin
  merge_result := public.capture_or_merge_booking_contact('Merge Test Bob','merge-b@example.com','+12015550201','2026-08-24-v2',now(),'/book',repeat('b',64));
  if merge_result <> current_setting('test.merge_keeper')::uuid then raise exception 'Alias intake recreated a duplicate'; end if;
end; $$;
reset role;
do $$ begin
  if has_function_privilege('anon','booking_private.merge_booking_contacts_by_method(boolean)','execute')
    or has_function_privilege('authenticated','booking_private.merge_booking_contacts_by_method(boolean)','execute')
    or has_function_privilege('service_role','booking_private.merge_booking_contacts_by_method(boolean)','execute')
    or has_table_privilege('authenticated','booking_private.contact_merge_runs','select') then
    raise exception 'Administrative merge permissions too broad';
  end if;
end; $$;
rollback;
