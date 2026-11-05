-- Aggregate-only staff dashboard. No contact records or existing permissions change.
create table public.site_activity_config (
  singleton boolean primary key default true check (singleton),
  tracking_started_at timestamptz not null default now()
);
insert into public.site_activity_config default values;

create table public.site_activity_daily (
  day date primary key,
  visits bigint not null default 0 check (visits >= 0),
  page_visits bigint not null default 0 check (page_visits >= 0),
  booking_visits bigint not null default 0 check (booking_visits >= 0),
  check (booking_visits <= visits and visits <= page_visits)
);
create schema site_activity_private;
revoke all on schema site_activity_private from public,anon,authenticated;
grant usage on schema site_activity_private to service_role;
create table site_activity_private.site_activity_sessions (
  day date not null,
  session_hash text not null check (session_hash ~ '^[a-f0-9]{64}$'),
  network_hash text not null check (network_hash ~ '^[a-f0-9]{64}$'),
  paths text[] not null check (paths <@ array['/','/book','/styles','/reviews','/privacy']::text[] and cardinality(paths) between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (day, session_hash)
);
create index site_activity_sessions_network_idx on site_activity_private.site_activity_sessions(day,network_hash);
create index site_activity_sessions_expiry_idx on site_activity_private.site_activity_sessions(created_at);

alter table public.site_activity_config enable row level security;
alter table public.site_activity_daily enable row level security;
alter table site_activity_private.site_activity_sessions enable row level security;
revoke all on public.site_activity_config,public.site_activity_daily,site_activity_private.site_activity_sessions from public,anon,authenticated;
grant select on public.site_activity_config,public.site_activity_daily to authenticated;
grant all on public.site_activity_config,public.site_activity_daily,site_activity_private.site_activity_sessions to service_role;
create policy staff_read_activity_config on public.site_activity_config for select to authenticated
  using ((select booking_private.is_active_staff()));
create policy staff_read_activity_daily on public.site_activity_daily for select to authenticated
  using ((select booking_private.is_active_staff()));
create policy service_activity_sessions on site_activity_private.site_activity_sessions for all to service_role using (true) with check (true);

create function public.record_site_activity(p_session_hash text,p_network_hash text,p_path text)
returns void language plpgsql security invoker set search_path='' as $$
declare
  v_day date := (now() at time zone 'America/New_York')::date;
  v_paths text[];
  v_new integer := 0;
begin
  if p_session_hash is null or p_session_hash !~ '^[a-f0-9]{64}$'
    or p_network_hash is null or p_network_hash !~ '^[a-f0-9]{64}$'
    or p_path is null or p_path <> all(array['/','/book','/styles','/reviews','/privacy'])
  then raise exception using errcode='22023',message='invalid activity'; end if;
  -- Consistent lock ordering serializes duplicate sessions and per-network limits.
  perform pg_advisory_xact_lock(hashtextextended('activity-network:'||v_day||p_network_hash,0));
  perform pg_advisory_xact_lock(hashtextextended('activity-session:'||v_day||p_session_hash,0));
  select paths into v_paths from site_activity_private.site_activity_sessions
    where day=v_day and session_hash=p_session_hash;
  if found then
    if p_path=any(v_paths) then return; end if;
    update site_activity_private.site_activity_sessions set paths=array_append(paths,p_path)
      where day=v_day and session_hash=p_session_hash;
  else
    if (select count(*) from site_activity_private.site_activity_sessions where day=v_day and network_hash=p_network_hash)>=1000
    then raise exception using errcode='P0001',message='activity_rate_limited'; end if;
    insert into site_activity_private.site_activity_sessions(day,session_hash,network_hash,paths)
      values(v_day,p_session_hash,p_network_hash,array[p_path]);
    v_new := 1;
  end if;
  insert into public.site_activity_daily(day) values(v_day) on conflict(day) do nothing;
  update public.site_activity_daily set visits=visits+v_new,page_visits=page_visits+1,
    booking_visits=booking_visits+case when p_path='/book' then 1 else 0 end where day=v_day;
end; $$;
revoke all on function public.record_site_activity(text,text,text) from public,anon,authenticated;
grant execute on function public.record_site_activity(text,text,text) to service_role;

create function public.get_site_activity(p_days integer default 30)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare
  v_today date := (now() at time zone 'America/New_York')::date;
  v_started timestamptz;
  v_days jsonb;
begin
  if not booking_private.is_active_staff() then
    raise exception using errcode='42501',message='staff only';
  end if;
  if p_days is null or p_days not in (7,30,90) then
    raise exception using errcode='22023',message='invalid activity range';
  end if;
  select tracking_started_at into strict v_started from public.site_activity_config where singleton;
  with dates as (select v_today-i as day from generate_series(0,p_days-1) as g(i)),
  signups as (
    select (c.first_seen_at at time zone 'America/New_York')::date as day,count(*) as total
    from public.booking_contacts c
    where c.origin='website' and c.first_seen_at >= ((v_today-(p_days-1))::timestamp at time zone 'America/New_York')
      and not exists(select 1 from public.booking_contact_source_records s where s.contact_id=c.id)
    group by 1
  )
  select jsonb_agg(jsonb_build_object('day',d.day,
    'visits',case when d.day < (v_started at time zone 'America/New_York')::date then null else coalesce(m.visits,0) end,
    'page_visits',case when d.day < (v_started at time zone 'America/New_York')::date then null else coalesce(m.page_visits,0) end,
    'booking_visits',case when d.day < (v_started at time zone 'America/New_York')::date then null else coalesce(m.booking_visits,0) end,
    'new_contacts',coalesce(s.total,0)) order by d.day desc) into v_days
  from dates d left join public.site_activity_daily m using(day) left join signups s using(day);
  return jsonb_build_object('days',v_days,'tracking_started_at',v_started,
    'total_contacts',(select count(*) from public.booking_contacts),
    'imported_contacts',(select count(distinct contact_id) from public.booking_contact_source_records),
    'website_contacts',(select count(*) from public.booking_contacts c where c.origin='website'
      and not exists(select 1 from public.booking_contact_source_records s where s.contact_id=c.id)));
end; $$;
revoke all on function public.get_site_activity(integer) from public,anon,authenticated;
grant execute on function public.get_site_activity(integer) to authenticated;

-- Only ephemeral, newly introduced analytics receipts are purged. Contacts stay untouched.
select cron.schedule('purge-redeemed-activity-receipts','23 * * * *',
  $$delete from site_activity_private.site_activity_sessions where created_at < now()-interval '48 hours'$$);
comment on table public.site_activity_daily is 'Anonymous Eastern-day visit totals; page counts deduplicated within a browser-tab session, not unique people or confirmed bookings.';
comment on table site_activity_private.site_activity_sessions is 'Daily-rotating pseudonymous duplicate/rate-limit receipts; no names, emails, raw IPs or full URLs. Purged hourly after 48 hours.';
notify pgrst,'reload schema';
