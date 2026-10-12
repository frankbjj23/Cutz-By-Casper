begin;
-- Test data only. The whole file rolls back, including generated IDs.
do $$
declare
  test_payload jsonb;
  first_id uuid;
  second_id uuid;
  original_count integer;
  outcome jsonb;
begin
  select count(*) into original_count from public.booking_contacts;
  test_payload := jsonb_build_object('source','booksy','source_business_id','697614','source_file','test.xlsx',
    'source_sha256',repeat('a',64),'policy','exact-full-name-and-phone-v1','source_count',2,'contacts',jsonb_build_array(
      jsonb_build_object('full_name','Import Test Person','emails',jsonb_build_array('import-one@example.com','import-two@example.com'),
        'phones',jsonb_build_array('+12015550111'),'existing_id',null,'review_reasons',jsonb_build_array(),
        'source_rows',jsonb_build_array(
          jsonb_build_object('external_id','test-source-1','first_name','Import Test','last_name','Person','full_name','Import Test Person','email','import-one@example.com','phone_e164','+12015550111','source_flags',jsonb_build_object('processing_consent',0)),
          jsonb_build_object('external_id','test-source-2','first_name','Import Test','last_name','Person','full_name','Import Test Person','email','import-two@example.com','phone_e164','+12015550111','source_flags',jsonb_build_object('processing_consent',1))))));
  outcome := booking_private.import_booksy_contacts(test_payload,true);
  if outcome->>'status' <> 'dry_run_passed' or (select count(*) from public.booking_contacts) <> original_count then
    raise exception 'Dry run mutated contacts or failed';
  end if;
  outcome := booking_private.import_booksy_contacts(test_payload,false);
  if (outcome->>'created')::integer <> 1 then raise exception 'Import did not consolidate duplicate source records'; end if;
  select contact_id into first_id from public.booking_contact_source_records where external_id='test-source-1';
  if (select count(*) from public.booking_contact_methods where contact_id=first_id) <> 3
    or (select handoff_count from public.booking_contacts where id=first_id) <> 0
    or exists(select 1 from public.booking_contacts where id=first_id and (consent_version is not null or consented_at is not null or expires_at is not null)) then
    raise exception 'Lost contact methods or invented consent, handoffs, or expiry';
  end if;
  outcome := booking_private.import_booksy_contacts(test_payload,false);
  if outcome->>'status' <> 'already_imported' or (select count(*) from public.booking_contacts) <> original_count+1 then
    raise exception 'Repeated import created duplicates';
  end if;
  second_id := public.capture_or_merge_booking_contact('Different Family Member','other-person@example.com','+12015550111','2026-08-24-v2',now(),'/book',repeat('b',64));
  if first_id=second_id or not (select needs_identity_review from public.booking_contacts where id=second_id) then
    raise exception 'Shared phone merged different people';
  end if;
  if public.capture_or_merge_booking_contact('Import Test Person','import-one@example.com','+12015550111','2026-08-24-v2',now(),'/book',repeat('b',64)) <> first_id then
    raise exception 'Website handoff failed to match imported full name and method';
  end if;
  if (select count(*) from public.booking_contact_source_records where contact_id=first_id) <> 2
    or (select handoff_count from public.booking_contacts where id=first_id) <> 1 then
    raise exception 'Website handoff lost import provenance';
  end if;
  -- A second file changing an existing source identity must fail atomically.
  test_payload := jsonb_set(test_payload,'{source_sha256}',to_jsonb(repeat('c',64)));
  test_payload := jsonb_set(test_payload,'{contacts,0,source_rows,0,source_flags,processing_consent}','1'::jsonb);
  begin
    perform booking_private.import_booksy_contacts(test_payload,false);
    raise exception 'Changed source record was accepted';
  exception when raise_exception then
    if sqlerrm <> 'source record changed; review before updating' then raise; end if;
  end;
  if exists(select 1 from public.booking_contact_import_batches where source_sha256=repeat('c',64)) then
    raise exception 'Failed import left a partial batch';
  end if;
end; $$;

do $$ begin
  if has_function_privilege('anon','booking_private.import_booksy_contacts(jsonb,boolean)','execute')
    or has_function_privilege('authenticated','booking_private.import_booksy_contacts(jsonb,boolean)','execute')
    or has_table_privilege('anon','public.booking_contact_source_records','select')
    or has_table_privilege('authenticated','public.booking_contact_source_records','insert')
    or has_function_privilege('authenticated','public.capture_or_merge_booking_contact(text,text,text,text,timestamptz,text,text)','execute') then
    raise exception 'Contact import privileges are too broad';
  end if;
end; $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  if exists(select 1 from public.booking_contacts)
    or exists(select 1 from public.booking_contact_methods)
    or exists(select 1 from public.booking_contact_source_records)
    or exists(select 1 from public.booking_contact_import_batches) then
    raise exception 'Nonstaff identity can see private contacts';
  end if;
end; $$;
reset role;

do $$ declare test_staff uuid; begin
  insert into auth.users(email) values('contact-import-staff@example.com') returning id into test_staff;
  insert into public.staff_members(user_id,role,active) values(test_staff,'owner',true);
  perform set_config('request.jwt.claim.sub',test_staff::text,true);
end; $$;
set local role authenticated;
do $$ begin
  if not exists(select 1 from public.booking_contact_source_records where external_id='test-source-1') then
    raise exception 'Authorized staff cannot read imported contacts';
  end if;
end; $$;
reset role;
rollback;
