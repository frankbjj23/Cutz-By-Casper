-- Keep the dormant custom-booking foundation aligned with Casper's current Booksy listing.
update public.business_settings
set
  location_city = 'Ridgefield',
  location_region = 'NJ',
  address_line = '719 Grand Ave, Ridgefield, NJ 07657',
  updated_at = now()
where id = 1;
