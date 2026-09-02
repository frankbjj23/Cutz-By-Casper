-- Authenticated staff RPCs call tightly granted helpers in booking_private.
-- Schema usage exposes no tables or functions by itself; object privileges
-- remain separately restricted.

grant usage on schema booking_private to authenticated;
