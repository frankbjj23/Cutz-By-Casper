delete from services;
delete from business_settings;

insert into services (
  name,
  duration_minutes,
  price_display,
  price_cents,
  price_from,
  note,
  deposit_amount,
  active
)
values
  ('Haircut (No Beard)', 45, '$55', 5500, false, null, 20, true),
  (
    'Haircut (With Beard)',
    60,
    '$70',
    7000,
    false,
    'Enhancements available for an additional cost.',
    20,
    true
  ),
  ('Beard with "THE WORKS"', 45, '$50', 5000, false, null, 20, true),
  (
    'Haircut w/ Beard + Hot Towel',
    60,
    '$75',
    7500,
    false,
    'Enhancements available for an additional cost.',
    20,
    true
  ),
  ('Gentlemen haircut / shape up', 30, '$35', 3500, false, null, 20, true),
  (
    'Before & After Hours Appointments (Text me direct)',
    60,
    '$100+',
    10000,
    true,
    'Before/after services available for a fee. Text me direct.',
    20,
    true
  );

insert into business_settings (
  time_zone,
  late_grace_minutes,
  reschedule_min_hours,
  deposit_amount_default,
  buffer_minutes,
  working_hours_json,
  address,
  phone,
  policy_text
)
values (
  'America/New_York',
  15,
  72,
  20,
  10,
  '{
    "Sunday": [{"start": "09:00", "end": "13:00"}],
    "Monday": [],
    "Tuesday": [],
    "Wednesday": [{"start": "11:00", "end": "18:00"}],
    "Thursday": [{"start": "10:00", "end": "19:00"}],
    "Friday": [{"start": "12:00", "end": "19:00"}],
    "Saturday": [{"start": "10:00", "end": "17:00"}]
  }'::jsonb,
  '442 Ridge Rd, Lyndhurst, NJ 07071',
  '(201) 889-6440',
  'STRICT POLICY ON 24hr CANCELLATIONS'
);
