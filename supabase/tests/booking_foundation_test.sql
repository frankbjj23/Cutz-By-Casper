begin;

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
      'booking_contact_capture_events'
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
      'booking_contact_capture_events'
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
