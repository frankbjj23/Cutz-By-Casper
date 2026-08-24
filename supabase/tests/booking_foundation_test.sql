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
      'staff_notification_settings'
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
      'staff_notification_settings'
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
end;
$$;

rollback;
