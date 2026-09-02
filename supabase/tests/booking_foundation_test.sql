begin;

do $$
begin
  if not has_schema_privilege('authenticated', 'booking_private', 'usage')
    or has_schema_privilege('anon', 'booking_private', 'usage') then
    raise exception 'Private helper schema usage is not limited to signed-in staff callers';
  end if;
end;
$$;

do $$
declare
  missing_rls text[];
begin
  select array_agg(tablename order by tablename)
  into missing_rls
  from pg_tables
  where schemaname = 'public'
    and tablename = any (array[
      'staff_members',
      'services',
      'business_settings',
      'weekly_hours',
      'customers',
      'appointments',
      'time_blocks',
      'payments',
      'stripe_webhook_events',
      'appointment_events',
      'notification_outbox',
      'calendar_sync_jobs',
      'staff_notification_settings',
      'booking_contacts',
      'booking_contact_methods',
      'booking_contact_capture_events',
      'published_reviews',
      'review_submissions',
      'review_capture_events'
    ])
    and rowsecurity = false;

  if missing_rls is not null then
    raise exception 'RLS is missing from: %', missing_rls;
  end if;
end;
$$;

do $$
declare
  exposed_table text;
begin
  select table_name
  into exposed_table
  from information_schema.tables
  where table_schema = 'public'
    and table_name = any (array[
      'staff_members',
      'services',
      'business_settings',
      'weekly_hours',
      'customers',
      'appointments',
      'time_blocks',
      'payments',
      'stripe_webhook_events',
      'appointment_events',
      'notification_outbox',
      'calendar_sync_jobs',
      'staff_notification_settings',
      'booking_contacts',
      'booking_contact_methods',
      'booking_contact_capture_events',
      'review_submissions',
      'review_capture_events'
    ])
    and (
      has_table_privilege('anon', format('%I.%I', table_schema, table_name), 'select') or
      has_table_privilege('anon', format('%I.%I', table_schema, table_name), 'insert') or
      has_table_privilege('anon', format('%I.%I', table_schema, table_name), 'update') or
      has_table_privilege('anon', format('%I.%I', table_schema, table_name), 'delete')
    )
  limit 1;

  if exposed_table is not null then
    raise exception 'Anonymous role unexpectedly has access to %', exposed_table;
  end if;
end;
$$;

do $$
declare
  settings public.business_settings%rowtype;
begin
  select * into strict settings from public.business_settings where id = 1;

  if settings.deposit_cents <> 1000 or
     settings.deposit_non_refundable is not true or
     settings.deposit_applies_to_balance is not true or
     settings.reschedule_min_hours <> 24 then
    raise exception 'Deposit and reschedule policy seed does not match the approved rules';
  end if;

  if settings.location_city is distinct from 'Ridgefield'
    or settings.address_line is distinct from '719 Grand Ave, Ridgefield, NJ 07657' then
    raise exception 'Location settings must match the current verified Booksy listing';
  end if;
end;
$$;

do $$
declare
  total_services integer;
  online_services integer;
begin
  select count(*), count(*) filter (where online_bookable)
  into total_services, online_services
  from public.services;

  if total_services <> 6 or online_services <> 5 then
    raise exception 'Expected six Booksy seed services and five online-bookable services';
  end if;
end;
$$;

do $$
begin
  if has_function_privilege(
    'anon',
    'public.create_booking_hold(uuid,timestamptz,text,text,text,boolean,text,boolean,text,text)',
    'execute'
  ) then
    raise exception 'Anonymous role can execute create_booking_hold';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.create_booking_hold(uuid,timestamptz,text,text,text,boolean,text,boolean,text,text)',
    'execute'
  ) then
    raise exception 'Service role cannot execute create_booking_hold';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.reschedule_confirmed_appointment(uuid,timestamptz)',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'public.cancel_customer_appointment(uuid,text)',
    'execute'
  ) then
    raise exception 'Authenticated browser role can execute customer management functions directly';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.create_time_block(uuid,timestamptz,timestamptz,text)',
    'execute'
  ) then
    raise exception 'Authenticated browser role can execute create_time_block directly';
  end if;

  if has_function_privilege(
    'anon',
    'booking_private.purge_expired_booking_contacts()',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'booking_private.purge_expired_booking_contacts()',
    'execute'
  ) then
    raise exception 'Browser roles can execute booking-contact retention cleanup';
  end if;

  if not has_function_privilege(
    'service_role',
    'booking_private.purge_expired_booking_contacts()',
    'execute'
  ) then
    raise exception 'Service role cannot execute booking-contact retention cleanup';
  end if;

  if has_function_privilege(
    'anon',
    'public.capture_or_merge_booking_contact(text,text,text,text,timestamptz,text,text)',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'public.capture_or_merge_booking_contact(text,text,text,text,timestamptz,text,text)',
    'execute'
  ) then
    raise exception 'Browser roles can execute master contact capture directly';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.capture_or_merge_booking_contact(text,text,text,text,timestamptz,text,text)',
    'execute'
  ) then
    raise exception 'Service role cannot execute master contact capture';
  end if;

  if has_function_privilege(
    'anon',
    'public.capture_review_submission_v2(text,text,smallint,text,text,timestamptz,text,text,uuid)',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'public.capture_review_submission_v2(text,text,smallint,text,text,timestamptz,text,text,uuid)',
    'execute'
  ) or not has_function_privilege(
    'service_role',
    'public.capture_review_submission_v2(text,text,smallint,text,text,timestamptz,text,text,uuid)',
    'execute'
  ) then
    raise exception 'Signed review receiver function privileges are incorrect';
  end if;

  if has_function_privilege(
    'anon',
    'public.publish_review_submission(uuid)',
    'execute'
  ) or not has_function_privilege(
    'authenticated',
    'public.publish_review_submission(uuid)',
    'execute'
  ) then
    raise exception 'Review publication function privileges are incorrect';
  end if;

  if has_function_privilege(
    'anon',
    'booking_private.purge_stale_review_capture_events()',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'booking_private.purge_stale_review_capture_events()',
    'execute'
  ) then
    raise exception 'Browser roles can execute review abuse-event cleanup';
  end if;

  if has_function_privilege(
    'anon',
    'public.delete_review_submission(uuid)',
    'execute'
  ) or not has_function_privilege(
    'authenticated',
    'public.delete_review_submission(uuid)',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'booking_private.delete_linked_website_review()',
    'execute'
  ) then
    raise exception 'Review deletion function privileges are incorrect';
  end if;
end;
$$;

do $$
begin
  if has_table_privilege('anon', 'public.booking_contacts', 'select')
    or has_table_privilege('anon', 'public.booking_contacts', 'insert') then
    raise exception 'Anonymous role can access booking contacts directly';
  end if;

  if not has_table_privilege('authenticated', 'public.booking_contacts', 'select')
    or not has_table_privilege('authenticated', 'public.booking_contacts', 'delete')
    or has_table_privilege('authenticated', 'public.booking_contacts', 'insert') then
    raise exception 'Authenticated booking-contact privileges do not match the staff dashboard boundary';
  end if;

  if not has_table_privilege('service_role', 'public.booking_contacts', 'insert') then
    raise exception 'Service role cannot capture booking contacts';
  end if;

  if has_table_privilege('anon', 'public.booking_contact_methods', 'select')
    or has_table_privilege('anon', 'public.booking_contact_capture_events', 'select')
    or has_table_privilege('authenticated', 'public.booking_contact_capture_events', 'select') then
    raise exception 'Master contact internals are exposed to a browser role';
  end if;

  if not has_table_privilege('authenticated', 'public.booking_contact_methods', 'select')
    or not has_table_privilege('service_role', 'public.booking_contact_capture_events', 'insert') then
    raise exception 'Master contact table privileges are incomplete';
  end if;

  if not exists (
    select 1
    from cron.job
    where jobname = 'purge-expired-legacy-redeemed-booking-contacts'
  ) then
    raise exception 'Legacy booking-contact retention job is missing';
  end if;

  if not has_table_privilege('anon', 'public.published_reviews', 'select')
    or has_table_privilege('anon', 'public.published_reviews', 'insert')
    or has_table_privilege('anon', 'public.published_reviews', 'update')
    or has_table_privilege('anon', 'public.published_reviews', 'delete') then
    raise exception 'Published review privileges do not match the public read-only boundary';
  end if;

  if has_table_privilege('anon', 'public.review_submissions', 'select')
    or has_table_privilege('anon', 'public.review_submissions', 'insert')
    or has_table_privilege('authenticated', 'public.review_submissions', 'insert')
    or not has_table_privilege('authenticated', 'public.review_submissions', 'select')
    or not has_table_privilege('authenticated', 'public.review_submissions', 'update')
    or not has_table_privilege('authenticated', 'public.review_submissions', 'delete')
    or has_table_privilege('anon', 'public.review_capture_events', 'select')
    or has_table_privilege('authenticated', 'public.review_capture_events', 'select') then
    raise exception 'Private review inbox or abuse events are exposed incorrectly';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.review_submissions'::regclass
      and tgname = 'review_submissions_delete_linked_public'
      and not tgisinternal
  ) then
    raise exception 'Approved website review deletion trigger is missing';
  end if;

  if not exists (
    select 1 from cron.job
    where jobname = 'purge-stale-redeemed-review-capture-events'
      and schedule = '53 * * * *'
  ) then
    raise exception 'Hourly review abuse-event cleanup job is missing';
  end if;

  if exists (
    select 1
    from cron.job
    where jobname = 'purge-expired-redeemed-booking-contacts'
  ) then
    raise exception 'The former all-contact deletion job still exists';
  end if;
end;
$$;

do $$
declare
  staff_id uuid;
  pending_id uuid := gen_random_uuid();
  approved_id uuid := gen_random_uuid();
  public_id uuid := gen_random_uuid();
begin
  select user_id into staff_id
  from public.staff_members
  where active
  order by created_at
  limit 1;

  if staff_id is null then
    perform set_config('redeemed.test.skip_review_delete', 'true', true);
    return;
  end if;

  insert into public.review_submissions (
    id, display_name, email, rating, review_text, consent_version, consented_at,
    source_path, status
  ) values (
    pending_id, 'Pending Delete Test', 'pending-delete-test@example.com', 5,
    'This private review exists only inside a rolled back security test.',
    '2026-09-01-v1', now(), '/reviews', 'pending'
  );

  insert into public.published_reviews (
    id, source, source_key, display_name, rating, review_text, reviewed_at,
    confirmed_client, source_url, active
  ) values (
    public_id, 'website', 'website:' || approved_id::text,
    'Approved Delete Test', 5,
    'This public review exists only inside a rolled back security test.',
    current_date, false, null, true
  );

  insert into public.review_submissions (
    id, display_name, email, rating, review_text, consent_version, consented_at,
    source_path, status, moderated_at, moderated_by, published_review_id
  ) values (
    approved_id, 'Approved Delete Test', 'approved-delete-test@example.com', 5,
    'This private review exists only inside a rolled back security test.',
    '2026-09-01-v1', now(), '/reviews', 'approved', now(), staff_id, public_id
  );

  perform set_config('request.jwt.claim.sub', staff_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('redeemed.test.skip_review_delete', 'false', true);
  perform set_config('redeemed.test.pending_review_id', pending_id::text, true);
  perform set_config('redeemed.test.approved_review_id', approved_id::text, true);
  perform set_config('redeemed.test.public_review_id', public_id::text, true);
end;
$$;

set local role authenticated;

select case
  when current_setting('redeemed.test.skip_review_delete') = 'true' then true
  else public.delete_review_submission(
    current_setting('redeemed.test.pending_review_id')::uuid
  )
end;

select case
  when current_setting('redeemed.test.skip_review_delete') = 'true' then true
  else public.delete_review_submission(
    current_setting('redeemed.test.approved_review_id')::uuid
  )
end;

reset role;

select set_config(
  'request.jwt.claim.sub',
  'ffffffff-ffff-4fff-8fff-ffffffffffff',
  true
);
set local role authenticated;

do $$
begin
  begin
    perform public.delete_review_submission(gen_random_uuid());
    raise exception 'Nonstaff user could execute staff review deletion';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;

do $$
begin
  if current_setting('redeemed.test.skip_review_delete') = 'true' then
    return;
  end if;

  if exists (
    select 1 from public.review_submissions
    where id in (
      current_setting('redeemed.test.pending_review_id')::uuid,
      current_setting('redeemed.test.approved_review_id')::uuid
    )
  ) or exists (
    select 1 from public.published_reviews
    where id = current_setting('redeemed.test.public_review_id')::uuid
  ) then
    raise exception 'Staff review deletion did not remove the exact linked rows';
  end if;

  if (select count(*) from public.published_reviews where source = 'booksy') <> 3 then
    raise exception 'Staff website-review deletion changed a Booksy highlight';
  end if;
end;
$$;

do $$
declare
  seeded_booksy_reviews integer;
  iteration integer;
begin
  select count(*) into seeded_booksy_reviews
  from public.published_reviews
  where source = 'booksy'
    and confirmed_client = true
    and active = true;

  if seeded_booksy_reviews <> 3 then
    raise exception 'Expected three confirmed Booksy review highlights';
  end if;

  for iteration in 1..4 loop
    perform public.capture_review_submission_v2(
      'Review Capture Test',
      format('review-capture-%s@example.com', iteration),
      5::smallint,
      'A complete review submission used only by the database test.',
      '2026-09-01-v1',
      now(),
      '/reviews',
      repeat('d', 64),
      ('00000000-0000-4000-8000-' || lpad(iteration::text, 12, '0'))::uuid
    );
  end loop;

  begin
    perform public.capture_review_submission_v2(
      'Review Capture Test',
      'review-capture-rate-limit@example.com',
      5::smallint,
      'This fifth review should be stopped by the durable rate limit.',
      '2026-09-01-v1',
      now(),
      '/reviews',
      repeat('d', 64),
      '00000000-0000-4000-8000-000000000005'::uuid
    );
    raise exception 'Fifth review submission was not rate limited';
  exception
    when raise_exception then
      if sqlerrm <> 'review_rate_limited' then
        raise;
      end if;
  end;

  perform public.capture_review_submission_v2(
    'Replay Protection Test',
    'review-replay-one@example.com',
    5::smallint,
    'A complete review submission used to verify replay protection.',
    '2026-09-01-v1',
    now(),
    '/reviews',
    repeat('e', 64),
    '10000000-0000-4000-8000-000000000001'::uuid
  );

  begin
    perform public.capture_review_submission_v2(
      'Replay Protection Test',
      'review-replay-two@example.com',
      5::smallint,
      'This replay must roll back instead of creating a second review.',
      '2026-09-01-v1',
      now(),
      '/reviews',
      repeat('e', 64),
      '10000000-0000-4000-8000-000000000001'::uuid
    );
    raise exception 'Duplicate signed request id was accepted';
  exception
    when unique_violation then null;
  end;
end;
$$;

do $$
declare
  first_contact_id uuid;
  second_contact_id uuid;
  third_contact_id uuid;
  master_count integer;
  method_count integer;
  event_count integer;
  total_handoffs integer;
begin
  first_contact_id := public.capture_or_merge_booking_contact(
    'Master Contact Test',
    'master-contact-one@example.com',
    '+19995550199',
    '2026-08-24-v2',
    now(),
    '/book',
    repeat('c', 64)
  );

  second_contact_id := public.capture_or_merge_booking_contact(
    'Master Contact Test Updated',
    'master-contact-two@example.com',
    '+19995550199',
    '2026-08-24-v2',
    now(),
    '/book',
    repeat('c', 64)
  );

  third_contact_id := public.capture_or_merge_booking_contact(
    'Master Contact Test Final',
    'MASTER-CONTACT-ONE@EXAMPLE.COM',
    null,
    '2026-08-24-v2',
    now(),
    '/book',
    repeat('c', 64)
  );

  if first_contact_id <> second_contact_id or first_contact_id <> third_contact_id then
    raise exception 'Matching email or phone did not resolve to one master contact';
  end if;

  select count(*), max(handoff_count)
  into master_count, total_handoffs
  from public.booking_contacts
  where id = first_contact_id;

  select count(*) into method_count
  from public.booking_contact_methods
  where contact_id = first_contact_id;

  select count(*) into event_count
  from public.booking_contact_capture_events
  where contact_id = first_contact_id;

  if master_count <> 1 or total_handoffs <> 3 then
    raise exception 'Master contact row or handoff count is incorrect';
  end if;

  if method_count <> 3 then
    raise exception 'Master contact did not retain two emails and one phone';
  end if;

  if event_count <> 3 then
    raise exception 'Capture event count does not match successful handoffs';
  end if;

  delete from public.booking_contacts where id = first_contact_id;
end;
$$;

do $$
begin
  insert into public.booking_contacts (
    full_name,
    email,
    consent_version,
    consented_at,
    source_path,
    network_fingerprint,
    created_at,
    expires_at
  ) values
    (
      'Legacy Retention Test',
      'legacy-retention-test@example.com',
      '2026-08-24-v1',
      now() - interval '13 months',
      '/book',
      repeat('a', 64),
      now() - interval '13 months',
      now() - interval '1 month'
    ),
    (
      'Current Retention Test',
      'current-retention-test@example.com',
      '2026-08-24-v2',
      now(),
      '/book',
      repeat('b', 64),
      now(),
      null
    );

  perform booking_private.purge_expired_booking_contacts();

  if exists (
    select 1 from public.booking_contacts
    where email = 'legacy-retention-test@example.com'
  ) then
    raise exception 'Expired legacy contact was not removed';
  end if;

  if not exists (
    select 1 from public.booking_contacts
    where email = 'current-retention-test@example.com'
      and expires_at is null
  ) then
    raise exception 'Current contact was incorrectly deleted or assigned an expiration';
  end if;
end;
$$;

rollback;
