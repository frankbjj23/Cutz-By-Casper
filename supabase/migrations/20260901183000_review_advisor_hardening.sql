-- Make the intended deny-all browser boundary explicit for abuse events and
-- cover the staff moderation foreign key flagged by the database advisor.

create policy browser_deny_review_capture_events
  on public.review_capture_events
  as restrictive
  for all to anon, authenticated
  using (false)
  with check (false);

create index review_submissions_moderated_by_idx
  on public.review_submissions (moderated_by)
  where moderated_by is not null;
