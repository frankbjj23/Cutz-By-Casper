alter table if exists services
  add column if not exists price_cents integer not null default 0,
  add column if not exists price_from boolean not null default false,
  add column if not exists note text;

alter table if exists business_settings
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists policy_text text;
