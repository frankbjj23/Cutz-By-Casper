-- The signed v2 Edge receiver is active, so the former unsigned service-role
-- capture function is no longer needed.

drop function public.capture_review_submission(
  text, text, smallint, text, text, timestamptz, text, text
);
